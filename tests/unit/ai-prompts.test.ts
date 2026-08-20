/** Unit tests — prompt template registry (no transport). */
import { describe, expect, it } from "vitest";
import * as prompts from "@/lib/ai/prompts.server";

const REGISTRY = prompts.PROMPT_REGISTRY;

describe("prompt registry", () => {
  it("exposes every pipeline template", () => {
    expect(Object.keys(REGISTRY).sort()).toEqual(
      [
        "jobAnalyze",
        "jobMatch",
        "jobTailor",
        "profileSync",
        "resumeGenerate",
        "resumeRewrite",
        "uploadProcess",
      ].sort(),
    );
  });

  it("gives every template a stable id and version", () => {
    for (const template of Object.values(REGISTRY)) {
      expect(template.id).toMatch(/\S/);
      expect(template.version).toMatch(/\S/);
    }
  });

  it("catalogs templates for observability", () => {
    const catalog = prompts.promptCatalog();
    expect(catalog.length).toBe(Object.keys(REGISTRY).length);
  });
});

describe("resumeGenerate template", () => {
  it("renders a system + user message pair containing the corpus", () => {
    const messages = prompts.resumeGenerate.render({
      corpus: "## Candidate profile\nName: Ada",
      targetRole: "Frontend Engineer",
      feedback: undefined,
    });
    expect(messages).toHaveLength(2);
    expect(messages[0]?.role).toBe("system");
    expect(messages[1]?.content).toContain("Ada");
    expect(messages[1]?.content).toContain("Frontend Engineer");
  });

  it("states the ATS + truthfulness rules in the system message", () => {
    const [system] = prompts.resumeGenerate.render({ corpus: "x" } as never);
    expect(system?.content.toLowerCase()).toMatch(/never (invent|fabricate)|do not invent/);
  });
});

describe("resumeRewrite template", () => {
  it("scopes the edit when a section is supplied", () => {
    const messages = prompts.resumeRewrite.render({
      resumeJson: "{}",
      instruction: "Improve the summary",
      section: "summary",
      targetRole: undefined,
    });
    expect(JSON.stringify(messages)).toContain("summary");
  });
});

describe("jobAnalyze / jobMatch templates", () => {
  it("passes the job description through", () => {
    const messages = prompts.jobAnalyze.render({
      jdText: "We need React and GraphQL",
      hintTitle: undefined,
      hintCompany: undefined,
    });
    expect(messages[1]?.content).toContain("GraphQL");
  });
});
