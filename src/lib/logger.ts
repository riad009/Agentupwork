import pino, { type Logger } from "pino";

const level = process.env.LOG_LEVEL ?? (process.env.NODE_ENV === "production" ? "info" : "debug");

const redactPaths = [
  "req.headers.authorization",
  "req.headers.cookie",
  "headers.authorization",
  "headers.cookie",
  "accessToken",
  "refreshToken",
  "password",
  "passwordHash",
  "apiKey",
  "token",
  "secret",
  "*.accessToken",
  "*.refreshToken",
  "*.apiKey",
  "*.password",
];

export const logger: Logger = pino({
  level,
  base: { service: "upwork-ai-job-hunter" },
  redact: { paths: redactPaths, censor: "[redacted]" },
  timestamp: pino.stdTimeFunctions.isoTime,
});

export function childLogger(bindings: Record<string, unknown>): Logger {
  return logger.child(bindings);
}
