import { useState } from "react";
import { Sparkles, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export interface CopilotMessage {
  role: "user" | "copilot";
  text: string;
}

const QUICK_ACTIONS = [
  "Make the bullets more quantified",
  "Tailor this to a senior role",
  "Shorten the summary to 2 lines",
  "Add missing ATS keywords",
];

/** Conversational panel that sends edit instructions to the AI copilot. */
export function CopilotPanel({
  messages,
  busy,
  onSend,
}: {
  messages: CopilotMessage[];
  busy: boolean;
  onSend: (instruction: string) => void;
}) {
  const [draft, setDraft] = useState("");

  function submit(text: string) {
    const value = text.trim();
    if (!value || busy) return;
    onSend(value);
    setDraft("");
  }

  return (
    <div className="flex h-full flex-col rounded-xl border border-border bg-card shadow-soft">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <Sparkles className="size-4 text-primary" />
        <h3 className="text-sm font-semibold">AI Copilot</h3>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4 text-sm">
        {messages.length === 0 && (
          <p className="text-muted-foreground">
            Ask for any edit — rewording, tone, keywords, length. Changes apply straight to the
            preview.
          </p>
        )}
        {messages.map((message, i) => (
          <div
            key={i}
            className={
              message.role === "user"
                ? "ml-auto max-w-[85%] rounded-lg rounded-br-sm bg-primary px-3 py-2 text-primary-foreground"
                : "max-w-[90%] rounded-lg rounded-bl-sm bg-muted px-3 py-2 text-foreground"
            }
          >
            {message.text}
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
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action}
              type="button"
              disabled={busy}
              onClick={() => submit(action)}
              className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
            >
              {action}
            </button>
          ))}
        </div>
        <div className="flex items-end gap-2">
          <Textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="e.g. Emphasise cloud infrastructure work"
            rows={2}
            className="resize-none"
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                submit(draft);
              }
            }}
          />
          <Button size="icon" disabled={busy} onClick={() => submit(draft)} aria-label="Send">
            <Send className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
