import { apiRequest, CompanyInfo, storeCompanyInfo, storeAuthData, AuthUser } from "./api";

interface ValidateCompanyResponse {
  success: boolean;
  data: CompanyInfo;
}

interface LoginResponse {
  success: boolean;
  message: string;
  data: {
    userId: string;
    email: string;
    userType: string;
  };
}

interface VerifyOtpResponse {
  success: boolean;
  message: string;
  data: {
    token: string;
    user: AuthUser;
    company: {
      name: string;
      code: string;
      subdomain: string;
      logo: string | null;
    };
  };
}

export async function validateCompanyCode(
  companyCode: string
): Promise<CompanyInfo> {
  const response = await apiRequest<ValidateCompanyResponse>(
    "/mobile/validate",
    {
      method: "POST",
      body: { companyCode },
      skipCompanyHeader: true,
    }
  );
  await storeCompanyInfo(response.data);
  return response.data;
}

export type UserType = "employee" | "superadmin";

interface ForgotPasswordResponse {
  success: boolean;
  message: string;
  data: {
    userId: string;
    email: string;
    userType: string;
  };
}

export async function forgotPassword(
  email: string,
  companyCode: string,
  userType: UserType = "employee"
): Promise<ForgotPasswordResponse> {
  return apiRequest<ForgotPasswordResponse>("/mobile/forgot-password", {
    method: "POST",
    body: { email, companyCode, userType },
  });
}

interface ResetPasswordResponse {
  success: boolean;
  message: string;
}

export async function resetPassword(
  userId: string,
  otp: string,
  newPassword: string,
  userType: UserType = "employee"
): Promise<ResetPasswordResponse> {
  return apiRequest<ResetPasswordResponse>("/mobile/reset-password", {
    method: "POST",
    body: { userId, otp, newPassword, userType },
  });
}

export async function login(
  email: string,
  password: string,
  userType: UserType = "employee"
): Promise<LoginResponse["data"]> {
  const response = await apiRequest<LoginResponse>("/mobile/login", {
    method: "POST",
    body: { email, password, userType },
  });
  return response.data;
}

export async function verifyOtp(
  userId: string,
  otp: string,
  userType: UserType = "employee"
): Promise<VerifyOtpResponse["data"]> {
  const response = await apiRequest<VerifyOtpResponse>("/mobile/verify-otp", {
    method: "POST",
    body: { userId, otp, userType },
  });
  await storeAuthData(response.data.token, response.data.user);
  return response.data;
}
