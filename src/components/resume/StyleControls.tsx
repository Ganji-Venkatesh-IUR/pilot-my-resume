import { RotateCcw, Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { STYLE_LIMITS, clampStyleValue, defaultStyle, type ResumeStyle } from "@/lib/resume-schema";

/**
 * Typography + spacing controls.
 * Ranges come from STYLE_LIMITS so a user can never push a resume outside
 * readable, ATS-safe bounds (min 90% font size, max 20mm margins, etc.).
 */
export function StyleControls({
  style,
  onChange,
}: {
  style: ResumeStyle;
  onChange: (next: ResumeStyle) => void;
}) {
  const set = (key: keyof ResumeStyle, value: number) =>
    onChange({ ...style, [key]: clampStyleValue(key, value) });

  const rows: Array<{
    key: keyof ResumeStyle;
    label: string;
    format: (v: number) => string;
  }> = [
    { key: "fontScale", label: "Font size", format: (v) => `${Math.round(v * 100)}%` },
    { key: "lineHeight", label: "Line height", format: (v) => `${Math.round(v * 100)}%` },
    { key: "sectionGap", label: "Section spacing", format: (v) => `${Math.round(v * 100)}%` },
    { key: "margin", label: "Page margin", format: (v) => `${Math.round(v)}mm` },
  ];

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Type className="size-4 text-primary" aria-hidden /> Typography
        </h2>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={() => onChange({ ...defaultStyle })}
        >
          <RotateCcw className="size-3" aria-hidden /> Reset
        </Button>
      </div>

      <div className="space-y-4">
        {rows.map((row) => {
          const limits = STYLE_LIMITS[row.key];
          return (
            <div key={row.key}>
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <label htmlFor={`style-${row.key}`} className="text-muted-foreground">
                  {row.label}
                </label>
                <span className="tabular-nums font-medium">{row.format(style[row.key])}</span>
              </div>
              <Slider
                id={`style-${row.key}`}
                aria-label={row.label}
                min={limits.min}
                max={limits.max}
                step={limits.step}
                value={[style[row.key]]}
                onValueChange={([v]) => set(row.key, v ?? defaultStyle[row.key])}
              />
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-[11px] leading-snug text-muted-foreground">
        Limits keep the resume parser-friendly — text never drops below 90% size and margins stay
        within 10–20mm.
      </p>
    </div>
  );
}
