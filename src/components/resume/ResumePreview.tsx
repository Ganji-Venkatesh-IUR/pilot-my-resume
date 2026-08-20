import type { ReactNode } from "react";
import type { ResumeContent, SectionId, TemplateId } from "@/lib/resume-schema";

/** Inline-editable text node. Commits on blur so typing never fights React state. */
function Editable({
  value,
  editable,
  onCommit,
  className,
  placeholder,
  label,
}: {
  value: string;
  editable: boolean;
  onCommit: (next: string) => void;
  className?: string;
  placeholder?: string;
  label: string;
}) {
  if (!editable) return <span className={className}>{value}</span>;
  return (
    <span
      role="textbox"
      tabIndex={0}
      aria-label={label}
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      onBlur={(e) => {
        const next = e.currentTarget.textContent ?? "";
        if (next !== value) onCommit(next);
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") e.currentTarget.blur();
      }}
      className={[
        className ?? "",
        "rounded-sm outline-none ring-offset-2 transition-colors focus:bg-accent/60 focus:ring-2 focus:ring-ring hover:bg-accent/30 print:hover:bg-transparent",
        !value ? "text-muted-foreground/60" : "",
      ].join(" ")}
    >
      {value || placeholder || ""}
    </span>
  );
}

/**
 * Renders a resume into one of five ATS-safe templates.
 * Every template is plain text flow — no tables or images — so parsers read it.
 * When `editable` is set, text nodes become inline-editable and commit on blur.
 */
export function ResumePreview({
  resume,
  template,
  editable = false,
  onChange,
}: {
  resume: ResumeContent;
  template: TemplateId;
  editable?: boolean;
  onChange?: (next: ResumeContent) => void;
}) {
  const isEditorial = template === "editorial";
  const isCompact = template === "compact";
  const isSidebar = template === "meridian";
  const isSignal = template === "signal";

  const base = isCompact ? "text-[11px] leading-snug" : "text-[12.5px] leading-relaxed";
  const font = isEditorial ? "font-serif" : "font-sans";

  const patch = (next: Partial<ResumeContent>) => onChange?.({ ...resume, ...next });
  const canEdit = editable && Boolean(onChange);

  const heading = (label: string) => (
    <h3
      className={[
        "mt-4 mb-1.5 font-semibold uppercase tracking-[0.14em]",
        isCompact ? "text-[10px]" : "text-[11px]",
        isSignal ? "text-primary" : "text-foreground",
        isEditorial ? "border-b border-border pb-1 tracking-[0.2em]" : "",
        !isEditorial && !isSignal ? "border-b border-border pb-1" : "",
      ].join(" ")}
    >
      {label}
    </h3>
  );

  const contact = [resume.email, resume.phone, resume.location, ...resume.links].filter(Boolean);

  const skillsBlock = (
    <section id="section-skills">
      {heading(isSidebar ? "Skills" : "Core Skills")}
      {isSidebar ? (
        <ul className="space-y-0.5">
          {resume.skills.map((skill, i) => (
            <li key={`${skill}-${i}`}>
              <Editable
                label={`Skill ${i + 1}`}
                editable={canEdit}
                value={skill}
                onCommit={(v) =>
                  patch({ skills: resume.skills.map((s, si) => (si === i ? v : s)) })
                }
              />
            </li>
          ))}
        </ul>
      ) : (
        <Editable
          label="Skills"
          editable={canEdit}
          className="block"
          placeholder="Add your core skills"
          value={resume.skills.join(" · ")}
          onCommit={(v) =>
            patch({
              skills: v
                .split(/[·,]/)
                .map((s) => s.trim())
                .filter(Boolean),
            })
          }
        />
      )}
    </section>
  );

  const blocks: Record<SectionId, ReactNode> = {
    summary: (
      <section id="section-summary">
        {heading("Professional Summary")}
        <p>
          <Editable
            label="Professional summary"
            editable={canEdit}
            placeholder="Add a two-line professional summary"
            value={resume.summary}
            onCommit={(v) => patch({ summary: v })}
          />
        </p>
      </section>
    ),
    skills: skillsBlock,
    experience: (
      <section id="section-experience">
        {heading("Experience")}
        <div className="space-y-3">
          {resume.experience.map((job, i) => (
            <div key={`${job.company}-${i}`}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <p className="font-semibold">
                  <Editable
                    label={`Role ${i + 1}`}
                    editable={canEdit}
                    value={job.role}
                    placeholder="Role"
                    onCommit={(v) =>
                      patch({
                        experience: resume.experience.map((e, ei) =>
                          ei === i ? { ...e, role: v } : e,
                        ),
                      })
                    }
                  />
                  {" — "}
                  <Editable
                    label={`Company ${i + 1}`}
                    editable={canEdit}
                    value={job.company}
                    placeholder="Company"
                    onCommit={(v) =>
                      patch({
                        experience: resume.experience.map((e, ei) =>
                          ei === i ? { ...e, company: v } : e,
                        ),
                      })
                    }
                  />
                </p>
                <p className="text-muted-foreground">
                  <Editable
                    label={`Period ${i + 1}`}
                    editable={canEdit}
                    value={job.period}
                    placeholder="Dates"
                    onCommit={(v) =>
                      patch({
                        experience: resume.experience.map((e, ei) =>
                          ei === i ? { ...e, period: v } : e,
                        ),
                      })
                    }
                  />
                </p>
              </div>
              {job.location && <p className="text-muted-foreground">{job.location}</p>}
              <ul className="mt-1 list-disc space-y-0.5 pl-4">
                {job.bullets.map((bullet, bi) => (
                  <li key={bi}>
                    <Editable
                      label={`Bullet ${bi + 1} of role ${i + 1}`}
                      editable={canEdit}
                      value={bullet}
                      onCommit={(v) =>
                        patch({
                          experience: resume.experience.map((e, ei) =>
                            ei === i
                              ? {
                                  ...e,
                                  bullets: e.bullets
                                    .map((b, bx) => (bx === bi ? v : b))
                                    .filter((b) => b.trim().length > 0),
                                }
                              : e,
                          ),
                        })
                      }
                    />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    ),
    projects: (
      <section id="section-projects">
        {heading("Projects")}
        <div className="space-y-2">
          {resume.projects.map((project, i) => (
            <div key={`${project.name}-${i}`}>
              <p className="font-semibold">
                <Editable
                  label={`Project ${i + 1} name`}
                  editable={canEdit}
                  value={project.name}
                  placeholder="Project"
                  onCommit={(v) =>
                    patch({
                      projects: resume.projects.map((p, pi) => (pi === i ? { ...p, name: v } : p)),
                    })
                  }
                />
                {project.tech ? ` · ${project.tech}` : ""}
              </p>
              <p>
                <Editable
                  label={`Project ${i + 1} description`}
                  editable={canEdit}
                  value={project.description}
                  placeholder="What it does and the impact"
                  onCommit={(v) =>
                    patch({
                      projects: resume.projects.map((p, pi) =>
                        pi === i ? { ...p, description: v } : p,
                      ),
                    })
                  }
                />
              </p>
              {project.link && <p className="text-muted-foreground">{project.link}</p>}
            </div>
          ))}
        </div>
      </section>
    ),
    education: (
      <section id="section-education">
        {heading("Education")}
        {resume.education.map((edu, i) => (
          <div key={`${edu.school}-${i}`} className="flex flex-wrap justify-between gap-x-3">
            <p className="font-semibold">
              <Editable
                label={`Degree ${i + 1}`}
                editable={canEdit}
                value={edu.degree}
                placeholder="Degree"
                onCommit={(v) =>
                  patch({
                    education: resume.education.map((e, ei) =>
                      ei === i ? { ...e, degree: v } : e,
                    ),
                  })
                }
              />
              {" — "}
              <Editable
                label={`School ${i + 1}`}
                editable={canEdit}
                value={edu.school}
                placeholder="School"
                onCommit={(v) =>
                  patch({
                    education: resume.education.map((e, ei) =>
                      ei === i ? { ...e, school: v } : e,
                    ),
                  })
                }
              />
            </p>
            <p className="text-muted-foreground">{edu.period}</p>
          </div>
        ))}
      </section>
    ),
    certifications: (
      <section id="section-certifications">
        {heading("Certifications")}
        <p>
          <Editable
            label="Certifications"
            editable={canEdit}
            value={resume.certifications.join(" · ")}
            placeholder="Add certifications"
            onCommit={(v) =>
              patch({
                certifications: v
                  .split(/[·,]/)
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
          />
        </p>
      </section>
    ),
  };

  const hasContent: Record<SectionId, boolean> = {
    summary: Boolean(resume.summary) || canEdit,
    skills: resume.skills.length > 0 || canEdit,
    experience: resume.experience.length > 0,
    projects: resume.projects.length > 0,
    education: resume.education.length > 0,
    certifications: resume.certifications.length > 0,
  };

  const visible = resume.layout.order.filter(
    (id) => !resume.layout.hidden.includes(id) && hasContent[id],
  );

  const renderList = (ids: SectionId[]) => (
    <>
      {ids.map((id) => (
        <div key={id}>{blocks[id]}</div>
      ))}
    </>
  );

  return (
    <div
      id="resume-sheet"
      className={`mx-auto w-full max-w-[820px] rounded-xl border border-border bg-card p-8 text-card-foreground shadow-soft sm:p-10 ${base} ${font}`}
    >
      {isSignal && <div className="mb-5 h-1.5 w-24 rounded-full bg-primary" />}

      <header className={isEditorial ? "text-center" : ""}>
        <h2
          className={`font-semibold ${isCompact ? "text-xl" : "text-[26px]"} ${
            isEditorial ? "font-serif tracking-normal" : ""
          }`}
        >
          <Editable
            label="Full name"
            editable={canEdit}
            value={resume.name}
            placeholder="Your name"
            onCommit={(v) => patch({ name: v })}
          />
        </h2>
        <p className={isSignal ? "text-primary" : "text-muted-foreground"}>
          <Editable
            label="Headline"
            editable={canEdit}
            value={resume.headline}
            placeholder="Professional headline"
            onCommit={(v) => patch({ headline: v })}
          />
        </p>
        {contact.length > 0 && <p className="mt-1 text-muted-foreground">{contact.join("  •  ")}</p>}
      </header>

      {isSidebar && visible.includes("skills") ? (
        <div className="mt-4 grid gap-6 sm:grid-cols-[1fr_200px]">
          <div>{renderList(visible.filter((id) => id !== "skills"))}</div>
          <aside className="sm:border-l sm:border-border sm:pl-5">{skillsBlock}</aside>
        </div>
      ) : (
        renderList(visible)
      )}
    </div>
  );
}
