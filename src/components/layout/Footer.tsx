import { Link } from "@tanstack/react-router";
import { Compass } from "lucide-react";
import { env } from "@/config/env";

/** Shared site footer used by the marketing pages and the app shell. */
export function Footer() {
  return (
    <footer className="border-t border-border bg-card/40 print:hidden">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-8 sm:flex-row sm:items-center sm:justify-between">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Compass className="size-3.5" aria-hidden />
          </span>
          <span className="font-display text-sm font-semibold">{env.appName}</span>
        </Link>

        <nav aria-label="Footer" className="flex flex-wrap gap-5 text-sm text-muted-foreground">
          <Link to="/dashboard" className="hover:text-foreground">
            Dashboard
          </Link>
          <Link to="/templates" className="hover:text-foreground">
            Templates
          </Link>
          <Link to="/settings" className="hover:text-foreground">
            Settings
          </Link>
        </nav>

        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} {env.appName}. Built for job seekers.
        </p>
      </div>
    </footer>
  );
}
