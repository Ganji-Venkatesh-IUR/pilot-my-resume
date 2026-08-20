import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Check } from "lucide-react";
import { PageHeader } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { ResumePreview } from "@/components/resume/ResumePreview";
import { StyleControls } from "@/components/resume/StyleControls";
import { ExportMenu } from "@/components/resume/ExportMenu";
import {
  TEMPLATES,
  defaultLayout,
  defaultStyle,
  type ResumeContent,
  type ResumeStyle,
  type TemplateId,
} from "@/lib/resume-schema";

export const Route = createFileRoute("/_authenticated/templates")({
  head: () => ({
    meta: [
      { title: "Resume templates — CareerPilot AI" },
      {
        name: "description",
        content:
          "Seven ATS-friendly resume templates — professional, modern, minimal, student and developer — with live preview, typography controls and PDF export.",
      },
      { property: "og:title", content: "Resume templates — CareerPilot AI" },
      {
        property: "og:description",
        content: "Switch templates instantly and export a pixel-perfect PDF.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TemplatesPage,
});

/** Static sample used to render each template thumbnail. */
const SAMPLE: ResumeContent = {
  layout: defaultLayout,
  style: defaultStyle,
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
  const [style, setStyle] = useState<ResumeStyle>(defaultStyle);

  const active = TEMPLATES.find((t) => t.id === selected);
  const sample: ResumeContent = { ...SAMPLE, style };

  return (
    <>
      <PageHeader
        title="Templates"
        description="Every template is single-flow and parser-safe. Preview live, tune the typography, then start a resume."
        actions={
          <div className="flex flex-wrap gap-2">
            <ExportMenu filename={`careerpilot-${selected}-sample`} margin={style.margin} />
            <Button onClick={() => navigate({ to: "/builder", search: { template: selected } })}>
              Use {active?.name}
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        {/* Live preview of the selected template */}
        <section aria-label="Template preview" className="order-2 xl:order-1">
          <div className="rounded-2xl border border-border bg-muted/30 p-4 sm:p-6">
            <ResumePreview resume={sample} template={selected} />
          </div>
        </section>

        <div className="order-1 space-y-6 xl:order-2">
          <StyleControls style={style} onChange={setStyle} />

          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            {TEMPLATES.map((template) => {
              const isSelected = selected === template.id;
              return (
                <li key={template.id}>
                  <button
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => setSelected(template.id)}
                    className={`flex w-full items-start justify-between gap-3 rounded-xl border bg-card p-4 text-left transition-all hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      isSelected ? "border-primary ring-2 ring-primary/40" : "border-border"
                    }`}
                  >
                    <div>
                      <p className="font-display font-semibold">{template.name}</p>
                      <p className="text-sm text-muted-foreground">{template.blurb}</p>
                      <p className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground/80">
                        {template.audience}
                      </p>
                    </div>
                    {isSelected && (
                      <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Check className="size-3.5" aria-hidden />
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </>
  );
}
