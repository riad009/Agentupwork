import "server-only";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { IntegrationError } from "@/lib/errors";
import { isRetryableHttpStatus, sleep, withRetry } from "@/lib/retry";
import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/crypto";

export interface VercelFile {
  path: string;
  contents: string;
}

export interface VercelDeploymentResult {
  id: string;
  url: string;
  status: "QUEUED" | "BUILDING" | "READY" | "ERROR" | "CANCELED";
  inspectorUrl: string | null;
  projectId: string | null;
  errorMessage?: string;
}

export async function resolveVercelToken(
  userId: string,
): Promise<{ token: string; teamId: string | null } | null> {
  const credential = await prisma.integrationCredential.findUnique({
    where: { userId_provider: { userId, provider: "VERCEL" } },
    select: { secretCiphertext: true, metadata: true, isActive: true },
  });

  if (credential?.isActive) {
    try {
      const metadata = (credential.metadata ?? {}) as { teamId?: string };
      return { token: decryptSecret(credential.secretCiphertext), teamId: metadata.teamId ?? null };
    } catch (error) {
      logger.warn({ err: error, userId }, "Failed to decrypt stored Vercel token");
    }
  }

  if (env.VERCEL_TOKEN) {
    return { token: env.VERCEL_TOKEN, teamId: env.VERCEL_TEAM_ID ?? null };
  }

  return null;
}

export class VercelService {
  constructor(
    private readonly token: string,
    private readonly teamId: string | null = null,
    private readonly apiUrl: string = env.VERCEL_API_URL,
  ) {}

  private url(path: string): string {
    const url = new URL(path, this.apiUrl);
    if (this.teamId) url.searchParams.set("teamId", this.teamId);
    return url.toString();
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    return withRetry(
      async () => {
        const response = await fetch(this.url(path), {
          ...init,
          headers: {
            Authorization: `Bearer ${this.token}`,
            "Content-Type": "application/json",
            ...(init.headers ?? {}),
          },
          signal: AbortSignal.timeout(60_000),
        });

        if (!response.ok) {
          const text = await response.text();
          const error = new IntegrationError("vercel", `Vercel ${path} failed (${response.status}): ${text.slice(0, 300)}`);
          if (isRetryableHttpStatus(response.status)) throw error;
          throw Object.assign(error, { __noRetry: true });
        }

        return (await response.json()) as T;
      },
      {
        attempts: 3,
        baseDelayMs: 1_000,
        label: `vercel:${path}`,
        shouldRetry: (error) => !(error as { __noRetry?: boolean }).__noRetry,
      },
    );
  }

  async verify(): Promise<{ ok: boolean; user?: string; message?: string }> {
    try {
      const result = await this.request<{ user?: { username?: string; email?: string } }>("/v2/user");
      return { ok: true, user: result.user?.username ?? result.user?.email };
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : "Unknown error" };
    }
  }

  /**
   * Creates a deployment straight from generated file contents. This avoids
   * requiring the Vercel↔GitHub integration to be installed on the account.
   */
  async createDeployment(
    projectName: string,
    files: VercelFile[],
  ): Promise<VercelDeploymentResult> {
    const payload = {
      name: projectName,
      target: "production",
      files: files.map((file) => ({
        file: file.path,
        data: Buffer.from(file.contents, "utf8").toString("base64"),
        encoding: "base64",
      })),
      projectSettings: {
        framework: "nextjs",
        buildCommand: null,
        installCommand: null,
        outputDirectory: null,
      },
    };

    const deployment = await this.request<{
      id: string;
      url: string;
      readyState?: string;
      inspectorUrl?: string;
      projectId?: string;
    }>("/v13/deployments", { method: "POST", body: JSON.stringify(payload) });

    logger.info({ deploymentId: deployment.id, projectName }, "Created Vercel deployment");

    return {
      id: deployment.id,
      url: deployment.url.startsWith("http") ? deployment.url : `https://${deployment.url}`,
      status: (deployment.readyState as VercelDeploymentResult["status"]) ?? "QUEUED",
      inspectorUrl: deployment.inspectorUrl ?? null,
      projectId: deployment.projectId ?? null,
    };
  }

  async getDeployment(deploymentId: string): Promise<VercelDeploymentResult> {
    const deployment = await this.request<{
      id: string;
      url: string;
      readyState: string;
      inspectorUrl?: string;
      projectId?: string;
      errorMessage?: string;
    }>(`/v13/deployments/${deploymentId}`);

    return {
      id: deployment.id,
      url: deployment.url.startsWith("http") ? deployment.url : `https://${deployment.url}`,
      status: (deployment.readyState as VercelDeploymentResult["status"]) ?? "QUEUED",
      inspectorUrl: deployment.inspectorUrl ?? null,
      projectId: deployment.projectId ?? null,
      errorMessage: deployment.errorMessage,
    };
  }

  async getBuildLogs(deploymentId: string): Promise<string> {
    try {
      const events = await this.request<{ text?: string; payload?: { text?: string } }[]>(
        `/v2/deployments/${deploymentId}/events?limit=200`,
      );
      return events
        .map((event) => event.text ?? event.payload?.text ?? "")
        .filter(Boolean)
        .join("\n")
        .slice(0, 20_000);
    } catch (error) {
      logger.debug({ err: error, deploymentId }, "Unable to read Vercel build logs");
      return "";
    }
  }

  /** Polls until the deployment settles or the timeout elapses. */
  async waitForDeployment(
    deploymentId: string,
    options: { timeoutMs?: number; intervalMs?: number } = {},
  ): Promise<VercelDeploymentResult> {
    const timeoutMs = options.timeoutMs ?? 8 * 60_000;
    const intervalMs = options.intervalMs ?? 5_000;
    const deadline = Date.now() + timeoutMs;

    let last = await this.getDeployment(deploymentId);

    while (Date.now() < deadline) {
      if (last.status === "READY" || last.status === "ERROR" || last.status === "CANCELED") return last;
      await sleep(intervalMs);
      last = await this.getDeployment(deploymentId);
    }

    return { ...last, status: "ERROR", errorMessage: "Timed out waiting for the Vercel deployment to finish." };
  }
}

export async function getVercelService(userId: string): Promise<VercelService | null> {
  const credentials = await resolveVercelToken(userId);
  if (!credentials) return null;
  return new VercelService(credentials.token, credentials.teamId);
}
