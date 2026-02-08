export const DEFAULT_PAYOUT_THRESHOLD = 10000;
export const DEFAULT_HOLD_PERIOD_DAYS = 14;
export const DEFAULT_TAX_RATE = 10;
export const DEFAULT_PAGE_SIZE = 20;
export const DEPOSIT_AMOUNT = 120000;
export const DEPOSIT_AMOUNT_INC_TAX = 132000;

export const AGENCY_STATUS_LABELS: Record<string, string> = {
  PENDING: "審査中",
  ACTIVE: "有効",
  SUSPENDED: "停止中",
  TERMINATED: "解約済",
};

export const COMMISSION_EVENT_STATUS_LABELS: Record<string, string> = {
  HOLD: "保留中",
  CONFIRMED: "確定",
  INVALIDATED: "無効",
  PAID: "支払済",
};

export const PAYOUT_STATUS_LABELS: Record<string, string> = {
  REQUESTED: "申請中",
  APPROVED: "承認済",
  REJECTED: "却下",
  PAID: "支払済",
  CANCELLED: "取消",
};

export const SALES_STATUS_LABELS: Record<string, string> = {
  SUCCESS: "成功",
  FAILED: "失敗",
  REFUNDED: "返金",
};

export const COMMISSION_TYPE_LABELS: Record<string, string> = {
  PERCENTAGE: "パーセンテージ",
  FIXED_AMOUNT: "固定金額",
};

export const BANK_ACCOUNT_TYPE_LABELS: Record<string, string> = {
  ordinary: "普通",
  current: "当座",
};
