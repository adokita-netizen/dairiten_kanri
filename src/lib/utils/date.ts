import { startOfMonth, endOfMonth, format, parseISO } from "date-fns";
import { ja } from "date-fns/locale";

export function getPeriodRange(year: number, month: number) {
  const date = new Date(year, month - 1, 1);
  return {
    start: startOfMonth(date),
    end: endOfMonth(date),
  };
}

export function getCurrentPeriod() {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "yyyy/MM/dd", { locale: ja });
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "yyyy/MM/dd HH:mm", { locale: ja });
}

export function formatPeriod(year: number, month: number): string {
  return `${year}年${month}月`;
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * HTML date input ("YYYY-MM-DD") をローカルタイムゾーンの Date に変換。
 * new Date("2024-01-15") は UTC midnight になるため、日本時間でずれる問題を防止。
 */
export function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}
