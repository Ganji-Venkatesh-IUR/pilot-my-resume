/**
 * Central place for browser-visible configuration.
 * Server-only values must be read from `process.env` inside a server function
 * handler — never here, this module ships to the client.
 */

const raw = import.meta.env;

export const env = {
  /** Base URL of the REST API used by the Axios service layer. */
  apiBaseUrl: (raw["VITE_API_BASE_URL"] as string | undefined) ?? "/api",
  /** Managed backend (Supabase) endpoint + publishable key. */
  supabaseUrl: raw["VITE_SUPABASE_URL"] as string | undefined,
  supabasePublishableKey: raw["VITE_SUPABASE_PUBLISHABLE_KEY"] as string | undefined,
  /** Product metadata reused by SEO tags and the UI chrome. */
  appName: "CareerPilot AI",
  isProd: raw.PROD,
  isDev: raw.DEV,
} as const;

export type Env = typeof env;
