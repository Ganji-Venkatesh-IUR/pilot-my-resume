import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, Loader2, Redo2, Save, Sparkles, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CopilotPanel, type CopilotMessage } from "@/components/resume/CopilotPanel";
import { ResumePreview } from "@/components/resume/ResumePreview";
import { SectionSidebar } from "@/components/resume/SectionSidebar";
import { StyleControls } from "@/components/resume/StyleControls";
import { ExportMenu } from "@/components/resume/ExportMenu";

import {
  changeTemplate,
  copilotRewrite,
  fetchResume,
  generateResume,
  regenerateResume,
  updateResume,
} from "@/lib/careerpilot.functions";
import {
  TEMPLATES,
  normalizeResume,
  type ResumeContent,
  type ResumeLayout,
  type SectionId,
  type TemplateId,
} from "@/lib/resume-schema";

export const Route = createFileRoute("/_authenticated/resume/$resumeId")({
  head: () => ({
    meta: [
      { title: "Resume editor — CareerPilot AI" },
      {
        name: "description",
        content:
          "Edit your resume inline, reorder sections, switch templates and refine content with the AI copilot — with auto-save and undo.",
      },
      { property: "og:title", content: "Resume editor — CareerPilot AI" },
      {
        property: "og:description",
        content: "Live ATS resume preview with inline editing and an AI copilot.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ResumeEditor,
});

const AUTOSAVE_MS = 1500;
const MAX_HISTORY = 40;

function ResumeEditor() {
  const { resumeId } = Route.useParams();
  const navigate = useNavigate();
  const runFetch = useServerFn(fetchResume);
  const runGenerate = useServerFn(generateResume);
  const runRegenerate = useServerFn(regenerateResume);
  const runUpdate = useServerFn(updateResume);
  const runCopilot = useServerFn(copilotRewrite);
  const runTemplate = useServerFn(changeTemplate);

  const [resume, setResume] = useState<ResumeContent | null>(null);
  const [template, setTemplate] = useState<TemplateId>("atlas");
  const [title, setTitle] = useState("");
  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  const [section, setSection] = useState<SectionId | "all">("all");
  const [generating, setGenerating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  // Undo / redo stacks of past resume snapshots.
  const past = useRef<ResumeContent[]>([]);
  const future = useRef<ResumeContent[]>([]);
  const [historyTick, setHistoryTick] = useState(0);

  const {
    data: row,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["resume", resumeId],
    queryFn: () => runFetch({ data: { resumeId } }),
  });

  useEffect(() => {
    if (!row) return;
    setResume(normalizeResume(row.content));
    setTemplate((row.template as TemplateId) ?? "atlas");
    setTitle(row.title);
  }, [row]);

  /** Every mutation goes through here so undo history stays complete. */
  const commit = useCallback((next: ResumeContent) => {
    setResume((current) => {
      if (current) {
        past.current = [...past.current, current].slice(-MAX_HISTORY);
        future.current = [];
      }
      return next;
    });
    setDirty(true);
    setHistoryTick((t) => t + 1);
  }, []);

  const save = useCallback(
    async (content: ResumeContent, patch?: { title?: string; template?: TemplateId }) => {
      setSaving(true);
      try {
        await runUpdate({
          data: {
            resumeId,
            content,
            title: patch?.title ?? title,
            template: patch?.template ?? template,
          },
        });
        setDirty(false);
        setSavedAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
        return true;
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not save your changes.");
        return false;
      } finally {
        setSaving(false);
      }
    },
    [resumeId, runUpdate, template, title],
  );

  // Debounced auto-save.
  useEffect(() => {
    if (!dirty || !resume) return;
    const timer = setTimeout(() => void save(resume), AUTOSAVE_MS);
    return () => clearTimeout(timer);
  }, [dirty, resume, save]);

  const undo = useCallback(() => {
    const previous = past.current[past.current.length - 1];
    if (!previous) return;
    past.current = past.current.slice(0, -1);
    setResume((current) => {
      if (current) future.current = [...future.current, current];
      return previous;
    });
    setDirty(true);
    setHistoryTick((t) => t + 1);
  }, []);

  const redo = useCallback(() => {
    const next = future.current[future.current.length - 1];
    if (!next) return;
    future.current = future.current.slice(0, -1);
    setResume((current) => {
      if (current) past.current = [...past.current, current];
      return next;
    });
    setDirty(true);
    setHistoryTick((t) => t + 1);
  }, []);

  // Keyboard: ⌘/Ctrl+Z undo, ⇧⌘/Ctrl+Z redo, ⌘/Ctrl+S save.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey)) return;
      const key = event.key.toLowerCase();
      if (key === "z") {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
      }
      if (key === "s") {
        event.preventDefault();
        if (resume) void save(resume);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [redo, undo, resume, save]);

  async function handleGenerate() {
    if (!resume) return;
    const hasContent = Boolean(resume.name || resume.summary || resume.experience.length);
    setGenerating(true);
    try {
      const result = hasContent
        ? await runRegenerate({ data: { resumeId } })
        : await runGenerate({ data: { resumeId } });
      commit({ ...normalizeResume(result.resume), layout: resume.layout });
      setDirty(false);
      toast.success(
        result.scaffold
          ? "Scaffold created — add uploads or links for a richer resume."
          : `Resume ready · ATS score ${result.atsScore}`,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Generation failed.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleCopilot(instruction: string) {
    if (!resume) return;
    setMessages((prev) => [...prev, { role: "user", text: instruction }]);
    setEditing(true);
    try {
      const result = await runCopilot({
        data: { resume, instruction, section, targetRole: row?.target_role ?? undefined },
      });
      const next = { ...normalizeResume(result.resume), layout: resume.layout };
      commit(next);
      await save(next);
      setMessages((prev) => [
        ...prev,
        { role: "copilot", text: result.note, changes: result.changes },
      ]);
    } catch (err) {
      const message = err instanceof Error ? err.message : "The copilot couldn't apply that.";
      setMessages((prev) => [...prev, { role: "copilot", text: message, error: true }]);
      toast.error(message);
    } finally {
      setEditing(false);
    }
  }

  async function handleTemplate(id: TemplateId) {
    setTemplate(id); // instant preview update
    try {
      await runTemplate({ data: { resumeId, template: id } });
    } catch {
      toast.error("Could not save the template choice.");
    }
  }

  function handleLayout(layout: ResumeLayout) {
    if (!resume) return;
    commit({ ...resume, layout });
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground">
        <Loader2 className="mr-2 size-4 animate-spin" /> Loading resume…
      </div>
    );
  }

  if (error || !resume) {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <p className="font-medium">We couldn’t load this resume.</p>
        <p className="mt-1 text-sm text-muted-foreground">
          It may have been deleted, or your session expired.
        </p>
        <Button className="mt-4" onClick={() => navigate({ to: "/dashboard" })}>
          Back to dashboard
        </Button>
      </div>
    );
  }

  const hasContent = Boolean(resume.name || resume.summary || resume.experience.length);
  const counts: Record<SectionId, number> = {
    summary: resume.summary ? 1 : 0,
    skills: resume.skills.length,
    experience: resume.experience.length,
    projects: resume.projects.length,
    education: resume.education.length,
    certifications: resume.certifications.length,
  };

  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 py-6">
      {/* Toolbar */}
      <div className="mb-5 flex flex-wrap items-center gap-3 print:hidden">
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/dashboard" })}>
          <ArrowLeft className="size-4" /> Back
        </Button>
        <Input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setDirty(true);
          }}
          className="h-9 max-w-xs font-medium"
          aria-label="Resume title"
        />
        <span
          aria-live="polite"
          className="flex items-center gap-1.5 text-xs text-muted-foreground"
        >
          {saving ? (
            <>
              <Loader2 className="size-3 animate-spin" /> Saving…
            </>
          ) : dirty ? (
            "Unsaved changes"
          ) : savedAt ? (
            <>
              <Check className="size-3 text-primary" /> Saved {savedAt}
            </>
          ) : null}
        </span>

        <div className="ml-auto flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={undo}
            disabled={past.current.length === 0}
            aria-label="Undo"
            title="Undo (Ctrl+Z)"
            data-history={historyTick}
          >
            <Undo2 className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={redo}
            disabled={future.current.length === 0}
            aria-label="Redo"
            title="Redo (Ctrl+Shift+Z)"
          >
            <Redo2 className="size-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => void save(resume)} disabled={saving}>
            <Save className="size-4" /> Save
          </Button>
          <ExportMenu
            filename={title || "resume"}
            margin={resume.style.margin}
            disabled={!hasContent}
          />

          <Button size="sm" onClick={handleGenerate} disabled={generating}>
            {generating ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}
            {hasContent ? "Regenerate" : "Generate with AI"}
          </Button>
        </div>
      </div>

      {/* Templates */}
      <div className="mb-5 flex flex-wrap gap-2 print:hidden">
        {TEMPLATES.map((item) => (
          <button
            key={item.id}
            onClick={() => handleTemplate(item.id)}
            aria-pressed={template === item.id}
            className={`rounded-lg border px-3 py-2 text-left text-xs transition-colors ${
              template === item.id
                ? "border-primary bg-accent text-accent-foreground"
                : "border-border bg-card text-muted-foreground hover:border-primary/50"
            }`}
          >
            <span className="block font-semibold text-foreground">{item.name}</span>
            {item.blurb}
          </button>
        ))}
      </div>

      {/* Three panels: sections · live preview · copilot */}
      <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[220px_minmax(0,1fr)_360px]">
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start print:hidden">
          <SectionSidebar layout={resume.layout} counts={counts} onChange={handleLayout} />
          <StyleControls style={resume.style} onChange={(style) => commit({ ...resume, style })} />
        </aside>

        <div>
          {hasContent ? (
            <ResumePreview
              resume={resume}
              template={template}
              editable
              onChange={(next) => commit(next)}
            />
          ) : (
            <div className="rounded-xl border border-dashed border-border p-16 text-center print:hidden">
              <Sparkles className="mx-auto size-6 text-primary" />
              <p className="mt-3 font-medium">Nothing generated yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Hit “Generate with AI” to turn your uploads and links into an ATS-friendly resume.
              </p>
            </div>
          )}
        </div>

        <div className="h-[640px] xl:sticky xl:top-24 print:hidden">
          <CopilotPanel
            messages={messages}
            busy={editing}
            section={section}
            onSectionChange={setSection}
            onSend={handleCopilot}
          />
        </div>
      </div>
    </div>
  );
}
