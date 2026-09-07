import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiHandler, clientIdentifier, enforceRateLimit, jsonOk, parseJsonBody } from "@/lib/api";
import { ConflictError, ForbiddenError } from "@/lib/errors";
import { hashPassword } from "@/lib/auth";
import { registerSchema } from "@/schemas/auth";
import { recordAudit } from "@/lib/audit";
import { env } from "@/lib/env";

export const runtime = "nodejs";

export const POST = apiHandler(async (request: NextRequest) => {
  await enforceRateLimit(request, { namespace: "register", limit: 5, windowSeconds: 600 });

  if (!env.ALLOW_REGISTRATION) {
    throw new ForbiddenError("Registration is disabled on this instance.");
  }

  const body = await parseJsonBody(request, registerSchema);
  const email = body.email.toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    throw new ConflictError("An account with that email already exists.");
  }

  const passwordHash = await hashPassword(body.password);

  // The first account to register becomes the administrator.
  const userCount = await prisma.user.count();

  const user = await prisma.user.create({
    data: {
      email,
      name: body.name,
      passwordHash,
      role: userCount === 0 ? "ADMIN" : "USER",
      preference: { create: {} },
      aiProfile: { create: {} },
    },
    select: { id: true, email: true, name: true, role: true },
  });

  await recordAudit({
    userId: user.id,
    action: "auth.register",
    resource: "user",
    resourceId: user.id,
    ip: clientIdentifier(request),
    userAgent: request.headers.get("user-agent"),
  });

  return jsonOk({ id: user.id, email: user.email, name: user.name, role: user.role }, { status: 201 });
});
