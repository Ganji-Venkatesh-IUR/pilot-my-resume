/**
 * Server-only helpers that talk to the Lovable AI Gateway.
 * Never imported by browser code (enforced by the `.server` filename).
 *
 * The generation engine is intentionally simple: normalize source material →
 * fill a prompt template → parse a strict JSON resume → normalize again.
 */
import { normalizeResume, type ResumeContent } from "./resume-schema";
import { buildCorpus, type NormalizedSource } from "./resume-source";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3.5-flash";

const RESUME_RULES = `You are CareerPilot AI, an expert technical recruiter and ATS optimisation engine.
Rules:
- Output must be strictly ATS friendly: no tables, no columns, no graphics, plain readable text.
- Bullets start with a strong action verb, are one line, and quantify impact when the source allows.
- Never invent employers, degrees, dates or metrics that are not supported by the source material.
- Leave a section as an empty array when the source has nothing for it. Do not pad with filler.
- Mirror relevant keywords from the target role naturally.
- Return ONLY a JSON object matching the requested shape.`;

const SHAPE = `{
  "name": string, "headline": string, "email": string, "phone": string, "location": string,
  "links": string[], "summary": string, "skills": string[],
  "experience": [{ "company": string, "role": string, "period": string, "location": string, "bullets": string[] }],
  "projects": [{ "name": string, "description": string, "tech": string, "link": string }],
  "education": [{ "school": string, "degree": string, "period": string }],
  "certifications": string[]
}`;

/** Low level gateway call with explicit error surfacing. */
async function callGateway(messages: Array<{ role: string; content: string }>): Promise<string> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("AI is not configured for this project.");

  const response = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      response_format: { type: "json_object" },
    }),
  });

  if (response.status === 429) throw new Error("Too many requests right now — try again in a moment.");
  if (response.status === 402) throw new Error("AI credits exhausted. Add credits to continue.");
  if (!response.ok) {
    const body = await response.text();
    console.error(`AI gateway failed [${response.status}]: ${body}`);
    throw new Error(`AI request failed (${response.status}).`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error("AI returned an empty response.");
  return content;
}

function parseResume(content: string): ResumeContent {
  try {
    return normalizeResume(JSON.parse(content));
  } catch {
    console.error("Failed to parse AI resume JSON");
    throw new Error("AI returned malformed resume data. Please try again.");
  }
}

/**
 * Deterministic scaffold used when there is no material to summarise.
 * Keeps the preview renderable instead of failing the whole request.
 */
export function baselineResume(source: NormalizedSource): ResumeContent {
  return normalizeResume({
    name: source.profile.fullName ?? "",
    headline: source.targetRole || source.profile.headline || "",
    email: source.profile.email ?? "",
    location: source.profile.location ?? "",
    links: source.links.map((l) => l.url),
  });
}

/** Build a full ATS-optimised resume from normalized source material. */
export async function generateFromSource(
  source: NormalizedSource,
  options?: { previous?: ResumeContent | undefined; feedback?: string | undefined },
): Promise<ResumeContent> {
  if (source.isEmpty) return baselineResume(source);

  const corpus = buildCorpus(source);
  const userParts = [
    "Create the strongest ATS-friendly resume you can from the material below.",
    "Sections to fill when supported by the source: summary, skills, experience, projects, education, certifications.",
    options?.previous
      ? `A previous version exists. Improve it, keeping accurate details:\n${JSON.stringify(options.previous)}`
      : "",
    options?.feedback ? `Regeneration feedback from the user: ${options.feedback}` : "",
    corpus,
  ].filter(Boolean);

  const content = await callGateway([
    { role: "system", content: `${RESUME_RULES}\nJSON shape:\n${SHAPE}` },
    { role: "user", content: userParts.join("\n\n") },
  ]);

  const generated = parseResume(content);

  // Backfill contact details the model may have dropped.
  return normalizeResume({
    ...generated,
    name: generated.name || (source.profile.fullName ?? ""),
    email: generated.email || (source.profile.email ?? ""),
    location: generated.location || (source.profile.location ?? ""),
    links: generated.links.length ? generated.links : source.links.map((l) => l.url),
  });
}

/** Apply a natural-language copilot instruction to an existing resume. */
export async function reviseResume(input: {
  resume: ResumeContent;
  instruction: string;
  targetRole?: string | undefined;
}): Promise<{ resume: ResumeContent; note: string }> {
  const content = await callGateway([
    {
      role: "system",
      content: `${RESUME_RULES}
Return JSON: { "resume": ${SHAPE}, "note": string }
"note" is one short sentence describing what you changed. Keep every field that the instruction does not touch unchanged.`,
    },
    {
      role: "user",
      content: `Target role: ${input.targetRole || "unspecified"}
Instruction: ${input.instruction}

Current resume JSON:
${JSON.stringify(input.resume)}`,
    },
  ]);

  try {
    const parsed = JSON.parse(content) as { resume?: unknown; note?: string };
    return {
      resume: normalizeResume(parsed.resume ?? parsed),
      note: parsed.note ?? "Updated your resume.",
    };
  } catch {
    throw new Error("AI returned malformed edit data. Please try again.");
  }
}
