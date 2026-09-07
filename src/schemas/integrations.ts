import { z } from "zod";

export const integrationProviderSchema = z.enum(["CLAUDE", "GITHUB", "VERCEL", "EMAIL"]);

export const claudeCredentialSchema = z.object({
  provider: z.literal("CLAUDE"),
  apiKey: z.string().trim().min(20, "Enter a valid Anthropic API key").max(300),
});

export const githubCredentialSchema = z.object({
  provider: z.literal("GITHUB"),
  token: z.string().trim().min(20, "Enter a valid GitHub token").max(300),
  owner: z.string().trim().max(60).nullable().optional(),
});

export const vercelCredentialSchema = z.object({
  provider: z.literal("VERCEL"),
  token: z.string().trim().min(20, "Enter a valid Vercel token").max(300),
  teamId: z.string().trim().max(80).nullable().optional(),
});

export const emailCredentialSchema = z.object({
  provider: z.literal("EMAIL"),
  transport: z.enum(["resend", "smtp"]),
  secret: z.string().trim().min(6, "Enter the API key or SMTP password").max(300),
  from: z.string().trim().max(200),
  host: z.string().trim().max(200).nullable().optional(),
  port: z.number().int().min(1).max(65_535).nullable().optional(),
  user: z.string().trim().max(200).nullable().optional(),
  secure: z.boolean().optional(),
});

export const credentialSchema = z.discriminatedUnion("provider", [
  claudeCredentialSchema,
  githubCredentialSchema,
  vercelCredentialSchema,
  emailCredentialSchema,
]);

export type CredentialInput = z.infer<typeof credentialSchema>;
