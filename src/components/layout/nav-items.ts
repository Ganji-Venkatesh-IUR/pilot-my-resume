import {
  LayoutDashboard,
  UploadCloud,
  FileText,
  Sparkles,
  LayoutTemplate,
  Target,
  BookUser,
  User,
  Settings,
} from "lucide-react";

/** Single source of truth for the primary navigation (sidebar + mobile drawer). */
export const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/upload", label: "Upload center", icon: UploadCloud },
  { to: "/career", label: "Career profile", icon: BookUser },
  { to: "/builder", label: "Resume builder", icon: FileText },
  { to: "/tailor", label: "Job tailoring", icon: Target },
  { to: "/copilot", label: "AI copilot", icon: Sparkles },
  { to: "/templates", label: "Templates", icon: LayoutTemplate },
] as const;

export const NAV_FOOTER_ITEMS = [
  { to: "/profile", label: "Profile", icon: User },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;
