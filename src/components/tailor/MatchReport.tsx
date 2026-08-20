import { AlertTriangle, CheckCircle2, Lightbulb } from "lucide-react";
import { scoreTone, type JobMatch } from "@/lib/job-schema";
import { cn } from "@/lib/utils";

const TONE: Record<ReturnType<typeof scoreTone>, string> = {
  strong: "text-success",
  fair: "text-primary",
  weak: "text-destructive",
};

const SEVERITY: Record<string, string> = {
  high: "bg-destructive/12 text-destructive",
  medium: "bg-primary/12 text-primary",
  low: "bg-muted text-muted-foreground",
};

/** Circular match gauge — no chart library, prints cleanly. */
export function MatchScoreRing({ score, label }: { score: number; label?: string }) {
  const tone = scoreTone(score);
  const dash = Math.max(0, Math.min(100, score));
  return (
    <div className="flex items-center gap-4">
      <div
        className="relative size-20 shrink-0"
        role="img"
        aria-label={`Match score ${score} out of 100`}
      >
        <svg viewBox="0 0 36 36" className="size-20 -rotate-90">
          <circle cx="18" cy="18" r="15.9" fill="none" strokeWidth="3" className="stroke-muted" />
          <circle
            cx="18"
            cy="18"
            r="15.9"
            fill="none"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={`${dash} 100`}
            className={cn("transition-all duration-700", TONE[tone], "stroke-current")}
          />
        </svg>
        <span
          className={cn(
            "absolute inset-0 flex items-center justify-center text-lg font-semibold",
            TONE[tone],
          )}
        >
          {score}
        </span>
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium">{label ?? "Match score"}</p>
        <p className="text-xs text-muted-foreground">
          {tone === "strong"
            ? "Strong fit — tailor it and apply."
            : tone === "fair"
              ? "Reasonable fit — close the gaps below."
              : "Stretch role — be selective about what you claim."}
        </p>
      </div>
    </div>
  );
}

/** Matched requirements + honest gap suggestions. */
export function MatchReport({ match }: { match: JobMatch }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card p-5 shadow-soft">
        <MatchScoreRing score={match.score} />
        <div className="text-right">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            ATS keyword coverage
          </p>
          <p className="text-2xl font-semibold">{match.keywordCoverage}%</p>
        </div>
      </div>

      {match.verdict && <p className="text-sm text-muted-foreground">{match.verdict}</p>}

      <div className="grid gap-6 md:grid-cols-2">
        <section aria-labelledby="matched-heading">
          <h3
            id="matched-heading"
            className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground"
          >
            <CheckCircle2 className="size-3.5 text-success" aria-hidden /> Already evidenced
          </h3>
          {match.matched.length ? (
            <ul className="space-y-2">
              {match.matched.map((item) => (
                <li
                  key={item}
                  className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
                >
                  {item}
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
              Nothing matched yet — add more career material and re-run the match.
            </p>
          )}
        </section>

        <section aria-labelledby="gaps-heading">
          <h3
            id="gaps-heading"
            className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground"
          >
            <AlertTriangle className="size-3.5 text-destructive" aria-hidden /> Missing or weak
          </h3>
          {match.missing.length ? (
            <ul className="space-y-2">
              {match.missing.map((gap) => (
                <li
                  key={gap.requirement}
                  className="rounded-lg border border-border bg-card px-3 py-2.5 text-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="font-medium">{gap.requirement}</span>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium capitalize",
                        SEVERITY[gap.severity],
                      )}
                    >
                      {gap.severity}
                    </span>
                  </div>
                  <p className="mt-1.5 flex gap-1.5 text-xs text-muted-foreground">
                    <Lightbulb className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                    {gap.suggestion}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
              No meaningful gaps found. Nice.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
