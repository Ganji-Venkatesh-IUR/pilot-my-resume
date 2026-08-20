import { useEffect, useRef, useState } from "react";
import { Sparkles, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SECTIONS, type SectionId } from "@/lib/resume-schema";

export interface CopilotMessage {
  role: "user" | "copilot";
  text: string;
  changes?: string[];
  error?: boolean;
}

/** One-tap instructions covering the most common resume improvements. */
const PROMPT_CHIPS = [
  "Make it one page",
  "Improve summary",
  "Tailor for a frontend role",
  "Quantify my bullets",
  "Add missing ATS keywords",
  "Use stronger action verbs",
];

/** Right panel: conversational, section-scoped editing with the AI copilot. */
export function CopilotPanel({
  messages,
  busy,
  section,
  onSectionChange,
  onSend,
}: {
  messages: CopilotMessage[];
  busy: boolean;
  section: SectionId | "all";
  onSectionChange: (section: SectionId | "all") => void;
  onSend: (instruction: string) => void;
}) {
  const [draft, setDraft] = useState("");
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  function submit(text: string) {
    const value = text.trim();
    if (!value || busy) return;
    onSend(value);
    setDraft("");
  }

  return (
    <section
      aria-label="AI copilot"
      className="flex h-full flex-col rounded-xl border border-border bg-card shadow-soft"
    >
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <Sparkles className="size-4 text-primary" />
        <h3 className="text-sm font-semibold">AI Copilot</h3>
        <select
          aria-label="Section to edit"
          value={section}
          onChange={(e) => onSectionChange(e.target.value as SectionId | "all")}
          className="ml-auto rounded-md border border-border bg-background px-2 py-1 text-xs"
        >
          <option value="all">Whole resume</option>
          {SECTIONS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <div
        ref={feedRef}
        role="log"
        aria-live="polite"
        className="flex-1 space-y-3 overflow-y-auto p-4 text-sm"
      >
        {messages.length === 0 && (
          <p className="text-muted-foreground">
            Ask for any edit — rewording, tone, keywords, length. The copilot rewrites only the
            chosen section, keeps your facts intact, and explains what it changed.
          </p>
        )}
        {messages.map((message, i) => (
          <div
            key={i}
            className={
              message.role === "user"
                ? "ml-auto max-w-[85%] rounded-lg rounded-br-sm bg-primary px-3 py-2 text-primary-foreground"
                : `max-w-[92%] rounded-lg rounded-bl-sm px-3 py-2 ${
                    message.error
                      ? "bg-destructive/10 text-destructive"
                      : "bg-muted text-foreground"
                  }`
            }
          >
            {message.text}
            {message.changes && message.changes.length > 0 && (
              <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-xs text-muted-foreground">
                {message.changes.map((change, ci) => (
                  <li key={ci}>{change}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
        {busy && (
          <p className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Rewriting…
          </p>
        )}
      </div>

      <div className="space-y-2 border-t border-border p-3">
        <div className="flex flex-wrap gap-1.5">
          {PROMPT_CHIPS.map((chip) => (
            <button
              key={chip}
              type="button"
              disabled={busy}
              onClick={() => submit(chip)}
              className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
            >
              {chip}
            </button>
          ))}
        </div>
        <div className="flex items-end gap-2">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit(draft);
              }
            }}
            placeholder="Ask the copilot to improve a section…"
            aria-label="Copilot instruction"
            rows={2}
            className="min-h-[56px] resize-none text-sm"
          />
          <Button
            size="icon"
            onClick={() => submit(draft)}
            disabled={busy || !draft.trim()}
            aria-label="Send instruction"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          </Button>
        </div>
      </div>
    </section>
  );
}
