import { Link } from "@tanstack/react-router";
import { Compass } from "lucide-react";
import { NAV_ITEMS, NAV_FOOTER_ITEMS } from "./nav-items";

/**
 * Primary navigation. Rendered as a fixed rail on large screens and inside a
 * drawer on small screens (see AppShell).
 */
export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const linkBase =
    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring";
  const activeProps = {
    className: "bg-sidebar-accent text-sidebar-accent-foreground",
    "aria-current": "page" as const,
  };

  return (
    <nav aria-label="Main" className="flex h-full flex-col gap-1 p-3">
      <Link to="/dashboard" onClick={onNavigate} className="mb-4 flex items-center gap-2 px-2 py-1">
        <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Compass className="size-4" aria-hidden />
        </span>
        <span className="font-display text-base font-semibold tracking-tight">CareerPilot AI</span>
      </Link>

      {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
        <Link key={to} to={to} onClick={onNavigate} className={linkBase} activeProps={activeProps}>
          <Icon className="size-4 shrink-0" aria-hidden />
          {label}
        </Link>
      ))}

      <div className="mt-auto space-y-1 border-t border-sidebar-border pt-3">
        {NAV_FOOTER_ITEMS.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            onClick={onNavigate}
            className={linkBase}
            activeProps={activeProps}
          >
            <Icon className="size-4 shrink-0" aria-hidden />
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
