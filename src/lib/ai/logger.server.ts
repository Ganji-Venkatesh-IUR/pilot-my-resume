/**
 * Structured logging for the AI orchestration layer (server-only).
 *
 * Every AI task emits one `start` and one `end` line with a correlation id so
 * a single request can be traced across gateway calls. Prompt bodies, resume
 * content and user identifiers are never logged verbatim — only sizes, task
 * names and durations.
 */

export type LogLevel = "info" | "warn" | "error";

export interface TaskLog {
  /** Correlation id shared by every log line of one orchestrated task. */
  readonly traceId: string;
  /** Log an event attached to this trace. */
  event: (name: string, fields?: Record<string, unknown>, level?: LogLevel) => void;
  /** Milliseconds elapsed since the trace started. */
  elapsed: () => number;
}

/** Short, collision-safe id — good enough for log correlation. */
export function newTraceId(): string {
  return Math.random().toString(36).slice(2, 10);
}

/** Redact anything that looks like a secret or personal identifier. */
function safeFields(fields: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (/token|key|secret|password|email|phone/i.test(key)) {
      out[key] = "[redacted]";
    } else if (typeof value === "string" && value.length > 120) {
      out[key] = `${value.length} chars`;
    } else {
      out[key] = value;
    }
  }
  return out;
}

/** Create a logger bound to one task + trace id. */
export function createTaskLog(task: string, traceId = newTraceId()): TaskLog {
  const startedAt = Date.now();

  const event: TaskLog["event"] = (name, fields = {}, level = "info") => {
    const line = JSON.stringify({
      scope: "ai",
      task,
      traceId,
      event: name,
      ms: Date.now() - startedAt,
      ...safeFields(fields),
    });
    if (level === "error") console.error(line);
    else if (level === "warn") console.warn(line);
    else console.log(line);
  };

  return { traceId, event, elapsed: () => Date.now() - startedAt };
}
