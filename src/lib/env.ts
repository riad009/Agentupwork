import { z } from "zod";

/**
 * Server-side environment. This module must never be imported from a client
 * component — every value here is a secret or an internal endpoint.
 */
const serverSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be at least 32 characters"),
  AUTH_URL: z.string().url().optional(),
  NEXTAUTH_URL: z.string().url().optional(),

  ENCRYPTION_KEY: z
    .string()
    .min(32, "ENCRYPTION_KEY must be a 32-byte value (base64 or 64 hex chars)"),

  APP_URL: z.string().url().default("http://localhost:3000"),

  REDIS_URL: z.string().default("redis://localhost:6379"),
  QUEUE_PREFIX: z.string().default("uajh"),

  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL: z.string().default("claude-sonnet-5"),
  ANTHROPIC_ANALYSIS_MODEL: z.string().default("claude-haiku-4-5-20251001"),
  ANTHROPIC_DEMO_MODEL: z.string().default("claude-sonnet-5"),

  UPWORK_CLIENT_ID: z.string().optional(),
  UPWORK_CLIENT_SECRET: z.string().optional(),
  UPWORK_REDIRECT_URI: z.string().optional(),
  UPWORK_API_BASE_URL: z.string().default("https://api.upwork.com"),
  UPWORK_AUTH_BASE_URL: z.string().default("https://www.upwork.com"),
  UPWORK_PROVIDER: z.enum(["api", "mock"]).default("mock"),
  UPWORK_WEBHOOK_SECRET: z.string().optional(),

  GITHUB_TOKEN: z.string().optional(),
  GITHUB_OWNER: z.string().optional(),
  GITHUB_API_URL: z.string().default("https://api.github.com"),

  VERCEL_TOKEN: z.string().optional(),
  VERCEL_TEAM_ID: z.string().optional(),
  VERCEL_API_URL: z.string().default("https://api.vercel.com"),

  EMAIL_PROVIDER: z.enum(["resend", "smtp", "console"]).default("console"),
  EMAIL_FROM: z.string().default("Upwork AI Job Hunter <noreply@example.com>"),
  RESEND_API_KEY: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_SECURE: z
    .string()
    .optional()
    .transform((v) => v === "true"),

  SENTRY_DSN: z.string().optional(),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),

  DEMO_WORKSPACE_DIR: z.string().default("./demo-workspace"),
  DEMO_LOCAL_VALIDATION: z
    .string()
    .default("false")
    .transform((v) => v === "true"),
  DEMO_VALIDATION_TIMEOUT_MS: z.coerce.number().int().positive().default(300_000),
  STORAGE_DIR: z.string().default("./storage"),
  PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH: z.string().optional(),

  RATE_LIMIT_WINDOW_SECONDS: z.coerce.number().int().positive().default(60),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(120),

  ALLOW_REGISTRATION: z
    .string()
    .default("true")
    .transform((v) => v !== "false"),
});

export type ServerEnv = z.infer<typeof serverSchema>;

let cached: ServerEnv | null = null;

function loadEnv(): ServerEnv {
  const parsed = serverSchema.safeParse(process.env);

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }

  return parsed.data;
}

/**
 * Validated server environment. Lazily parsed so that importing modules in a
 * build step (where secrets are absent) does not explode.
 */
export const env: ServerEnv = new Proxy({} as ServerEnv, {
  get(_target, prop: string) {
    if (!cached) cached = loadEnv();
    return cached[prop as keyof ServerEnv];
  },
  has(_target, prop: string) {
    if (!cached) cached = loadEnv();
    return prop in cached;
  },
});

export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

/** Public, build-time-safe values that are allowed to reach the browser. */
export const publicEnv = {
  appName: "Upwork AI Job Hunter",
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
};
