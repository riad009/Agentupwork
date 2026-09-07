import type { ScheduleFrequency } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { getQueue, QUEUE_NAMES, type AutomationJobData } from "@/workers/queues";

const INTERVAL_HOURS: Record<Exclude<ScheduleFrequency, "MANUAL">, number> = {
  HOURLY: 1,
  EVERY_3_HOURS: 3,
  EVERY_6_HOURS: 6,
  DAILY: 24,
};

/**
 * Finds users whose schedule is due and queues a run for each. Runs every few
 * minutes from the maintenance queue; overlapping runs are prevented by
 * checking for an in-flight run per user.
 */
export async function scheduleDueAutomations(): Promise<number> {
  const preferences = await prisma.userPreference.findMany({
    where: { automationEnabled: true, scheduleFrequency: { not: "MANUAL" } },
    select: { userId: true, scheduleFrequency: true },
  });

  if (preferences.length === 0) return 0;

  const queue = getQueue<AutomationJobData>(QUEUE_NAMES.automation);
  let queued = 0;

  for (const preference of preferences) {
    const frequency = preference.scheduleFrequency as Exclude<ScheduleFrequency, "MANUAL">;
    const intervalMs = INTERVAL_HOURS[frequency] * 3_600_000;

    const inFlight = await prisma.automationRun.findFirst({
      where: { userId: preference.userId, status: { in: ["QUEUED", "RUNNING"] } },
      select: { id: true },
    });
    if (inFlight) continue;

    const lastRun = await prisma.automationRun.findFirst({
      where: { userId: preference.userId, trigger: "SCHEDULED" },
      orderBy: { startedAt: "desc" },
      select: { startedAt: true },
    });

    const due = !lastRun || Date.now() - lastRun.startedAt.getTime() >= intervalMs;
    if (!due) continue;

    await queue.add(
      "run",
      { userId: preference.userId, trigger: "SCHEDULED" },
      { jobId: `scheduled:${preference.userId}:${Math.floor(Date.now() / intervalMs)}` },
    );
    queued += 1;
  }

  if (queued > 0) logger.info({ queued }, "Queued scheduled automation runs");
  return queued;
}

/** Removes password reset tokens that are expired or already used. */
export async function pruneExpiredTokens(): Promise<number> {
  const result = await prisma.passwordResetToken.deleteMany({
    where: { OR: [{ expiresAt: { lt: new Date() } }, { usedAt: { not: null } }] },
  });
  if (result.count > 0) logger.info({ count: result.count }, "Pruned expired password reset tokens");
  return result.count;
}
