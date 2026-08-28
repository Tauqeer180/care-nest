import {
  apiRequest,
  AuthUser,
  CompanyInfo,
  getStoredCompanyInfo,
  storeAuthData,
  storeCompanyInfo,
  updateStoredUser,
} from "./api";

/**
 * Client authentication — /mobile/client/*
 *
 * Clients are a third account type alongside employee and superadmin, but they
 * do NOT share the staff auth routes: they have their own login/OTP/password
 * endpoints, they identify by `username` (username OR email) instead of email,
 * and none of their payloads carry a `userType` field — the route itself
 * establishes the account type.
 *
 * Flow: validateCompanyCode (shared) → clientLogin → verifyClientOtp → JWT.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Client record as returned by GET /mobile/client/profile.
 * Note the profile payload carries no id — only verify-otp does — so `id` is
 * optional here and should be read from the stored AuthUser when needed.
 */
export interface ClientProfile {
  id?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  username: string;
  cell: string;
  profilePicture: string | null;
}

interface ClientLoginResponse {
  success: boolean;
  message: string;
  data: {
    userId: string;
    /** Address the OTP was sent to — safe to show on the OTP screen. */
    email: string;
    /** Display name of the client, e.g. "test data". */
    name: string;
    userType: "client";
    /** False would mean the login completed without an OTP step. */
    requiresOTP: boolean;
  };
}

interface ClientVerifyOtpResponse {
  success: boolean;
  message: string;
  data: {
    /** Already prefixed, e.g. "JWT eyJhbGci..." — sent verbatim as Authorization. */
    token: string;
    user: Record<string, any>;
    /** Note: carries `name`/`code`, and no subscriptionStatus. */
    company?: {
      name?: string;
      code?: string;
      subdomain?: string;
      logo?: string | null;
    };
  };
}

interface ClientMessageResponse {
  success: boolean;
  message: string;
}

interface ClientResendOtpResponse {
  success: boolean;
  message: string;
  data: {
    userId: string;
    /** Address the OTP was resent to — may differ from the typed username. */
    email: string;
  };
}

interface ClientForgotPasswordResponse {
  success: boolean;
  message: string;
  data: {
    userId: string;
    /** Address the reset OTP went to. */
    email: string;
    userType: "client";
    companyCode: string;
  };
}

interface ClientProfileResponse {
  success: boolean;
  data: Record<string, any>;
}

export interface UpdateClientProfilePayload {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
}

// ---------------------------------------------------------------------------
// Normalisation
// ---------------------------------------------------------------------------

/**
 * verify-otp returns a camelCase user that already matches AuthUser, but the
 * profile endpoints take snake_case (first_name, last_name) — so accept either
 * casing. Always stamps userType: "client" so role checks downstream never
 * depend on the server echoing it back.
 */
function toAuthUser(raw: Record<string, any> | undefined): AuthUser {
  const r = raw ?? {};
  return {
    id: r.id ?? r._id ?? "",
    email: r.email ?? "",
    phone: r.phone ?? r.phone_number ?? "",
    userType: "client",
    firstName: r.firstName ?? r.first_name ?? "",
    lastName: r.lastName ?? r.last_name ?? "",
    entity_type: r.entity_type ?? 0,
  };
}

function toClientProfile(raw: Record<string, any> | undefined): ClientProfile {
  const user = toAuthUser(raw);
  return {
    id: user.id || undefined,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone,
    username: raw?.username ?? "",
    cell: raw?.cell ?? "",
    profilePicture: raw?.profile_picture ?? raw?.profilePicture ?? null,
  };
}

// ---------------------------------------------------------------------------
// Login + OTP
// ---------------------------------------------------------------------------

/**
 * Step 1 — POST /mobile/client/login
 * Sends an OTP to the client's registered email. `username` accepts a username
 * or an email. Returns the userId needed by verifyClientOtp / resendClientOtp,
 * plus the email the OTP went to and the client's display name.
 */
export async function clientLogin(
  username: string,
  password: string
): Promise<ClientLoginResponse["data"]> {
  const response = await apiRequest<ClientLoginResponse>("/mobile/client/login", {
    method: "POST",
    body: { username, password },
  });
  return response.data;
}

/**
 * Step 2 — POST /mobile/client/verify-otp
 * Exchanges the OTP for a JWT and persists the session as a client session, so
 * refresh + FCM registration route to /mobile/client/* from here on.
 */
export async function verifyClientOtp(
  userId: string,
  otp: string
): Promise<{ token: string; user: AuthUser }> {
  const response = await apiRequest<ClientVerifyOtpResponse>(
    "/mobile/client/verify-otp",
    {
      method: "POST",
      body: { userId, otp },
    }
  );

  const token = response.data.token;
  const user = toAuthUser(response.data.user);
  await storeAuthData(token, user, "client");

  // Refresh the cached company record if this response carries one. It uses
  // name/code and omits subscriptionStatus, so merge over what /mobile/validate
  // already stored instead of overwriting and losing that field.
  const company = response.data.company;
  if (company?.code) {
    const existing = await getStoredCompanyInfo();
    const info: CompanyInfo = {
      companyName: company.name ?? existing?.companyName ?? "",
      companyCode: company.code,
      subdomain: company.subdomain ?? existing?.subdomain ?? "",
      subscriptionStatus: existing?.subscriptionStatus ?? "",
      logo: company.logo ?? existing?.logo ?? null,
    };
    await storeCompanyInfo(info);
  }

  return { token, user };
}

/**
 * POST /mobile/client/resend-otp — re-sends the login OTP for `userId`.
 * Returns the address it went to, so the OTP screen can confirm it.
 */
export async function resendClientOtp(
  userId: string
): Promise<ClientResendOtpResponse> {
  return apiRequest<ClientResendOtpResponse>("/mobile/client/resend-otp", {
    method: "POST",
    body: { userId },
  });
}

// ---------------------------------------------------------------------------
// Password reset
// ---------------------------------------------------------------------------

/**
 * POST /mobile/client/forgot-password
 * Unauthenticated: companyCode travels in the body, not the header.
 * Returns the userId to pass to resetClientPassword along with the OTP.
 */
export async function clientForgotPassword(
  username: string,
  companyCode: string
): Promise<ClientForgotPasswordResponse> {
  return apiRequest<ClientForgotPasswordResponse>(
    "/mobile/client/forgot-password",
    {
      method: "POST",
      body: { username, companyCode },
      skipCompanyHeader: true,
    }
  );
}

/** POST /mobile/client/reset-password — completes the forgot-password flow. */
export async function resetClientPassword(
  userId: string,
  otp: string,
  newPassword: string
): Promise<ClientMessageResponse> {
  return apiRequest<ClientMessageResponse>("/mobile/client/reset-password", {
    method: "POST",
    body: { userId, otp, newPassword },
  });
}

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

/** GET /mobile/client/profile — authenticated client's own profile. */
export async function getClientProfile(): Promise<ClientProfile> {
  const response = await apiRequest<ClientProfileResponse>(
    "/mobile/client/profile"
  );
  return toClientProfile(response.data);
}

/**
 * PUT /mobile/client/profile
 * Also refreshes the cached AuthUser so profile screens reflect the edit
 * without a re-login.
 */
export async function updateClientProfile(
  payload: UpdateClientProfilePayload
): Promise<ClientProfile> {
  const response = await apiRequest<ClientProfileResponse>(
    "/mobile/client/profile",
    {
      method: "PUT",
      body: { ...payload },
    }
  );
  const profile = toClientProfile(response.data);
  await updateStoredUser({
    firstName: profile.firstName,
    lastName: profile.lastName,
    email: profile.email,
    phone: profile.phone,
  });
  return profile;
}
