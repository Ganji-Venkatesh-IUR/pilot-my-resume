import type { ResumeContent, TemplateId } from "@/lib/resume-schema";

/**
 * Renders a resume into one of five ATS-safe templates.
 * Every template is plain text flow — no tables or images — so parsers read it.
 */
export function ResumePreview({
  resume,
  template,
}: {
  resume: ResumeContent;
  template: TemplateId;
}) {
  const isEditorial = template === "editorial";
  const isCompact = template === "compact";
  const isSidebar = template === "meridian";
  const isSignal = template === "signal";

  const base = isCompact ? "text-[11px] leading-snug" : "text-[12.5px] leading-relaxed";
  const font = isEditorial ? "font-serif" : "font-sans";

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

  const body = (
    <>
      {resume.summary && (
        <section>
          {heading("Professional Summary")}
          <p>{resume.summary}</p>
        </section>
      )}

      {resume.experience.length > 0 && (
        <section>
          {heading("Experience")}
          <div className="space-y-3">
            {resume.experience.map((job, i) => (
              <div key={`${job.company}-${i}`}>
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <p className="font-semibold">
                    {job.role}
                    {job.company ? ` — ${job.company}` : ""}
                  </p>
                  <p className="text-muted-foreground">{job.period}</p>
                </div>
                {job.location && <p className="text-muted-foreground">{job.location}</p>}
                <ul className="mt-1 list-disc space-y-0.5 pl-4">
                  {job.bullets.map((bullet, bi) => (
                    <li key={bi}>{bullet}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      {resume.projects.length > 0 && (
        <section>
          {heading("Projects")}
          <div className="space-y-2">
            {resume.projects.map((project, i) => (
              <div key={`${project.name}-${i}`}>
                <p className="font-semibold">
                  {project.name}
                  {project.tech ? ` · ${project.tech}` : ""}
                </p>
                <p>{project.description}</p>
                {project.link && <p className="text-muted-foreground">{project.link}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {resume.education.length > 0 && (
        <section>
          {heading("Education")}
          {resume.education.map((edu, i) => (
            <div key={`${edu.school}-${i}`} className="flex flex-wrap justify-between gap-x-3">
              <p className="font-semibold">
                {edu.degree}
                {edu.school ? ` — ${edu.school}` : ""}
              </p>
              <p className="text-muted-foreground">{edu.period}</p>
            </div>
          ))}
        </section>
      )}

      {resume.certifications.length > 0 && (
        <section>
          {heading("Certifications")}
          <p>{resume.certifications.join(" · ")}</p>
        </section>
      )}
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
          {resume.name || "Your name"}
        </h2>
        {resume.headline && (
          <p className={isSignal ? "text-primary" : "text-muted-foreground"}>{resume.headline}</p>
        )}
        {contact.length > 0 && (
          <p className="mt-1 text-muted-foreground">{contact.join("  •  ")}</p>
        )}
      </header>

      {isSidebar ? (
        <div className="mt-4 grid gap-6 sm:grid-cols-[1fr_200px]">
          <div>{body}</div>
          <aside className="sm:border-l sm:border-border sm:pl-5">
            {resume.skills.length > 0 && (
              <>
                {heading("Skills")}
                <ul className="space-y-0.5">
                  {resume.skills.map((skill) => (
                    <li key={skill}>{skill}</li>
                  ))}
                </ul>
              </>
            )}
          </aside>
        </div>
      ) : (
        <>
          {resume.skills.length > 0 && (
            <section>
              {heading("Core Skills")}
              <p>{resume.skills.join(" · ")}</p>
            </section>
          )}
          {body}
        </>
      )}
    </div>
  );
}
