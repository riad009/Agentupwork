import { readFile } from "node:fs/promises";
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiHandler } from "@/lib/api";
import { requireApiUser } from "@/lib/session";
import { NotFoundError } from "@/lib/errors";
import { resolveStoredFile } from "@/lib/storage";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

/** Streams the generated brief. Ownership is checked before the file is read. */
export const GET = apiHandler<Context>(async (request: NextRequest, context) => {
  const user = await requireApiUser();
  const { id } = await context.params;

  const document = await prisma.proposalDocument.findFirst({
    where: { proposalId: id, proposal: { userId: user.id } },
    select: { filePath: true, status: true, title: true },
  });

  if (!document?.filePath || document.status !== "READY") {
    throw new NotFoundError("No generated brief is available for this proposal.");
  }

  const absolute = resolveStoredFile(document.filePath);
  const buffer = await readFile(absolute).catch(() => null);
  if (!buffer) throw new NotFoundError("The generated brief file is no longer available.");

  const disposition = new URL(request.url).searchParams.get("download") === "1" ? "attachment" : "inline";
  const fileName = `${document.title.replace(/[^a-z0-9]+/gi, "-").slice(0, 60)}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${disposition}; filename="${fileName}"`,
      "Cache-Control": "private, no-store",
    },
  });
});
