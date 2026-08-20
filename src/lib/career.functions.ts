/**
 * Career knowledge profile API (thin server-function wrappers only).
 * Endpoints: fetch, savePersonal, create, update, delete, reorder.
 * Every handler requires an authenticated session; RLS enforces ownership.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { CareerKind } from "@/lib/career-schema";

/** Read the whole knowledge profile (personal info + all entries). */
export const fetchCareerProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { loadCareerProfile } = await import("./career.server");
    return loadCareerProfile(context.supabase, context.userId);
  });

/** Update the personal info block on the user's profile row. */
export const saveCareerPersonal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: Record<string, string>) => {
    if (!input || typeof input !== "object") throw new Error("Invalid personal info payload.");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { savePersonal } = await import("./career.server");
    await savePersonal(context.supabase, context.userId, data);
    return { saved: true };
  });

/** Create one career entry. */
export const createCareerEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { kind: CareerKind } & Record<string, unknown>) => {
    if (!input?.kind) throw new Error("Missing entry type.");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { createEntry } = await import("./career.server");
    return createEntry(context.supabase, context.userId, data as never);
  });

/** Patch one career entry. */
export const updateCareerEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; patch: Record<string, unknown> }) => {
    if (!input?.id) throw new Error("Missing entry id.");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { updateEntry } = await import("./career.server");
    return updateEntry(context.supabase, data.id, data.patch as never);
  });

/** Delete one career entry. */
export const deleteCareerEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => {
    if (!input?.id) throw new Error("Missing entry id.");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { deleteEntry } = await import("./career.server");
    await deleteEntry(context.supabase, data.id);
    return { deleted: true };
  });

/** Persist a new order for a list of entries of the same kind. */
export const reorderCareerEntries = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { ids: string[] }) => {
    if (!Array.isArray(input?.ids)) throw new Error("Missing entry order.");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { reorderEntries } = await import("./career.server");
    await reorderEntries(context.supabase, data.ids);
    return { reordered: true };
  });
