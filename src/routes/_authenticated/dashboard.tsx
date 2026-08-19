import { Link, createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  FileText,
  Gauge,
  Github,
  Linkedin,
  Lightbulb,
  Plus,
  Sparkles,
  UploadCloud,
} from "lucide-react";
import { PageHeader } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ListSkeleton } from "@/components/common/LoadingState";
import {
  EmptyState,
  ProgressMeter,
  QuickActionCard,
  SectionCard,
  StatCard,
  SurfaceCard,
} from "@/components/dashboard/DashboardCards";
import { resumeService, type ResumeSummary } from "@/services/resume.service";
import { profileService } from "@/services/profile.service";
import { useSession } from "@/hooks/useSession";
import { formatDate, formatRelative } from "@/utils/format";

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

const QUICK_ACTIONS = [
  {
    to: "/upload",
    label: "Upload resume",
    description: "Drop a PDF or paste the text of your current resume.",
    icon: UploadCloud,
  },
  {
    to: "/upload",
    label: "Import GitHub",
    description: "Turn your repos and README highlights into bullets.",
    icon: Github,
  },
  {
    to: "/upload",
    label: "Add LinkedIn",
    description: "Pull roles and skills straight from your profile link.",
    icon: Linkedin,
  },
  {
    to: "/copilot",
    label: "Open AI Copilot",
    description: "Rewrite tone, bullets and keywords in a chat.",
    icon: Sparkles,
  },
] as const;

/** Derives an actionable suggestion list from the user's real data. */
function buildSuggestions(resumes: ResumeSummary[], completion: number) {
  const suggestions: Array<{ text: string; to: "/upload" | "/builder" | "/copilot" | "/profile" }> =
    [];

  if (resumes.length === 0) {
    suggestions.push({ text: "Upload your current resume to get a first ATS score.", to: "/upload" });
  }
  if (completion < 100) {
    suggestions.push({
      text: "Complete your profile — headline and links get reused on every resume.",
      to: "/profile",
    });
  }
  const weak = resumes.find((r) => (r.ats_score ?? 100) < 75);
  if (weak) {
    suggestions.push({
      text: `"${weak.title}" scores below 75. Ask the copilot to tighten its bullets.`,
      to: "/copilot",
    });
  }
  const noRole = resumes.find((r) => !r.target_role);
  if (noRole) {
    suggestions.push({
      text: `Set a target role on "${noRole.title}" so the AI can match keywords.`,
      to: "/builder",
    });
  }
  if (resumes.length > 0 && resumes.length < 3) {
    suggestions.push({
      text: "Create a role-specific variant — tailored resumes convert better.",
      to: "/builder",
    });
  }
  return suggestions.slice(0, 3);
}

function Dashboard() {
  const { user } = useSession();

  const { data: resumes, isLoading: loadingResumes } = useQuery({
    queryKey: ["resumes"],
    queryFn: () => resumeService.list(),
  });
  const { data: profile, isLoading: loadingProfile } = useQuery({
    queryKey: ["profile"],
    queryFn: () => profileService.getCurrent(),
  });

  const list = resumes ?? [];
  const scored = list.filter((r) => r.ats_score !== null);
  const avgAts = scored.length
    ? Math.round(scored.reduce((sum, r) => sum + (r.ats_score ?? 0), 0) / scored.length)
    : null;

  // Profile completion: name, headline, location and the three links.
  const profileFields = [
    profile?.full_name,
    profile?.headline,
    profile?.location,
    profile?.github_url,
    profile?.linkedin_url,
    profile?.website_url,
  ];
  const filled = profileFields.filter((value) => Boolean(value && String(value).trim())).length;
  const completion = Math.round((filled / profileFields.length) * 100);

  const firstName = (profile?.full_name || user?.email || "there").split(/[\s@]/)[0];
  const uploads = list.filter((r) => r.source_text || r.github_url || r.linkedin_url).slice(0, 4);
  const suggestions = buildSuggestions(list, completion);

  return (
    <>
      <PageHeader
        title={`Welcome back, ${firstName}`}
        description="Everything you need to ship an ATS-friendly resume today."
        actions={
          <Button asChild>
            <Link to="/builder">
              <Plus className="size-4" aria-hidden /> Create resume
            </Link>
          </Button>
        }
      />

      <section aria-label="Overview" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Resumes"
          value={String(list.length)}
          hint={list.length === 1 ? "1 draft in your workspace" : `${list.length} drafts saved`}
          icon={FileText}
          loading={loadingResumes}
        />
        <StatCard
          label="Average ATS"
          value={avgAts === null ? "—" : String(avgAts)}
          hint={scored.length ? `across ${scored.length} scored resumes` : "score a resume to see this"}
          icon={Gauge}
          loading={loadingResumes}
        />
        <StatCard
          label="Last activity"
          value={list[0] ? formatRelative(list[0].updated_at) : "—"}
          hint={list[0] ? list[0].title : "no edits yet"}
          icon={Sparkles}
          loading={loadingResumes}
        />
        <SurfaceCard>
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Profile
            </p>
            <Link to="/profile" className="text-xs text-primary hover:underline">
              Edit
            </Link>
          </div>
          {loadingProfile ? (
            <Skeleton className="mt-4 h-9 w-full" />
          ) : (
            <div className="mt-4">
              <ProgressMeter value={completion} label="Completion" />
            </div>
          )}
        </SurfaceCard>
      </section>

      <section aria-label="Quick actions" className="mt-8">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Quick actions
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {QUICK_ACTIONS.map((action) => (
            <li key={action.label}>
              <QuickActionCard
                to={action.to}
                label={action.label}
                description={action.description}
                icon={action.icon}
              />
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <SectionCard
          title="Recent activity"
          className="lg:col-span-2"
          action={
            <Link to="/builder" className="text-sm text-primary hover:underline">
              View all
            </Link>
          }
        >
          {loadingResumes ? (
            <ListSkeleton rows={3} />
          ) : list.length === 0 ? (
            <EmptyState
              message="No resumes yet — start from an upload or a blank draft."
              actionLabel="Upload your resume"
              actionTo="/upload"
            />
          ) : (
            <ul className="space-y-3">
              {list.slice(0, 5).map((resume) => (
                <li key={resume.id}>
                  <Link
                    to="/resume/$resumeId"
                    params={{ resumeId: resume.id }}
                    className="flex items-center gap-4 rounded-lg border border-border p-4 transition-shadow hover:shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                      <FileText className="size-5" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{resume.title}</span>
                      <span className="block truncate text-sm text-muted-foreground">
                        {resume.target_role || "No target role"} ·{" "}
                        {formatRelative(resume.updated_at)}
                      </span>
                    </span>
                    {resume.ats_score !== null && (
                      <span className="hidden rounded-full bg-success/15 px-2.5 py-1 text-xs font-medium text-success sm:inline">
                        ATS {resume.ats_score}
                      </span>
                    )}
                    <ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <div className="space-y-6">
          <SectionCard
            title="Recent uploads"
            action={
              <Link to="/upload" className="text-sm text-primary hover:underline">
                Upload
              </Link>
            }
          >
            {loadingResumes ? (
              <ListSkeleton rows={2} />
            ) : uploads.length === 0 ? (
              <EmptyState
                message="No sources imported yet."
                actionLabel="Add a source"
                actionTo="/upload"
              />
            ) : (
              <ul className="space-y-3">
                {uploads.map((item) => {
                  const SourceIcon = item.github_url
                    ? Github
                    : item.linkedin_url
                      ? Linkedin
                      : UploadCloud;
                  const source = item.github_url
                    ? "GitHub import"
                    : item.linkedin_url
                      ? "LinkedIn import"
                      : "Pasted resume";
                  return (
                    <li key={item.id} className="flex items-center gap-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                        <SourceIcon className="size-4" aria-hidden />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{item.title}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {source} · {formatDate(item.created_at)}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </SectionCard>

          <SectionCard title="AI suggestions">
            {loadingResumes || loadingProfile ? (
              <ListSkeleton rows={2} />
            ) : suggestions.length === 0 ? (
              <EmptyState message="You're all caught up — nothing to fix right now." />
            ) : (
              <ul className="space-y-3">
                {suggestions.map((suggestion) => (
                  <li key={suggestion.text}>
                    <Link
                      to={suggestion.to}
                      className="flex gap-3 rounded-lg border border-border p-3 text-sm transition-shadow hover:shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <Lightbulb className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                      <span>{suggestion.text}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>
      </div>
    </>
  );
}
