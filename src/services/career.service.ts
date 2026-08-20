/**
 * Career knowledge profile service layer.
 * The UI talks to this module only — it never calls server functions directly,
 * so swapping in a different backend later touches one file.
 */
import {
  createCareerEntry,
  deleteCareerEntry,
  fetchCareerProfile,
  reorderCareerEntries,
  saveCareerPersonal,
  updateCareerEntry,
} from "@/lib/career.functions";
import type { CareerEntry, CareerKind, CareerPersonal, CareerProfile } from "@/lib/career-schema";

export const careerService = {
  /** Full profile: personal info + every entry, ordered per kind. */
  get(): Promise<CareerProfile> {
    return fetchCareerProfile({});
  },

  savePersonal(personal: Partial<CareerPersonal>) {
    return saveCareerPersonal({ data: personal as Record<string, string> });
  },

  create(entry: Partial<CareerEntry> & { kind: CareerKind }): Promise<CareerEntry> {
    return createCareerEntry({ data: entry as never });
  },

  update(id: string, patch: Partial<CareerEntry>): Promise<CareerEntry> {
    return updateCareerEntry({ data: { id, patch: patch as Record<string, unknown> } });
  },

  remove(id: string) {
    return deleteCareerEntry({ data: { id } });
  },

  reorder(ids: string[]) {
    return reorderCareerEntries({ data: { ids } });
  },
};
