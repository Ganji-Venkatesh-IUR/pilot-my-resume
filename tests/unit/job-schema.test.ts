/** Unit tests — job analysis/match normalization and scoring. */
import { describe, expect, it } from "vitest";
import { keywordCoverage, normalizeAnalysis, normalizeMatch, scoreTone } from "@/lib/job-schema";

describe("normalizeAnalysis", () => {
  it("returns the empty analysis for junk", () => {
    const analysis = normalizeAnalysis(undefined);
    expect(analysis.requirements).toEqual([]);
    expect(analysis.keywords).toEqual([]);
  });

  it("coerces loose model output", () => {
    const analysis = normalizeAnalysis({
      role: "  Frontend Engineer ",
      requirements: [{ label: "React", importance: "must" }, "TypeScript"],
      keywords: ["React", "React", " GraphQL "],
    });
    expect(analysis.role).toBe("Frontend Engineer");
    expect(analysis.requirements.length).toBeGreaterThan(0);
    expect(analysis.keywords).toContain("GraphQL");
  });
});

describe("normalizeMatch", () => {
  it("clamps the score to 0-100", () => {
    expect(normalizeMatch({ score: 350 }).score).toBeLessThanOrEqual(100);
    expect(normalizeMatch({ score: -10 }).score).toBeGreaterThanOrEqual(0);
  });

  it("accepts a numeric string score", () => {
    expect(normalizeMatch({ score: "72" }).score).toBe(72);
  });
});

describe("keywordCoverage", () => {
  const resumeText = "React and TypeScript engineer focused on accessibility";

  it("is 0 with no keywords", () => {
    expect(keywordCoverage([], resumeText)).toBe(0);
  });

  it("matches case-insensitively", () => {
    expect(keywordCoverage(["react", "TYPESCRIPT"], resumeText)).toBe(100);
  });

  it("reports partial coverage", () => {
    expect(keywordCoverage(["React", "Kubernetes"], resumeText)).toBe(50);
  });
});

describe("scoreTone", () => {
  it.each([
    [90, "strong"],
    [60, "fair"],
    [20, "weak"],
  ])("maps %i to %s", (score, tone) => {
    expect(scoreTone(score)).toBe(tone);
  });
});
