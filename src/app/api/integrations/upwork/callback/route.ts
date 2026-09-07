import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { apiHandler } from "@/lib/api";
import { requireApiUser } from "@/lib/session";
import { safeEqual } from "@/lib/crypto";
import { publicEnv } from "@/lib/env";
import { logger } from "@/lib/logger";
import { recordAudit } from "@/lib/audit";
import {
  exchangeCodeForTokens,
  getUpworkProvider,
  saveConnection,
  updateConnectionProfile,
} from "@/services/upwork";
import { OAUTH_STATE_COOKIE } from "@/services/upwork/state";

export const runtime = "nodejs";

function redirectTo(status: string, message?: string): NextResponse {
  const url = new URL("/settings/upwork", publicEnv.appUrl);
  url.searchParams.set("status", status);
  if (message) url.searchParams.set("message", message.slice(0, 200));
  return NextResponse.redirect(url);
}

export const GET = apiHandler(async (request: NextRequest) => {
  const user = await requireApiUser();
  const params = new URL(request.url).searchParams;

  const error = params.get("error");
  if (error) return redirectTo("error", params.get("error_description") ?? error);

  const code = params.get("code");
  const state = params.get("state");
  const store = await cookies();
  const expectedState = store.get(OAUTH_STATE_COOKIE)?.value;

  store.delete(OAUTH_STATE_COOKIE);

  if (!code || !state || !expectedState || !safeEqual(state, expectedState)) {
    return redirectTo("error", "The authorization response could not be verified. Please try again.");
  }

  if (!state.startsWith(`${user.id}.`)) {
    return redirectTo("error", "This authorization belongs to a different account.");
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    await saveConnection(user.id, tokens);

    // Populate the profile immediately so the settings page has something real.
    const provider = await getUpworkProvider(user.id);
    const profile = await provider.getProfile();
    await updateConnectionProfile(user.id, profile);

    await recordAudit({
      userId: user.id,
      action: "integration.upwork.connected",
      resource: "upwork_connection",
      resourceId: user.id,
    });

    return redirectTo("connected");
  } catch (caught) {
    logger.error({ err: caught, userId: user.id }, "Upwork OAuth callback failed");
    await recordAudit({
      userId: user.id,
      action: "integration.upwork.connect_failed",
      success: false,
    });
    return redirectTo("error", caught instanceof Error ? caught.message : "Connection failed.");
  }
});
