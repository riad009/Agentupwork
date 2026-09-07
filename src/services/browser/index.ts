import "server-only";
import { existsSync } from "node:fs";
import type { Browser } from "playwright";
import { logger } from "@/lib/logger";

const FALLBACK_PATHS = [
  "/opt/pw-browsers/chromium",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "/usr/bin/google-chrome",
];

/**
 * Resolves a Chromium binary without touching validated config: this runs in
 * workers and scripts where the full server environment may not be loaded, and
 * a missing browser must never look like a configuration error.
 */
function resolveExecutablePath(): string | undefined {
  const configured = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
  if (configured && existsSync(configured)) return configured;

  for (const candidate of FALLBACK_PATHS) {
    if (existsSync(candidate)) return candidate;
  }

  // Fall through to Playwright's own bundled browser resolution.
  return undefined;
}

/**
 * Launches Chromium for screenshots and PDF rendering.
 *
 * Returns null instead of throwing when no browser is available: both callers
 * treat visual artefacts as optional, so a missing browser degrades the output
 * rather than failing the pipeline.
 */
export async function launchBrowser(): Promise<Browser | null> {
  const executablePath = resolveExecutablePath();

  try {
    const { chromium } = await import("playwright");

    return await chromium.launch({
      headless: true,
      executablePath,
      args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
    });
  } catch (error) {
    logger.warn(
      { err: error, executablePath: executablePath ?? "(playwright default)" },
      "Chromium could not be launched; skipping browser-rendered artefacts",
    );
    return null;
  }
}

export async function isBrowserAvailable(): Promise<boolean> {
  const browser = await launchBrowser();
  if (!browser) return false;
  await browser.close();
  return true;
}
