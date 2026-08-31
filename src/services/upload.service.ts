import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { validateLink, type LinkKind } from "@/lib/upload-links";

/** Bucket holding raw career documents, private per user folder. */
export const UPLOAD_BUCKET = "resumes";
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
 *
 * Transaction safety: If storage upload succeeds but database INSERT fails,
 * the orphaned storage file is cleaned up to prevent storage leaks.
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
   *
   * Transaction semantics: If storage upload succeeds but database INSERT fails,
   * the orphaned storage file is automatically deleted to maintain consistency.
   */
  async uploadFile(file: File, onProgress?: (pct: number) => void): Promise<UploadRecord> {
    if (!isSupportedFile(file)) {
      throw new Error(`${file.name}: unsupported file type.`);
    }
    if (file.size > MAX_FILE_BYTES) {
      throw new Error(`${file.name}: files must be under 10 MB.`);
    }

    let userId: string;
    try {
      userId = await currentUserId();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Authentication failed";
      throw new Error(`Cannot upload: ${message}`);
    }

    const path = `${userId}/${crypto.randomUUID()}-${file.name.replace(/[^\w.-]+/g, "_")}`;

    onProgress?.(15);

    // Step 1: Upload to storage
    const { error: storageError } = await supabase.storage.from(UPLOAD_BUCKET).upload(path, file, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });
    if (storageError) {
      throw new Error(`Storage upload failed: ${storageError.message}`);
    }

    onProgress?.(65);

    // Step 2: Extract text (if applicable)
    let extracted: string | null = null;
    try {
      extracted = await extractText(file);
    } catch (err) {
      // Text extraction is best-effort; don't fail the upload if it fails
      console.warn("Text extraction failed:", err);
    }

    // Step 3: Insert metadata into database
    const uploadData = {
      user_id: userId,
      kind: "file" as const,
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
    };

    try {
      // Step 3a: INSERT the record ONLY (minimal fields to isolate INSERT issues)
      console.log("[UPLOAD] Inserting metadata into public.uploads", {
        user_id: userId,
        kind: uploadData.kind,
        label: uploadData.label,
        status: uploadData.status,
        storage_path: uploadData.storage_path,
      });

      const { data: insertData, error: insertError } = await supabase
        .from("uploads")
        .insert([uploadData])
        .select("id")
        .single();

      if (insertError) {
        // Log the ACTUAL Supabase error for debugging
        console.error("[UPLOAD] INSERT FAILED - ACTUAL SUPABASE ERROR", {
          message: insertError.message,
          code: insertError.code,
          details: insertError.details,
          hint: insertError.hint,
          status: insertError.status,
          fullError: insertError,
        });
        throw insertError;
      }

      if (!insertData?.id) {
        const error = new Error("INSERT succeeded but no ID returned");
        console.error("[UPLOAD] NO ID RETURNED AFTER INSERT", { error });
        throw error;
      }

      console.log("[UPLOAD] INSERT succeeded with ID:", insertData.id);

      // Step 3b: FETCH the complete record (separate from INSERT)
      console.log("[UPLOAD] Fetching complete record by ID", { id: insertData.id });

      const { data: fullData, error: selectError } = await supabase
        .from("uploads")
        .select(
          "id, kind, label, file_name, file_type, file_size, storage_path, source_url, status, error_message, extracted_text, metadata, created_at, updated_at",
        )
        .eq("id", insertData.id)
        .single();

      if (selectError) {
        // Log SELECT error separately
        console.error("[UPLOAD] SELECT AFTER INSERT FAILED", {
          message: selectError.message,
          code: selectError.code,
          details: selectError.details,
          hint: selectError.hint,
          status: selectError.status,
          recordId: insertData.id,
          fullError: selectError,
        });
        throw selectError;
      }

      if (!fullData) {
        const error = new Error(
          "SELECT returned no rows for inserted record (RLS or data inconsistency)",
        );
        console.error("[UPLOAD] NO DATA RETURNED AFTER SELECT", { error, recordId: insertData.id });
        throw error;
      }

      console.log("[UPLOAD] Upload complete", {
        id: fullData.id,
        user_id: fullData.user_id,
        status: fullData.status,
        storage_path: fullData.storage_path,
      });

      onProgress?.(100);
      return fullData as UploadRecord;
    } catch (dbError) {
      console.error("[UPLOAD] OPERATION FAILED - Cleaning up orphaned storage file", {
        path,
        error: dbError instanceof Error ? dbError.message : String(dbError),
      });

      // Database operation failed; clean up the orphaned storage file
      try {
        const { error: deleteError } = await supabase.storage.from(UPLOAD_BUCKET).remove([path]);
        if (deleteError) {
          console.error("[UPLOAD] CLEANUP FAILED - Could not delete orphaned file", {
            path,
            deleteError,
          });
        } else {
          console.log("[UPLOAD] CLEANUP SUCCESS - Orphaned file deleted", { path });
        }
      } catch (cleanupError) {
        console.error("[UPLOAD] CLEANUP EXCEPTION", { path, cleanupError });
      }

      // Provide a detailed error message
      if (dbError instanceof Error) {
        const errorMsg = dbError.message || "Unknown database error";
        const errorObj = dbError as Error & {
          code?: string;
          details?: string;
          hint?: string;
          status?: number;
        };
        const code = errorObj.code;
        const details = errorObj.details;
        const hint = errorObj.hint;

        console.error("[UPLOAD] THROWING USER ERROR", {
          originalMessage: errorMsg,
          code,
          details,
          hint,
        });

        if (
          errorMsg.includes("RLS") ||
          errorMsg.includes("policy") ||
          errorMsg.includes("permission") ||
          code === "PGRST301"
        ) {
          throw new Error(
            `Cannot save upload metadata: Permission denied by RLS policy. Please check your authentication. [${code}]`,
          );
        }
        if (
          errorMsg.includes("No rows found") ||
          errorMsg.includes("single") ||
          errorMsg.includes("cannot be retrieved")
        ) {
          throw new Error(
            `Upload stored but metadata retrieval failed. Please refresh and check your uploads. [${code}]`,
          );
        }
        if (
          errorMsg.includes("foreign key") ||
          errorMsg.includes("FOREIGN KEY") ||
          code === "23503"
        ) {
          throw new Error(
            `Invalid user ID. User session may have expired. Please sign out and sign back in. [${code}]`,
          );
        }
        if (errorMsg.includes("violates unique constraint")) {
          throw new Error(
            `Upload already exists. This file may have been uploaded previously. [${code}]`,
          );
        }
        if (errorMsg.includes("not-null violation") || code === "23502") {
          throw new Error(`Missing required field in upload metadata. [${code}]`);
        }
        if (errorMsg.includes("check constraint") || code === "23514") {
          throw new Error(`Upload data failed validation. Please try again. [${code}]`);
        }

        throw new Error(
          `Resume upload failed: ${errorMsg}${code ? ` [${code}]` : ""}${hint ? ` - ${hint}` : ""}`,
        );
      }

      throw new Error("Resume upload failed: Unknown database error");
    }
  },

  /** Validates then stores a career profile link. */
  async addLink(kind: LinkKind, rawUrl: string): Promise<UploadRecord> {
    const result = validateLink(kind, rawUrl);
    if (!result.ok || !result.url) throw new Error(result.error ?? "Invalid link.");

    let userId: string;
    try {
      userId = await currentUserId();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Authentication failed";
      throw new Error(`Cannot save link: ${message}`);
    }

    const linkData = {
      user_id: userId,
      kind,
      label: result.handle ? `${kind}/${result.handle}` : result.url,
      source_url: result.url,
      status: "ready" as const,
      metadata: { handle: result.handle ?? null } as unknown as Json,
    };

    try {
      console.log("[ADDLINK] Inserting profile link", { kind, label: linkData.label });

      const { data, error } = await supabase
        .from("uploads")
        .insert([linkData])
        .select("*")
        .single();

      if (error) {
        console.error("[ADDLINK] INSERT FAILED", {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
          fullError: error,
        });
        throw error;
      }

      if (!data) {
        throw new Error("Database returned no rows after insert");
      }

      console.log("[ADDLINK] Success", { id: data.id, kind: data.kind });
      return data as UploadRecord;
    } catch (dbError) {
      if (dbError instanceof Error) {
        const errorMsg = dbError.message || "Unknown database error";
        const errorObj = dbError as Error & { code?: string };
        const code = errorObj.code;
        if (
          errorMsg.includes("RLS") ||
          errorMsg.includes("policy") ||
          errorMsg.includes("permission") ||
          code === "PGRST301"
        ) {
          throw new Error(`Cannot save profile link: Permission denied by RLS policy. [${code}]`);
        }
        if (code === "23503") {
          throw new Error(`Invalid user ID. Please sign out and sign back in. [${code}]`);
        }
        throw new Error(`Failed to save profile link: ${errorMsg}${code ? ` [${code}]` : ""}`);
      }
      throw new Error("Failed to save profile link: Unknown error");
    }
  },

  async remove(record: UploadRecord) {
    try {
      console.log("[REMOVE] Deleting upload", { id: record.id, storage_path: record.storage_path });

      // Delete storage file first, then database record
      if (record.storage_path) {
        const { error: storageError } = await supabase.storage
          .from(UPLOAD_BUCKET)
          .remove([record.storage_path]);
        if (storageError) {
          // Continue even if storage deletion fails; the database record should still be deleted
          console.warn("[REMOVE] Failed to delete storage file", { storageError });
        } else {
          console.log("[REMOVE] Storage file deleted", { path: record.storage_path });
        }
      }

      // Delete database record
      console.log("[REMOVE] Deleting database record", { id: record.id });
      const { error: dbError } = await supabase.from("uploads").delete().eq("id", record.id);
      if (dbError) {
        console.error("[REMOVE] DELETE FAILED", {
          message: dbError.message,
          code: dbError.code,
          details: dbError.details,
          hint: dbError.hint,
        });
        throw dbError;
      }

      console.log("[REMOVE] Success", { id: record.id });
    } catch (err) {
      if (err instanceof Error) {
        const errorObj = err as Error & { code?: string };
        const code = errorObj.code;
        throw new Error(`Failed to remove upload: ${err.message}${code ? ` [${code}]` : ""}`);
      }
      throw err;
    }
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
