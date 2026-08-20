/**
 * Minimal in-memory Supabase client double.
 *
 * It supports the narrow query surface the services actually use
 * (`from().select().eq().maybeSingle()`, `insert`, `update`, `delete`) so
 * integration tests can exercise real service code without a database.
 */
import { vi } from "vitest";

type Row = Record<string, unknown>;

export interface FakeDb {
  [table: string]: Row[];
}

export function createFakeSupabase(seed: FakeDb = {}) {
  const db: FakeDb = JSON.parse(JSON.stringify(seed));
  const calls: Array<{ table: string; op: string; payload?: unknown }> = [];

  function builder(table: string) {
    let rows = () => (db[table] ??= []);
    const filters: Array<(r: Row) => boolean> = [];
    let pending: { op: "select" | "insert" | "update" | "delete"; payload?: Row } = {
      op: "select",
    };

    const applyFilters = () => rows().filter((r) => filters.every((f) => f(r)));

    const resolve = () => {
      calls.push({ table, op: pending.op, payload: pending.payload });
      switch (pending.op) {
        case "insert": {
          const row = { id: `row-${rows().length + 1}`, ...(pending.payload ?? {}) };
          rows().push(row);
          return { data: [row], error: null };
        }
        case "update": {
          const matched = applyFilters();
          for (const r of matched) Object.assign(r, pending.payload);
          return { data: matched, error: null };
        }
        case "delete": {
          const matched = applyFilters();
          db[table] = rows().filter((r) => !matched.includes(r));
          return { data: matched, error: null };
        }
        default:
          return { data: applyFilters(), error: null };
      }
    };

    const api: Record<string, unknown> = {
      select: () => api,
      order: () => api,
      limit: () => api,
      eq: (col: string, value: unknown) => {
        filters.push((r) => r[col] === value);
        return api;
      },
      in: (col: string, values: unknown[]) => {
        filters.push((r) => values.includes(r[col]));
        return api;
      },
      insert: (payload: Row) => {
        pending = { op: "insert", payload };
        return api;
      },
      update: (payload: Row) => {
        pending = { op: "update", payload };
        return api;
      },
      upsert: (payload: Row) => {
        pending = { op: "insert", payload };
        return api;
      },
      delete: () => {
        pending = { op: "delete" };
        return api;
      },
      single: async () => {
        const res = resolve();
        return { data: res.data?.[0] ?? null, error: res.data?.length ? null : { message: "no rows" } };
      },
      maybeSingle: async () => {
        const res = resolve();
        return { data: res.data?.[0] ?? null, error: null };
      },
      then: (onFulfilled: (v: unknown) => unknown) => Promise.resolve(resolve()).then(onFulfilled),
    };
    return api;
  }

  return {
    db,
    calls,
    from: vi.fn((table: string) => builder(table)),
    auth: {
      getUser: vi.fn(async () => ({ data: { user: { id: "user-1" } }, error: null })),
    },
  } as unknown as {
    db: FakeDb;
    calls: typeof calls;
    from: (table: string) => any;
    auth: { getUser: () => Promise<unknown> };
  };
}

/** Queue AI Gateway responses (in order) for `globalThis.fetch`. */
export function mockGateway(...contents: Array<string | { status: number; body?: string }>) {
  const queue = [...contents];
  const fetchMock = vi.fn(async () => {
    const next = queue.shift();
    if (next === undefined) throw new Error("Gateway called more times than mocked.");
    if (typeof next !== "string") {
      return new Response(next.body ?? "error", { status: next.status });
    }
    return new Response(
      JSON.stringify({ choices: [{ message: { content: next } }] }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  });
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}
