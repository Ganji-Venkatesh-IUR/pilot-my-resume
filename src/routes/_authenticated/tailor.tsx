import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { FileUp, Loader2, Sparkles, Target, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { analyzeJob, deleteJobTarget, fetchJobHistory } from "@/lib/tailor.functions";
import { resumeService } from "@/services/resume.service";
import { scoreTone } from "@/lib/job-schema";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/tailor")({
  head: () => ({
    meta: [
      { title: "Job analyzer & resume tailoring — CareerPilot AI" },
      {
        name: "description",
        content:
          "Paste a job description, see your match score and missing skills, then generate a tailored resume that keeps every fact true.",
      },
      { property: "og:title", content: "Job analyzer & resume tailoring — CareerPilot AI" },
      {
        property: "og:description",
        content: "Match your resume against any job description and tailor it in one click.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TailorPage,
});

const MIN_JD = 80;

function TailorPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const runAnalyze = useServerFn(analyzeJob);
  const runHistory = useServerFn(fetchJobHistory);
  const runDelete = useServerFn(deleteJobTarget);
  const fileRef = useRef<HTMLInputElement>(null);

  const [jdText, setJdText] = useState("");
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [baseResumeId, setBaseResumeId] = useState("");
  const [analyzing, setAnalyzing] = useState(false);

  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ["job-targets"],
    queryFn: () => runHistory({}),
  });

  const { data: resumes } = useQuery({
    queryKey: ["resumes"],
    queryFn: () => resumeService.list(),
  });

  /** Plain-text JD upload; PDFs are handled by the upload center. */
  async function handleFile(file: File | undefined) {
    if (!file) return;
    if (file.size > 400_000) {
      toast.error("That file is too large — paste the description instead.");
      return;
    }
    try {
      const text = await file.text();
      setJdText(text.slice(0, 12_000));
      toast.success(`Loaded ${file.name}`);
    } catch {
      toast.error("Could not read that file. Try pasting the text.");
    }
  }

  async function handleAnalyze(event: React.FormEvent) {
    event.preventDefault();
    if (jdText.trim().length < MIN_JD) {
      toast.error("Paste a fuller job description first.");
      return;
    }
    setAnalyzing(true);
    try {
      const result = await runAnalyze({
        data: {
          jdText,
          title: title.trim() || undefined,
          company: company.trim() || undefined,
          baseResumeId: baseResumeId || undefined,
        },
      });
      await queryClient.invalidateQueries({ queryKey: ["job-targets"] });
      toast.success("Job description analyzed");
      navigate({ to: "/tailor/$jobId", params: { jobId: result.id } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Analysis failed. Please try again.");
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleDelete(jobId: string) {
    try {
      await runDelete({ data: { jobId } });
      await queryClient.invalidateQueries({ queryKey: ["job-targets"] });
      toast.success("Removed from history");
    } catch {
      toast.error("Could not remove that entry.");
    }
  }

  return (
    <>
      <PageHeader
        title="Job analyzer & tailoring"
        description="Paste a job description, see how you match, then tailor your resume without bending the truth."
      />

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_420px]">
        <section
          aria-labelledby="jd-heading"
          className="rounded-xl border border-border bg-card p-5 shadow-soft"
        >
          <h2
            id="jd-heading"
            className="text-xs font-semibold uppercase tracking-widest text-muted-foreground"
          >
            New job description
          </h2>

          <form onSubmit={handleAnalyze} className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="job-title">Role title (optional)</Label>
                <Input
                  id="job-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Senior Frontend Engineer"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="job-company">Company (optional)</Label>
                <Input
                  id="job-company"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Northwind"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="base-resume">Resume to compare</Label>
              <select
                id="base-resume"
                value={baseResumeId}
                onChange={(e) => setBaseResumeId(e.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Choose later</option>
                {(resumes ?? []).map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="jd">Job description</Label>
                <span className="text-xs text-muted-foreground">{jdText.length} characters</span>
              </div>
              <Textarea
                id="jd"
                value={jdText}
                onChange={(e) => setJdText(e.target.value)}
                rows={14}
                placeholder="Paste the full job posting here — responsibilities, requirements, nice-to-haves."
              />
              <div className="flex items-center gap-2 pt-1">
                <input
                  ref={fileRef}
                  type="file"
                  accept=".txt,.md,text/plain,text/markdown"
                  className="sr-only"
                  onChange={(e) => handleFile(e.target.files?.[0])}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileRef.current?.click()}
                >
                  <FileUp className="size-4" aria-hidden /> Upload .txt
                </Button>
                <p className="text-xs text-muted-foreground">
                  PDF postings? Paste the text — it parses more reliably.
                </p>
              </div>
            </div>

            <Button type="submit" disabled={analyzing} className="w-full">
              {analyzing ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden /> Reading the posting…
                </>
              ) : (
                <>
                  <Sparkles className="size-4" aria-hidden /> Analyze job description
                </>
              )}
            </Button>
            {analyzing && (
              <p role="status" className="text-center text-xs text-muted-foreground">
                Extracting requirements and ATS keywords. This takes a few seconds.
              </p>
            )}
          </form>
        </section>

        <section aria-labelledby="history-heading">
          <h2
            id="history-heading"
            className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground"
          >
            Analyzed roles
          </h2>

          {historyLoading ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden /> Loading history…
            </p>
          ) : history && history.length > 0 ? (
            <ul className="space-y-3">
              {history.map((job) => (
                <li
                  key={job.id}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-soft transition-shadow hover:shadow-lift"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                    <Target className="size-5" aria-hidden />
                  </span>
                  <Link
                    to="/tailor/$jobId"
                    params={{ jobId: job.id }}
                    className="min-w-0 flex-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <p className="truncate font-medium">{job.title}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {job.company ?? "Company not set"} ·{" "}
                      {new Date(job.createdAt).toLocaleDateString()} · {job.status}
                    </p>
                  </Link>
                  {job.matchScore !== null && (
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2.5 py-1 text-xs font-medium",
                        scoreTone(job.matchScore) === "strong"
                          ? "bg-success/15 text-success"
                          : scoreTone(job.matchScore) === "fair"
                            ? "bg-primary/12 text-primary"
                            : "bg-destructive/12 text-destructive",
                      )}
                    >
                      {job.matchScore}% match
                    </span>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove ${job.title} from history`}
                    onClick={() => handleDelete(job.id)}
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-xl border border-dashed border-border p-10 text-center">
              <Target className="mx-auto size-8 text-muted-foreground" aria-hidden />
              <p className="mt-3 text-sm font-medium">No roles analyzed yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Paste your first job description and CareerPilot will show exactly where you match —
                and where you don&apos;t.
              </p>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
