import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { z, type ZodType } from "zod";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { IntegrationError } from "@/lib/errors";
import { withRetry } from "@/lib/retry";
import { decryptSecret } from "@/lib/crypto";

export interface ClaudeUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface StructuredRequest<T> {
  operation: string;
  system: string;
  prompt: string;
  schema: ZodType<T>;
  toolName: string;
  toolDescription: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  userId?: string;
  jobId?: string;
  runId?: string;
}

export interface StructuredResponse<T> {
  data: T;
  usage: ClaudeUsage;
  model: string;
}

/** Approximate per-million-token pricing, used only for cost reporting. */
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  "claude-opus-5": { input: 15, output: 75 },
  "claude-sonnet-5": { input: 3, output: 15 },
  "claude-haiku-4-5-20251001": { input: 1, output: 5 },
};

function priceFor(model: string): { input: number; output: number } {
  const exact = MODEL_PRICING[model];
  if (exact) return exact;
  if (model.includes("opus")) return MODEL_PRICING["claude-opus-5"]!;
  if (model.includes("haiku")) return MODEL_PRICING["claude-haiku-4-5-20251001"]!;
  return MODEL_PRICING["claude-sonnet-5"]!;
}

export function estimateCostUsd(model: string, usage: ClaudeUsage): number {
  const pricing = priceFor(model);
  return (usage.inputTokens / 1_000_000) * pricing.input + (usage.outputTokens / 1_000_000) * pricing.output;
}

/**
 * Resolves the Claude API key for a user, falling back to the platform key.
 * Per-user keys are stored encrypted and only ever decrypted here.
 */
export async function resolveAnthropicApiKey(userId?: string): Promise<string> {
  if (userId) {
    const credential = await prisma.integrationCredential.findUnique({
      where: { userId_provider: { userId, provider: "CLAUDE" } },
      select: { secretCiphertext: true, isActive: true },
    });

    if (credential?.isActive) {
      try {
        return decryptSecret(credential.secretCiphertext);
      } catch (error) {
        logger.warn({ err: error, userId }, "Failed to decrypt stored Claude API key");
      }
    }
  }

  const platformKey = env.ANTHROPIC_API_KEY;
  if (!platformKey) {
    throw new IntegrationError(
      "claude",
      "No Claude API key configured. Add one in Settings → Claude AI or set ANTHROPIC_API_KEY.",
    );
  }
  return platformKey;
}

export async function getAnthropicClient(userId?: string): Promise<Anthropic> {
  const apiKey = await resolveAnthropicApiKey(userId);
  return new Anthropic({ apiKey, maxRetries: 0, timeout: 180_000 });
}

async function recordUsage(params: {
  userId?: string;
  operation: string;
  model: string;
  usage: ClaudeUsage;
  durationMs: number;
  success: boolean;
  jobId?: string;
  runId?: string;
}): Promise<void> {
  try {
    await prisma.aiUsageRecord.create({
      data: {
        userId: params.userId ?? null,
        operation: params.operation,
        model: params.model,
        inputTokens: params.usage.inputTokens,
        outputTokens: params.usage.outputTokens,
        costUsd: estimateCostUsd(params.model, params.usage).toFixed(6),
        durationMs: params.durationMs,
        success: params.success,
        jobId: params.jobId,
        runId: params.runId,
      },
    });
  } catch (error) {
    logger.warn({ err: error }, "Failed to persist AI usage record");
  }
}

function toToolSchema(schema: ZodType<unknown>): Record<string, unknown> {
  const jsonSchema = z.toJSONSchema(schema, { target: "draft-7", io: "output" }) as Record<string, unknown>;
  delete jsonSchema.$schema;
  return jsonSchema;
}

/**
 * Calls Claude and forces a single tool call whose input matches `schema`,
 * which removes prose-wrapped-JSON parsing failures entirely.
 */
export async function completeStructured<T>(request: StructuredRequest<T>): Promise<StructuredResponse<T>> {
  const client = await getAnthropicClient(request.userId);
  const model = request.model ?? env.ANTHROPIC_MODEL;
  const startedAt = Date.now();

  const usage: ClaudeUsage = { inputTokens: 0, outputTokens: 0 };

  try {
    const result = await withRetry(
      async () => {
        const message = await client.messages.create({
          model,
          max_tokens: request.maxTokens ?? 4_000,
          temperature: request.temperature ?? 0.4,
          system: request.system,
          tools: [
            {
              name: request.toolName,
              description: request.toolDescription,
              input_schema: toToolSchema(request.schema) as never,
            },
          ],
          tool_choice: { type: "tool", name: request.toolName },
          messages: [{ role: "user", content: request.prompt }],
        });

        usage.inputTokens += message.usage.input_tokens;
        usage.outputTokens += message.usage.output_tokens;

        const toolUse = message.content.find(
          (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
        );

        if (!toolUse) {
          throw new IntegrationError("claude", "Claude did not return the expected structured response.");
        }

        return request.schema.parse(toolUse.input);
      },
      {
        attempts: 3,
        baseDelayMs: 1_000,
        label: `claude:${request.operation}`,
        shouldRetry: (error) => {
          if (error instanceof Anthropic.APIError) {
            return error.status === undefined || error.status === 429 || error.status >= 500;
          }
          return true;
        },
      },
    );

    await recordUsage({
      userId: request.userId,
      operation: request.operation,
      model,
      usage,
      durationMs: Date.now() - startedAt,
      success: true,
      jobId: request.jobId,
      runId: request.runId,
    });

    return { data: result, usage, model };
  } catch (error) {
    await recordUsage({
      userId: request.userId,
      operation: request.operation,
      model,
      usage,
      durationMs: Date.now() - startedAt,
      success: false,
      jobId: request.jobId,
      runId: request.runId,
    });

    if (error instanceof Anthropic.APIError) {
      throw new IntegrationError("claude", `Claude request failed (${error.status ?? "network"}): ${error.message}`);
    }
    throw error;
  }
}

/** Lightweight connectivity check used by the settings page. */
export async function verifyClaudeKey(apiKey: string): Promise<{ ok: boolean; model?: string; message?: string }> {
  try {
    const client = new Anthropic({ apiKey, maxRetries: 0, timeout: 20_000 });
    const model = env.ANTHROPIC_ANALYSIS_MODEL;
    await client.messages.create({
      model,
      max_tokens: 16,
      messages: [{ role: "user", content: "Reply with the single word: ready" }],
    });
    return { ok: true, model };
  } catch (error) {
    const message = error instanceof Anthropic.APIError ? error.message : (error as Error).message;
    return { ok: false, message };
  }
}
