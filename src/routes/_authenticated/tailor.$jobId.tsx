import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, PencilRuler, Sparkles, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { JobAnalysisCard } from "@/components/tailor/JobAnalysisCard";
import { MatchReport } from "@/components/tailor/MatchReport";
import { ResumePreview } from "@/components/resume/ResumePreview";
import { fetchJobTarget, matchJob, tailorForJob } from "@/lib/tailor.functions";
import { resumeService } from "@/services/resume.service";
import { DEFAULT_TEMPLATE, type TemplateId } from "@/lib/resume-schema";

export const Route = createFileRoute("/_authenticated/tailor/$jobId")({
  head: () => ({
    meta: [
      { title: "Role match & tailored resume — CareerPilot AI" },
      {
        name: "description",
        content:
          "Review extracted job requirements, your match score and missing skills, then compare the original and tailored resume side by side.",
      },
      { property: "og:title", content: "Role match & tailored resume — CareerPilot AI" },
      {
        property: "og:description",
        content: "Match score, safe gap suggestions and a truthful tailored resume.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: JobTargetPage,
});

function JobTargetPage() {
  const { jobId } = Route.useParams();
  const navigate = useNavigate();
  const runFetch = useServerFn(fetchJobTarget);
  const runMatch = useServerFn(matchJob);
  const runTailor = useServerFn(tailorForJob);

  const [resumeId, setResumeId] = useState("");
  const [matching, setMatching] = useState(false);
  const [tailoring, setTailoring] = useState(false);
  const [changes, setChanges] = useState<string[]>([]);

  const detail = useQuery({
    queryKey: ["job-target", jobId],
    queryFn: () => runFetch({ data: { jobId } }),
  });

  const resumes = useQuery({
    queryKey: ["resumes"],
    queryFn: () => resumeService.list(),
  });

  // Preselect the resume already linked to this job target.
  useEffect(() => {
    const linked = detail.data?.row.base_resume_id;
    if (linked && !resumeId) setResumeId(linked);
  }, [detail.data?.row.base_resume_id, resumeId]);

  async function handleMatch() {
    if (!resumeId) {
      toast.error("Pick a resume to compare against.");
      return;
    }
    setMatching(true);
    try {
      await runMatch({ data: { jobId, resumeId } });
      await detail.refetch();
      toast.success("Match report ready");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not compute the match.");
    } finally {
      setMatching(false);
    }
  }

  async function handleTailor() {
    if (!resumeId) {
      toast.error("Pick the resume you want tailored.");
      return;
    }
    setTailoring(true);
    try {
      const result = await runTailor({ data: { jobId, resumeId } });
      setChanges(result.changes);
      await detail.refetch();
      toast.success(result.note || "Tailored version saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Tailoring failed. Please try again.");
    } finally {
      setTailoring(false);
    }
  }

  if (detail.isLoading) {
    return (
      <p className="flex items-center gap-2 py-16 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" aria-hidden /> Loading this role…
      </p>
    );
  }

  if (detail.isError || !detail.data) {
    return (
      <div className="rounded-xl border border-dashed border-border p-10 text-center">
        <p className="text-sm font-medium">We couldn&apos;t load this role.</p>
        <Button className="mt-4" variant="outline" onClick={() => navigate({ to: "/tailor" })}>
          Back to job analyzer
        </Button>
      </div>
    );
  }

  const { row, analysis, match, baseResume, tailoredResume, baseTitle, tailoredTitle } =
    detail.data;
  const template = (resumes.data?.find((r) => r.id === row.base_resume_id)?.template ??
    DEFAULT_TEMPLATE) as TemplateId;

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <Link
            to="/tailor"
            className="mb-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" aria-hidden /> All roles
          </Link>
          <h1 className="truncate text-2xl font-semibold sm:text-3xl">{row.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {row.company ?? "Company not set"} · analyzed{" "}
            {new Date(row.created_at).toLocaleDateString()}
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1.5">
            <Label htmlFor="resume-picker" className="text-xs">
              Resume
            </Label>
            <select
              id="resume-picker"
              value={resumeId}
              onChange={(e) => setResumeId(e.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Select a resume…</option>
              {(resumes.data ?? []).map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title}
                </option>
              ))}
            </select>
          </div>
          <Button variant="outline" onClick={handleMatch} disabled={matching || tailoring}>
            {matching ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden /> Matching…
              </>
            ) : (
              <>
                <Sparkles className="size-4" aria-hidden /> Run match
              </>
            )}
          </Button>
          <Button onClick={handleTailor} disabled={tailoring || matching}>
            {tailoring ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden /> Tailoring…
              </>
            ) : (
              <>
                <Wand2 className="size-4" aria-hidden />{" "}
                {tailoredResume ? "Re-tailor resume" : "Tailor resume"}
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="grid gap-8 xl:grid-cols-[380px_minmax(0,1fr)]">
        <div className="space-y-6">
          {analysis ? (
            <JobAnalysisCard analysis={analysis} />
          ) : (
            <p className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
              No analysis stored for this role.
            </p>
          )}
        </div>

        <div className="space-y-8">
          <section aria-labelledby="match-heading">
            <h2
              id="match-heading"
              className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground"
            >
              Match report
            </h2>
            {matching ? (
              <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" aria-hidden /> Comparing your experience
                against every requirement…
              </p>
            ) : match ? (
              <MatchReport match={match} />
            ) : (
              <div className="rounded-xl border border-dashed border-border p-10 text-center">
                <Sparkles className="mx-auto size-8 text-muted-foreground" aria-hidden />
                <p className="mt-3 text-sm font-medium">No match report yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Pick a resume above and run the match to see your score, matched requirements and
                  safe suggestions for the gaps.
                </p>
              </div>
            )}
          </section>

          <section aria-labelledby="compare-heading">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2
                id="compare-heading"
                className="text-xs font-semibold uppercase tracking-widest text-muted-foreground"
              >
                Original vs tailored
              </h2>
              {row.tailored_resume_id && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    navigate({
                      to: "/resume/$resumeId",
                      params: { resumeId: row.tailored_resume_id as string },
                    })
                  }
                >
                  <PencilRuler className="size-4" aria-hidden /> Open tailored version
                </Button>
              )}
            </div>

            {changes.length > 0 && (
              <ul className="mb-4 space-y-1.5 rounded-xl border border-border bg-accent/40 p-4 text-sm">
                {changes.map((c) => (
                  <li key={c} className="flex gap-2">
                    <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                    {c}
                  </li>
                ))}
              </ul>
            )}

            {tailoring ? (
              <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" aria-hidden /> Rewriting and reordering
                sections — facts stay exactly as you wrote them…
              </p>
            ) : baseResume || tailoredResume ? (
              <div className="grid gap-6 lg:grid-cols-2">
                <ComparePane
                  label={`Original${baseTitle ? ` — ${baseTitle}` : ""}`}
                  resume={baseResume}
                  template={template}
                  emptyHint="Select a resume and run the match to load your original version."
                />
                <ComparePane
                  label={`Tailored${tailoredTitle ? ` — ${tailoredTitle}` : ""}`}
                  resume={tailoredResume}
                  template={template}
                  emptyHint="No tailored version yet — hit “Tailor resume” above."
                />
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
                Choose a resume to compare it side by side with a tailored version.
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  );
}

/** One column of the side-by-side comparison. */
function ComparePane({
  label,
  resume,
  template,
  emptyHint,
}: {
  label: string;
  resume: React.ComponentProps<typeof ResumePreview>["resume"] | null;
  template: TemplateId;
  emptyHint: string;
}) {
  return (
    <div className="min-w-0">
      <p className="mb-2 truncate text-xs font-medium text-muted-foreground">{label}</p>
      {resume ? (
        <div className="origin-top overflow-hidden rounded-xl border border-border">
          <ResumePreview resume={resume} template={template} />
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          {emptyHint}
        </div>
      )}
    </div>
  );
}
