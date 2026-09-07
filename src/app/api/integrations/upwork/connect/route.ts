import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { apiHandler } from "@/lib/api";
import { requireApiUser } from "@/lib/session";
import { generateToken } from "@/lib/crypto";
import { buildAuthorizationUrl, isUpworkConfigured } from "@/services/upwork";
import { IntegrationError } from "@/lib/errors";
import { isProduction } from "@/lib/env";
import { OAUTH_STATE_COOKIE } from "@/services/upwork/state";

export const runtime = "nodejs";

/** Starts the official Upwork OAuth2 flow with a signed, single-use state value. */
export const GET = apiHandler(async (_request: NextRequest) => {
  const user = await requireApiUser();

  if (!isUpworkConfigured()) {
    throw new IntegrationError(
      "upwork",
      "Upwork OAuth is not configured on this instance. Ask an administrator to set the Upwork client credentials.",
    );
  }

  const state = `${user.id}.${generateToken(24)}`;
  const store = await cookies();

  store.set(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction(),
    path: "/",
    maxAge: 600,
  });

  return NextResponse.redirect(buildAuthorizationUrl(state));
});
