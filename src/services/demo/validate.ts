import "server-only";
import { spawn } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import type { GeneratedFile } from "@/services/templates/scaffold";

export interface ValidationIssue {
  path: string;
  message: string;
}

export interface ValidationResult {
  ok: boolean;
  issues: ValidationIssue[];
  /** Combined tool output, used to drive the AI repair loop. */
  output: string;
}

const ALLOWED_IMPORTS = [/^@\/components\/kit$/, /^lucide-react$/, /^react$/, /^next\/link$/];

const FORBIDDEN_PATTERNS: { pattern: RegExp; message: string }[] = [
  { pattern: /```/, message: "File contains a markdown code fence." },
  { pattern: /\buseEffect\s*\(/, message: "useEffect is not allowed in demo screens." },
  { pattern: /\bfetch\s*\(/, message: "Network calls are not allowed in demo screens." },
  { pattern: /process\.env/, message: "Environment access is not allowed in demo screens." },
  { pattern: /require\s*\(/, message: "CommonJS require is not allowed." },
  { pattern: /from\s+["']fs["']|from\s+["']node:/, message: "Node built-ins are not allowed." },
];

/**
 * Cheap structural validation that runs before any build. It catches the
 * failure modes generated screens actually hit, without spending a minute on a
 * toolchain run.
 */
export function validateGeneratedFiles(files: GeneratedFile[]): ValidationResult {
  const issues: ValidationIssue[] = [];

  for (const file of files) {
    const { path: filePath, contents } = file;

    if (!filePath.startsWith("src/app/(demo)/") || !filePath.endsWith("/page.tsx")) {
      issues.push({ path: filePath, message: 'Generated screens must live at "src/app/(demo)/<route>/page.tsx".' });
      continue;
    }

    if (!/export\s+default\s+function\s+\w+/.test(contents)) {
      issues.push({ path: filePath, message: "File must export a default function component." });
    }

    for (const { pattern, message } of FORBIDDEN_PATTERNS) {
      if (pattern.test(contents)) issues.push({ path: filePath, message });
    }

    for (const match of contents.matchAll(/from\s+["']([^"']+)["']/g)) {
      const source = match[1]!;
      if (!ALLOWED_IMPORTS.some((allowed) => allowed.test(source))) {
        issues.push({
          path: filePath,
          message: `Import from "${source}" is not permitted. Only "@/components/kit", "lucide-react", "next/link" and type-only React imports are allowed.`,
        });
      }
    }

    const openBraces = (contents.match(/\{/g) ?? []).length;
    const closeBraces = (contents.match(/\}/g) ?? []).length;
    if (openBraces !== closeBraces) {
      issues.push({ path: filePath, message: "Unbalanced braces — the file is not syntactically complete." });
    }
  }

  return {
    ok: issues.length === 0,
    issues,
    output: issues.map((issue) => `${issue.path}: ${issue.message}`).join("\n"),
  };
}

function run(
  command: string,
  args: string[],
  cwd: string,
  timeoutMs: number,
): Promise<{ code: number; output: string }> {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd,
      env: { ...process.env, CI: "1", NEXT_TELEMETRY_DISABLED: "1" },
      stdio: ["ignore", "pipe", "pipe"],
    });

    let output = "";
    const append = (chunk: Buffer) => {
      output += chunk.toString();
      if (output.length > 60_000) output = output.slice(-60_000);
    };

    child.stdout.on("data", append);
    child.stderr.on("data", append);

    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      output += `\n[timed out after ${timeoutMs}ms]`;
    }, timeoutMs);

    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code: code ?? 1, output });
    });

    child.on("error", (error) => {
      clearTimeout(timer);
      resolve({ code: 1, output: `${output}\n${error.message}` });
    });
  });
}

/**
 * Optional full toolchain validation: installs dependencies, type-checks and
 * builds the generated demo in a scratch directory.
 *
 * Disabled by default because Vercel performs the authoritative build and its
 * errors feed the same repair loop; enable DEMO_LOCAL_VALIDATION to catch
 * failures before a repository is created.
 */
export async function validateWithToolchain(files: GeneratedFile[]): Promise<ValidationResult> {
  if (!env.DEMO_LOCAL_VALIDATION) {
    return { ok: true, issues: [], output: "" };
  }

  const workspaceRoot = path.resolve(process.cwd(), env.DEMO_WORKSPACE_DIR);
  await mkdir(workspaceRoot, { recursive: true });
  const workspace = await mkdtemp(path.join(workspaceRoot, "demo-"));

  try {
    for (const file of files) {
      const target = path.join(workspace, file.path);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, file.contents, "utf8");
    }

    const timeout = env.DEMO_VALIDATION_TIMEOUT_MS;

    const install = await run("npm", ["install", "--no-audit", "--no-fund"], workspace, timeout);
    if (install.code !== 0) {
      logger.warn({ output: install.output.slice(-1_000) }, "Demo dependency install failed");
      return {
        ok: false,
        issues: [{ path: "package.json", message: "Dependency installation failed." }],
        output: install.output.slice(-8_000),
      };
    }

    const typecheck = await run("npx", ["tsc", "--noEmit"], workspace, timeout);
    if (typecheck.code !== 0) {
      return {
        ok: false,
        issues: [{ path: "typescript", message: "Type checking failed." }],
        output: typecheck.output.slice(-8_000),
      };
    }

    const build = await run("npx", ["next", "build"], workspace, timeout);
    if (build.code !== 0) {
      return {
        ok: false,
        issues: [{ path: "build", message: "Production build failed." }],
        output: build.output.slice(-8_000),
      };
    }

    return { ok: true, issues: [], output: build.output.slice(-2_000) };
  } finally {
    await rm(workspace, { recursive: true, force: true }).catch(() => undefined);
  }
}
