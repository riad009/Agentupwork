import "server-only";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { IntegrationError } from "@/lib/errors";
import { isRetryableHttpStatus, withRetry } from "@/lib/retry";
import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/crypto";

export interface GitHubFile {
  path: string;
  contents: string;
}

export interface CreatedRepository {
  owner: string;
  name: string;
  htmlUrl: string;
  defaultBranch: string;
}

export interface GitHubClientOptions {
  token: string;
  owner?: string | null;
  apiUrl?: string;
}

/** Resolves the GitHub token for a user, falling back to the platform token. */
export async function resolveGitHubToken(
  userId: string,
): Promise<{ token: string; owner: string | null } | null> {
  const credential = await prisma.integrationCredential.findUnique({
    where: { userId_provider: { userId, provider: "GITHUB" } },
    select: { secretCiphertext: true, metadata: true, isActive: true },
  });

  if (credential?.isActive) {
    try {
      const metadata = (credential.metadata ?? {}) as { owner?: string };
      return { token: decryptSecret(credential.secretCiphertext), owner: metadata.owner ?? null };
    } catch (error) {
      logger.warn({ err: error, userId }, "Failed to decrypt stored GitHub token");
    }
  }

  if (env.GITHUB_TOKEN) {
    return { token: env.GITHUB_TOKEN, owner: env.GITHUB_OWNER ?? null };
  }

  return null;
}

export class GitHubService {
  private readonly token: string;
  private readonly apiUrl: string;
  private readonly configuredOwner: string | null;

  constructor(options: GitHubClientOptions) {
    this.token = options.token;
    this.apiUrl = options.apiUrl ?? env.GITHUB_API_URL;
    this.configuredOwner = options.owner ?? null;
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    return withRetry(
      async () => {
        const response = await fetch(`${this.apiUrl}${path}`, {
          ...init,
          headers: {
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            Authorization: `Bearer ${this.token}`,
            "Content-Type": "application/json",
            ...(init.headers ?? {}),
          },
          signal: AbortSignal.timeout(45_000),
        });

        if (!response.ok) {
          const text = await response.text();
          const error = new IntegrationError("github", `GitHub ${path} failed (${response.status}): ${text.slice(0, 300)}`);
          if (isRetryableHttpStatus(response.status)) throw error;
          throw Object.assign(error, { __noRetry: true });
        }

        if (response.status === 204) return undefined as T;
        return (await response.json()) as T;
      },
      {
        attempts: 3,
        baseDelayMs: 800,
        label: `github:${path}`,
        shouldRetry: (error) => !(error as { __noRetry?: boolean }).__noRetry,
      },
    );
  }

  async getAuthenticatedLogin(): Promise<string> {
    const user = await this.request<{ login: string }>("/user");
    return user.login;
  }

  async verify(): Promise<{ ok: boolean; login?: string; message?: string }> {
    try {
      const login = await this.getAuthenticatedLogin();
      return { ok: true, login };
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : "Unknown error" };
    }
  }

  async createRepository(name: string, description: string, isPrivate = false): Promise<CreatedRepository> {
    const owner = this.configuredOwner;

    const path = owner ? `/orgs/${owner}/repos` : "/user/repos";
    let repo: { name: string; html_url: string; default_branch: string; owner: { login: string } };

    try {
      repo = await this.request(path, {
        method: "POST",
        body: JSON.stringify({
          name,
          description,
          private: isPrivate,
          auto_init: true,
          has_issues: false,
          has_projects: false,
          has_wiki: false,
        }),
      });
    } catch (error) {
      // Personal accounts reject the /orgs path; retry against the user route.
      if (owner) {
        repo = await this.request("/user/repos", {
          method: "POST",
          body: JSON.stringify({ name, description, private: isPrivate, auto_init: true }),
        });
      } else {
        throw error;
      }
    }

    return {
      owner: repo.owner.login,
      name: repo.name,
      htmlUrl: repo.html_url,
      defaultBranch: repo.default_branch || "main",
    };
  }

  /** Commits every file in a single tree so the repository has one clean commit. */
  async pushFiles(
    repo: CreatedRepository,
    files: GitHubFile[],
    commitMessage: string,
  ): Promise<{ commitSha: string }> {
    const base = `/repos/${repo.owner}/${repo.name}`;

    const ref = await this.request<{ object: { sha: string } }>(
      `${base}/git/ref/heads/${repo.defaultBranch}`,
    );
    const baseCommit = await this.request<{ tree: { sha: string } }>(
      `${base}/git/commits/${ref.object.sha}`,
    );

    const blobs = await Promise.all(
      files.map(async (file) => {
        const blob = await this.request<{ sha: string }>(`${base}/git/blobs`, {
          method: "POST",
          body: JSON.stringify({ content: Buffer.from(file.contents, "utf8").toString("base64"), encoding: "base64" }),
        });
        return { path: file.path, mode: "100644" as const, type: "blob" as const, sha: blob.sha };
      }),
    );

    const tree = await this.request<{ sha: string }>(`${base}/git/trees`, {
      method: "POST",
      body: JSON.stringify({ base_tree: baseCommit.tree.sha, tree: blobs }),
    });

    const commit = await this.request<{ sha: string }>(`${base}/git/commits`, {
      method: "POST",
      body: JSON.stringify({ message: commitMessage, tree: tree.sha, parents: [ref.object.sha] }),
    });

    await this.request(`${base}/git/refs/heads/${repo.defaultBranch}`, {
      method: "PATCH",
      body: JSON.stringify({ sha: commit.sha, force: false }),
    });

    logger.info({ repo: `${repo.owner}/${repo.name}`, files: files.length }, "Pushed demo files to GitHub");
    return { commitSha: commit.sha };
  }

  async deleteRepository(owner: string, name: string): Promise<void> {
    await this.request(`/repos/${owner}/${name}`, { method: "DELETE" });
  }
}

export async function getGitHubService(userId: string): Promise<GitHubService | null> {
  const credentials = await resolveGitHubToken(userId);
  if (!credentials) return null;
  return new GitHubService({ token: credentials.token, owner: credentials.owner });
}
