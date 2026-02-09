/**
 * ログイン試行回数制限（インメモリ）
 * - IPアドレスごとに15分間で最大5回まで
 * - メールアドレスごとに15分間で最大10回まで
 */

interface AttemptRecord {
  count: number;
  firstAttempt: number;
}

const ipAttempts = new Map<string, AttemptRecord>();
const emailAttempts = new Map<string, AttemptRecord>();

const WINDOW_MS = 15 * 60 * 1000; // 15分
const MAX_IP_ATTEMPTS = 5;
const MAX_EMAIL_ATTEMPTS = 10;

function cleanExpired(map: Map<string, AttemptRecord>) {
  const now = Date.now();
  for (const [key, record] of map) {
    if (now - record.firstAttempt > WINDOW_MS) {
      map.delete(key);
    }
  }
}

function checkAndIncrement(
  map: Map<string, AttemptRecord>,
  key: string,
  maxAttempts: number
): { allowed: boolean; remaining: number; retryAfterMs: number } {
  cleanExpired(map);
  const now = Date.now();
  const record = map.get(key);

  if (!record) {
    map.set(key, { count: 1, firstAttempt: now });
    return { allowed: true, remaining: maxAttempts - 1, retryAfterMs: 0 };
  }

  if (now - record.firstAttempt > WINDOW_MS) {
    map.set(key, { count: 1, firstAttempt: now });
    return { allowed: true, remaining: maxAttempts - 1, retryAfterMs: 0 };
  }

  if (record.count >= maxAttempts) {
    const retryAfterMs = WINDOW_MS - (now - record.firstAttempt);
    return { allowed: false, remaining: 0, retryAfterMs };
  }

  record.count++;
  return { allowed: true, remaining: maxAttempts - record.count, retryAfterMs: 0 };
}

export function checkLoginRateLimit(ip: string, email: string): {
  allowed: boolean;
  message?: string;
} {
  const ipCheck = checkAndIncrement(ipAttempts, ip, MAX_IP_ATTEMPTS);
  if (!ipCheck.allowed) {
    const minutes = Math.ceil(ipCheck.retryAfterMs / 60000);
    return {
      allowed: false,
      message: `ログイン試行回数が上限に達しました。${minutes}分後に再試行してください。`,
    };
  }

  const emailCheck = checkAndIncrement(emailAttempts, email, MAX_EMAIL_ATTEMPTS);
  if (!emailCheck.allowed) {
    const minutes = Math.ceil(emailCheck.retryAfterMs / 60000);
    return {
      allowed: false,
      message: `このアカウントへのログイン試行回数が上限に達しました。${minutes}分後に再試行してください。`,
    };
  }

  return { allowed: true };
}

export function resetLoginAttempts(ip: string, email: string) {
  ipAttempts.delete(ip);
  emailAttempts.delete(email);
}
