import { useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  Github,
  Globe,
  Linkedin,
  Loader2,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ACCEPT_ATTR, SUPPORTED_TYPES, type UploadRecord } from "@/services/upload.service";
import { formatRelative } from "@/utils/format";

/** Item shown in the in-flight upload queue. */
export interface QueueItem {
  id: string;
  name: string;
  size: number;
  progress: number;
  status: "uploading" | "done" | "error";
  error?: string;
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Accessible drag & drop surface that also works via keyboard and click. */
export function DropZone({
  onFiles,
  disabled,
}: {
  onFiles: (files: File[]) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function open() {
    if (!disabled) inputRef.current?.click();
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-disabled={disabled}
      aria-label="Upload career documents. Drag and drop files here or press Enter to browse."
      onClick={open}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          open();
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const files = Array.from(e.dataTransfer.files ?? []);
        if (files.length) onFiles(files);
      }}
      className={`flex min-h-64 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:p-10 ${
        dragging ? "border-primary bg-accent/50" : "border-border bg-card hover:bg-muted/50"
      } ${disabled ? "pointer-events-none opacity-60" : ""}`}
    >
      <span className="flex size-14 items-center justify-center rounded-full bg-accent text-accent-foreground">
        <UploadCloud className="size-7" aria-hidden />
      </span>
      <p className="mt-4 font-display text-lg font-semibold">Drag & drop your documents</p>
      <p className="mt-1 text-sm text-muted-foreground">
        or click to browse — resumes, cover letters, certificates
      </p>
      <ul className="mt-4 flex flex-wrap justify-center gap-1.5" aria-label="Supported file types">
        {SUPPORTED_TYPES.map((type) => (
          <li key={type.ext}>
            <Badge variant="secondary" className="font-mono text-[11px]">
              {type.ext}
            </Badge>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-muted-foreground">Up to 10 MB per file</p>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPT_ATTR}
        className="sr-only"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          if (files.length) onFiles(files);
          e.target.value = "";
        }}
      />
    </div>
  );
}

/** Live progress list for files currently being uploaded. */
export function UploadQueue({ items }: { items: QueueItem[] }) {
  if (items.length === 0) return null;
  return (
    <ul className="space-y-3" aria-live="polite" aria-label="Upload progress">
      {items.map((item) => (
        <li key={item.id} className="rounded-xl border border-border bg-card p-4 shadow-soft">
          <div className="flex items-center gap-3">
            <StatusIcon status={item.status} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{item.name}</p>
              <p className="text-xs text-muted-foreground">
                {formatBytes(item.size)}
                {item.status === "error" ? ` — ${item.error}` : ""}
                {item.status === "done" ? " — uploaded" : ""}
              </p>
            </div>
            <span className="text-xs tabular-nums text-muted-foreground">{item.progress}%</span>
          </div>
          <Progress
            value={item.progress}
            className="mt-3 h-1.5"
            aria-label={`${item.name} upload progress`}
          />
        </li>
      ))}
    </ul>
  );
}

function StatusIcon({ status }: { status: QueueItem["status"] }) {
  if (status === "done")
    return <CheckCircle2 className="size-5 shrink-0 text-success" aria-label="Uploaded" />;
  if (status === "error")
    return <AlertCircle className="size-5 shrink-0 text-destructive" aria-label="Failed" />;
  return <Loader2 className="size-5 shrink-0 animate-spin text-primary" aria-label="Uploading" />;
}

function kindIcon(kind: string) {
  if (kind === "github") return Github;
  if (kind === "linkedin") return Linkedin;
  if (kind === "portfolio") return Globe;
  return FileText;
}

const STATUS_STYLES: Record<string, string> = {
  ready: "bg-success/15 text-success",
  pending: "bg-warning/15 text-warning",
  processing: "bg-accent text-accent-foreground",
  error: "bg-destructive/15 text-destructive",
};

/** Table of everything the user has brought in, newest first. */
export function RecentUploads({
  items,
  loading,
  onRemove,
  removingId,
}: {
  items: UploadRecord[];
  loading: boolean;
  onRemove: (item: UploadRecord) => void;
  removingId?: string | null;
}) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-8 text-center">
        <p className="text-sm font-medium">No uploads yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Drop a resume or add a profile link to get started.
        </p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border rounded-xl border border-border bg-card">
      {items.map((item) => {
        const Icon = kindIcon(item.kind);
        return (
          <li key={item.id} className="flex items-center gap-3 p-4">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <Icon className="size-4" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{item.label}</p>
              <p className="truncate text-xs text-muted-foreground">
                {item.kind === "file"
                  ? `${item.file_type || "file"} · ${formatBytes(item.file_size ?? 0)}`
                  : (item.source_url ?? "link")}{" "}
                · {formatRelative(item.created_at)}
              </p>
            </div>
            <Badge
              variant="secondary"
              className={`shrink-0 capitalize ${STATUS_STYLES[item.status] ?? ""}`}
            >
              {item.status === "pending" ? "stored" : item.status}
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Remove ${item.label}`}
              disabled={removingId === item.id}
              onClick={() => onRemove(item)}
            >
              {removingId === item.id ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
            </Button>
          </li>
        );
      })}
    </ul>
  );
}
