import { Link, createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  FileText,
  Gauge,
  LayoutTemplate,
  Loader2,
  Sparkles,
  UploadCloud,
} from "lucide-react";
import { PageHeader } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { resumeService } from "@/services/resume.service";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — CareerPilot AI" },
      {
        name: "description",
        content: "Track your AI-generated resumes, ATS readiness and jump back into a draft.",
      },
      { property: "og:title", content: "Dashboard — CareerPilot AI" },
      { property: "og:description", content: "Your AI resume workspace at a glance." },
    ],
  }),
  component: Dashboard,
});

interface ResumeRow {
  id: string;
  title: string;
  template: string;
  target_role: string | null;
  ats_score: number | null;
  updated_at: string;
}

const QUICK_ACTIONS = [
  {
    to: "/upload" as const,
    label: "Upload a resume",
    description: "Drop a file or paste your GitHub and LinkedIn links.",
    icon: UploadCloud,
  },
  {
    to: "/builder" as const,
    label: "Start a new draft",
    description: "Name it, set a target role and let the AI write it.",
    icon: FileText,
  },
  {
    to: "/templates" as const,
    label: "Browse templates",
    description: "Five parser-safe layouts, previewed side by side.",
    icon: LayoutTemplate,
  },
  {
    to: "/copilot" as const,
    label: "Open AI copilot",
    description: "Rewrite bullets, tone and keywords in a chat.",
    icon: Sparkles,
  },
];

function Dashboard() {
  const { data: resumes, isLoading } = useQuery({
    queryKey: ["resumes"],
    queryFn: async (): Promise<ResumeRow[]> => {
      return resumeService.list();
    },
  });

  const list = resumes ?? [];
  const scored = list.filter((r) => r.ats_score !== null);
  const avgAts = scored.length
    ? Math.round(scored.reduce((sum, r) => sum + (r.ats_score ?? 0), 0) / scored.length)
    : null;
  const lastUpdated = list[0]?.updated_at;

  const summary = [
    { label: "Resumes", value: String(list.length), icon: FileText },
    { label: "Average ATS score", value: avgAts === null ? "—" : `${avgAts}`, icon: Gauge },
    {
      label: "Last activity",
      value: lastUpdated ? new Date(lastUpdated).toLocaleDateString() : "—",
      icon: Sparkles,
    },
  ];

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Everything you need to ship an ATS-friendly resume today."
        actions={
          <Button asChild>
            <Link to="/upload">
              <UploadCloud className="size-4" aria-hidden /> New resume
            </Link>
          </Button>
        }
      />

      <section aria-label="Summary" className="grid gap-4 sm:grid-cols-3">
        {summary.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-xl border border-border bg-card p-5 shadow-soft">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                {label}
              </p>
              <Icon className="size-4 text-muted-foreground" aria-hidden />
            </div>
            <p className="mt-3 font-display text-3xl font-semibold tabular-nums">
              {isLoading ? "…" : value}
            </p>
          </div>
        ))}
      </section>

      <section aria-label="Quick actions" className="mt-8">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Quick actions
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {QUICK_ACTIONS.map(({ to, label, description, icon: Icon }) => (
            <li key={to}>
              <Link
                to={to}
                className="flex h-full flex-col gap-2 rounded-xl border border-border bg-card p-5 shadow-soft transition-shadow hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="flex size-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                  <Icon className="size-4" aria-hidden />
                </span>
                <span className="font-medium">{label}</span>
                <span className="text-sm text-muted-foreground">{description}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-label="Recent resumes" className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Recent resumes
          </h2>
          <Link
            to="/builder"
            className="text-sm text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            View all
          </Link>
        </div>

        {isLoading ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden /> Loading…
          </p>
        ) : list.length > 0 ? (
          <ul className="space-y-3">
            {list.slice(0, 5).map((resume) => (
              <li key={resume.id}>
                <Link
                  to="/resume/$resumeId"
                  params={{ resumeId: resume.id }}
                  className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-soft transition-shadow hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                    <FileText className="size-5" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{resume.title}</span>
                    <span className="block truncate text-sm text-muted-foreground">
                      {resume.target_role || "No target role"} ·{" "}
                      {new Date(resume.updated_at).toLocaleDateString()}
                    </span>
                  </span>
                  {resume.ats_score !== null && (
                    <span className="rounded-full bg-success/15 px-2.5 py-1 text-xs font-medium text-success">
                      ATS {resume.ats_score}
                    </span>
                  )}
                  <ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-xl border border-dashed border-border p-10 text-center">
            <p className="text-sm text-muted-foreground">
              No resumes yet — start from an upload or a blank draft.
            </p>
            <Button asChild className="mt-4">
              <Link to="/upload">Upload your resume</Link>
            </Button>
          </div>
        )}
      </section>
    </>
  );
}
