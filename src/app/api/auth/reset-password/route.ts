import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiHandler, clientIdentifier, enforceRateLimit, jsonOk, parseJsonBody } from "@/lib/api";
import { hashToken } from "@/lib/crypto";
import { hashPassword } from "@/lib/auth";
import { ValidationError } from "@/lib/errors";
import { resetPasswordSchema } from "@/schemas/auth";
import { recordAudit } from "@/lib/audit";

export const runtime = "nodejs";

export const POST = apiHandler(async (request: NextRequest) => {
  await enforceRateLimit(request, { namespace: "reset-password", limit: 10, windowSeconds: 900 });

  const body = await parseJsonBody(request, resetPasswordSchema);

  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(body.token) },
    select: { id: true, userId: true, expiresAt: true, usedAt: true },
  });

  if (!record || record.usedAt || record.expiresAt.getTime() < Date.now()) {
    throw new ValidationError("This reset link is invalid or has expired. Request a new one.");
  }

  const passwordHash = await hashPassword(body.password);

  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    // Any other outstanding reset links for this user are invalidated.
    prisma.passwordResetToken.deleteMany({
      where: { userId: record.userId, usedAt: null, id: { not: record.id } },
    }),
    prisma.session.deleteMany({ where: { userId: record.userId } }),
  ]);

  await recordAudit({
    userId: record.userId,
    action: "auth.password_reset_completed",
    ip: clientIdentifier(request),
    userAgent: request.headers.get("user-agent"),
  });

  return jsonOk({ message: "Your password has been updated. You can sign in now." });
});
