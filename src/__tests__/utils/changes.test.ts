import { describe, it, expect } from "vitest";
import { computeChanges } from "@/lib/utils/changes";

describe("computeChanges", () => {
  it("detects changed fields", () => {
    const before = { name: "Alice", email: "alice@example.com", age: 30 };
    const after = { name: "Bob" };
    const changes = computeChanges(before, after, ["name", "email", "age"]);
    expect(changes).toEqual({
      name: { old: "Alice", new: "Bob" },
    });
  });

  it("ignores unchanged fields", () => {
    const before = { name: "Alice", email: "alice@example.com" };
    const after = { name: "Alice" };
    const changes = computeChanges(before, after, ["name", "email"]);
    expect(changes).toEqual({});
  });

  it("ignores fields not in trackedFields", () => {
    const before = { name: "Alice", secret: "x" };
    const after = { name: "Bob", secret: "y" };
    const changes = computeChanges(before, after, ["name"]);
    expect(changes).toEqual({
      name: { old: "Alice", new: "Bob" },
    });
    expect(changes).not.toHaveProperty("secret");
  });

  it("handles numeric changes (string comparison)", () => {
    const before = { amount: 100 };
    const after = { amount: 200 };
    const changes = computeChanges(before, after, ["amount"]);
    expect(changes).toEqual({
      amount: { old: 100, new: 200 },
    });
  });

  it("returns empty for no changes", () => {
    const before = { name: "Alice" };
    const after = {};
    const changes = computeChanges(before, after, ["name"]);
    expect(changes).toEqual({});
  });

  it("detects change from value to undefined-like", () => {
    const before = { name: "Alice", notes: "some notes" };
    const after = { notes: "" };
    const changes = computeChanges(before, after, ["name", "notes"]);
    expect(changes).toEqual({
      notes: { old: "some notes", new: "" },
    });
  });
});
