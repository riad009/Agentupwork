import "server-only";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { logger } from "@/lib/logger";
import { launchBrowser } from "@/services/browser";
import { storagePath } from "@/lib/storage";

export interface ScreenshotTarget {
  label: string;
  routePath: string;
  viewport?: "desktop" | "mobile";
}

export interface CapturedScreenshot {
  label: string;
  routePath: string;
  path: string;
  width: number;
  height: number;
  viewport: "desktop" | "mobile";
  order: number;
}

const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 414, height: 896 };

/**
 * Captures a handful of screenshots of a deployed demo. Never captures every
 * page: the caller selects the screens that best communicate the solution.
 */
export async function captureDemoScreenshots(
  baseUrl: string,
  targets: ScreenshotTarget[],
  demoId: string,
  maxScreenshots: number,
): Promise<CapturedScreenshot[]> {
  const selected = targets.slice(0, Math.max(1, Math.min(maxScreenshots, 6)));
  const browser = await launchBrowser();
  if (!browser) return [];

  const outputDir = storagePath("demos", demoId);
  await mkdir(outputDir, { recursive: true });

  const captured: CapturedScreenshot[] = [];

  try {
    for (const [index, target] of selected.entries()) {
      const viewport = target.viewport ?? "desktop";
      const size = viewport === "mobile" ? MOBILE : DESKTOP;
      const context = await browser.newContext({
        viewport: size,
        deviceScaleFactor: 2,
        colorScheme: "light",
      });
      const page = await context.newPage();

      try {
        const url = new URL(target.routePath, baseUrl).toString();
        await page.goto(url, { waitUntil: "networkidle", timeout: 45_000 });
        await page.waitForTimeout(600);

        const fileName = `${String(index + 1).padStart(2, "0")}-${viewport}-${target.routePath
          .replace(/[^a-z0-9]+/gi, "-")
          .replace(/^-|-$/g, "") || "home"}.png`;
        const filePath = path.join(outputDir, fileName);

        const buffer = await page.screenshot({ type: "png", fullPage: false });
        await writeFile(filePath, buffer);

        captured.push({
          label: target.label,
          routePath: target.routePath,
          path: path.relative(process.cwd(), filePath),
          width: size.width,
          height: size.height,
          viewport,
          order: index,
        });
      } catch (error) {
        logger.warn({ err: error, route: target.routePath }, "Screenshot capture failed for route");
      } finally {
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }

  logger.info({ demoId, count: captured.length }, "Captured demo screenshots");
  return captured;
}

/** Confirms the deployed demo actually renders before it is shown to a client. */
export async function verifyDeployment(url: string): Promise<{ ok: boolean; status: number | null; message?: string }> {
  const browser = await launchBrowser();

  if (!browser) {
    try {
      const response = await fetch(url, { method: "GET", signal: AbortSignal.timeout(30_000) });
      return { ok: response.ok, status: response.status };
    } catch (error) {
      return { ok: false, status: null, message: error instanceof Error ? error.message : "Unreachable" };
    }
  }

  try {
    const page = await browser.newPage();
    const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45_000 });
    const status = response?.status() ?? null;
    const bodyText = await page.locator("body").innerText().catch(() => "");
    const looksBroken = /application error|500|internal server error/i.test(bodyText.slice(0, 400));

    return {
      ok: Boolean(status && status < 400) && !looksBroken,
      status,
      message: looksBroken ? "Deployed page rendered an application error." : undefined,
    };
  } catch (error) {
    return { ok: false, status: null, message: error instanceof Error ? error.message : "Unreachable" };
  } finally {
    await browser.close();
  }
}
