import "server-only";
import type { DemoProject } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { captureException } from "@/lib/monitoring";
import { toErrorMessage } from "@/lib/errors";
import { generateDemoCode, planDemo, repairDemoCode } from "@/services/claude";
import { buildScaffold, RESERVED_ROUTES, type GeneratedFile } from "@/services/templates/scaffold";
import { getTemplate, inferTemplate } from "@/services/templates/registry";
import { validateGeneratedFiles, validateWithToolchain } from "@/services/demo/validate";
import { getGitHubService } from "@/services/github";
import { getVercelService } from "@/services/vercel";
import { captureDemoScreenshots, verifyDeployment } from "@/services/screenshots";
import type { DemoPlan, DemoDecisionResult, RequirementExtraction } from "@/schemas/ai";
import type { DemoThresholds, JobContext } from "@/types/domain";

export interface DemoBuildInput {
  userId: string;
  job: JobContext;
  requirements: RequirementExtraction;
  decision: DemoDecisionResult;
  thresholds: DemoThresholds;
  preparedBy: string;
  runId?: string;
}

export interface DemoBuildOutcome {
  demo: DemoProject;
  plan: DemoPlan | null;
  liveUrl: string | null;
  screenshots: { label: string; path: string; routePath: string }[];
  usage: { inputTokens: number; outputTokens: number };
  failureReason: string | null;
}

function slugify(value: string, maxLength = 40): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, maxLength)
      .replace(/-+$/g, "") || "demo"
  );
}

function generateDemoPassword(): string {
  const digits = Math.floor(1000 + Math.random() * 9000);
  return `Demo${digits}!`;
}

function normaliseRoute(route: string): string {
  return slugify(route, 32);
}

/** Screens are generated in small batches so one bad response cannot lose them all. */
function chunk<T>(items: T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    batches.push(items.slice(index, index + size));
  }
  return batches;
}

function mergeFiles(base: GeneratedFile[], updates: GeneratedFile[]): GeneratedFile[] {
  const map = new Map(base.map((file) => [file.path, file]));
  for (const update of updates) map.set(update.path, update);
  return [...map.values()];
}

/**
 * Builds, deploys and screenshots a lightweight demo for one job.
 *
 * Every stage degrades safely: a failure after the proposal stage leaves the
 * proposal intact and simply records why the demo is unavailable. A demo URL is
 * only ever returned once the deployment has been verified to render.
 */
export async function buildDemo(input: DemoBuildInput): Promise<DemoBuildOutcome> {
  const usage = { inputTokens: 0, outputTokens: 0 };
  const meta = { userId: input.userId, jobId: input.job.id, runId: input.runId };

  const template = input.decision.suggestedTemplate
    ? getTemplate(input.decision.suggestedTemplate)
    : inferTemplate(`${input.job.title} ${input.job.description}`);

  let demo = await prisma.demoProject.create({
    data: {
      userId: input.userId,
      jobId: input.job.id,
      status: "PLANNING",
      complexity: input.decision.demoComplexity === "NONE" ? "SMALL" : input.decision.demoComplexity,
      templateKey: template.key,
      title: input.job.title.slice(0, 120),
      industry: input.decision.industry || template.industry,
      requirements: input.requirements as never,
      startedAt: new Date(),
    },
  });

  const fail = async (reason: string, buildLog?: string): Promise<DemoBuildOutcome> => {
    logger.warn({ demoId: demo.id, reason }, "Demo build did not complete");
    const updated = await prisma.demoProject.update({
      where: { id: demo.id },
      data: {
        status: "FAILED",
        errorMessage: reason.slice(0, 2_000),
        buildLog: buildLog?.slice(0, 20_000),
        completedAt: new Date(),
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
      },
    });
    return { demo: updated, plan: null, liveUrl: null, screenshots: [], usage, failureReason: reason };
  };

  try {
    // 1 — plan the demo -----------------------------------------------------
    const planResult = await planDemo(
      input.job,
      input.requirements,
      {
        maxPages: input.thresholds.maxPages,
        templateKey: template.key,
        industry: input.decision.industry || template.industry,
      },
      meta,
    );
    usage.inputTokens += planResult.usage.inputTokens;
    usage.outputTokens += planResult.usage.outputTokens;

    const plan: DemoPlan = {
      ...planResult.data,
      primaryColor: planResult.data.primaryColor || template.primaryColor,
      pages: planResult.data.pages
        .map((page) => ({ ...page, route: normaliseRoute(page.route) }))
        .filter((page) => !RESERVED_ROUTES.has(page.route))
        .filter((page, index, all) => all.findIndex((other) => other.route === page.route) === index)
        .slice(0, input.thresholds.maxPages),
    };

    if (plan.pages.length === 0) {
      return fail("The demo plan produced no usable screens.");
    }

    const projectSlug = `demo-${slugify(plan.projectTitle, 28)}-${demo.id.slice(-6)}`;
    const demoPassword = generateDemoPassword();
    const demoEmail = "demo@example.com";

    const { files: scaffoldFiles, config } = buildScaffold({
      plan,
      templateKey: template.key,
      projectSlug,
      demoEmail,
      demoPassword,
      jobTitle: input.job.title,
      preparedBy: input.preparedBy,
    });

    demo = await prisma.demoProject.update({
      where: { id: demo.id },
      data: {
        status: "GENERATING",
        title: plan.projectTitle.slice(0, 120),
        summary: plan.tagline,
        plan: plan as never,
        coverage: config.coverage as never,
        demoEmail,
        demoPassword,
        pageCount: plan.pages.length,
      },
    });

    // 2 — generate the screens ---------------------------------------------
    let screenFiles: GeneratedFile[] = [];

    for (const batch of chunk(plan.pages.map((page) => page.route), 3)) {
      const codeResult = await generateDemoCode(plan, batch, meta);
      usage.inputTokens += codeResult.usage.inputTokens;
      usage.outputTokens += codeResult.usage.outputTokens;
      screenFiles = mergeFiles(screenFiles, codeResult.data.files);
    }

    screenFiles = screenFiles.filter((file) => file.path.startsWith("src/app/(demo)/"));

    if (screenFiles.length === 0) {
      return fail("No demo screens were generated.");
    }

    // 3 — static validation with a bounded repair loop -----------------------
    let iterations = 0;
    let staticResult = validateGeneratedFiles(screenFiles);

    while (!staticResult.ok && iterations < input.thresholds.maxIterations) {
      iterations += 1;
      logger.info({ demoId: demo.id, iteration: iterations }, "Repairing generated demo screens");

      const repair = await repairDemoCode(staticResult.output, screenFiles, meta);
      usage.inputTokens += repair.usage.inputTokens;
      usage.outputTokens += repair.usage.outputTokens;

      screenFiles = mergeFiles(screenFiles, repair.data.files).filter((file) =>
        file.path.startsWith("src/app/(demo)/"),
      );
      staticResult = validateGeneratedFiles(screenFiles);
    }

    if (!staticResult.ok) {
      return fail(`Generated screens did not pass validation: ${staticResult.output.slice(0, 500)}`);
    }

    // 4 — optional local toolchain validation -------------------------------
    let allFiles = mergeFiles(scaffoldFiles, screenFiles);
    let buildAttempts = 0;
    let toolchain = await validateWithToolchain(allFiles);

    while (!toolchain.ok && buildAttempts < input.thresholds.maxBuildFixAttempts) {
      buildAttempts += 1;
      const repair = await repairDemoCode(toolchain.output, screenFiles, meta);
      usage.inputTokens += repair.usage.inputTokens;
      usage.outputTokens += repair.usage.outputTokens;

      screenFiles = mergeFiles(screenFiles, repair.data.files).filter((file) =>
        file.path.startsWith("src/app/(demo)/"),
      );
      allFiles = mergeFiles(scaffoldFiles, screenFiles);
      toolchain = await validateWithToolchain(allFiles);
    }

    if (!toolchain.ok) {
      return fail("The generated demo did not build locally.", toolchain.output);
    }

    demo = await prisma.demoProject.update({
      where: { id: demo.id },
      data: {
        status: "VALIDATING",
        fileCount: allFiles.length,
        iterations,
        buildAttempts,
        buildStatus: "PASSED",
      },
    });

    // 5 — publish the repository -------------------------------------------
    const github = await getGitHubService(input.userId);
    if (github) {
      try {
        const repo = await github.createRepository(
          projectSlug,
          `Interactive concept prototype prepared for: ${input.job.title}`.slice(0, 350),
          false,
        );
        await github.pushFiles(
          repo,
          allFiles.map((file) => ({ path: file.path, contents: file.contents })),
          "Add interactive concept prototype",
        );

        demo = await prisma.demoProject.update({
          where: { id: demo.id },
          data: {
            status: "REPO_CREATED",
            githubRepoUrl: repo.htmlUrl,
            githubRepoName: repo.name,
            githubOwner: repo.owner,
          },
        });
      } catch (error) {
        // A missing repository is not fatal: the demo can still be deployed.
        logger.warn({ err: error, demoId: demo.id }, "GitHub publishing failed; continuing to deployment");
      }
    }

    // 6 — deploy ------------------------------------------------------------
    const vercel = await getVercelService(input.userId);
    if (!vercel) {
      return fail(
        "No Vercel token is configured, so the demo could not be deployed. Add one in Settings → Vercel.",
      );
    }

    demo = await prisma.demoProject.update({ where: { id: demo.id }, data: { status: "DEPLOYING" } });

    let deployAttempts = 0;
    let liveUrl: string | null = null;
    let lastDeployError = "";

    while (deployAttempts <= input.thresholds.maxBuildFixAttempts) {
      const deployment = await vercel.createDeployment(
        projectSlug,
        allFiles.map((file) => ({ path: file.path, contents: file.contents })),
      );

      const record = await prisma.deployment.create({
        data: {
          userId: input.userId,
          demoId: demo.id,
          deploymentId: deployment.id,
          status: "BUILDING",
          url: deployment.url,
          inspectorUrl: deployment.inspectorUrl,
        },
      });

      const settled = await vercel.waitForDeployment(deployment.id);
      const logs = settled.status === "READY" ? "" : await vercel.getBuildLogs(deployment.id);

      await prisma.deployment.update({
        where: { id: record.id },
        data: {
          status: settled.status,
          url: settled.url,
          readyAt: settled.status === "READY" ? new Date() : null,
          errorMessage: settled.errorMessage ?? (settled.status === "ERROR" ? "Deployment failed" : null),
          logs: logs ? ({ build: logs.slice(0, 15_000) } as never) : undefined,
        },
      });

      if (settled.status === "READY") {
        liveUrl = settled.url;
        break;
      }

      lastDeployError = settled.errorMessage ?? logs.slice(-2_000) ?? "Deployment failed";
      deployAttempts += 1;

      if (deployAttempts > input.thresholds.maxBuildFixAttempts) break;

      logger.info({ demoId: demo.id, attempt: deployAttempts }, "Repairing demo after a failed deployment");
      const repair = await repairDemoCode(lastDeployError, screenFiles, meta);
      usage.inputTokens += repair.usage.inputTokens;
      usage.outputTokens += repair.usage.outputTokens;

      screenFiles = mergeFiles(screenFiles, repair.data.files).filter((file) =>
        file.path.startsWith("src/app/(demo)/"),
      );
      allFiles = mergeFiles(scaffoldFiles, screenFiles);
    }

    if (!liveUrl) {
      return fail(`The demo failed to deploy: ${lastDeployError.slice(0, 500)}`, lastDeployError);
    }

    // 7 — verify the deployment actually renders ----------------------------
    const verification = await verifyDeployment(liveUrl);
    if (!verification.ok) {
      return fail(
        `The deployment did not render correctly (${verification.status ?? "no response"}). ${verification.message ?? ""}`.trim(),
      );
    }

    // 8 — capture screenshots ----------------------------------------------
    const targets = [
      { label: "Project concept", routePath: "/" },
      ...plan.pages.slice(0, 3).map((page) => ({ label: page.name, routePath: `/${page.route}` })),
      { label: "Demo coverage", routePath: "/coverage" },
      {
        label: `${plan.pages[0]?.name ?? "Main screen"} on mobile`,
        routePath: `/${plan.pages[0]?.route ?? ""}`,
        viewport: "mobile" as const,
      },
    ].slice(0, input.thresholds.maxScreenshots);

    const screenshots = await captureDemoScreenshots(
      liveUrl,
      targets,
      demo.id,
      input.thresholds.maxScreenshots,
    );

    if (screenshots.length > 0) {
      await prisma.demoScreenshot.createMany({
        data: screenshots.map((shot) => ({
          demoId: demo.id,
          label: shot.label,
          path: shot.path,
          routePath: shot.routePath,
          width: shot.width,
          height: shot.height,
          viewport: shot.viewport,
          order: shot.order,
        })),
      });
    }

    const finalDemo = await prisma.demoProject.update({
      where: { id: demo.id },
      data: {
        status: "READY",
        liveUrl,
        buildStatus: "READY",
        completedAt: new Date(),
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        fileCount: allFiles.length,
        buildAttempts: buildAttempts + deployAttempts,
      },
    });

    logger.info({ demoId: demo.id, liveUrl }, "Demo built, deployed and verified");

    return {
      demo: finalDemo,
      plan,
      liveUrl,
      screenshots: screenshots.map((shot) => ({
        label: shot.label,
        path: shot.path,
        routePath: shot.routePath,
      })),
      usage,
      failureReason: null,
    };
  } catch (error) {
    captureException(error, { userId: input.userId, operation: "demo_build", extra: { jobId: input.job.id } });
    return fail(toErrorMessage(error));
  }
}
