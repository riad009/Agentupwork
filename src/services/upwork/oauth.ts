import "server-only";
import { env } from "@/lib/env";
import { IntegrationError } from "@/lib/errors";
import { withRetry, isRetryableHttpStatus } from "@/lib/retry";
import { logger } from "@/lib/logger";

export interface UpworkTokenResponse {
  accessToken: string;
  refreshToken: string | null;
  tokenType: string;
  scope: string | null;
  expiresAt: Date | null;
}

export const UPWORK_SCOPES = ["public", "offline_access"] as const;

export function isUpworkConfigured(): boolean {
  return Boolean(env.UPWORK_CLIENT_ID && env.UPWORK_CLIENT_SECRET && env.UPWORK_REDIRECT_URI);
}

/** Builds the official Upwork OAuth2 authorization URL. */
export function buildAuthorizationUrl(state: string): string {
  if (!isUpworkConfigured()) {
    throw new IntegrationError(
      "upwork",
      "Upwork OAuth is not configured. Set UPWORK_CLIENT_ID, UPWORK_CLIENT_SECRET and UPWORK_REDIRECT_URI.",
    );
  }

  const url = new URL("/ab/account-security/oauth2/authorize", env.UPWORK_AUTH_BASE_URL);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", env.UPWORK_CLIENT_ID!);
  url.searchParams.set("redirect_uri", env.UPWORK_REDIRECT_URI!);
  url.searchParams.set("state", state);
  return url.toString();
}

async function requestToken(body: URLSearchParams): Promise<UpworkTokenResponse> {
  const tokenUrl = new URL("/api/v3/oauth2/token", env.UPWORK_AUTH_BASE_URL).toString();

  const response = await withRetry(
    async () => {
      const res = await fetch(tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
        signal: AbortSignal.timeout(20_000),
      });

      if (!res.ok) {
        const text = await res.text();
        const error = new IntegrationError("upwork", `Token request failed (${res.status}): ${text.slice(0, 400)}`);
        if (isRetryableHttpStatus(res.status)) throw error;
        throw Object.assign(error, { __noRetry: true });
      }

      return res.json() as Promise<Record<string, unknown>>;
    },
    {
      attempts: 3,
      label: "upwork:token",
      shouldRetry: (error) => !(error as { __noRetry?: boolean }).__noRetry,
    },
  );

  const accessToken = typeof response.access_token === "string" ? response.access_token : null;
  if (!accessToken) {
    throw new IntegrationError("upwork", "Upwork token response did not contain an access token.");
  }

  const expiresIn = typeof response.expires_in === "number" ? response.expires_in : null;

  return {
    accessToken,
    refreshToken: typeof response.refresh_token === "string" ? response.refresh_token : null,
    tokenType: typeof response.token_type === "string" ? response.token_type : "Bearer",
    scope: typeof response.scope === "string" ? response.scope : null,
    expiresAt: expiresIn ? new Date(Date.now() + expiresIn * 1000) : null,
  };
}

export async function exchangeCodeForTokens(code: string): Promise<UpworkTokenResponse> {
  logger.info("Exchanging Upwork authorization code for tokens");
  return requestToken(
    new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: env.UPWORK_CLIENT_ID!,
      client_secret: env.UPWORK_CLIENT_SECRET!,
      redirect_uri: env.UPWORK_REDIRECT_URI!,
    }),
  );
}

export async function refreshAccessToken(refreshToken: string): Promise<UpworkTokenResponse> {
  logger.info("Refreshing Upwork access token");
  return requestToken(
    new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: env.UPWORK_CLIENT_ID!,
      client_secret: env.UPWORK_CLIENT_SECRET!,
    }),
  );
}
