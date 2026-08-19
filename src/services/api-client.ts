import axios, { AxiosError, type AxiosInstance } from "axios";
import { env } from "@/config/env";
import { supabase } from "@/integrations/supabase/client";

/**
 * Shared Axios instance for REST calls.
 *
 * Today most reads/writes go through the managed backend SDK, but every
 * feature service talks to the app through this layer, so swapping in a
 * self-hosted API (e.g. FastAPI) later only means changing VITE_API_BASE_URL
 * and the service implementations — no component changes.
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: 30_000,
  headers: { "Content-Type": "application/json" },
});

// Attach the current access token to every outgoing request.
apiClient.interceptors.request.use(async (config) => {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (token) config.headers.set("Authorization", `Bearer ${token}`);
  return config;
});

// Normalise errors so the UI always receives a readable message.
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message?: string; error?: string }>) => {
    const message =
      error.response?.data?.message ??
      error.response?.data?.error ??
      error.message ??
      "Something went wrong. Please try again.";
    return Promise.reject(new ApiError(message, error.response?.status));
  },
);

/** Error type thrown by every service so callers can branch on status. */
export class ApiError extends Error {
  status: number | undefined;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/** Turns any thrown value into a user-facing message. */
export function toErrorMessage(error: unknown, fallback = "Something went wrong."): string {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
