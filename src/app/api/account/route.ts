import { z } from "zod";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiHandler, enforceRateLimit, jsonOk, parseJsonBody } from "@/lib/api";
import { requireApiUser } from "@/lib/session";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { passwordSchema } from "@/schemas/auth";
import { ValidationError } from "@/lib/errors";
import { recordAudit } from "@/lib/audit";

export const runtime = "nodejs";

const profileSchema = z.object({
  name: z.string().trim().min(2).max(80),
});

const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "New passwords do not match",
    path: ["confirmPassword"],
  });

export const PATCH = apiHandler(async (request: NextRequest) => {
  const user = await requireApiUser();
  const body = await parseJsonBody(request, profileSchema);

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { name: body.name },
    select: { id: true, name: true, email: true },
  });

  return jsonOk({ user: updated });
});

export const PUT = apiHandler(async (request: NextRequest) => {
  const user = await requireApiUser();
  await enforceRateLimit(request, {
    namespace: "password-change",
    identifier: user.id,
    limit: 5,
    windowSeconds: 900,
  });

  const body = await parseJsonBody(request, passwordChangeSchema);

  const record = await prisma.user.findUniqueOrThrow({
    where: { id: user.id },
    select: { passwordHash: true },
  });

  if (!record.passwordHash || !(await verifyPassword(body.currentPassword, record.passwordHash))) {
    throw new ValidationError("Your current password is not correct.");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(body.newPassword) },
  });

  await recordAudit({ userId: user.id, action: "auth.password_changed" });

  return jsonOk({ updated: true });
});
