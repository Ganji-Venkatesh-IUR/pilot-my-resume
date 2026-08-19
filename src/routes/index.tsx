import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Compass,
  FileText,
  Github,
  Linkedin,
  LayoutTemplate,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CareerPilot AI — ATS-friendly resumes, generated in minutes" },
      {
        name: "description",
        content:
          "Turn your resume, GitHub or LinkedIn into an ATS-optimised resume with AI. Five templates, a live copilot for edits and one-click PDF export.",
      },
      { property: "og:title", content: "CareerPilot AI — ATS resumes built by AI" },
      {
        property: "og:description",
        content:
          "Upload a resume or paste your GitHub/LinkedIn and get a recruiter-ready, ATS-friendly resume with AI editing and PDF export.",
      },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  {
    icon: Sparkles,
    title: "AI resume generation",
    body: "Source material in, quantified and keyword-aligned bullets out — no invented history.",
  },
  {
    icon: MessageSquareText,
    title: "Copilot for edits",
    body: "Ask for a shorter summary or a senior tone and watch the preview update instantly.",
  },
  {
    icon: LayoutTemplate,
    title: "Five clean templates",
    body: "Atlas, Meridian, Compact, Editorial and Signal — every one parser-safe.",
  },
  {
    icon: ShieldCheck,
    title: "ATS scoring",
    body: "A readability and completeness score on every draft so nothing gets filtered out.",
  },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Compass className="size-4" />
          </span>
          <span className="font-display text-lg font-semibold tracking-tight">CareerPilot AI</span>
        </div>
        <Button asChild size="sm">
          <Link to="/auth">Get started</Link>
        </Button>
      </header>

      <main>
        {/* Hero */}
        <section className="surface-grid border-b border-border">
          <div className="mx-auto max-w-4xl px-5 py-24 text-center">
            <p className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
              <Sparkles className="size-3.5 text-primary" /> AI resume copilot
            </p>
            <h1 className="mt-6 text-balance text-5xl font-semibold leading-[1.05] sm:text-6xl">
              <span className="text-gradient-signal">Resumes that get past the filter</span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-lg text-muted-foreground">
              Upload your resume or paste a GitHub / LinkedIn link. CareerPilot AI rewrites it into
              an ATS-friendly, recruiter-ready document you can export in one click.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg">
                <Link to="/auth">Build my resume</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/auth">Sign in</Link>
              </Button>
            </div>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <FileText className="size-4" /> Resume upload
              </span>
              <span className="flex items-center gap-2">
                <Github className="size-4" /> GitHub import
              </span>
              <span className="flex items-center gap-2">
                <Linkedin className="size-4" /> LinkedIn profile
              </span>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="mx-auto max-w-6xl px-5 py-20">
          <h2 className="text-3xl font-semibold">Everything the job hunt needs</h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((feature) => (
              <article
                key={feature.title}
                className="rounded-xl border border-border bg-card p-5 shadow-soft transition-shadow hover:shadow-lift"
              >
                <span className="flex size-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                  <feature.icon className="size-4" />
                </span>
                <h3 className="mt-4 text-base font-semibold">{feature.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{feature.body}</p>
              </article>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="border-t border-border bg-ink text-ink-foreground">
          <div className="mx-auto flex max-w-4xl flex-col items-center px-5 py-20 text-center">
            <h2 className="text-3xl font-semibold">Your next role starts with one draft</h2>
            <p className="mt-3 max-w-lg text-sm opacity-80">
              Create an account and generate your first ATS-optimised resume in under two minutes.
            </p>
            <Button asChild size="lg" className="mt-7">
              <Link to="/auth">Get started free</Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="mx-auto max-w-7xl px-5 py-8 text-sm text-muted-foreground">
        © {new Date().getFullYear()} CareerPilot AI
      </footer>
    </div>
  );
}
