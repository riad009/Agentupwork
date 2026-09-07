import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiHandler, clientIdentifier, enforceRateLimit, jsonOk, parseJsonBody } from "@/lib/api";
import { generateToken, hashToken } from "@/lib/crypto";
import { forgotPasswordSchema } from "@/schemas/auth";
import { passwordResetEmail, sendNotificationEmail } from "@/services/email";
import { publicEnv } from "@/lib/env";
import { recordAudit } from "@/lib/audit";

export const runtime = "nodejs";

const EXPIRY_MINUTES = 30;

export const POST = apiHandler(async (request: NextRequest) => {
  await enforceRateLimit(request, { namespace: "forgot-password", limit: 5, windowSeconds: 900 });

  const { email } = await parseJsonBody(request, forgotPasswordSchema);
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: { id: true, email: true, isActive: true },
  });

  // Always answer the same way so the endpoint cannot enumerate accounts.
  if (user?.isActive) {
    const token = generateToken(32);

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + EXPIRY_MINUTES * 60_000),
      },
    });

    const resetUrl = `${publicEnv.appUrl}/reset-password?token=${token}`;
    const email_ = passwordResetEmail(resetUrl, EXPIRY_MINUTES);

    await sendNotificationEmail({
      userId: user.id,
      to: user.email,
      type: "SYSTEM",
      subject: email_.subject,
      html: email_.html,
      text: email_.text,
    });

    await recordAudit({
      userId: user.id,
      action: "auth.password_reset_requested",
      ip: clientIdentifier(request),
      userAgent: request.headers.get("user-agent"),
    });
  }

  return jsonOk({
    message: "If an account exists for that address, a reset link is on its way.",
  });
});
