import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Github, Globe, Linkedin, Loader2, Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DropZone,
  RecentUploads,
  UploadQueue,
  type QueueItem,
} from "@/components/upload/UploadParts";
import { LINK_RULES, validateLink, type LinkKind } from "@/lib/upload-links";
import { uploadService, MAX_EXTRACT_CHARS, type UploadRecord } from "@/services/upload.service";
import { resumeService } from "@/services/resume.service";

export const Route = createFileRoute("/_authenticated/upload")({
  head: () => ({
    meta: [
      { title: "AI upload center — CareerPilot AI" },
      {
        name: "description",
        content:
          "Drag and drop resumes and career documents or paste your GitHub, LinkedIn and portfolio links to feed CareerPilot AI.",
      },
      { property: "og:title", content: "AI upload center — CareerPilot AI" },
      {
        property: "og:description",
        content: "Bring resumes, certificates and profile links into CareerPilot AI.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: UploadCenter,
});

const LINK_ICONS = { github: Github, linkedin: Linkedin, portfolio: Globe } as const;

function UploadCenter() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [notes, setNotes] = useState("");
  const [links, setLinks] = useState<Record<LinkKind, string>>({
    github: "",
    linkedin: "",
    portfolio: "",
  });
  const [linkErrors, setLinkErrors] = useState<Partial<Record<LinkKind, string>>>({});
  const [savingLink, setSavingLink] = useState<LinkKind | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const uploadsQuery = useQuery({
    queryKey: ["uploads"],
    queryFn: () => uploadService.list(),
  });
  const uploads = uploadsQuery.data ?? [];

  function refresh() {
    return queryClient.invalidateQueries({ queryKey: ["uploads"] });
  }

  /** Uploads dropped files one by one, tracking per-file progress. */
  async function handleFiles(files: File[]) {
    for (const file of files) {
      const id = crypto.randomUUID();
      setQueue((q) => [
        ...q,
        { id, name: file.name, size: file.size, progress: 5, status: "uploading" },
      ]);

      try {
        await uploadService.uploadFile(file, (pct) =>
          setQueue((q) => q.map((i) => (i.id === id ? { ...i, progress: pct } : i))),
        );
        setQueue((q) =>
          q.map((i) => (i.id === id ? { ...i, progress: 100, status: "done" } : i)),
        );
        toast.success(`${file.name} uploaded`);
        await refresh();
        setTimeout(() => setQueue((q) => q.filter((i) => i.id !== id)), 4000);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Upload failed.";
        setQueue((q) =>
          q.map((i) => (i.id === id ? { ...i, status: "error", error: message } : i)),
        );
        toast.error(message);
      }
    }
  }

  async function saveLink(kind: LinkKind) {
    const check = validateLink(kind, links[kind]);
    if (!check.ok) {
      setLinkErrors((e) => ({ ...e, [kind]: check.error }));
      return;
    }
    setLinkErrors((e) => ({ ...e, [kind]: undefined }));
    setSavingLink(kind);
    try {
      await uploadService.addLink(kind, links[kind]);
      setLinks((l) => ({ ...l, [kind]: "" }));
      toast.success(`${LINK_RULES[kind].label} link saved`);
      await refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not save that link.";
      setLinkErrors((e) => ({ ...e, [kind]: message }));
      toast.error(message);
    } finally {
      setSavingLink(null);
    }
  }

  const removeMutation = useMutation({
    mutationFn: (item: UploadRecord) => uploadService.remove(item),
    onMutate: (item) => setRemovingId(item.id),
    onSuccess: async () => {
      toast.success("Removed");
      await refresh();
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Could not remove that item."),
    onSettled: () => setRemovingId(null),
  });

  /**
   * Assembles everything collected here into a draft resume so prompt seven's
   * generation engine has a single record to work from.
   */
  async function createDraft() {
    const extracted = uploads
      .filter((u) => u.extracted_text)
      .map((u) => `--- ${u.label} ---\n${u.extracted_text}`)
      .join("\n\n");
    const combined = [notes.trim(), extracted].filter(Boolean).join("\n\n").slice(
      0,
      MAX_EXTRACT_CHARS,
    );
    const github = uploads.find((u) => u.kind === "github")?.source_url ?? "";
    const linkedin = uploads.find((u) => u.kind === "linkedin")?.source_url ?? "";

    if (!combined && !github && !linkedin) {
      toast.error("Upload a document, add notes, or save a profile link first.");
      return;
    }

    setCreating(true);
    try {
      const id = await resumeService.create({
        title: "Imported resume",
        sourceText: combined,
        githubUrl: github,
        linkedinUrl: linkedin,
      });
      await queryClient.invalidateQueries({ queryKey: ["resumes"] });
      navigate({ to: "/resume/$resumeId", params: { resumeId: id } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create the draft.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <>
      <PageHeader
        title="AI upload center"
        description="Drop resumes and career documents, or paste the profile links we should learn from."
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="space-y-6">
          <DropZone onFiles={handleFiles} />
          <UploadQueue items={queue} />

          <div className="space-y-1.5">
            <Label htmlFor="notes">Extra notes (optional)</Label>
            <Textarea
              id="notes"
              rows={8}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Paste raw work history, achievements or project notes…"
            />
            <p className="text-xs text-muted-foreground">
              {notes.length.toLocaleString()} characters
            </p>
          </div>

          <section aria-labelledby="recent-uploads" className="space-y-3">
            <h2 id="recent-uploads" className="font-display text-lg font-semibold">
              Recent uploads
            </h2>
            <RecentUploads
              items={uploads}
              loading={uploadsQuery.isLoading}
              onRemove={(item) => removeMutation.mutate(item)}
              removingId={removingId}
            />
          </section>
        </section>

        <aside className="h-fit space-y-5 rounded-xl border border-border bg-card p-5 shadow-soft">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Profile links
          </h2>

          {(Object.keys(LINK_RULES) as LinkKind[]).map((kind) => {
            const rule = LINK_RULES[kind];
            const Icon = LINK_ICONS[kind];
            const error = linkErrors[kind];
            return (
              <div key={kind} className="space-y-1.5">
                <Label htmlFor={`link-${kind}`} className="flex items-center gap-1.5">
                  <Icon className="size-3.5" aria-hidden /> {rule.label}
                </Label>
                <div className="flex gap-2">
                  <Input
                    id={`link-${kind}`}
                    value={links[kind]}
                    placeholder={rule.placeholder}
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? `link-${kind}-error` : undefined}
                    onChange={(e) => setLinks((l) => ({ ...l, [kind]: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void saveLink(kind);
                      }
                    }}
                  />
                  <Button
                    variant="secondary"
                    size="icon"
                    aria-label={`Save ${rule.label} link`}
                    disabled={savingLink === kind}
                    onClick={() => void saveLink(kind)}
                  >
                    {savingLink === kind ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Plus className="size-4" />
                    )}
                  </Button>
                </div>
                {error && (
                  <p id={`link-${kind}-error`} role="alert" className="text-xs text-destructive">
                    {error}
                  </p>
                )}
              </div>
            );
          })}

          <Button className="w-full" onClick={createDraft} disabled={creating}>
            {creating ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" aria-hidden />
            )}
            Create draft from uploads
          </Button>
          <p className="text-xs text-muted-foreground">
            Files stay private to your account. Text formats are read immediately; PDFs and Word
            files are stored ready for AI extraction.
          </p>
        </aside>
      </div>
    </>
  );
}
