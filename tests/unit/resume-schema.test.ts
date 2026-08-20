/** Unit tests — resume normalization, style limits and the ATS heuristic. */
import { describe, expect, it } from "vitest";
import {
  clampStyleValue,
  defaultLayout,
  defaultStyle,
  emptyResume,
  estimateAtsScore,
  normalizeResume,
  normalizeStyle,
  STYLE_LIMITS,
} from "@/lib/resume-schema";
import { getTemplate, TEMPLATES, DEFAULT_TEMPLATE } from "@/lib/resume-templates";
import { sampleResume } from "../fixtures/career";

describe("normalizeResume", () => {
  it("returns the empty document for garbage input", () => {
    expect(normalizeResume(null)).toEqual(emptyResume);
    expect(normalizeResume("nope").name).toBe("");
  });

  it("keeps supplied fields and fills the rest with defaults", () => {
    const resume = normalizeResume(sampleResume);
    expect(resume.name).toBe("Ada Lovelace");
    expect(resume.skills).toContain("GraphQL");
    expect(resume.experience[0]?.bullets.length).toBe(2);
    expect(resume.education).toEqual([]);
    expect(resume.layout.order).toEqual(defaultLayout.order);
  });

  it("is idempotent", () => {
    const once = normalizeResume(sampleResume);
    expect(normalizeResume(once)).toEqual(once);
  });
});

describe("style controls", () => {
  it("clamps values into the safe range", () => {
    expect(clampStyleValue("fontScale", 99)).toBe(STYLE_LIMITS.fontScale.max);
    expect(clampStyleValue("margin", -50)).toBe(STYLE_LIMITS.margin.min);
    expect(clampStyleValue("lineHeight", Number.NaN)).toBe(defaultStyle.lineHeight);
  });

  it("normalizes a partial style object", () => {
    const style = normalizeStyle({ fontScale: 1000 });
    expect(style.fontScale).toBe(STYLE_LIMITS.fontScale.max);
    expect(style.margin).toBe(defaultStyle.margin);
  });
});

describe("estimateAtsScore", () => {
  it("scores an empty resume at zero", () => {
    expect(estimateAtsScore(emptyResume)).toBe(0);
  });

  it("rewards contact info, summary, skills and quantified bullets", () => {
    const score = estimateAtsScore(normalizeResume(sampleResume));
    expect(score).toBeGreaterThan(50);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("never exceeds 100", () => {
    const stuffed = normalizeResume({
      ...sampleResume,
      skills: Array.from({ length: 40 }, (_, i) => `Skill ${i}`),
      experience: Array.from({ length: 10 }, () => sampleResume.experience![0]),
    });
    expect(estimateAtsScore(stuffed)).toBe(100);
  });
});

describe("template catalog", () => {
  it("ships at least five templates", () => {
    expect(TEMPLATES.length).toBeGreaterThanOrEqual(5);
  });

  it("has unique ids", () => {
    const ids = TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("falls back to the default for unknown ids", () => {
    expect(getTemplate("does-not-exist").id).toBe(DEFAULT_TEMPLATE);
    expect(getTemplate(null).id).toBe(DEFAULT_TEMPLATE);
  });
});
