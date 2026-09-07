import "server-only";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { logger } from "@/lib/logger";
import { launchBrowser } from "@/services/browser";
import { resolveStoredFile, storagePath } from "@/lib/storage";
import { renderBriefHtml, type BriefRenderInput, type BriefScreenshot } from "@/services/pdf/template";

export interface RenderedDocument {
  filePath: string;
  pageCount: number;
}

const FOOTER_TEMPLATE = `
  <div style="width:100%;font-size:8px;color:#94a3b8;font-family:Helvetica,Arial,sans-serif;padding:0 20mm;display:flex;justify-content:space-between;">
    <span class="title"></span>
    <span><span class="pageNumber"></span> / <span class="totalPages"></span></span>
  </div>`;

const HEADER_TEMPLATE = `<div style="font-size:0;height:0;"></div>`;

/** Reads a stored screenshot and inlines it so the PDF is fully self-contained. */
export async function toDataUri(relativePath: string, label: string): Promise<BriefScreenshot | null> {
  try {
    const absolute = resolveStoredFile(relativePath);
    const buffer = await readFile(absolute);
    return { label, dataUri: `data:image/png;base64,${buffer.toString("base64")}` };
  } catch (error) {
    logger.warn({ err: error, relativePath }, "Unable to inline screenshot into the PDF");
    return null;
  }
}

/**
 * Renders the client project brief to a designed PDF.
 *
 * Returns null when no browser is available so the pipeline keeps the proposal
 * and demo even if the document cannot be produced.
 */
export async function renderProjectBriefPdf(
  input: BriefRenderInput,
  proposalId: string,
): Promise<RenderedDocument | null> {
  const browser = await launchBrowser();
  if (!browser) {
    logger.warn({ proposalId }, "Skipping PDF generation: no Chromium binary available");
    return null;
  }

  const outputDir = storagePath("documents");
  await mkdir(outputDir, { recursive: true });
  const filePath = path.join(outputDir, `${proposalId}.pdf`);

  try {
    const context = await browser.newContext({ viewport: { width: 1240, height: 1754 } });
    const page = await context.newPage();

    await page.setContent(renderBriefHtml(input), { waitUntil: "networkidle", timeout: 60_000 });

    const buffer = await page.pdf({
      format: "A4",
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: HEADER_TEMPLATE,
      footerTemplate: FOOTER_TEMPLATE,
      margin: { top: "0mm", bottom: "12mm", left: "0mm", right: "0mm" },
    });

    await writeFile(filePath, buffer);
    await context.close();

    // The PDF page count is read back from the trailer rather than guessed.
    const pageCount = (buffer.toString("latin1").match(/\/Type\s*\/Page[^s]/g) ?? []).length || 1;

    logger.info({ proposalId, pageCount }, "Rendered client project brief PDF");
    return { filePath: path.relative(process.cwd(), filePath), pageCount };
  } catch (error) {
    logger.error({ err: error, proposalId }, "Failed to render the project brief PDF");
    return null;
  } finally {
    await browser.close();
  }
}

export { renderBriefHtml } from "@/services/pdf/template";
export type { BriefRenderInput, BriefScreenshot } from "@/services/pdf/template";
