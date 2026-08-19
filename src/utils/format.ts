/** Small presentation helpers shared across pages. */

/** "12 Aug 2026" style short date; falls back to an em dash. */
export function formatDate(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString();
}

/** "2 hours ago" style relative time for activity feeds. */
export function formatRelative(value?: string | null): string {
  if (!value) return "—";
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return "—";
  const minutes = Math.round((then - Date.now()) / 60000);
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  const abs = Math.abs(minutes);
  if (abs < 60) return rtf.format(minutes, "minute");
  if (abs < 60 * 24) return rtf.format(Math.round(minutes / 60), "hour");
  return rtf.format(Math.round(minutes / (60 * 24)), "day");
}

/** Two-letter avatar initials from a name or email. */
export function initialsFrom(value?: string | null): string {
  const source = (value ?? "").trim();
  if (!source) return "?";
  const parts = source.split(/\s+/);
  if (parts.length > 1 && parts[0] && parts[1]) {
    return (parts[0][0]! + parts[1][0]!).toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

/** Truncates long text for list rows and previews. */
export function truncate(value: string, max = 120): string {
  return value.length <= max ? value : `${value.slice(0, max - 1)}…`;
}
