import { ArrowDown, ArrowUp, Eye, EyeOff } from "lucide-react";
import { SECTIONS, type ResumeLayout, type SectionId } from "@/lib/resume-schema";

const LABELS = Object.fromEntries(SECTIONS.map((s) => [s.id, s.label])) as Record<
  SectionId,
  string
>;

/**
 * Left panel: lists the resume sections in render order and lets the user
 * reorder, hide/show, and jump to a section in the preview.
 */
export function SectionSidebar({
  layout,
  counts,
  onChange,
}: {
  layout: ResumeLayout;
  counts: Record<SectionId, number>;
  onChange: (next: ResumeLayout) => void;
}) {
  function move(index: number, delta: number) {
    const next = [...layout.order];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    const [item] = next.splice(index, 1);
    if (!item) return;
    next.splice(target, 0, item);
    onChange({ ...layout, order: next });
  }

  function toggle(id: SectionId) {
    const hidden = layout.hidden.includes(id)
      ? layout.hidden.filter((h) => h !== id)
      : [...layout.hidden, id];
    onChange({ ...layout, hidden });
  }

  return (
    <nav aria-label="Resume sections" className="rounded-xl border border-border bg-card p-3">
      <h2 className="px-1 pb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Sections
      </h2>
      <ul className="space-y-1">
        {layout.order.map((id, index) => {
          const hidden = layout.hidden.includes(id);
          return (
            <li key={id} className="group flex items-center gap-1 rounded-lg px-1 py-1">
              <a
                href={`#section-${id}`}
                className={`flex-1 truncate rounded-md px-2 py-1 text-sm transition-colors hover:bg-accent hover:text-accent-foreground ${
                  hidden ? "text-muted-foreground line-through" : "text-foreground"
                }`}
              >
                {LABELS[id]}
                <span className="ml-1 text-xs text-muted-foreground">{counts[id] || ""}</span>
              </a>
              <button
                type="button"
                aria-label={`Move ${LABELS[id]} up`}
                onClick={() => move(index, -1)}
                disabled={index === 0}
                className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground disabled:opacity-30"
              >
                <ArrowUp className="size-3.5" />
              </button>
              <button
                type="button"
                aria-label={`Move ${LABELS[id]} down`}
                onClick={() => move(index, 1)}
                disabled={index === layout.order.length - 1}
                className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground disabled:opacity-30"
              >
                <ArrowDown className="size-3.5" />
              </button>
              <button
                type="button"
                aria-label={`${hidden ? "Show" : "Hide"} ${LABELS[id]}`}
                aria-pressed={!hidden}
                onClick={() => toggle(id)}
                className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              >
                {hidden ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
              </button>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 px-2 text-xs text-muted-foreground">
        Click any text in the preview to edit it inline.
      </p>
    </nav>
  );
}
