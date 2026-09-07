import type { NextRequest } from "next/server";
import { apiHandler, enforceRateLimit, jsonOk } from "@/lib/api";
import { requireApiUser } from "@/lib/session";
import { getUpworkProvider, updateConnectionProfile } from "@/services/upwork";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/** Refreshes the stored Upwork profile and Connects balance. */
export const POST = apiHandler(async (request: NextRequest) => {
  const user = await requireApiUser();
  await enforceRateLimit(request, { namespace: "upwork-sync", identifier: user.id, limit: 12, windowSeconds: 60 });

  const connection = await prisma.upworkConnection.findUnique({ where: { userId: user.id } });
  const provider = await getUpworkProvider(user.id);
  const profile = await provider.getProfile();

  if (connection) {
    await updateConnectionProfile(user.id, profile);
  }

  return jsonOk({
    profileName: profile.name,
    profileTitle: profile.title,
    connectsBalance: profile.connectsBalance,
    provider: provider.name,
    stored: Boolean(connection),
  });
});
