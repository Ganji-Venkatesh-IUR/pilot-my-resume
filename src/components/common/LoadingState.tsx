import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

/** Small inline spinner used inside buttons and rows. */
export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("size-4 animate-spin", className)} aria-hidden />;
}

/** Inline "loading…" line for sections that are fetching. */
export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
      <Spinner /> {label}
    </p>
  );
}

/** Full-height loader used while gating authenticated routes. */
export function FullPageLoader({ label = "Loading your workspace…" }: { label?: string }) {
  return (
    <div
      role="status"
      className="flex min-h-screen items-center justify-center gap-2 text-sm text-muted-foreground"
    >
      <Spinner /> {label}
    </div>
  );
}

/** Placeholder rows that match the resume list layout. */
export function ListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-hidden>
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} className="h-[74px] w-full rounded-xl" />
      ))}
    </div>
  );
}
