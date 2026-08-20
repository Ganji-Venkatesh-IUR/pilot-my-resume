/** Unit tests — auth & profile form validation rules. */
import { describe, expect, it } from "vitest";
import {
  fieldErrors,
  forgotPasswordSchema,
  profileSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
} from "@/lib/validation";
import { testUser } from "../fixtures/career";

describe("signUpSchema", () => {
  it("accepts a valid registration", () => {
    const result = signUpSchema.safeParse({
      fullName: testUser.fullName,
      email: testUser.email,
      password: testUser.password,
    });
    expect(result.success).toBe(true);
  });

  it("rejects a one-character name", () => {
    const result = signUpSchema.safeParse({
      fullName: "A",
      email: testUser.email,
      password: testUser.password,
    });
    expect(result.success).toBe(false);
  });

  it.each([
    ["too short", "Ab1!"],
    ["no digit", "Abcdefghij!"],
    ["no letter", "1234567890!"],
  ])("rejects a weak password (%s)", (_label, password) => {
    const result = signUpSchema.safeParse({
      fullName: testUser.fullName,
      email: testUser.email,
      password,
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid email", () => {
    expect(signInSchema.safeParse({ email: "nope", password: testUser.password }).success).toBe(
      false,
    );
  });
});

describe("password reset flows", () => {
  it("validates the forgot-password email", () => {
    expect(forgotPasswordSchema.safeParse({ email: testUser.email }).success).toBe(true);
    expect(forgotPasswordSchema.safeParse({ email: "" }).success).toBe(false);
  });

  it("requires the confirmation to match", () => {
    expect(
      resetPasswordSchema.safeParse({
        password: testUser.password,
        confirm: testUser.password,
      }).success,
    ).toBe(true);
    expect(
      resetPasswordSchema.safeParse({ password: testUser.password, confirm: "x" }).success,
    ).toBe(false);
  });
});

describe("profileSchema", () => {
  it("allows empty optional links", () => {
    const result = profileSchema.safeParse({
      fullName: testUser.fullName,
      headline: "",
      location: "",
      githubUrl: "",
      linkedinUrl: "",
      websiteUrl: "",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a malformed URL", () => {
    const result = profileSchema.safeParse({
      fullName: testUser.fullName,
      headline: "",
      location: "",
      githubUrl: "not a url",
      linkedinUrl: "",
      websiteUrl: "",
    });
    expect(result.success).toBe(false);
  });
});

describe("fieldErrors", () => {
  it("flattens zod issues into a field map", () => {
    const result = signInSchema.safeParse({ email: "bad", password: "" });
    expect(result.success).toBe(false);
    if (result.success) return;
    const errors = fieldErrors(result.error);
    expect(Object.keys(errors)).toContain("email");
  });
});
