import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Width = "narrow" | "default" | "wide" | "full";

const WIDTHS: Record<Width, string> = {
  narrow: "max-w-3xl",
  default: "max-w-5xl",
  wide: "max-w-7xl",
  full: "max-w-none",
};

/** Consistent page gutter + max width for every screen. */
export function PageContainer({
  children,
  width = "wide",
  className,
}: {
  children: ReactNode;
  width?: Width;
  className?: string;
}) {
  return <div className={cn("mx-auto w-full", WIDTHS[width], className)}>{children}</div>;
}
