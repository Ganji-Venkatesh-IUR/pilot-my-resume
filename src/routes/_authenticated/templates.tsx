import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Check } from "lucide-react";
import { PageHeader } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { ResumePreview } from "@/components/resume/ResumePreview";
import {
  TEMPLATES,
  defaultLayout,
  type TemplateId,
  type ResumeContent,
} from "@/lib/resume-schema";

export const Route = createFileRoute("/_authenticated/templates")({
  head: () => ({
    meta: [
      { title: "Templates — CareerPilot AI" },
      {
        name: "description",
        content: "Five parser-safe resume templates: Atlas, Meridian, Compact, Editorial, Signal.",
      },
      { property: "og:title", content: "Templates — CareerPilot AI" },
      { property: "og:description", content: "Pick an ATS-safe resume template." },
    ],
  }),
  component: TemplatesPage,
});

/** Static sample used to render each template thumbnail. */
const SAMPLE: ResumeContent = {
  layout: defaultLayout,
  name: "Alex Morgan",
  headline: "Senior Backend Engineer",
  email: "alex@example.com",
  phone: "+1 555 0142",
  location: "Berlin, DE",
  links: ["github.com/alexmorgan"],
  summary:
    "Backend engineer with 8 years building high-throughput payment services on Go and Postgres.",
  skills: ["Go", "PostgreSQL", "Kubernetes", "gRPC", "AWS"],
  experience: [
    {
      role: "Senior Backend Engineer",
      company: "Northwind Pay",
      period: "2022 — Present",
      location: "Berlin",
      bullets: [
        "Cut p99 latency 62% by resharding the ledger service.",
        "Led migration of 40 services to gRPC with zero downtime.",
      ],
    },
  ],
  projects: [{ name: "ledgerkit", description: "Open-source double-entry ledger library." }],
  education: [{ school: "TU Munich", degree: "BSc Computer Science", period: "2017" }],
  certifications: ["AWS Solutions Architect"],
};

function TemplatesPage() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<TemplateId>("atlas");

  return (
    <>
      <PageHeader
        title="Templates"
        description="Every template is single-flow and parser-safe. Pick one to start a new resume."
        actions={
          <Button
            onClick={() => navigate({ to: "/builder", search: { template: selected } })}
          >
            Use {TEMPLATES.find((t) => t.id === selected)?.name}
          </Button>
        }
      />

      <ul className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {TEMPLATES.map((template) => {
          const isSelected = selected === template.id;
          return (
            <li key={template.id}>
              <button
                type="button"
                aria-pressed={isSelected}
                onClick={() => setSelected(template.id)}
                className={`group w-full overflow-hidden rounded-xl border bg-card text-left shadow-soft transition-all hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  isSelected ? "border-primary ring-2 ring-primary/40" : "border-border"
                }`}
              >
                <div className="h-56 overflow-hidden bg-muted/40 p-3">
                  <div className="origin-top scale-[0.42] rounded-md bg-card p-4 shadow-soft">
                    <ResumePreview resume={SAMPLE} template={template.id} />
                  </div>
                </div>
                <div className="flex items-start justify-between gap-3 border-t border-border p-4">
                  <div>
                    <p className="font-display font-semibold">{template.name}</p>
                    <p className="text-sm text-muted-foreground">{template.blurb}</p>
                  </div>
                  {isSelected && (
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Check className="size-3.5" aria-hidden />
                    </span>
                  )}
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </>
  );
}
