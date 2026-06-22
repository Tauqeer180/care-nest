import AsyncStorage from "@react-native-async-storage/async-storage";

const BASE_URL = "https://ohc-saas-backend.onrender.com/api";
const COMPANY_STORAGE_KEY = "@carenest/company_info";
const AUTH_TOKEN_KEY = "@carenest/auth_token";
const AUTH_USER_KEY = "@carenest/auth_user";
const AUTH_LOGIN_AT_KEY = "@carenest/login_at";

export interface CompanyInfo {
  companyName: string;
  companyCode: string;
  subdomain: string;
  subscriptionStatus: string;
  logo: string | null;
}

export async function getStoredCompanyInfo(): Promise<CompanyInfo | null> {
  try {
    const raw = await AsyncStorage.getItem(COMPANY_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function storeCompanyInfo(info: CompanyInfo): Promise<void> {
  await AsyncStorage.setItem(COMPANY_STORAGE_KEY, JSON.stringify(info));
}

export async function clearCompanyInfo(): Promise<void> {
  await AsyncStorage.removeItem(COMPANY_STORAGE_KEY).catch(() => {});
}

// Auth token & user storage
export interface AuthUser {
  id: string;
  email: string;
  phone: string;
  userType: string;
  firstName: string;
  lastName: string;
  entity_type: number;
}

export async function storeAuthData(token: string, user: AuthUser): Promise<void> {
  await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
  await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  // Stamp the login time — used to enforce a hard session lifetime cap.
  await AsyncStorage.setItem(AUTH_LOGIN_AT_KEY, String(Date.now()));
}

/**
 * Returns the epoch-ms timestamp of when the current session started (login),
 * or null if unknown. NOT reset on token refresh — the session cap is measured
 * from the original login, not the last refresh.
 */
export async function getLoginAt(): Promise<number | null> {
  try {
    const raw = await AsyncStorage.getItem(AUTH_LOGIN_AT_KEY);
    const value = raw ? Number(raw) : NaN;
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

export async function getStoredToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function getStoredUser(): Promise<AuthUser | null> {
  try {
    const raw = await AsyncStorage.getItem(AUTH_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function clearAuthData(): Promise<void> {
  await AsyncStorage.multiRemove([
    AUTH_TOKEN_KEY,
    AUTH_USER_KEY,
    AUTH_LOGIN_AT_KEY,
  ]).catch(() => {});
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
  skipCompanyHeader?: boolean;
}

// Global session-expired handler — registered by AuthProvider on mount
let sessionExpiredHandler: (() => void) | null = null;

export function setSessionExpiredHandler(handler: () => void): void {
  sessionExpiredHandler = handler;
}

function isAuthError(status: number, message?: string): boolean {
  if (status === 401 || status === 403) return true;
  if (!message) return false;
  const lower = message.toLowerCase();
  return lower.includes("invalid or expired token") || lower.includes("unauthorized");
}

// ---------------------------------------------------------------------------
// Token refresh
// ---------------------------------------------------------------------------

export type RefreshResult =
  | { status: "refreshed"; token: string }
  | { status: "auth_failed" } // server rejected the token — session is dead
  | { status: "error" }; // network/other — inconclusive, do NOT force logout

// De-dupes concurrent refreshes (e.g. several requests 401 at once).
let refreshInFlight: Promise<RefreshResult> | null = null;

/**
 * Exchanges the current (possibly near/just-expired) token for a fresh one via
 * POST /mobile/refresh-token. Uses a raw fetch — NOT apiRequest — so it never
 * re-enters the 401 retry path. Concurrent callers share one in-flight request.
 *
 * Returns "auth_failed" only when the server actually rejects the token; any
 * network/parse failure returns "error" so callers don't log the user out while
 * merely offline.
 */
export async function refreshAuthToken(): Promise<RefreshResult> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async (): Promise<RefreshResult> => {
    try {
      const [token, user, company] = await Promise.all([
        getStoredToken(),
        getStoredUser(),
        getStoredCompanyInfo(),
      ]);
      if (!token || !user) return { status: "auth_failed" };

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Authorization: token,
      };
      if (company?.companyCode) headers["X-Company-Code"] = company.companyCode;

      const response = await fetch(`${BASE_URL}/mobile/refresh-token`, {
        method: "POST",
        headers,
        body: JSON.stringify({ userId: user.id, userType: user.userType }),
      });

      let data: any = null;
      try {
        data = await response.json();
      } catch {
        // non-JSON body
      }

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          return { status: "auth_failed" };
        }
        return { status: "error" };
      }

      const newToken: string | undefined =
        data?.data?.token ?? data?.token ?? data?.data?.access_token;
      if (!newToken) return { status: "error" };

      await AsyncStorage.setItem(AUTH_TOKEN_KEY, newToken);
      // Persist a refreshed user object if the endpoint returns one.
      const newUser = data?.data?.user ?? data?.user;
      if (newUser) {
        await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(newUser));
      }

      return { status: "refreshed", token: newToken };
    } catch {
      return { status: "error" };
    }
  })();

  try {
    return await refreshInFlight;
  } finally {
    refreshInFlight = null;
  }
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {},
  isRetry = false
): Promise<T> {
  const { method = "GET", body, headers = {}, skipCompanyHeader = false } = options;

  const requestHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...headers,
  };

  if (!skipCompanyHeader) {
    const company = await getStoredCompanyInfo();
    if (company?.companyCode) {
      requestHeaders["X-Company-Code"] = company.companyCode;
    }
  }

  const token = await getStoredToken();
  if (token) {
    requestHeaders["Authorization"] = token;
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers: requestHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json();

  if (!response.ok) {
    const message = data?.message || `Request failed with status ${response.status}`;

    // Detect expired/invalid session.
    // Only when a token was actually present — otherwise this is just bad credentials.
    if (isAuthError(response.status, message) && token) {
      // Attempt a one-time transparent refresh + retry before giving up.
      if (!isRetry) {
        const result = await refreshAuthToken();
        if (result.status === "refreshed") {
          return apiRequest<T>(endpoint, options, true);
        }
      }
      // Refresh failed (or this was already the retry) → session is over.
      sessionExpiredHandler?.();
      throw new ApiError("SESSION_EXPIRED", response.status, data);
    }

    throw new ApiError(message, response.status, data);
  }

  return data as T;
}

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}
