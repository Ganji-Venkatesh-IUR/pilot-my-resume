/**
 * Career knowledge profile — the single source of truth that powers resume
 * generation and job matching.
 *
 * Browser-safe: shared by the UI, the server functions and the resume engine.
 */

export const CAREER_KINDS = [
  "experience",
  "education",
  "skill",
  "project",
  "certification",
  "achievement",
  "link",
] as const;

export type CareerKind = (typeof CAREER_KINDS)[number];

export const SKILL_LEVELS = ["beginner", "intermediate", "advanced", "expert"] as const;
export type SkillLevel = (typeof SKILL_LEVELS)[number];

/** One item of career knowledge. Fields are shared across kinds on purpose:
 *  a flat, predictable shape keeps CRUD, prompts and matching simple. */
export interface CareerEntry {
  id: string;
  kind: CareerKind;
  title: string;
  subtitle: string;
  organization: string;
  location: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  description: string;
  bullets: string[];
  tags: string[];
  level: SkillLevel | "";
  url: string;
  position: number;
}

/** Personal info block, stored on the profile row. */
export interface CareerPersonal {
  fullName: string;
  jobTitle: string;
  email: string;
  phone: string;
  location: string;
  headline: string;
  summary: string;
  githubUrl: string;
  linkedinUrl: string;
  websiteUrl: string;
}

export interface CareerProfile {
  personal: CareerPersonal;
  entries: CareerEntry[];
}

/** Per-kind UI + validation metadata; drives the profile page rendering. */
export interface KindMeta {
  label: string;
  singular: string;
  /** Placeholder + label for the primary text field. */
  titleLabel: string;
  subtitleLabel?: string;
  hasDates: boolean;
  hasBullets: boolean;
  hasLevel: boolean;
  hasUrl: boolean;
  emptyHint: string;
}

export const KIND_META: Record<CareerKind, KindMeta> = {
  experience: {
    label: "Experience",
    singular: "role",
    titleLabel: "Job title",
    subtitleLabel: "Company",
    hasDates: true,
    hasBullets: true,
    hasLevel: false,
    hasUrl: false,
    emptyHint: "Add the roles you've held — the copilot writes bullets from what you list here.",
  },
  education: {
    label: "Education",
    singular: "qualification",
    titleLabel: "Degree or programme",
    subtitleLabel: "School",
    hasDates: true,
    hasBullets: false,
    hasLevel: false,
    hasUrl: false,
    emptyHint: "Degrees, diplomas and bootcamps go here.",
  },
  skill: {
    label: "Skills",
    singular: "skill",
    titleLabel: "Skill",
    subtitleLabel: "Category",
    hasDates: false,
    hasBullets: false,
    hasLevel: true,
    hasUrl: false,
    emptyHint: "List your skills with an honest level — matching uses these keywords.",
  },
  project: {
    label: "Projects",
    singular: "project",
    titleLabel: "Project name",
    subtitleLabel: "Tech stack",
    hasDates: true,
    hasBullets: true,
    hasLevel: false,
    hasUrl: true,
    emptyHint: "Side projects and shipped work — great filler when experience is thin.",
  },
  certification: {
    label: "Certifications",
    singular: "certification",
    titleLabel: "Certification",
    subtitleLabel: "Issuer",
    hasDates: true,
    hasBullets: false,
    hasLevel: false,
    hasUrl: true,
    emptyHint: "Cloud certs, course completions, licences.",
  },
  achievement: {
    label: "Achievements",
    singular: "achievement",
    titleLabel: "Achievement",
    subtitleLabel: "Context",
    hasDates: true,
    hasBullets: false,
    hasLevel: false,
    hasUrl: true,
    emptyHint: "Awards, rankings, publications, measurable wins.",
  },
  link: {
    label: "Links",
    singular: "link",
    titleLabel: "Label",
    subtitleLabel: "Platform",
    hasDates: false,
    hasBullets: false,
    hasLevel: false,
    hasUrl: true,
    emptyHint: "Portfolio, blog, Dribbble, Stack Overflow — anything worth showing.",
  },
};

/** Coerce an unknown DB row into a safe `CareerEntry`. */
export function normalizeEntry(row: Record<string, unknown>): CareerEntry {
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  const list = (v: unknown) =>
    Array.isArray(v) ? v.filter((i): i is string => typeof i === "string") : [];
  const kind = CAREER_KINDS.includes(row["kind"] as CareerKind)
    ? (row["kind"] as CareerKind)
    : "achievement";

  return {
    id: str(row["id"]),
    kind,
    title: str(row["title"]),
    subtitle: str(row["subtitle"]),
    organization: str(row["organization"]),
    location: str(row["location"]),
    startDate: str(row["start_date"]),
    endDate: str(row["end_date"]),
    isCurrent: row["is_current"] === true,
    description: str(row["description"]),
    bullets: list(row["bullets"]),
    tags: list(row["tags"]),
    level: (SKILL_LEVELS as readonly string[]).includes(str(row["level"]))
      ? (str(row["level"]) as SkillLevel)
      : "",
    url: str(row["url"]),
    position: typeof row["position"] === "number" ? row["position"] : 0,
  };
}

/** A blank entry used when the user adds a row in the UI. */
export function blankEntry(kind: CareerKind, position = 0): Omit<CareerEntry, "id"> {
  return {
    kind,
    title: "",
    subtitle: "",
    organization: "",
    location: "",
    startDate: "",
    endDate: "",
    isCurrent: false,
    description: "",
    bullets: [],
    tags: [],
    level: kind === "skill" ? "intermediate" : "",
    url: "",
    position,
  };
}

/** Human-readable date range, tolerant of missing halves. */
export function formatPeriod(entry: Pick<CareerEntry, "startDate" | "endDate" | "isCurrent">) {
  const end = entry.isCurrent ? "Present" : entry.endDate;
  if (entry.startDate && end) return `${entry.startDate} — ${end}`;
  return entry.startDate || end || "";
}

/**
 * Completeness score (0-100) across the whole knowledge profile.
 * Used by the dashboard meter and to warn before generating a thin resume.
 */
export function profileCompleteness(profile: CareerProfile): number {
  const p = profile.personal;
  const has = (v: string) => v.trim().length > 0;
  const count = (kind: CareerKind) => profile.entries.filter((e) => e.kind === kind).length;

  const checks: boolean[] = [
    has(p.fullName),
    has(p.email),
    has(p.jobTitle) || has(p.headline),
    has(p.location),
    has(p.summary),
    has(p.githubUrl) || has(p.linkedinUrl) || has(p.websiteUrl),
    count("experience") > 0,
    count("education") > 0,
    count("skill") >= 5,
    count("project") > 0,
    count("certification") + count("achievement") > 0,
  ];

  const hit = checks.filter(Boolean).length;
  return Math.round((hit / checks.length) * 100);
}

/** Flatten the knowledge profile into prompt-friendly text for AI features. */
export function careerProfileToText(profile: CareerProfile): string {
  const p = profile.personal;
  const lines: string[] = [
    `Name: ${p.fullName}`,
    p.jobTitle && `Target/current title: ${p.jobTitle}`,
    p.location && `Location: ${p.location}`,
    p.summary && `Summary: ${p.summary}`,
  ].filter(Boolean) as string[];

  for (const kind of CAREER_KINDS) {
    const items = profile.entries.filter((e) => e.kind === kind);
    if (!items.length) continue;
    lines.push("", KIND_META[kind].label.toUpperCase());
    for (const e of items) {
      const head = [e.title, e.subtitle, formatPeriod(e), e.level && `level: ${e.level}`]
        .filter(Boolean)
        .join(" | ");
      lines.push(`- ${head}`);
      if (e.description) lines.push(`  ${e.description}`);
      for (const b of e.bullets) lines.push(`  • ${b}`);
      if (e.url) lines.push(`  ${e.url}`);
    }
  }

  return lines.join("\n");
}
