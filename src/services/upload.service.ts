import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { validateLink, type LinkKind } from "@/lib/upload-links";

/** Bucket holding raw career documents, private per user folder. */
export const UPLOAD_BUCKET = "career-uploads";

/** Hard cap enforced client-side and by the bucket itself. */
export const MAX_FILE_BYTES = 10 * 1024 * 1024;

/** Character cap kept on extracted text so AI prompts stay bounded. */
export const MAX_EXTRACT_CHARS = 40_000;

export type UploadStatus = "pending" | "processing" | "ready" | "error";

export interface UploadRecord {
  id: string;
  kind: string;
  label: string;
  file_name: string | null;
  file_type: string | null;
  file_size: number | null;
  storage_path: string | null;
  source_url: string | null;
  status: string;
  error_message: string | null;
  extracted_text: string | null;
  metadata: Json;
  created_at: string;
  updated_at: string;
}

/** File types the drop zone advertises. `text` types get inline extraction. */
export const SUPPORTED_TYPES = [
  { ext: ".pdf", label: "PDF", extract: false },
  { ext: ".docx", label: "Word", extract: false },
  { ext: ".txt", label: "Plain text", extract: true },
  { ext: ".md", label: "Markdown", extract: true },
  { ext: ".json", label: "JSON", extract: true },
  { ext: ".csv", label: "CSV", extract: true },
] as const;

export const ACCEPT_ATTR = SUPPORTED_TYPES.map((t) => t.ext).join(",");

const TEXT_EXTS = SUPPORTED_TYPES.filter((t) => t.extract).map((t) => t.ext);

function extensionOf(name: string) {
  const dot = name.lastIndexOf(".");
  return dot === -1 ? "" : name.slice(dot).toLowerCase();
}

export function isSupportedFile(file: File) {
  return SUPPORTED_TYPES.some((t) => t.ext === extensionOf(file.name));
}

/** Simple extraction for now: plain-text formats only; binaries are stored as-is. */
async function extractText(file: File): Promise<string | null> {
  if (!TEXT_EXTS.includes(extensionOf(file.name) as (typeof TEXT_EXTS)[number])) return null;
  try {
    const text = await file.text();
    return text.slice(0, MAX_EXTRACT_CHARS);
  } catch {
    return null;
  }
}

async function currentUserId() {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Session expired. Please sign in again.");
  return data.user.id;
}

/**
 * All upload persistence (storage + metadata rows) lives here so components
 * stay presentational and the backend can be swapped later.
 */
export const uploadService = {
  async list(): Promise<UploadRecord[]> {
    const { data, error } = await supabase
      .from("uploads")
      .select(
        "id, kind, label, file_name, file_type, file_size, storage_path, source_url, status, error_message, extracted_text, metadata, created_at, updated_at",
      )
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    return (data ?? []) as UploadRecord[];
  },

  /**
   * Uploads one document to private storage and records its metadata.
   * `onProgress` reports coarse phases (0 → 100) for the UI indicator.
   */
  async uploadFile(file: File, onProgress?: (pct: number) => void): Promise<UploadRecord> {
    if (!isSupportedFile(file)) {
      throw new Error(`${file.name}: unsupported file type.`);
    }
    if (file.size > MAX_FILE_BYTES) {
      throw new Error(`${file.name}: files must be under 10 MB.`);
    }

    const userId = await currentUserId();
    const path = `${userId}/${crypto.randomUUID()}-${file.name.replace(/[^\w.\-]+/g, "_")}`;

    onProgress?.(15);
    const { error: storageError } = await supabase.storage
      .from(UPLOAD_BUCKET)
      .upload(path, file, { contentType: file.type || "application/octet-stream", upsert: false });
    if (storageError) throw new Error(storageError.message);

    onProgress?.(65);
    const extracted = await extractText(file);

    const { data, error } = await supabase
      .from("uploads")
      .insert({
        user_id: userId,
        kind: "file",
        label: file.name,
        file_name: file.name,
        file_type: file.type || extensionOf(file.name).replace(".", ""),
        file_size: file.size,
        storage_path: path,
        status: extracted ? "ready" : "pending",
        extracted_text: extracted,
        metadata: {
          extension: extensionOf(file.name),
          extracted: Boolean(extracted),
          characters: extracted?.length ?? 0,
        } as unknown as Json,
      })
      .select("*")
      .single();

    if (error) throw error;
    onProgress?.(100);
    return data as UploadRecord;
  },

  /** Validates then stores a career profile link. */
  async addLink(kind: LinkKind, rawUrl: string): Promise<UploadRecord> {
    const result = validateLink(kind, rawUrl);
    if (!result.ok || !result.url) throw new Error(result.error ?? "Invalid link.");

    const userId = await currentUserId();
    const { data, error } = await supabase
      .from("uploads")
      .insert({
        user_id: userId,
        kind,
        label: result.handle ? `${kind}/${result.handle}` : result.url,
        source_url: result.url,
        status: "ready",
        metadata: { handle: result.handle ?? null } as unknown as Json,
      })
      .select("*")
      .single();

    if (error) throw error;
    return data as UploadRecord;
  },

  async remove(record: UploadRecord) {
    if (record.storage_path) {
      await supabase.storage.from(UPLOAD_BUCKET).remove([record.storage_path]);
    }
    const { error } = await supabase.from("uploads").delete().eq("id", record.id);
    if (error) throw error;
  },

  /** Signed URL for previewing/downloading a stored document. */
  async signedUrl(path: string, seconds = 300) {
    const { data, error } = await supabase.storage
      .from(UPLOAD_BUCKET)
      .createSignedUrl(path, seconds);
    if (error) throw error;
    return data.signedUrl;
  },
};
