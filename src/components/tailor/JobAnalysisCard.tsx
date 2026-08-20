import { Building2, MapPin, Target } from "lucide-react";
import type { JobAnalysis } from "@/lib/job-schema";

/** Read-only view of the requirements extracted from a job description. */
export function JobAnalysisCard({ analysis }: { analysis: JobAnalysis }) {
  const hard = analysis.requirements.filter((r) => r.kind === "hard");
  const soft = analysis.requirements.filter((r) => r.kind === "soft");

  return (
    <div className="space-y-5 rounded-xl border border-border bg-card p-5 shadow-soft">
      <div>
        <h2 className="text-lg font-semibold">{analysis.role || "Role"}</h2>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          {analysis.company && (
            <span className="inline-flex items-center gap-1.5">
              <Building2 className="size-3.5" aria-hidden />
              {analysis.company}
            </span>
          )}
          {analysis.location && (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="size-3.5" aria-hidden />
              {analysis.location}
            </span>
          )}
          {analysis.seniority && (
            <span className="inline-flex items-center gap-1.5">
              <Target className="size-3.5" aria-hidden />
              {analysis.seniority}
            </span>
          )}
        </p>
      </div>

      {analysis.summary && <p className="text-sm leading-relaxed">{analysis.summary}</p>}

      <RequirementList title="Must-haves" items={hard.map((r) => r.label)} />
      <RequirementList title="Nice-to-haves" items={soft.map((r) => r.label)} />

      {analysis.keywords.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            ATS keywords
          </h3>
          <ul className="flex flex-wrap gap-1.5">
            {analysis.keywords.map((k) => (
              <li
                key={k}
                className="rounded-full bg-accent px-2.5 py-1 text-xs text-accent-foreground"
              >
                {k}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function RequirementList({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {title}
      </h3>
      <ul className="space-y-1.5 text-sm">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
