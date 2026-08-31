/**
 * Lovable AI Gateway client (server-only).
 *
 * Single place where CareerPilot talks to a model: timeouts, retries on
 * transient failures, JSON parsing and structured logging live here so the
 * feature services stay free of transport concerns.
 */
import { createTaskLog, type TaskLog } from "./logger.server";
import type { PromptTemplate } from "./prompts.server";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const DEFAULT_MODEL = "google/gemini-3.5-flash";
const TIMEOUT_MS = 60_000;
const MAX_ATTEMPTS = 3;

/** Error type callers can branch on without string matching. */
export class AiError extends Error {
  constructor(
    message: string,
    readonly code:
      "unconfigured" | "rate_limited" | "no_credits" | "upstream" | "timeout" | "invalid_output",
  ) {
    super(message);
    this.name = "AiError";
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Raw completion call. Returns the assistant message content. */
export async function callGateway(
  messages: Array<{ role: string; content: string }>,
  options?: { log?: TaskLog | undefined; model?: string | undefined },
): Promise<string> {
  const log = options?.log ?? createTaskLog("ai.raw");
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new AiError("AI is not configured for this project.", "unconfigured");

  const promptChars = messages.reduce((n, m) => n + m.content.length, 0);
  let lastError: AiError | null = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      log.event("gateway.request", { attempt, promptChars });
      const response = await fetch(GATEWAY_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: options?.model ?? DEFAULT_MODEL,
          messages,
          response_format: { type: "json_object" },
        }),
        signal: controller.signal,
      });

      // Client-visible, non-retryable states.
      if (response.status === 429) {
        throw new AiError("Too many requests right now — try again in a moment.", "rate_limited");
      }
      if (response.status === 402) {
        throw new AiError("AI credits exhausted. Add credits to continue.", "no_credits");
      }
      if (!response.ok) {
        const body = await response.text();
        log.event("gateway.error", { status: response.status, bodyChars: body.length }, "error");
        throw new AiError(`AI request failed (${response.status}).`, "upstream");
      }

      const payload = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = payload.choices?.[0]?.message?.content;
      if (!content) throw new AiError("AI returned an empty response.", "invalid_output");

      log.event("gateway.ok", { attempt, responseChars: content.length });
      return content;
    } catch (error) {
      clearTimeout(timer);
      const aiError =
        error instanceof AiError
          ? error
          : (error as Error)?.name === "AbortError"
            ? new AiError("The AI request timed out. Please try again.", "timeout")
            : new AiError("The AI service is unreachable right now.", "upstream");

      // Only transport-level failures are worth retrying.
      const retryable = aiError.code === "upstream" || aiError.code === "timeout";
      lastError = aiError;
      log.event("gateway.attempt_failed", { attempt, code: aiError.code, retryable }, "warn");
      if (!retryable || attempt === MAX_ATTEMPTS) throw aiError;
      await sleep(400 * attempt);
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError ?? new AiError("AI request failed.", "upstream");
}

/**
 * Render a registered prompt template, call the gateway and return raw JSON
 * text. Validation of the payload is the caller's job (see validation.server).
 */
export async function runPrompt<V extends Record<string, unknown>>(
  template: PromptTemplate<V>,
  vars: V,
  log: TaskLog,
): Promise<string> {
  log.event("prompt.render", { prompt: template.id, version: template.version });
  return callGateway(template.render(vars), { log });
}
