import { useState } from "react";
import { ChevronDown, Download, Loader2, Printer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { exportResumePdf, printResume } from "@/lib/pdf-export";

/**
 * Download / print entry point.
 * Download renders an isolated A4 frame so output is identical across devices;
 * Print falls back to the live page for users who want the browser dialog.
 */
export function ExportMenu({
  filename,
  margin,
  disabled,
}: {
  filename: string;
  margin: number;
  disabled?: boolean;
}) {
  const [busy, setBusy] = useState(false);

  async function handleDownload() {
    setBusy(true);
    try {
      await exportResumePdf({ filename, margin });
      toast.success("Export ready — choose “Save as PDF” in the print dialog.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "PDF export failed. Try printing instead.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex">
      <Button
        variant="outline"
        size="sm"
        className="rounded-r-none"
        onClick={handleDownload}
        disabled={disabled || busy}
      >
        {busy ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : (
          <Download className="size-4" aria-hidden />
        )}
        {busy ? "Preparing…" : "Download PDF"}
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="rounded-l-none border-l-0 px-2"
            aria-label="More export options"
            disabled={disabled || busy}
          >
            <ChevronDown className="size-4" aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => void handleDownload()}>
            <Download className="size-4" aria-hidden /> Download as PDF
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => printResume()}>
            <Printer className="size-4" aria-hidden /> Print this page
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
