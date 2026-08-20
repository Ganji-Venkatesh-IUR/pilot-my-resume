/**
 * Server-only job description analysis, matching and resume tailoring.
 *
 * Flow: analyze (JD -> structured requirements) -> match (requirements vs the
 * user's stored resume/career profile) -> tailor (reorder + rewrite the resume
 * without inventing anything).
 */
import { callGateway } from "./ai.server";
import {
  keywordCoverage,
  normalizeAnalysis,
  normalizeMatch,
  type JobAnalysis,
  type JobMatch,
} from "./job-schema";
import { normalizeResume, type ResumeContent } from "./resume-schema";

const TRUTH_RULES = `You are CareerPilot AI, a senior resume strategist.
Absolute rules:
- Never invent employers, titles, dates, degrees, certifications, tools or metrics.
- You may reword, reorder, re-emphasise and re-group facts that already exist.
- If the candidate lacks a requirement, say so honestly instead of faking it.
- Keep everything ATS friendly: plain text, no tables, no columns, no graphics.
- Return ONLY valid JSON.`;

const RESUME_SHAPE = `{
  "name": string, "headline": string, "email": string, "phone": string, "location": string,
  "links": string[], "summary": string, "skills": string[],
  "experience": [{ "company": string, "role": string, "period": string, "location": string, "bullets": string[] }],
  "projects": [{ "name": string, "description": string, "tech": string, "link": string }],
  "education": [{ "school": string, "degree": string, "period": string }],
  "certifications": string[]
}`;

/** Cap the JD we send so a pasted careers page can't blow the context window. */
export const MAX_JD_CHARS = 12_000;

/** Flatten a resume into plain text for deterministic keyword coverage. */
export function resumeToText(resume: ResumeContent): string {
  return [
    resume.name,
    resume.headline,
    resume.summary,
    resume.skills.join(" "),
    resume.experience
      .map((e) => `${e.role} ${e.company} ${e.period} ${e.bullets.join(" ")}`)
      .join(" "),
    resume.projects.map((p) => `${p.name} ${p.description} ${p.tech ?? ""}`).join(" "),
    resume.education.map((e) => `${e.degree} ${e.school}`).join(" "),
    resume.certifications.join(" "),
  ].join(" ");
}

/** Step 1 — extract structured requirements from a pasted job description. */
export async function analyzeJobDescription(input: {
  jdText: string;
  hintTitle?: string | undefined;
  hintCompany?: string | undefined;
}): Promise<JobAnalysis> {
  const jd = input.jdText.slice(0, MAX_JD_CHARS);

  const content = await callGateway([
    {
      role: "system",
      content: `${TRUTH_RULES}
Extract what this job actually asks for. Separate must-haves ("hard") from nice-to-haves and behavioural traits ("soft").
"keywords" are the exact terms an ATS would scan for (tools, languages, frameworks, domains) — lowercase, no duplicates.
Return JSON: {
  "role": string, "company": string, "seniority": string, "location": string,
  "summary": string,
  "requirements": [{ "label": string, "kind": "hard" | "soft", "keyword": string }],
  "keywords": string[],
  "responsibilities": string[]
}`,
    },
    {
      role: "user",
      content: `Known role title (may be blank): ${input.hintTitle ?? ""}
Known company (may be blank): ${input.hintCompany ?? ""}

Job description:
${jd}`,
    },
  ]);

  try {
    return normalizeAnalysis(JSON.parse(content));
  } catch {
    console.error("Failed to parse job analysis JSON");
    throw new Error("AI returned malformed analysis data. Please try again.");
  }
}

/** Step 2 — compare the analysis against the candidate's current resume. */
export async function matchResumeToJob(input: {
  analysis: JobAnalysis;
  resume: ResumeContent;
}): Promise<JobMatch> {
  const coverage = keywordCoverage(input.analysis.keywords, resumeToText(input.resume));

  const content = await callGateway([
    {
      role: "system",
      content: `${TRUTH_RULES}
Score how well this candidate's resume fits the role, 0-100. Weight must-haves far above nice-to-haves.
"matched" lists requirements clearly evidenced in the resume.
"missing" lists gaps; each suggestion must be safe and honest — reframe existing experience, or advise the candidate to gain/state the skill. Never suggest claiming something untrue.
Return JSON: {
  "score": number, "verdict": string, "matched": string[],
  "missing": [{ "requirement": string, "suggestion": string, "severity": "high" | "medium" | "low" }]
}`,
    },
    {
      role: "user",
      content: `Deterministic ATS keyword coverage already computed: ${coverage}%.

Job analysis JSON:
${JSON.stringify(input.analysis)}

Candidate resume JSON:
${JSON.stringify(input.resume)}`,
    },
  ]);

  try {
    const parsed = JSON.parse(content) as Record<string, unknown>;
    return normalizeMatch({ ...parsed, keywordCoverage: coverage });
  } catch {
    console.error("Failed to parse job match JSON");
    throw new Error("AI returned malformed match data. Please try again.");
  }
}

/** Step 3 — produce a tailored resume that reorders and rewrites, never invents. */
export async function tailorResumeForJob(input: {
  analysis: JobAnalysis;
  match?: JobMatch | undefined;
  resume: ResumeContent;
}): Promise<{ resume: ResumeContent; changes: string[]; note: string }> {
  const content = await callGateway([
    {
      role: "system",
      content: `${TRUTH_RULES}
Tailor the resume to the target role:
- Rewrite the summary to speak to this role using the candidate's real background.
- Reorder skills and experience bullets so the most relevant evidence comes first.
- Mirror the job's keywords ONLY where the candidate genuinely has that experience.
- Keep every company, title, date, school and metric exactly as given.
- Do not drop whole roles; you may trim weak bullets.
Return JSON: { "resume": ${RESUME_SHAPE}, "note": string, "changes": string[] }
"note" is one sentence. "changes" lists up to 6 short strings explaining the major edits.`,
    },
    {
      role: "user",
      content: `Job analysis JSON:
${JSON.stringify(input.analysis)}

${input.match ? `Match report JSON:\n${JSON.stringify(input.match)}\n` : ""}
Current resume JSON:
${JSON.stringify(input.resume)}`,
    },
  ]);

  try {
    const parsed = JSON.parse(content) as {
      resume?: unknown;
      note?: string;
      changes?: unknown;
    };
    return {
      // Layout + style stay user-owned; the model only supplies content.
      resume: {
        ...normalizeResume(parsed.resume ?? parsed),
        layout: input.resume.layout,
        style: input.resume.style,
      },
      note: typeof parsed.note === "string" ? parsed.note : "Tailored your resume for this role.",
      changes: Array.isArray(parsed.changes)
        ? parsed.changes.filter((c): c is string => typeof c === "string").slice(0, 6)
        : [],
    };
  } catch {
    console.error("Failed to parse tailored resume JSON");
    throw new Error("AI returned malformed tailoring data. Please try again.");
  }
}
