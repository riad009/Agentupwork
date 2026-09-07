import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiHandler, jsonOk } from "@/lib/api";
import { requireApiUser } from "@/lib/session";
import { recordAudit } from "@/lib/audit";
import { disconnectUpwork, getUpworkProvider, isUpworkConfigured } from "@/services/upwork";

export const runtime = "nodejs";

/** Connection status. Tokens are never included in the response. */
export const GET = apiHandler(async (_request: NextRequest) => {
  const user = await requireApiUser();

  const connection = await prisma.upworkConnection.findUnique({
    where: { userId: user.id },
    select: {
      connectedAt: true,
      lastSyncedAt: true,
      expiresAt: true,
      isActive: true,
      scope: true,
      upworkUserId: true,
      profileName: true,
      profileTitle: true,
      profilePictureUrl: true,
      countryCode: true,
      connectsBalance: true,
      connectsUpdatedAt: true,
    },
  });

  const provider = await getUpworkProvider(user.id);

  return jsonOk({
    configured: isUpworkConfigured(),
    connected: Boolean(connection?.isActive),
    provider: provider.name,
    capabilities: provider.capabilities(),
    connection,
  });
});

export const DELETE = apiHandler(async (_request: NextRequest) => {
  const user = await requireApiUser();
  await disconnectUpwork(user.id);
  await recordAudit({ userId: user.id, action: "integration.upwork.disconnected" });
  return jsonOk({ disconnected: true });
});
