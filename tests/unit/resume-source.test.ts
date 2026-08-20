/** Unit tests — upload/profile normalization into the generation corpus. */
import { describe, expect, it } from "vitest";
import { buildCorpus, MAX_CORPUS_CHARS, normalizeSource } from "@/lib/resume-source";

describe("normalizeSource", () => {
  it("flags an empty source", () => {
    const source = normalizeSource({});
    expect(source.isEmpty).toBe(true);
    expect(source.richness).toBe(0);
  });

  it("deduplicates links case-insensitively", () => {
    const source = normalizeSource({
      githubUrl: "https://github.com/Ada",
      uploads: [{ kind: "github", label: "GitHub", source_url: "https://github.com/ada" }],
    });
    expect(source.links).toHaveLength(1);
  });

  it("collects document text and raises richness", () => {
    const source = normalizeSource({
      uploads: [{ kind: "file", label: "resume.pdf", extracted_text: "x".repeat(3000) }],
      profile: { fullName: "Ada" },
      targetRole: "Frontend Engineer",
    });
    expect(source.isEmpty).toBe(false);
    expect(source.documents).toHaveLength(1);
    expect(source.richness).toBeGreaterThan(40);
  });

  it("caps the total corpus budget", () => {
    const source = normalizeSource({
      uploads: [
        { kind: "file", label: "a", extracted_text: "a".repeat(MAX_CORPUS_CHARS) },
        { kind: "file", label: "b", extracted_text: "b".repeat(5000) },
      ],
    });
    const total = source.documents.reduce((n, d) => n + d.text.length, 0);
    expect(total).toBeLessThanOrEqual(MAX_CORPUS_CHARS);
  });

  it("ignores uploads without extracted text", () => {
    const source = normalizeSource({
      uploads: [{ kind: "file", label: "scan.png", extracted_text: "   " }],
    });
    expect(source.documents).toHaveLength(0);
  });
});

describe("buildCorpus", () => {
  it("produces deterministic, labelled blocks", () => {
    const source = normalizeSource({
      profile: { fullName: "Ada", email: "ada@example.com" },
      targetRole: "Frontend Engineer",
      githubUrl: "https://github.com/ada",
      pastedText: "Built design systems.",
      uploads: [{ kind: "file", label: "resume.pdf", extracted_text: "Experience section" }],
    });
    const corpus = buildCorpus(source);
    expect(corpus).toContain("## Candidate profile");
    expect(corpus).toContain("## Target role");
    expect(corpus).toContain("## Profile links");
    expect(corpus).toContain("## Document — resume.pdf");
    expect(buildCorpus(source)).toBe(corpus);
  });

  it("omits blocks with no data", () => {
    expect(buildCorpus(normalizeSource({}))).toBe("");
  });
});
