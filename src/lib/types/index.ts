export type UserRole = "OPERATOR" | "AGENCY";

export type AgencyStatus = "PENDING" | "ACTIVE" | "SUSPENDED" | "TERMINATED";

export type CommissionEventStatus = "HOLD" | "CONFIRMED" | "INVALIDATED" | "PAID";

export type PayoutStatus = "REQUESTED" | "APPROVED" | "REJECTED" | "PAID" | "CANCELLED";

export type SalesStatus = "SUCCESS" | "FAILED" | "REFUNDED";

export type AuditAction =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "STATUS_CHANGE"
  | "LOGIN"
  | "EXPORT"
  | "CALCULATE"
  | "IMPORT"
  | "PAYOUT";

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface BalanceSummary {
  confirmedBalance: number;
  holdBalance: number;
  totalEarned: number;
  totalPaidOut: number;
  pendingPayouts: number;
  availableBalance: number;
  threshold: number;
  canRequestPayout: boolean;
  amountUntilThreshold: number;
}
