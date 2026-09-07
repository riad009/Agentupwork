import "server-only";
import nodemailer from "nodemailer";
import { Resend } from "resend";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/crypto";
import type { EmailMessage, EmailProvider, EmailResult } from "@/services/email/types";

class ResendProvider implements EmailProvider {
  readonly name = "resend";

  constructor(private readonly apiKey: string, private readonly from: string) {}

  async send(message: EmailMessage): Promise<EmailResult> {
    try {
      const client = new Resend(this.apiKey);
      const result = await client.emails.send({
        from: this.from,
        to: message.to,
        subject: message.subject,
        html: message.html,
        text: message.text,
        replyTo: message.replyTo,
      });

      if (result.error) return { ok: false, message: result.error.message };
      return { ok: true, id: result.data?.id };
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : "Unknown Resend error" };
    }
  }
}

class SmtpProvider implements EmailProvider {
  readonly name = "smtp";

  constructor(
    private readonly config: { host: string; port: number; user?: string; password?: string; secure: boolean },
    private readonly from: string,
  ) {}

  async send(message: EmailMessage): Promise<EmailResult> {
    try {
      const transport = nodemailer.createTransport({
        host: this.config.host,
        port: this.config.port,
        secure: this.config.secure,
        auth: this.config.user ? { user: this.config.user, pass: this.config.password } : undefined,
      });

      const info = await transport.sendMail({
        from: this.from,
        to: message.to,
        subject: message.subject,
        html: message.html,
        text: message.text,
        replyTo: message.replyTo,
      });

      return { ok: true, id: info.messageId };
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : "Unknown SMTP error" };
    }
  }
}

/** Development fallback: logs the message instead of delivering it. */
class ConsoleProvider implements EmailProvider {
  readonly name = "console";

  async send(message: EmailMessage): Promise<EmailResult> {
    logger.info(
      { to: message.to, subject: message.subject, preview: message.text.slice(0, 400) },
      "Email delivery is not configured — logging message instead",
    );
    return { ok: true, id: `console-${Date.now()}` };
  }
}

interface UserEmailConfig {
  provider?: "resend" | "smtp" | "console";
  from?: string;
  host?: string;
  port?: number;
  user?: string;
  secure?: boolean;
}

/**
 * Resolves the email provider, preferring the user's own configuration and
 * falling back to platform environment settings.
 */
export async function getEmailProvider(userId?: string): Promise<EmailProvider> {
  if (userId) {
    const credential = await prisma.integrationCredential.findUnique({
      where: { userId_provider: { userId, provider: "EMAIL" } },
      select: { secretCiphertext: true, metadata: true, isActive: true },
    });

    if (credential?.isActive) {
      try {
        const secret = decryptSecret(credential.secretCiphertext);
        const metadata = (credential.metadata ?? {}) as UserEmailConfig;
        const from = metadata.from ?? env.EMAIL_FROM;

        if (metadata.provider === "resend") return new ResendProvider(secret, from);
        if (metadata.provider === "smtp" && metadata.host) {
          return new SmtpProvider(
            {
              host: metadata.host,
              port: metadata.port ?? 587,
              user: metadata.user,
              password: secret,
              secure: metadata.secure ?? false,
            },
            from,
          );
        }
      } catch (error) {
        logger.warn({ err: error, userId }, "Failed to load user email configuration");
      }
    }
  }

  if (env.EMAIL_PROVIDER === "resend" && env.RESEND_API_KEY) {
    return new ResendProvider(env.RESEND_API_KEY, env.EMAIL_FROM);
  }

  if (env.EMAIL_PROVIDER === "smtp" && env.SMTP_HOST) {
    return new SmtpProvider(
      {
        host: env.SMTP_HOST,
        port: env.SMTP_PORT ?? 587,
        user: env.SMTP_USER,
        password: env.SMTP_PASSWORD,
        secure: env.SMTP_SECURE ?? false,
      },
      env.EMAIL_FROM,
    );
  }

  return new ConsoleProvider();
}

export interface SendNotificationInput {
  userId: string;
  to: string;
  type: "PROPOSALS_READY" | "AUTOMATION_FAILED" | "DEMO_READY" | "SUBMISSION_RESULT" | "SYSTEM";
  subject: string;
  html: string;
  text: string;
  data?: Record<string, unknown>;
}

/** Sends an email and records it as a Notification row for the in-app feed. */
export async function sendNotificationEmail(input: SendNotificationInput): Promise<EmailResult> {
  const notification = await prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      subject: input.subject,
      body: input.text,
      data: (input.data ?? {}) as never,
      channel: "email",
      status: "PENDING",
    },
  });

  const provider = await getEmailProvider(input.userId);
  const result = await provider.send({
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
  });

  await prisma.notification.update({
    where: { id: notification.id },
    data: {
      status: result.ok ? "SENT" : "FAILED",
      sentAt: result.ok ? new Date() : null,
      errorMessage: result.ok ? null : (result.message ?? "Unknown delivery error"),
    },
  });

  if (!result.ok) {
    logger.warn({ userId: input.userId, message: result.message }, "Email delivery failed");
  }

  return result;
}

export type { EmailMessage, EmailProvider, EmailResult } from "@/services/email/types";
export * from "@/services/email/templates";
