import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { FileUp, Github, Linkedin, Loader2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createResume } from "@/lib/create-resume";

export const Route = createFileRoute("/_authenticated/upload")({
  head: () => ({
    meta: [
      { title: "Upload center — CareerPilot AI" },
      {
        name: "description",
        content: "Drop a resume file or paste your GitHub and LinkedIn links to start a draft.",
      },
      { property: "og:title", content: "Upload center — CareerPilot AI" },
      { property: "og:description", content: "Bring your existing material into CareerPilot AI." },
    ],
  }),
  component: UploadCenter,
});

const ACCEPTED = ".txt,.md,.markdown,.json,.csv";

function UploadCenter() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);

  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState("");
  const [sourceText, setSourceText] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [busy, setBusy] = useState(false);

  /** Reads a plain-text resume into the draft textarea. */
  async function readFile(file: File) {
    try {
      const text = await file.text();
      setSourceText(text.slice(0, 40000));
      setFileName(file.name);
      toast.success(`Loaded ${file.name}`);
    } catch {
      toast.error("Couldn't read that file. Paste the text instead.");
    }
  }

  function handleDrop(event: React.DragEvent) {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) void readFile(file);
  }

  async function handleContinue() {
    if (!sourceText.trim() && !githubUrl.trim() && !linkedinUrl.trim()) {
      toast.error("Add a file, some text, or a profile link first.");
      return;
    }
    setBusy(true);
    try {
      const id = await createResume({
        title: fileName ? fileName.replace(/\.[^.]+$/, "") : "Imported resume",
        sourceText,
        githubUrl,
        linkedinUrl,
      });
      await queryClient.invalidateQueries({ queryKey: ["resumes"] });
      navigate({ to: "/resume/$resumeId", params: { resumeId: id } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create the resume.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Upload center"
        description="Drop your current resume, paste raw notes, or link your profiles."
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="space-y-6">
          <div
            role="button"
            tabIndex={0}
            aria-label="Upload a resume file"
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                inputRef.current?.click();
              }
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            className={`flex min-h-64 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              dragging ? "border-primary bg-accent/50" : "border-border bg-card hover:bg-muted/50"
            }`}
          >
            <span className="flex size-14 items-center justify-center rounded-full bg-accent text-accent-foreground">
              <UploadCloud className="size-7" aria-hidden />
            </span>
            <p className="mt-4 font-display text-lg font-semibold">
              Drag & drop your resume here
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              or click to browse — .txt, .md, .json or .csv up to 40,000 characters
            </p>
            {fileName && (
              <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-success/15 px-3 py-1 text-xs font-medium text-success">
                <FileUp className="size-3.5" aria-hidden /> {fileName}
              </p>
            )}
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED}
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void readFile(file);
              }}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pasted">Or paste your content</Label>
            <Textarea
              id="pasted"
              rows={10}
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              placeholder="Paste your resume text, work history or project notes…"
            />
            <p className="text-xs text-muted-foreground">
              {sourceText.length.toLocaleString()} characters
            </p>
          </div>
        </section>

        <aside className="h-fit space-y-4 rounded-xl border border-border bg-card p-5 shadow-soft">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Profile links
          </h2>
          <div className="space-y-1.5">
            <Label htmlFor="gh" className="flex items-center gap-1.5">
              <Github className="size-3.5" aria-hidden /> GitHub
            </Label>
            <Input
              id="gh"
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              placeholder="https://github.com/username"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="li" className="flex items-center gap-1.5">
              <Linkedin className="size-3.5" aria-hidden /> LinkedIn
            </Label>
            <Input
              id="li"
              value={linkedinUrl}
              onChange={(e) => setLinkedinUrl(e.target.value)}
              placeholder="https://linkedin.com/in/username"
            />
          </div>
          <Button className="w-full" onClick={handleContinue} disabled={busy}>
            {busy && <Loader2 className="size-4 animate-spin" />}
            Continue to builder
          </Button>
          <p className="text-xs text-muted-foreground">
            We never publish your material — it is stored privately against your account.
          </p>
        </aside>
      </div>
    </>
  );
}
