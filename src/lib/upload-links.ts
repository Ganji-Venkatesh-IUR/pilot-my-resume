/**
 * Validation + normalization helpers for career profile links.
 * Kept framework-free so the same rules can move to a backend later.
 */

export type LinkKind = "github" | "linkedin" | "portfolio";

export interface LinkRule {
  kind: LinkKind;
  label: string;
  placeholder: string;
  /** Hosts accepted for this link kind; empty = any https host. */
  hosts: string[];
}

export const LINK_RULES: Record<LinkKind, LinkRule> = {
  github: {
    kind: "github",
    label: "GitHub",
    placeholder: "https://github.com/username",
    hosts: ["github.com", "www.github.com"],
  },
  linkedin: {
    kind: "linkedin",
    label: "LinkedIn",
    placeholder: "https://linkedin.com/in/username",
    hosts: ["linkedin.com", "www.linkedin.com"],
  },
  portfolio: {
    kind: "portfolio",
    label: "Portfolio",
    placeholder: "https://yourdomain.com",
    hosts: [],
  },
};

export interface LinkValidation {
  ok: boolean;
  /** Normalized absolute URL when ok. */
  url?: string;
  /** Handle / slug extracted from the path, when detectable. */
  handle?: string;
  error?: string;
}

/**
 * Validates a pasted profile URL. Accepts bare input ("github.com/foo") by
 * prefixing https:// so users don't have to type the scheme.
 */
export function validateLink(kind: LinkKind, raw: string): LinkValidation {
  const value = raw.trim();
  if (!value) return { ok: false, error: "Enter a link first." };

  const withScheme = /^https?:\/\//i.test(value) ? value : `https://${value}`;

  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return { ok: false, error: "That doesn't look like a valid URL." };
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return { ok: false, error: "Only http(s) links are supported." };
  }

  const rule = LINK_RULES[kind];
  const host = url.hostname.toLowerCase();
  if (rule.hosts.length > 0 && !rule.hosts.includes(host)) {
    return { ok: false, error: `Use a ${rule.label} URL (${rule.hosts[0]}).` };
  }
  if (rule.hosts.length === 0 && !host.includes(".")) {
    return { ok: false, error: "Enter a full domain, e.g. https://yourdomain.com" };
  }

  const segments = url.pathname.split("/").filter(Boolean);
  if (kind === "github" && segments.length === 0) {
    return { ok: false, error: "Include your username, e.g. github.com/username" };
  }
  if (kind === "linkedin" && (segments[0] !== "in" || !segments[1])) {
    return { ok: false, error: "Use your public profile, e.g. linkedin.com/in/username" };
  }

  const handle = kind === "linkedin" ? segments[1] : segments[0];

  return {
    ok: true,
    url: url.toString().replace(/\/$/, ""),
    ...(handle ? { handle } : {}),
  };
}
