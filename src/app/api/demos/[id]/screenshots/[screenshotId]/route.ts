import { readFile } from "node:fs/promises";
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiHandler } from "@/lib/api";
import { requireApiUser } from "@/lib/session";
import { NotFoundError } from "@/lib/errors";
import { resolveStoredFile } from "@/lib/storage";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string; screenshotId: string }> };

/** Serves a captured screenshot to its owner only. */
export const GET = apiHandler<Context>(async (_request: NextRequest, context) => {
  const user = await requireApiUser();
  const { id, screenshotId } = await context.params;

  const screenshot = await prisma.demoScreenshot.findFirst({
    where: { id: screenshotId, demoId: id, demo: { userId: user.id } },
    select: { path: true },
  });

  if (!screenshot) throw new NotFoundError("Screenshot not found.");

  const absolute = resolveStoredFile(screenshot.path);
  const buffer = await readFile(absolute).catch(() => null);
  if (!buffer) throw new NotFoundError("Screenshot file is no longer available.");

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "private, max-age=3600",
    },
  });
});
