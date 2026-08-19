import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { ResumeContent, TemplateId } from "@/lib/resume-schema";

interface ActiveResume {
  id: string;
  title: string;
  content: ResumeContent;
  template: TemplateId;
  atsScore: number | null;
}

interface ResumeState {
  /** The resume currently open in the editor / copilot, if any. */
  active: ActiveResume | null;
  setActive: (resume: ActiveResume | null) => void;
  patchActive: (patch: Partial<ActiveResume>) => void;
  /** Draft input shared between the upload center and the builder. */
  draftSource: string;
  setDraftSource: (value: string) => void;
}

const ResumeContext = createContext<ResumeState | null>(null);

/** Global resume state shared across the editor, copilot and upload flows. */
export function ResumeProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<ActiveResume | null>(null);
  const [draftSource, setDraftSource] = useState("");

  const patchActive = useCallback((patch: Partial<ActiveResume>) => {
    setActive((current) => (current ? { ...current, ...patch } : current));
  }, []);

  const value = useMemo<ResumeState>(
    () => ({ active, setActive, patchActive, draftSource, setDraftSource }),
    [active, patchActive, draftSource],
  );

  return <ResumeContext.Provider value={value}>{children}</ResumeContext.Provider>;
}

export function useResumeContext(): ResumeState {
  const context = useContext(ResumeContext);
  if (!context) throw new Error("useResumeContext must be used inside <ResumeProvider>.");
  return context;
}
