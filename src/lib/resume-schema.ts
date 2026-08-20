/**
 * Shared resume data model.
 * Browser-safe: imported by both UI components and server helpers.
 */

export interface ResumeExperience {
  company: string;
  role: string;
  period: string;
  location?: string;
  bullets: string[];
}

export interface ResumeProject {
  name: string;
  description: string;
  tech?: string;
  link?: string;
}

export interface ResumeEducation {
  school: string;
  degree: string;
  period: string;
}

/** Ordered, toggleable body sections of a resume. */
export const SECTIONS = [
  { id: "summary", label: "Summary" },
  { id: "skills", label: "Skills" },
  { id: "experience", label: "Experience" },
  { id: "projects", label: "Projects" },
  { id: "education", label: "Education" },
  { id: "certifications", label: "Certifications" },
] as const;

export type SectionId = (typeof SECTIONS)[number]["id"];

const SECTION_IDS = SECTIONS.map((s) => s.id) as readonly SectionId[];

/** Section order + visibility, persisted alongside the resume content. */
export interface ResumeLayout {
  order: SectionId[];
  hidden: SectionId[];
}

export const defaultLayout: ResumeLayout = { order: [...SECTION_IDS], hidden: [] };

export interface ResumeContent {
  name: string;
  headline: string;
  email: string;
  phone: string;
  location: string;
  links: string[];
  summary: string;
  skills: string[];
  experience: ResumeExperience[];
  projects: ResumeProject[];
  education: ResumeEducation[];
  certifications: string[];
  layout: ResumeLayout;
}

export const TEMPLATES = [
  { id: "atlas", name: "Atlas", blurb: "Single column, ATS-safe classic" },
  { id: "meridian", name: "Meridian", blurb: "Sidebar with skills rail" },
  { id: "compact", name: "Compact", blurb: "Dense, one-page engineering" },
  { id: "editorial", name: "Editorial", blurb: "Serif headings, airy spacing" },
  { id: "signal", name: "Signal", blurb: "Accent bar, modern product roles" },
] as const;

export type TemplateId = (typeof TEMPLATES)[number]["id"];

/** Empty resume used before AI generation and as a merge fallback. */
export const emptyResume: ResumeContent = {
  name: "",
  headline: "",
  email: "",
  phone: "",
  location: "",
  links: [],
  summary: "",
  skills: [],
  experience: [],
  projects: [],
  education: [],
  certifications: [],
  layout: defaultLayout,
};

/** Defensive normaliser — AI output and DB JSON are never fully trusted. */
export function normalizeResume(value: unknown): ResumeContent {
  const raw = (value ?? {}) as Partial<ResumeContent>;
  const strArray = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((i): i is string => typeof i === "string") : [];

  return {
    name: raw.name ?? "",
    headline: raw.headline ?? "",
    email: raw.email ?? "",
    phone: raw.phone ?? "",
    location: raw.location ?? "",
    links: strArray(raw.links),
    summary: raw.summary ?? "",
    skills: strArray(raw.skills),
    experience: Array.isArray(raw.experience)
      ? raw.experience.map((e) => ({
          company: e?.company ?? "",
          role: e?.role ?? "",
          period: e?.period ?? "",
          location: e?.location ?? "",
          bullets: strArray(e?.bullets),
        }))
      : [],
    projects: Array.isArray(raw.projects)
      ? raw.projects.map((p) => ({
          name: p?.name ?? "",
          description: p?.description ?? "",
          tech: p?.tech ?? "",
          link: p?.link ?? "",
        }))
      : [],
    education: Array.isArray(raw.education)
      ? raw.education.map((e) => ({
          school: e?.school ?? "",
          degree: e?.degree ?? "",
          period: e?.period ?? "",
        }))
      : [],
    certifications: strArray(raw.certifications),
    layout: normalizeLayout((raw as { layout?: unknown }).layout),
  };
}

/** Layout is user-controlled state, so unknown/missing values fall back safely. */
function normalizeLayout(value: unknown): ResumeLayout {
  const raw = (value ?? {}) as Partial<ResumeLayout>;
  const isId = (v: unknown): v is SectionId =>
    typeof v === "string" && (SECTION_IDS as readonly string[]).includes(v);

  const order = Array.isArray(raw.order) ? raw.order.filter(isId) : [];
  // Append any section the stored order is missing so nothing disappears.
  for (const id of SECTION_IDS) if (!order.includes(id)) order.push(id);

  return {
    order,
    hidden: Array.isArray(raw.hidden) ? raw.hidden.filter(isId) : [],
  };
}

/** Rough ATS heuristic used for the dashboard score chip. */
export function estimateAtsScore(resume: ResumeContent): number {
  let score = 0;
  if (resume.name) score += 8;
  if (resume.email) score += 8;
  if (resume.phone) score += 6;
  if (resume.summary.length > 80) score += 14;
  score += Math.min(resume.skills.length * 2, 18);
  score += Math.min(resume.experience.length * 8, 24);
  const bullets = resume.experience.flatMap((e) => e.bullets);
  score += Math.min(bullets.length * 2, 14);
  if (bullets.some((b) => /\d/.test(b))) score += 8;
  return Math.min(score, 100);
}
