/** Integration tests — nothing from the model is persisted unvalidated. */
import { describe, expect, it } from "vitest";
import {
  parseJson,
  validateAnalysis,
  validateMatch,
  validateProfileAdvice,
  validateResume,
  validateResumeEdit,
  validateUploadInsight,
} from "@/lib/ai/validation.server";
import { sampleResume } from "../fixtures/career";

describe("parseJson", () => {
  it("tolerates markdown code fences", () => {
    expect(parseJson('```json\n{"a":1}\n```', "test")).toEqual({ a: 1 });
  });

  it("throws a typed AiError on malformed JSON", () => {
    expect(() => parseJson("not json", "resume")).toThrowError(/malformed resume/i);
  });
});

describe("validateResume", () => {
  it("normalizes a valid document", () => {
    const resume = validateResume(JSON.stringify(sampleResume));
    expect(resume.name).toBe("Ada Lovelace");
    expect(resume.layout.order.length).toBeGreaterThan(0);
  });

  it("rejects a non-object payload", () => {
    expect(() => validateResume('"just a string"')).toThrow();
  });
});

describe("validateResumeEdit", () => {
  it("unwraps { resume, note, changes }", () => {
    const edit = validateResumeEdit(
      JSON.stringify({ resume: sampleResume, note: "Tightened summary", changes: ["a", "", "b"] }),
      "edit",
    );
    expect(edit.note).toBe("Tightened summary");
    expect(edit.changes).toEqual(["a", "b"]);
  });

  it("falls back to a default note and caps the change list", () => {
    const edit = validateResumeEdit(
      JSON.stringify({
        resume: sampleResume,
        changes: Array.from({ length: 20 }, (_, i) => `c${i}`),
      }),
      "edit",
    );
    expect(edit.note).toMatch(/updated/i);
    expect(edit.changes.length).toBeLessThanOrEqual(6);
  });

  it("still returns a canonical document when the envelope is missing", () => {
    const edit = validateResumeEdit(JSON.stringify(sampleResume), "edit");
    expect(edit.resume.layout.order.length).toBeGreaterThan(0);
    expect(edit.note).toMatch(/updated/i);
  });
});

describe("job validators", () => {
  it("normalizes analysis output", () => {
    const analysis = validateAnalysis(
      JSON.stringify({ role: "Frontend Engineer", keywords: ["React"], requirements: [] }),
    );
    expect(analysis.role).toBe("Frontend Engineer");
  });

  it("injects deterministic keyword coverage into the match", () => {
    const match = validateMatch(JSON.stringify({ score: 70, matched: [], missing: [] }), 42);
    expect(match.score).toBe(70);
    expect(match.keywordCoverage).toBe(42);
  });
});

describe("upload + profile validators", () => {
  it("applies defaults for missing fields", () => {
    const insight = validateUploadInsight("{}");
    expect(insight.summary).toBe("");
    expect(insight.documentType).toBe("other");
  });

  it("rejects an unknown document type", () => {
    expect(() => validateUploadInsight(JSON.stringify({ documentType: "spaceship" }))).toThrow();
  });

  it("normalizes profile advice severities", () => {
    const advice = validateProfileAdvice(
      JSON.stringify({ verdict: "Solid", gaps: [{ section: "projects", advice: "Add one" }] }),
    );
    expect(advice.gaps[0]?.severity).toBe("medium");
  });
});
