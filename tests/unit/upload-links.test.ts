/** Unit tests — upload center link validation. */
import { describe, expect, it } from "vitest";
import { validateLink } from "@/lib/upload-links";

describe("validateLink — github", () => {
  it("accepts a bare host and adds the scheme", () => {
    const result = validateLink("github", "github.com/ada");
    expect(result.ok).toBe(true);
    expect(result.url).toBe("https://github.com/ada");
    expect(result.handle).toBe("ada");
  });

  it("rejects the wrong host", () => {
    expect(validateLink("github", "https://gitlab.com/ada").ok).toBe(false);
  });

  it("requires a username", () => {
    expect(validateLink("github", "https://github.com").ok).toBe(false);
  });
});

describe("validateLink — linkedin", () => {
  it("accepts a public /in/ profile", () => {
    const result = validateLink("linkedin", "https://www.linkedin.com/in/ada/");
    expect(result.ok).toBe(true);
    expect(result.handle).toBe("ada");
    expect(result.url?.endsWith("/")).toBe(false);
  });

  it("rejects a company page", () => {
    expect(validateLink("linkedin", "https://linkedin.com/company/northwind").ok).toBe(false);
  });
});

describe("validateLink — portfolio", () => {
  it("accepts any https domain", () => {
    expect(validateLink("portfolio", "https://ada.dev").ok).toBe(true);
  });

  it("rejects a hostname without a dot", () => {
    expect(validateLink("portfolio", "localhost").ok).toBe(false);
  });
});

describe("validateLink — general", () => {
  it("rejects empty input with a friendly message", () => {
    const result = validateLink("github", "   ");
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/link/i);
  });

  it("rejects unparsable input", () => {
    expect(validateLink("portfolio", "http://").ok).toBe(false);
  });
});
