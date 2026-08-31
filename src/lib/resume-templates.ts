/**
 * Template registry.
 *
 * Templates are pure data descriptors — the renderer (`ResumePreview`) reads a
 * descriptor and derives every class from it. Adding a template means adding one
 * entry here; no renderer changes required.
 *
 * Every template stays parser-safe: single text flow, no tables, no images.
 */

export type TemplateFont = "sans" | "serif" | "mono-heading";
export type HeaderAlign = "left" | "center";

export interface TemplateDescriptor {
  id: string;
  /** Display name in the gallery and switcher. */
  name: string;
  blurb: string;
  /** Short audience hint, e.g. "Students", "Engineers". */
  audience: string;
  font: TemplateFont;
  /** Base body size in px at scale 1. */
  baseSize: number;
  /** Base line-height at density 1. */
  leading: number;
  headerAlign: HeaderAlign;
  /** Thin accent bar above the header. */
  accentBar: boolean;
  /** Renders skills in a right-hand rail instead of inline. */
  sidebar: boolean;
  /** Underline under section headings. */
  headingRule: boolean;
  /** Section heading colour uses the accent instead of foreground. */
  accentHeadings: boolean;
  /** Letter-spacing for section headings. */
  headingTracking: string;
  /** Preferred default section order override (optional). */
  preferredOrder?: string[];
}

export const TEMPLATES: TemplateDescriptor[] = [
  {
    id: "atlas",
    name: "ATS Professional",
    blurb: "Single column, maximum parser compatibility",
    audience: "Any role",
    font: "sans",
    baseSize: 12.5,
    leading: 1.55,
    headerAlign: "left",
    accentBar: false,
    sidebar: false,
    headingRule: true,
    accentHeadings: false,
    headingTracking: "0.14em",
  },
  {
    id: "signal",
    name: "Modern",
    blurb: "Accent bar and coloured headings for product roles",
    audience: "Product & design",
    font: "sans",
    baseSize: 12.5,
    leading: 1.6,
    headerAlign: "left",
    accentBar: true,
    sidebar: false,
    headingRule: false,
    accentHeadings: true,
    headingTracking: "0.16em",
  },
  {
    id: "compact",
    name: "Minimal",
    blurb: "Dense one-page layout with quiet typography",
    audience: "Senior ICs",
    font: "sans",
    baseSize: 11,
    leading: 1.4,
    headerAlign: "left",
    accentBar: false,
    sidebar: false,
    headingRule: true,
    accentHeadings: false,
    headingTracking: "0.12em",
  },
  {
    id: "scholar",
    name: "Student",
    blurb: "Education and projects first, generous spacing",
    audience: "Students & grads",
    font: "sans",
    baseSize: 12.5,
    leading: 1.65,
    headerAlign: "center",
    accentBar: false,
    sidebar: false,
    headingRule: true,
    accentHeadings: false,
    headingTracking: "0.14em",
    preferredOrder: ["summary", "education", "projects", "skills", "experience", "certifications"],
  },
  {
    id: "devstack",
    name: "Developer",
    blurb: "Monospace headings, projects and stack up front",
    audience: "Engineers",
    font: "mono-heading",
    baseSize: 12,
    leading: 1.5,
    headerAlign: "left",
    accentBar: true,
    sidebar: false,
    headingRule: true,
    accentHeadings: true,
    headingTracking: "0.1em",
    preferredOrder: ["summary", "skills", "experience", "projects", "education", "certifications"],
  },
  {
    id: "meridian",
    name: "Meridian",
    blurb: "Skills rail alongside the main column",
    audience: "Any role",
    font: "sans",
    baseSize: 12.5,
    leading: 1.55,
    headerAlign: "left",
    accentBar: false,
    sidebar: true,
    headingRule: true,
    accentHeadings: false,
    headingTracking: "0.14em",
  },
  {
    id: "editorial",
    name: "Editorial",
    blurb: "Serif headings, centred header, airy spacing",
    audience: "Leadership",
    font: "serif",
    baseSize: 12.5,
    leading: 1.7,
    headerAlign: "center",
    accentBar: false,
    sidebar: false,
    headingRule: true,
    accentHeadings: false,
    headingTracking: "0.2em",
  },
];

export type TemplateId = string;

export const DEFAULT_TEMPLATE: TemplateId = "atlas";

/** Never throws — unknown ids fall back to the ATS-safe default. */
export function getTemplate(id: string | null | undefined): TemplateDescriptor {
  return TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0]!;
}
