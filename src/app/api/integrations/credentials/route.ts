import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiHandler, jsonOk, parseJsonBody } from "@/lib/api";
import { requireApiUser } from "@/lib/session";
import { encryptSecret, maskSecret } from "@/lib/crypto";
import { recordAudit } from "@/lib/audit";
import { credentialSchema, integrationProviderSchema } from "@/schemas/integrations";
import { verifyClaudeKey } from "@/services/claude";
import { GitHubService } from "@/services/github";
import { VercelService } from "@/services/vercel";
import { ValidationError } from "@/lib/errors";
import { z } from "zod";

export const runtime = "nodejs";

/** Lists configured integrations. Secrets are never returned, only masked hints. */
export const GET = apiHandler(async (_request: NextRequest) => {
  const user = await requireApiUser();

  const credentials = await prisma.integrationCredential.findMany({
    where: { userId: user.id },
    select: {
      provider: true,
      label: true,
      metadata: true,
      lastVerifiedAt: true,
      isActive: true,
      updatedAt: true,
    },
  });

  return jsonOk({ credentials });
});

export const PUT = apiHandler(async (request: NextRequest) => {
  const user = await requireApiUser();
  const body = await parseJsonBody(request, credentialSchema);

  let secret: string;
  let metadata: Record<string, unknown> = {};
  let label: string | null = null;
  let verification: { ok: boolean; message?: string; detail?: string } = { ok: true };

  switch (body.provider) {
    case "CLAUDE": {
      secret = body.apiKey;
      const result = await verifyClaudeKey(secret);
      verification = { ok: result.ok, message: result.message, detail: result.model };
      label = maskSecret(secret);
      break;
    }
    case "GITHUB": {
      secret = body.token;
      const service = new GitHubService({ token: secret, owner: body.owner ?? null });
      const result = await service.verify();
      verification = { ok: result.ok, message: result.message, detail: result.login };
      metadata = { owner: body.owner ?? result.login ?? null };
      label = result.login ?? maskSecret(secret);
      break;
    }
    case "VERCEL": {
      secret = body.token;
      const service = new VercelService(secret, body.teamId ?? null);
      const result = await service.verify();
      verification = { ok: result.ok, message: result.message, detail: result.user };
      metadata = { teamId: body.teamId ?? null };
      label = result.user ?? maskSecret(secret);
      break;
    }
    case "EMAIL": {
      secret = body.secret;
      metadata = {
        provider: body.transport,
        from: body.from,
        host: body.host ?? null,
        port: body.port ?? null,
        user: body.user ?? null,
        secure: body.secure ?? false,
      };
      label = body.from;
      break;
    }
  }

  if (!verification.ok) {
    throw new ValidationError(
      `Those credentials were rejected by ${body.provider.toLowerCase()}: ${verification.message ?? "verification failed"}`,
    );
  }

  await prisma.integrationCredential.upsert({
    where: { userId_provider: { userId: user.id, provider: body.provider } },
    create: {
      userId: user.id,
      provider: body.provider,
      secretCiphertext: encryptSecret(secret),
      metadata: metadata as never,
      label,
      lastVerifiedAt: new Date(),
      isActive: true,
    },
    update: {
      secretCiphertext: encryptSecret(secret),
      metadata: metadata as never,
      label,
      lastVerifiedAt: new Date(),
      isActive: true,
    },
  });

  await recordAudit({
    userId: user.id,
    action: "integration.credential.saved",
    resource: "integration",
    resourceId: body.provider,
  });

  return jsonOk({ provider: body.provider, verified: true, detail: verification.detail ?? null });
});

export const DELETE = apiHandler(async (request: NextRequest) => {
  const user = await requireApiUser();
  const provider = integrationProviderSchema.parse(
    z.string().parse(new URL(request.url).searchParams.get("provider") ?? ""),
  );

  await prisma.integrationCredential.deleteMany({ where: { userId: user.id, provider } });
  await recordAudit({
    userId: user.id,
    action: "integration.credential.removed",
    resource: "integration",
    resourceId: provider,
  });

  return jsonOk({ removed: true });
});
