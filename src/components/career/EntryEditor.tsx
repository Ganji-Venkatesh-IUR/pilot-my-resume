import { useState } from "react";
import { ChevronDown, ChevronUp, Loader2, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  KIND_META,
  SKILL_LEVELS,
  formatPeriod,
  type CareerEntry,
  type CareerKind,
} from "@/lib/career-schema";

interface EntryEditorProps {
  entry: CareerEntry;
  saving?: boolean;
  onChange: (patch: Partial<CareerEntry>) => void;
  onDelete: () => void;
  onMove: (direction: -1 | 1) => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}

/**
 * One editable career item. Fields adapt to the entry kind (dates, bullets,
 * skill level, URL) so a single component covers all seven sections.
 */
export function EntryEditor({
  entry,
  saving,
  onChange,
  onDelete,
  onMove,
  canMoveUp,
  canMoveDown,
}: EntryEditorProps) {
  const meta = KIND_META[entry.kind];
  const [open, setOpen] = useState(!entry.title);
  const [bulletDraft, setBulletDraft] = useState("");
  const [tagDraft, setTagDraft] = useState("");
  const fieldId = (name: string) => `${entry.id}-${name}`;

  return (
    <li className="rounded-xl border border-border bg-card shadow-soft">
      <div className="flex items-center gap-2 p-4">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="min-w-0 flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <p className="truncate font-medium">
            {entry.title || `Untitled ${meta.singular}`}
            {entry.level && (
              <span className="ml-2 rounded-full bg-accent px-2 py-0.5 text-xs font-normal text-accent-foreground">
                {entry.level}
              </span>
            )}
          </p>
          <p className="truncate text-sm text-muted-foreground">
            {[entry.subtitle, formatPeriod(entry)].filter(Boolean).join(" · ") ||
              "Tap to add details"}
          </p>
        </button>

        {saving && <Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden />}
        <Button
          variant="ghost"
          size="icon"
          aria-label="Move up"
          disabled={!canMoveUp}
          onClick={() => onMove(-1)}
        >
          <ChevronUp className="size-4" aria-hidden />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Move down"
          disabled={!canMoveDown}
          onClick={() => onMove(1)}
        >
          <ChevronDown className="size-4" aria-hidden />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Delete ${entry.title || meta.singular}`}
          onClick={onDelete}
        >
          <Trash2 className="size-4" aria-hidden />
        </Button>
      </div>

      {open && (
        <div className="space-y-4 border-t border-border p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              id={fieldId("title")}
              label={meta.titleLabel}
              value={entry.title}
              onChange={(v) => onChange({ title: v })}
            />
            {meta.subtitleLabel && (
              <Field
                id={fieldId("subtitle")}
                label={meta.subtitleLabel}
                value={entry.subtitle}
                onChange={(v) => onChange({ subtitle: v })}
              />
            )}
          </div>

          {meta.hasDates && (
            <div className="grid gap-4 sm:grid-cols-3">
              <Field
                id={fieldId("start")}
                label="Start"
                placeholder="Jan 2023"
                value={entry.startDate}
                onChange={(v) => onChange({ startDate: v })}
              />
              <Field
                id={fieldId("end")}
                label="End"
                placeholder="Mar 2025"
                value={entry.endDate}
                disabled={entry.isCurrent}
                onChange={(v) => onChange({ endDate: v })}
              />
              <div className="flex items-end gap-3 pb-2">
                <Switch
                  id={fieldId("current")}
                  checked={entry.isCurrent}
                  onCheckedChange={(checked) => onChange({ isCurrent: checked })}
                />
                <Label htmlFor={fieldId("current")}>Current</Label>
              </div>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            {meta.hasLevel && (
              <div className="space-y-1.5">
                <Label htmlFor={fieldId("level")}>Level</Label>
                <select
                  id={fieldId("level")}
                  value={entry.level}
                  onChange={(e) => onChange({ level: e.target.value as CareerEntry["level"] })}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">Not set</option>
                  {SKILL_LEVELS.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {meta.hasUrl && (
              <Field
                id={fieldId("url")}
                label="Link"
                placeholder="https://"
                value={entry.url}
                onChange={(v) => onChange({ url: v })}
              />
            )}
            {entry.kind !== "skill" && entry.kind !== "link" && (
              <Field
                id={fieldId("location")}
                label="Location"
                placeholder="Remote / Bengaluru"
                value={entry.location}
                onChange={(v) => onChange({ location: v })}
              />
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={fieldId("description")}>Description</Label>
            <Textarea
              id={fieldId("description")}
              rows={3}
              value={entry.description}
              onChange={(e) => onChange({ description: e.target.value })}
              placeholder="One or two honest sentences. The AI never invents beyond this."
            />
          </div>

          {meta.hasBullets && (
            <ChipList
              legend="Highlights"
              items={entry.bullets}
              draft={bulletDraft}
              setDraft={setBulletDraft}
              placeholder="Cut API latency by 40% by adding caching"
              onAdd={(value) => onChange({ bullets: [...entry.bullets, value] })}
              onRemove={(i) => onChange({ bullets: entry.bullets.filter((_, bi) => bi !== i) })}
              block
            />
          )}

          <ChipList
            legend="Keywords"
            items={entry.tags}
            draft={tagDraft}
            setDraft={setTagDraft}
            placeholder="react, postgres, leadership"
            onAdd={(value) => onChange({ tags: [...entry.tags, value] })}
            onRemove={(i) => onChange({ tags: entry.tags.filter((_, ti) => ti !== i) })}
          />
        </div>
      )}
    </li>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  placeholder,
  disabled,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

/** Add/remove list used for both bullets and keyword tags. */
function ChipList({
  legend,
  items,
  draft,
  setDraft,
  placeholder,
  onAdd,
  onRemove,
  block,
}: {
  legend: string;
  items: string[];
  draft: string;
  setDraft: (v: string) => void;
  placeholder: string;
  onAdd: (value: string) => void;
  onRemove: (index: number) => void;
  block?: boolean;
}) {
  function commit() {
    const value = draft.trim();
    if (!value) return;
    onAdd(value);
    setDraft("");
  }

  return (
    <fieldset className="space-y-2">
      <legend className="mb-1 text-sm font-medium">{legend}</legend>
      {items.length > 0 && (
        <ul className={block ? "space-y-1.5" : "flex flex-wrap gap-1.5"}>
          {items.map((item, i) => (
            <li
              key={`${item}-${i}`}
              className={
                block
                  ? "flex items-start gap-2 rounded-md bg-muted px-3 py-2 text-sm"
                  : "flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-xs text-accent-foreground"
              }
            >
              <span className="min-w-0 flex-1 break-words">{item}</span>
              <button
                type="button"
                onClick={() => onRemove(i)}
                aria-label={`Remove ${item}`}
                className="shrink-0 text-muted-foreground hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="size-3.5" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <Input
          value={draft}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit();
            }
          }}
          aria-label={`Add ${legend.toLowerCase()}`}
        />
        <Button type="button" variant="outline" onClick={commit}>
          <Plus className="size-4" aria-hidden /> Add
        </Button>
      </div>
    </fieldset>
  );
}
