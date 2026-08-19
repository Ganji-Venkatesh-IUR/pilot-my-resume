import type { ComponentType, ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import type { LinkProps } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

type Icon = ComponentType<{ className?: string }>;

/** Base surface every dashboard block sits on. */
export function SurfaceCard({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("rounded-xl border border-border bg-card p-5 shadow-soft", className)}>
      {children}
    </div>
  );
}

/** Titled section wrapper with an optional trailing link/action. */
export function SectionCard({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <SurfaceCard className={cn("p-0", className)}>
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {title}
        </h2>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </SurfaceCard>
  );
}

/** Single KPI tile with a loading skeleton. */
export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  loading,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: Icon;
  loading?: boolean;
}) {
  return (
    <SurfaceCard>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {label}
        </p>
        <Icon className="size-4 shrink-0 text-muted-foreground" />
      </div>
      {loading ? (
        <Skeleton className="mt-3 h-9 w-20" />
      ) : (
        <p className="mt-3 font-display text-3xl font-semibold tabular-nums">{value}</p>
      )}
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </SurfaceCard>
  );
}

/** Navigational tile used by the quick actions grid. */
export function QuickActionCard({
  to,
  search,
  label,
  description,
  icon: Icon,
}: {
  to: LinkProps["to"];
  search?: LinkProps["search"];
  label: string;
  description: string;
  icon: Icon;
}) {
  return (
    <Link
      to={to}
      search={search}
      className="group flex h-full flex-col gap-2 rounded-xl border border-border bg-card p-5 shadow-soft transition-shadow hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="flex size-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
        <Icon className="size-4" />
      </span>
      <span className="flex items-center gap-1 font-medium">
        {label}
        <ArrowRight className="size-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
      </span>
      <span className="text-sm text-muted-foreground">{description}</span>
    </Link>
  );
}

/** Shared empty placeholder for every dashboard section. */
export function EmptyState({
  message,
  actionLabel,
  actionTo,
}: {
  message: string;
  actionLabel?: string;
  actionTo?: LinkProps["to"];
}) {
  return (
    <div className="rounded-lg border border-dashed border-border p-8 text-center">
      <p className="text-sm text-muted-foreground">{message}</p>
      {actionLabel && actionTo && (
        <Button asChild size="sm" className="mt-4">
          <Link to={actionTo}>{actionLabel}</Link>
        </Button>
      )}
    </div>
  );
}

/** Accessible progress meter for profile completion. */
export function ProgressMeter({
  value,
  label,
}: {
  value: number;
  label: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium tabular-nums">{value}%</span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
        className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted"
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-500"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}
