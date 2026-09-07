import type { Metadata } from "next";
import { UpworkPanel } from "@/components/settings/upwork-panel";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import { getUpworkProvider, isUpworkConfigured } from "@/services/upwork";

export const metadata: Metadata = { title: "Upwork integration" };
export const dynamic = "force-dynamic";

export default async function UpworkSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; message?: string }>;
}) {
  const user = await requireSessionUser();
  const params = await searchParams;

  const [connection, provider] = await Promise.all([
    prisma.upworkConnection.findUnique({
      where: { userId: user.id },
      select: {
        connectedAt: true,
        lastSyncedAt: true,
        expiresAt: true,
        scope: true,
        isActive: true,
        upworkUserId: true,
        profileName: true,
        profileTitle: true,
        countryCode: true,
        connectsBalance: true,
        connectsUpdatedAt: true,
      },
    }),
    getUpworkProvider(user.id),
  ]);

  return (
    <UpworkPanel
      configured={isUpworkConfigured()}
      connected={Boolean(connection?.isActive)}
      providerName={provider.name}
      capabilities={provider.capabilities()}
      connection={connection ? { ...connection } : null}
      statusKind={params.status ?? null}
      statusMessage={params.message ?? null}
    />
  );
}
