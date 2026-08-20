/**
 * Frontend service layer for the AI orchestrator.
 * Components call this module — never the server functions directly — so the
 * transport can change without touching UI code.
 */
import {
  aiCatalog,
  orchestrateJobAnalyze,
  orchestrateJobMatch,
  orchestrateJobTailor,
  orchestrateProfileSync,
  orchestrateResume,
  orchestrateRewrite,
  orchestrateUpload,
} from "@/lib/ai.orchestrator";
import type { ResumeContent } from "@/lib/resume-schema";
import type { JobAnalysis, JobMatch } from "@/lib/job-schema";

export const aiService = {
  /** Available tasks + prompt template versions. */
  catalog: () => aiCatalog(),

  generateResume: (resumeId: string) => orchestrateResume({ data: { resumeId } }),

  regenerateResume: (resumeId: string, feedback?: string) =>
    orchestrateResume({ data: { resumeId, regenerate: true, feedback: feedback ?? "" } }),

  rewrite: (input: {
    resumeId: string;
    resume: ResumeContent;
    instruction: string;
    section?: string;
    targetRole?: string;
    persist?: boolean;
  }) => orchestrateRewrite({ data: input }),

  analyzeJob: (input: { jdText: string; title?: string; company?: string }) =>
    orchestrateJobAnalyze({ data: input }),

  matchJob: (analysis: JobAnalysis, resume: ResumeContent) =>
    orchestrateJobMatch({ data: { analysis, resume } }),

  tailorJob: (analysis: JobAnalysis, resume: ResumeContent, match?: JobMatch) =>
    orchestrateJobTailor({ data: { analysis, resume, ...(match ? { match } : {}) } }),

  processUpload: (uploadId: string) => orchestrateUpload({ data: { uploadId } }),

  syncProfile: () => orchestrateProfileSync({}),
};
