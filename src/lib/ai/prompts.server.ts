/**
 * Prompt template registry (server-only).
 *
 * All prompt text for CareerPilot AI lives here — never inline in a route
 * handler or a server function. Templates are pure data + a render function so
 * they can be versioned, diffed and reused across services.
 */

/** Shared JSON shape for a resume document, referenced by several templates. */
export const RESUME_JSON_SHAPE = `{
  "name": string, "headline": string, "email": string, "phone": string, "location": string,
  "links": string[], "summary": string, "skills": string[],
  "experience": [{ "company": string, "role": string, "period": string, "location": string, "bullets": string[] }],
  "projects": [{ "name": string, "description": string, "tech": string, "link": string }],
  "education": [{ "school": string, "degree": string, "period": string }],
  "certifications": string[]
}`;

/** Rules every resume-writing prompt inherits. */
export const ATS_RULES = `You are CareerPilot AI, an expert technical recruiter and ATS optimisation engine.
Rules:
- Output must be strictly ATS friendly: no tables, no columns, no graphics, plain readable text.
- Bullets start with a strong action verb, are one line, and quantify impact when the source allows.
- Never invent employers, degrees, dates or metrics that are not supported by the source material.
- Leave a section as an empty array when the source has nothing for it. Do not pad with filler.
- Mirror relevant keywords from the target role naturally.
- Return ONLY a JSON object matching the requested shape.`;

/** Rules every job-tailoring prompt inherits. */
export const TRUTH_RULES = `You are CareerPilot AI, a senior resume strategist.
Absolute rules:
- Never invent employers, titles, dates, degrees, certifications, tools or metrics.
- You may reword, reorder, re-emphasise and re-group facts that already exist.
- If the candidate lacks a requirement, say so honestly instead of faking it.
- Keep everything ATS friendly: plain text, no tables, no columns, no graphics.
- Return ONLY valid JSON.`;

export interface PromptTemplate<V extends Record<string, unknown>> {
  /** Stable identifier used in logs and the public catalog. */
  id: string;
  /** Bumped whenever the wording changes materially. */
  version: string;
  /** One line describing what this template is for. */
  description: string;
  /** Build the chat messages for the gateway. */
  render: (vars: V) => Array<{ role: "system" | "user"; content: string }>;
}

const line = (label: string, value?: string | undefined) =>
  value && value.trim() ? `${label}: ${value.trim()}` : "";

/** Build an ATS resume from normalized source material. */
export const resumeGenerate: PromptTemplate<{
  corpus: string;
  targetRole?: string | undefined;
  previous?: string | undefined;
  feedback?: string | undefined;
}> = {
  id: "resume.generate",
  version: "1.1",
  description: "Turn normalized career source material into a full ATS resume.",
  render: (v) => [
    { role: "system", content: `${ATS_RULES}\nJSON shape:\n${RESUME_JSON_SHAPE}` },
    {
      role: "user",
      content: [
        "Create the strongest ATS-friendly resume you can from the material below.",
        "Sections to fill when supported by the source: summary, skills, experience, projects, education, certifications.",
        line("Target role", v.targetRole),
        v.previous
          ? `A previous version exists. Improve it, keeping accurate details:\n${v.previous}`
          : "",
        line("Regeneration feedback from the user", v.feedback),
        v.corpus,
      ]
        .filter(Boolean)
        .join("\n\n"),
    },
  ],
};

/** Rewrite one section (or the whole resume) under a copilot instruction. */
export const resumeRewrite: PromptTemplate<{
  resumeJson: string;
  instruction: string;
  section?: string | undefined;
  targetRole?: string | undefined;
}> = {
  id: "resume.rewrite",
  version: "1.1",
  description: "Apply a copilot instruction to a resume while preserving every fact.",
  render: (v) => {
    const scope =
      v.section && v.section !== "all"
        ? `Only modify the "${v.section}" section. Every other field must be returned byte-identical.`
        : "Modify only what the instruction requires; leave untouched fields identical.";
    return [
      {
        role: "system",
        content: `${ATS_RULES}
${scope}
Preserve every fact: employers, titles, dates, schools, metrics and technologies may be reworded but never invented, removed or altered in meaning.
Return JSON: { "resume": ${RESUME_JSON_SHAPE}, "note": string, "changes": string[] }
"note" is one short sentence. "changes" lists up to 4 short bullet strings explaining the major edits.`,
      },
      {
        role: "user",
        content: `Target role: ${v.targetRole || "unspecified"}
Section in focus: ${v.section || "all"}
Instruction: ${v.instruction}

Current resume JSON:
${v.resumeJson}`,
      },
    ];
  },
};

/** Extract structured requirements from a pasted job description. */
export const jobAnalyze: PromptTemplate<{
  jdText: string;
  hintTitle?: string | undefined;
  hintCompany?: string | undefined;
}> = {
  id: "job.analyze",
  version: "1.0",
  description: "Extract role requirements and ATS keywords from a job description.",
  render: (v) => [
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
      content: `Known role title (may be blank): ${v.hintTitle ?? ""}
Known company (may be blank): ${v.hintCompany ?? ""}

Job description:
${v.jdText}`,
    },
  ],
};

/** Score a resume against an analyzed job. */
export const jobMatch: PromptTemplate<{
  analysisJson: string;
  resumeJson: string;
  coverage: number;
}> = {
  id: "job.match",
  version: "1.0",
  description: "Score resume/job fit and list honest gaps with safe suggestions.",
  render: (v) => [
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
      content: `Deterministic ATS keyword coverage already computed: ${v.coverage}%.

Job analysis JSON:
${v.analysisJson}

Candidate resume JSON:
${v.resumeJson}`,
    },
  ],
};

/** Produce a tailored resume for a specific job. */
export const jobTailor: PromptTemplate<{
  analysisJson: string;
  matchJson?: string | undefined;
  resumeJson: string;
}> = {
  id: "job.tailor",
  version: "1.0",
  description: "Reorder and rewrite a resume for one job without inventing facts.",
  render: (v) => [
    {
      role: "system",
      content: `${TRUTH_RULES}
Tailor the resume to the target role:
- Rewrite the summary to speak to this role using the candidate's real background.
- Reorder skills and experience bullets so the most relevant evidence comes first.
- Mirror the job's keywords ONLY where the candidate genuinely has that experience.
- Keep every company, title, date, school and metric exactly as given.
- Do not drop whole roles; you may trim weak bullets.
Return JSON: { "resume": ${RESUME_JSON_SHAPE}, "note": string, "changes": string[] }
"note" is one sentence. "changes" lists up to 6 short strings explaining the major edits.`,
    },
    {
      role: "user",
      content: `Job analysis JSON:
${v.analysisJson}

${v.matchJson ? `Match report JSON:\n${v.matchJson}\n` : ""}
Current resume JSON:
${v.resumeJson}`,
    },
  ],
};

/** Summarise one uploaded document into structured, reusable facts. */
export const uploadProcess: PromptTemplate<{ label: string; text: string }> = {
  id: "upload.process",
  version: "1.0",
  description: "Extract structured facts from an uploaded career document.",
  render: (v) => [
    {
      role: "system",
      content: `${TRUTH_RULES}
Read the uploaded career document and extract only what it actually contains.
Return JSON: {
  "summary": string,
  "skills": string[],
  "highlights": string[],
  "organizations": string[],
  "documentType": "resume" | "certificate" | "transcript" | "portfolio" | "other"
}
"summary" is at most two sentences. Arrays are empty when the document has nothing for them.`,
    },
    {
      role: "user",
      content: `Document label: ${v.label}\n\nDocument text:\n${v.text}`,
    },
  ],
};

/** Suggest what the career knowledge profile is still missing. */
export const profileSync: PromptTemplate<{ profileText: string; completeness: number }> = {
  id: "profile.sync",
  version: "1.0",
  description: "Review the career knowledge profile and suggest concrete next steps.",
  render: (v) => [
    {
      role: "system",
      content: `${TRUTH_RULES}
Review the candidate's career knowledge profile and advise how to strengthen it.
Never invent facts about the candidate — only describe what they should add or clarify themselves.
Return JSON: {
  "verdict": string,
  "gaps": [{ "section": string, "advice": string, "severity": "high" | "medium" | "low" }],
  "nextSteps": string[]
}`,
    },
    {
      role: "user",
      content: `Deterministic completeness score: ${v.completeness}%.\n\nCareer knowledge profile:\n${v.profileText}`,
    },
  ],
};

/** Registry used for logging, the catalog endpoint and prompt versioning. */
export const PROMPT_REGISTRY = {
  [resumeGenerate.id]: resumeGenerate,
  [resumeRewrite.id]: resumeRewrite,
  [jobAnalyze.id]: jobAnalyze,
  [jobMatch.id]: jobMatch,
  [jobTailor.id]: jobTailor,
  [uploadProcess.id]: uploadProcess,
  [profileSync.id]: profileSync,
} as const;

/** Public, non-sensitive description of the available prompt templates. */
export function promptCatalog() {
  return Object.values(PROMPT_REGISTRY).map((t) => ({
    id: t.id,
    version: t.version,
    description: t.description,
  }));
}
