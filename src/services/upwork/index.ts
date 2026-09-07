import "server-only";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { UpworkApiProvider } from "@/services/upwork/api-provider";
import { UpworkMockProvider } from "@/services/upwork/mock-provider";
import { getValidAccessToken } from "@/services/upwork/connection";
import type { UpworkProvider } from "@/services/upwork/types";

/**
 * Resolves the Upwork provider for a user.
 *
 * A connected account always uses the official API. When no account is
 * connected the sample-data provider is returned so the rest of the pipeline
 * remains exercisable; it can never submit proposals.
 */
export async function getUpworkProvider(userId: string): Promise<UpworkProvider> {
  if (env.UPWORK_PROVIDER === "mock") {
    return new UpworkMockProvider();
  }

  const credentials = await getValidAccessToken(userId);
  if (!credentials) {
    logger.debug({ userId }, "No Upwork connection; using sample data provider");
    return new UpworkMockProvider();
  }

  return new UpworkApiProvider(credentials.accessToken, credentials.organizationId);
}

export async function hasLiveUpworkConnection(userId: string): Promise<boolean> {
  if (env.UPWORK_PROVIDER === "mock") return false;
  const credentials = await getValidAccessToken(userId).catch(() => null);
  return Boolean(credentials);
}

export * from "@/services/upwork/types";
export { buildAuthorizationUrl, exchangeCodeForTokens, isUpworkConfigured } from "@/services/upwork/oauth";
export {
  disconnectUpwork,
  getValidAccessToken,
  saveConnection,
  updateConnectionProfile,
} from "@/services/upwork/connection";
