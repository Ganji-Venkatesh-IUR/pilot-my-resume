/**
 * Source normalisation for the resume generation engine.
 *
 * Uploads, profile links and pasted text arrive in many shapes. Everything is
 * folded into one `NormalizedSource` object here so the prompt templates (and
 * any future backend) consume a single, predictable structure.
 *
 * Browser-safe: no server-only imports, so the UI can preview what will be sent.
 */

export interface SourceDocument {
  label: string;
  kind: string;
  /** Extracted plain text, already length-capped. */
  text: string;
}

export interface SourceLink {
  kind: string;
  url: string;
}

export interface SourceProfile {
  fullName?: string | undefined;
  email?: string | undefined;
  headline?: string | undefined;
  location?: string | undefined;
}

export interface NormalizedSource {
  profile: SourceProfile;
  targetRole: string;
  links: SourceLink[];
  documents: SourceDocument[];
  pastedText: string;
  /** True when there is essentially nothing to work with. */
  isEmpty: boolean;
  /** 0-100 hint on how much material the engine has. */
  richness: number;
}

/** Total characters of document text handed to the model. */
export const MAX_CORPUS_CHARS = 24_000;

interface RawUpload {
  kind: string;
  label: string;
  source_url?: string | null;
  extracted_text?: string | null;
  status?: string | null;
}

/** Fold uploads + profile + free text into the canonical source shape. */
export function normalizeSource(input: {
  uploads?: RawUpload[] | undefined;
  profile?: SourceProfile | undefined;
  targetRole?: string | undefined;
  pastedText?: string | undefined;
  githubUrl?: string | undefined;
  linkedinUrl?: string | undefined;
}): NormalizedSource {
  const uploads = input.uploads ?? [];

  const links: SourceLink[] = [];
  const push = (kind: string, url?: string | null) => {
    const clean = url?.trim();
    if (!clean) return;
    if (links.some((l) => l.url.toLowerCase() === clean.toLowerCase())) return;
    links.push({ kind, url: clean });
  };

  push("github", input.githubUrl);
  push("linkedin", input.linkedinUrl);
  for (const upload of uploads) {
    if (upload.source_url) push(upload.kind, upload.source_url);
  }

  const documents: SourceDocument[] = [];
  let budget = MAX_CORPUS_CHARS;
  for (const upload of uploads) {
    const text = upload.extracted_text?.trim();
    if (!text || budget <= 0) continue;
    documents.push({
      label: upload.label,
      kind: upload.kind,
      text: text.slice(0, budget),
    });
    budget -= Math.min(text.length, budget);
  }

  const pastedText = (input.pastedText ?? "").trim().slice(0, MAX_CORPUS_CHARS);
  const docChars = documents.reduce((sum, d) => sum + d.text.length, 0);

  const richness = Math.min(
    100,
    Math.round(
      Math.min((docChars + pastedText.length) / 4000, 1) * 60 +
        Math.min(links.length, 3) * 10 +
        (input.profile?.fullName ? 5 : 0) +
        (input.targetRole ? 5 : 0),
    ),
  );

  return {
    profile: input.profile ?? {},
    targetRole: (input.targetRole ?? "").trim(),
    links,
    documents,
    pastedText,
    isEmpty: docChars === 0 && pastedText.length === 0 && links.length === 0,
    richness,
  };
}

/** Deterministic, human-readable prompt corpus built from the normalized source. */
export function buildCorpus(source: NormalizedSource): string {
  const blocks: string[] = [];

  const identity = [
    source.profile.fullName ? `Name: ${source.profile.fullName}` : "",
    source.profile.email ? `Email: ${source.profile.email}` : "",
    source.profile.headline ? `Headline: ${source.profile.headline}` : "",
    source.profile.location ? `Location: ${source.profile.location}` : "",
  ].filter(Boolean);
  if (identity.length) blocks.push(`## Candidate profile\n${identity.join("\n")}`);

  if (source.targetRole) blocks.push(`## Target role\n${source.targetRole}`);

  if (source.links.length) {
    blocks.push(
      `## Profile links\n${source.links.map((l) => `- ${l.kind}: ${l.url}`).join("\n")}`,
    );
  }

  if (source.pastedText) blocks.push(`## Pasted career notes\n${source.pastedText}`);

  for (const doc of source.documents) {
    blocks.push(`## Document — ${doc.label} (${doc.kind})\n${doc.text}`);
  }

  return blocks.join("\n\n");
}
