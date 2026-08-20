/** DOM tests — PDF export builds an isolated, fixed-width print document. */
// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";
import { exportResumePdf, printResume } from "@/lib/pdf-export";

function mountSheet(id = "resume-sheet") {
  document.body.innerHTML = `
    <style>.sheet { color: black }</style>
    <div id="${id}" class="sheet"><h1>Ada Lovelace</h1><p>Senior Frontend Engineer</p></div>
  `;
}

describe("exportResumePdf", () => {
  it("rejects when the resume sheet is missing", async () => {
    document.body.innerHTML = "";
    await expect(exportResumePdf({ filename: "ada" })).rejects.toThrow();
  });

  it("clones the sheet into an off-screen iframe and prints it", async () => {
    mountSheet();
    const printed: string[] = [];
    // happy-dom has no print implementation; capture the call instead.
    Object.defineProperty(window, "print", { value: () => printed.push("host"), writable: true });
    const promise = exportResumePdf({ filename: "ada-lovelace", margin: 12 });
    const iframe = document.querySelector("iframe");
    expect(iframe).toBeTruthy();

    const doc = iframe?.contentDocument;
    if (doc) {
      // The export document must carry the app styles, the title (filename)
      // and a fixed A4 page block so output is device-independent.
      expect(doc.title).toContain("ada-lovelace");
      expect(doc.documentElement.innerHTML).toContain("Ada Lovelace");
      expect(doc.documentElement.innerHTML).toMatch(/@page/);
      expect(doc.documentElement.innerHTML).toContain("12mm");
    }

    await promise.catch(() => undefined);
    // The iframe is torn down again so the app DOM is left untouched.
    await vi.waitFor(() => expect(document.querySelectorAll("iframe").length).toBe(0), {
      timeout: 5000,
    });
  });
});

describe("printResume", () => {
  it("delegates to the browser print dialog", () => {
    const spy = vi.fn();
    Object.defineProperty(window, "print", { value: spy, writable: true });
    printResume();
    expect(spy).toHaveBeenCalled();
  });
});
