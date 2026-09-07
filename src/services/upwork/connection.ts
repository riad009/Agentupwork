import "server-only";
import type { UpworkConnection } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { logger } from "@/lib/logger";
import { IntegrationError } from "@/lib/errors";
import { refreshAccessToken, type UpworkTokenResponse } from "@/services/upwork/oauth";

const REFRESH_MARGIN_MS = 120_000;

export async function saveConnection(
  userId: string,
  tokens: UpworkTokenResponse,
): Promise<UpworkConnection> {
  const data = {
    accessTokenCiphertext: encryptSecret(tokens.accessToken),
    refreshTokenCiphertext: tokens.refreshToken ? encryptSecret(tokens.refreshToken) : null,
    tokenType: tokens.tokenType,
    scope: tokens.scope,
    expiresAt: tokens.expiresAt,
    isActive: true,
    lastRefreshedAt: new Date(),
  };

  return prisma.upworkConnection.upsert({
    where: { userId },
    create: { userId, connectedAt: new Date(), ...data },
    update: data,
  });
}

export async function updateConnectionProfile(
  userId: string,
  profile: {
    upworkUserId: string | null;
    organizationId: string | null;
    name: string | null;
    title: string | null;
    pictureUrl: string | null;
    countryCode: string | null;
    connectsBalance: number | null;
    raw: unknown;
  },
): Promise<void> {
  await prisma.upworkConnection.update({
    where: { userId },
    data: {
      upworkUserId: profile.upworkUserId,
      upworkOrgId: profile.organizationId,
      profileName: profile.name,
      profileTitle: profile.title,
      profilePictureUrl: profile.pictureUrl,
      countryCode: profile.countryCode,
      connectsBalance: profile.connectsBalance,
      connectsUpdatedAt: profile.connectsBalance !== null ? new Date() : undefined,
      rawProfile: profile.raw as never,
      lastSyncedAt: new Date(),
    },
  });
}

/**
 * Returns a usable access token, transparently refreshing it when it is close
 * to expiry. Returns null when the user has not connected Upwork.
 */
export async function getValidAccessToken(
  userId: string,
): Promise<{ accessToken: string; organizationId: string | null } | null> {
  const connection = await prisma.upworkConnection.findUnique({ where: { userId } });
  if (!connection || !connection.isActive) return null;

  const expiresSoon =
    connection.expiresAt !== null && connection.expiresAt.getTime() - Date.now() < REFRESH_MARGIN_MS;

  if (!expiresSoon) {
    try {
      return {
        accessToken: decryptSecret(connection.accessTokenCiphertext),
        organizationId: connection.upworkOrgId,
      };
    } catch (error) {
      logger.error({ err: error, userId }, "Stored Upwork access token could not be decrypted");
      throw new IntegrationError("upwork", "Stored Upwork credentials are unreadable. Please reconnect.");
    }
  }

  if (!connection.refreshTokenCiphertext) {
    await prisma.upworkConnection.update({ where: { userId }, data: { isActive: false } });
    throw new IntegrationError("upwork", "Upwork session expired and no refresh token is stored. Please reconnect.");
  }

  const refreshToken = decryptSecret(connection.refreshTokenCiphertext);
  const refreshed = await refreshAccessToken(refreshToken);
  const updated = await saveConnection(userId, refreshed);

  return {
    accessToken: decryptSecret(updated.accessTokenCiphertext),
    organizationId: updated.upworkOrgId,
  };
}

export async function disconnectUpwork(userId: string): Promise<void> {
  await prisma.upworkConnection.deleteMany({ where: { userId } });
}
