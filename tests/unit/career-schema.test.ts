/** Unit tests — career knowledge profile completeness and prompt text. */
import { describe, expect, it } from "vitest";
import {
  blankEntry,
  careerProfileToText,
  formatPeriod,
  normalizeEntry,
  profileCompleteness,
} from "@/lib/career-schema";
import { emptyProfile, fullProfile } from "../fixtures/career";

describe("profileCompleteness", () => {
  it("is 0 for an empty profile", () => {
    expect(profileCompleteness(emptyProfile)).toBe(0);
  });

  it("is 100 for a fully populated profile", () => {
    expect(profileCompleteness(fullProfile)).toBe(100);
  });

  it("increases as sections are filled", () => {
    const partial = {
      ...emptyProfile,
      personal: { ...emptyProfile.personal, fullName: "Ada", email: "ada@example.com" },
    };
    const score = profileCompleteness(partial);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(100);
  });
});

describe("normalizeEntry", () => {
  it("coerces database rows into the canonical entry shape", () => {
    const entry = normalizeEntry({
      id: "x",
      kind: "experience",
      title: "Engineer",
      bullets: null,
      tags: null,
      is_current: true,
    });
    expect(entry.bullets).toEqual([]);
    expect(entry.tags).toEqual([]);
    expect(entry.isCurrent).toBe(true);
  });
});

describe("blankEntry", () => {
  it("creates an empty entry of the requested kind", () => {
    const entry = blankEntry("skill", 3);
    expect(entry.kind).toBe("skill");
    expect(entry.position).toBe(3);
    expect(entry.title).toBe("");
  });
});

describe("formatPeriod", () => {
  it("renders current roles as Present", () => {
    expect(formatPeriod({ startDate: "2021", endDate: "", isCurrent: true })).toMatch(/present/i);
  });

  it("renders a closed range", () => {
    expect(formatPeriod({ startDate: "2013", endDate: "2017", isCurrent: false })).toContain("2017");
  });
});

describe("careerProfileToText", () => {
  it("includes every populated section for the AI prompt", () => {
    const text = careerProfileToText(fullProfile);
    expect(text).toContain("Ada Lovelace");
    expect(text).toContain("Analytical Engines Ltd");
    expect(text).toContain("Loom UI");
    expect(text).toContain("AWS Solutions Architect");
  });

  it("does not emit empty section headers", () => {
    expect(careerProfileToText(emptyProfile)).not.toMatch(/PROJECTS/i);
  });
});
