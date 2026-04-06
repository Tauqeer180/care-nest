import AsyncStorage from "@react-native-async-storage/async-storage";

const BASE_URL = "https://ohc-saas-backend.onrender.com/api";
const COMPANY_STORAGE_KEY = "@carenest/company_info";
const AUTH_TOKEN_KEY = "@carenest/auth_token";
const AUTH_USER_KEY = "@carenest/auth_user";

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
  await AsyncStorage.multiRemove([AUTH_TOKEN_KEY, AUTH_USER_KEY]).catch(() => {});
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
  skipCompanyHeader?: boolean;
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {}
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
    throw new ApiError(
      data?.message || `Request failed with status ${response.status}`,
      response.status,
      data
    );
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
