/**
 * PDF export.
 *
 * The resume sheet is cloned into an isolated, off-screen iframe that carries a
 * copy of the app's stylesheets plus a fixed @page block. Printing the iframe
 * (rather than the live document) means the export is identical on every device
 * and can never be affected by app chrome, sidebars, scroll position or the
 * viewport width — the sheet is laid out at a fixed A4 content width.
 */

export interface ExportOptions {
  /** Element id of the resume sheet (defaults to the live preview). */
  sourceId?: string;
  /** Used as the suggested PDF filename by the browser print dialog. */
  filename: string;
  /** Page margin in millimetres. */
  margin?: number;
}

const A4_CONTENT_WIDTH_MM = 210;

/** Collects <style> and <link rel=stylesheet> markup from the host document. */
function collectStyles(): string {
  return Array.from(
    document.querySelectorAll<HTMLElement>('style, link[rel="stylesheet"]'),
  )
    .map((node) => node.outerHTML)
    .join("\n");
}

/**
 * Renders the resume into a print-ready iframe and opens the browser print
 * dialog ("Save as PDF" or a physical printer).
 * Resolves once the dialog has been dismissed; rejects on any failure.
 */
export async function exportResumePdf({
  sourceId = "resume-sheet",
  filename,
  margin = 12,
}: ExportOptions): Promise<void> {
  const source = document.getElementById(sourceId);
  if (!source) throw new Error("Nothing to export yet — generate a resume first.");

  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.setAttribute("title", "Resume export");
  iframe.style.cssText =
    "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;";
  document.body.appendChild(iframe);

  const cleanup = () => {
    // Delay removal so Safari/Firefox finish spooling the print job.
    setTimeout(() => iframe.remove(), 1000);
  };

  try {
    const doc = iframe.contentDocument;
    const win = iframe.contentWindow;
    if (!doc || !win) throw new Error("Your browser blocked the export frame.");

    doc.open();
    doc.write(`<!doctype html><html><head><meta charset="utf-8" />
<title>${escapeHtml(filename)}</title>
${collectStyles()}
<style>
  @page { size: A4; margin: ${margin}mm; }
  html, body { margin: 0; padding: 0; background: #fff; }
  /* Fixed page width keeps the export byte-identical across screen sizes. */
  #export-root { width: ${A4_CONTENT_WIDTH_MM - margin * 2}mm; }
  #export-root [id="resume-sheet"] {
    max-width: none !important;
    width: 100% !important;
    margin: 0 !important;
    padding: 0 !important;
    border: 0 !important;
    border-radius: 0 !important;
    box-shadow: none !important;
    background: #fff !important;
  }
  /* Inline-edit affordances must never leak into the PDF. */
  #export-root [contenteditable] { outline: none !important; background: transparent !important; }
  #export-root section, #export-root li, #export-root h2, #export-root h3 {
    break-inside: avoid;
    page-break-inside: avoid;
  }
</style>
</head><body><div id="export-root"></div></body></html>`);
    doc.close();

    const root = doc.getElementById("export-root")!;
    const clone = source.cloneNode(true) as HTMLElement;
    clone.querySelectorAll("[contenteditable]").forEach((node) => {
      node.removeAttribute("contenteditable");
      node.removeAttribute("role");
      node.removeAttribute("tabindex");
    });
    root.appendChild(clone);

    // Wait for the cloned stylesheets and fonts to settle before printing.
    await new Promise<void>((resolve) => {
      if (doc.readyState === "complete") resolve();
      else win.addEventListener("load", () => resolve(), { once: true });
      setTimeout(resolve, 1200); // hard timeout so export never hangs
    });
    await (doc as Document & { fonts?: FontFaceSet }).fonts?.ready?.catch(() => undefined);

    win.focus();
    win.print();
  } finally {
    cleanup();
  }
}

/** Prints the live page using the app's print stylesheet. */
export function printResume(): void {
  window.print();
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"]/g, (c) =>
    c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : "&quot;",
  );
}
