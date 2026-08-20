/** Integration tests — orchestrated AI pipelines with a mocked gateway. */
import { describe, expect, it } from "vitest";
import {
  runJobAnalysis,
  runJobMatch,
  runResumeRewrite,
} from "@/lib/ai/orchestrator.server";
import { normalizeResume } from "@/lib/resume-schema";
import { createFakeSupabase, mockGateway } from "../fixtures/supabase";
import { sampleJobDescription, sampleResume } from "../fixtures/career";

const supabase = () => createFakeSupabase({ resumes: [] }) as never;

describe("runJobAnalysis", () => {
  it("returns a normalized analysis with a trace id", async () => {
    mockGateway(
      JSON.stringify({
        role: "Senior Frontend Engineer",
        requirements: [{ label: "React", importance: "must" }],
        keywords: ["React", "TypeScript", "GraphQL"],
      }),
    );
    const result = await runJobAnalysis({ jdText: sampleJobDescription });
    expect(result.ok).toBe(true);
    expect(result.traceId).toMatch(/\w+/);
    expect(result.data.keywords).toContain("GraphQL");
  });

  it("surfaces a friendly message when the model returns junk", async () => {
    mockGateway("this is not json");
    await expect(runJobAnalysis({ jdText: sampleJobDescription })).rejects.toThrow(
      /malformed|invalid/i,
    );
  });
});

describe("runJobMatch", () => {
  it("blends model score with deterministic keyword coverage", async () => {
    mockGateway(JSON.stringify({ score: 68, matched: ["React"], missing: ["Kubernetes"] }));
    const result = await runJobMatch({
      analysis: { role: "FE", requirements: [], keywords: ["React", "Kubernetes"] } as never,
      resume: normalizeResume({ ...sampleResume, skills: ["React"] }),
    });
    expect(result.data.score).toBeGreaterThan(0);
    expect(result.data.keywordCoverage).toBe(50);
  });
});

describe("runResumeRewrite", () => {
  const resume = normalizeResume({
    ...sampleResume,
    style: { fontScale: 1.05, lineHeight: 1.4, sectionGap: 12, margin: 14 },
  });

  it("applies the copilot edit without persisting when persist=false", async () => {
    mockGateway(
      JSON.stringify({
        resume: { ...sampleResume, summary: "Tighter, quantified summary of eight years." },
        note: "Tightened the summary.",
        changes: ["Rewrote summary"],
      }),
    );
    const result = await runResumeRewrite(supabase(), {
      resumeId: "r1",
      resume,
      instruction: "Improve summary",
      persist: false,
    });
    expect(result.data.resume.summary).toMatch(/quantified/);
    expect(result.data.note).toBe("Tightened the summary.");
    expect(result.data.atsScore).toBeGreaterThan(0);
  });

  it("never lets the model overwrite user-owned layout and style", async () => {
    mockGateway(
      JSON.stringify({
        resume: {
          ...sampleResume,
          layout: { order: ["skills"], hidden: ["experience"] },
          style: { fontScale: 9, lineHeight: 9, sectionGap: 99, margin: 99 },
        },
      }),
    );
    const result = await runResumeRewrite(supabase(), {
      resumeId: "r1",
      resume,
      instruction: "Make it one page",
      persist: false,
    });
    expect(result.data.resume.layout).toEqual(resume.layout);
    expect(result.data.resume.style).toEqual(resume.style);
  });
});
