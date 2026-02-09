import { describe, it, expect } from "vitest";
import { loginSchema, createUserSchema } from "@/lib/validations/user";

describe("loginSchema", () => {
  it("accepts valid login", () => {
    const result = loginSchema.safeParse({
      email: "test@example.com",
      password: "password123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email", () => {
    const result = loginSchema.safeParse({
      email: "not-email",
      password: "password123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty password", () => {
    const result = loginSchema.safeParse({
      email: "test@example.com",
      password: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty email", () => {
    const result = loginSchema.safeParse({
      email: "",
      password: "password123",
    });
    expect(result.success).toBe(false);
  });
});

describe("createUserSchema", () => {
  const validUser = {
    email: "new@example.com",
    name: "テスト",
    password: "password123",
    role: "OPERATOR",
  };

  it("accepts valid operator user", () => {
    const result = createUserSchema.safeParse(validUser);
    expect(result.success).toBe(true);
  });

  it("accepts valid agency user with agencyId", () => {
    const result = createUserSchema.safeParse({
      ...validUser,
      role: "AGENCY",
      agencyId: "agency-123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects password < 8 chars", () => {
    const result = createUserSchema.safeParse({ ...validUser, password: "1234567" });
    expect(result.success).toBe(false);
  });

  it("accepts password exactly 8 chars", () => {
    const result = createUserSchema.safeParse({ ...validUser, password: "12345678" });
    expect(result.success).toBe(true);
  });

  it("rejects invalid role", () => {
    const result = createUserSchema.safeParse({ ...validUser, role: "ADMIN" });
    expect(result.success).toBe(false);
  });

  it("rejects empty name", () => {
    const result = createUserSchema.safeParse({ ...validUser, name: "" });
    expect(result.success).toBe(false);
  });
});
