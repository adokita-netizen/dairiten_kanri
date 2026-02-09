import { describe, it, expect } from "vitest";
import {
  getPeriodRange,
  getCurrentPeriod,
  formatDate,
  formatDateTime,
  formatPeriod,
  addDays,
  parseLocalDate,
} from "@/lib/utils/date";

describe("getPeriodRange", () => {
  it("returns start and end of January 2024", () => {
    const { start, end } = getPeriodRange(2024, 1);
    expect(start.getFullYear()).toBe(2024);
    expect(start.getMonth()).toBe(0);
    expect(start.getDate()).toBe(1);
    expect(end.getFullYear()).toBe(2024);
    expect(end.getMonth()).toBe(0);
    expect(end.getDate()).toBe(31);
  });

  it("returns correct end for February in leap year", () => {
    const { end } = getPeriodRange(2024, 2);
    expect(end.getDate()).toBe(29);
  });

  it("returns correct end for February in non-leap year", () => {
    const { end } = getPeriodRange(2023, 2);
    expect(end.getDate()).toBe(28);
  });

  it("returns start and end of December", () => {
    const { start, end } = getPeriodRange(2024, 12);
    expect(start.getMonth()).toBe(11);
    expect(end.getDate()).toBe(31);
  });
});

describe("getCurrentPeriod", () => {
  it("returns year and month as numbers", () => {
    const { year, month } = getCurrentPeriod();
    expect(year).toBeGreaterThanOrEqual(2024);
    expect(month).toBeGreaterThanOrEqual(1);
    expect(month).toBeLessThanOrEqual(12);
  });
});

describe("formatDate", () => {
  it("formats Date object as yyyy/MM/dd", () => {
    const result = formatDate(new Date(2024, 0, 15));
    expect(result).toBe("2024/01/15");
  });

  it("formats ISO string", () => {
    const result = formatDate("2024-06-30");
    expect(result).toBe("2024/06/30");
  });
});

describe("formatDateTime", () => {
  it("formats Date object with time", () => {
    const result = formatDateTime(new Date(2024, 5, 15, 14, 30));
    expect(result).toBe("2024/06/15 14:30");
  });
});

describe("formatPeriod", () => {
  it("formats year and month in Japanese", () => {
    expect(formatPeriod(2024, 6)).toBe("2024年6月");
  });

  it("handles single-digit month", () => {
    expect(formatPeriod(2024, 1)).toBe("2024年1月");
  });
});

describe("addDays", () => {
  it("adds days to a date", () => {
    const base = new Date(2024, 0, 1);
    const result = addDays(base, 14);
    expect(result.getDate()).toBe(15);
    expect(result.getMonth()).toBe(0);
  });

  it("crosses month boundary", () => {
    const base = new Date(2024, 0, 25);
    const result = addDays(base, 10);
    expect(result.getMonth()).toBe(1); // February
    expect(result.getDate()).toBe(4);
  });

  it("does not mutate original date", () => {
    const base = new Date(2024, 0, 1);
    addDays(base, 10);
    expect(base.getDate()).toBe(1);
  });

  it("handles zero days", () => {
    const base = new Date(2024, 5, 15);
    const result = addDays(base, 0);
    expect(result.getDate()).toBe(15);
  });
});

describe("parseLocalDate", () => {
  it("parses YYYY-MM-DD string to local date", () => {
    const result = parseLocalDate("2024-06-15");
    expect(result.getFullYear()).toBe(2024);
    expect(result.getMonth()).toBe(5); // June = 5
    expect(result.getDate()).toBe(15);
  });

  it("parses first day of year", () => {
    const result = parseLocalDate("2024-01-01");
    expect(result.getMonth()).toBe(0);
    expect(result.getDate()).toBe(1);
  });
});
