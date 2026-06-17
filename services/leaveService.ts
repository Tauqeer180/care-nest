import { apiRequest } from "./api";

export type LeaveStatus = "pending" | "approved" | "rejected" | "cancelled";

export interface LeaveRequest {
  _id: string;
  employee_id: string;
  employee_name: string;
  employee_email: string;
  leave_type: string;
  leave_type_label: string;
  start_date: string;
  end_date: string;
  total_days: number;
  reason: string;
  status: LeaveStatus;
  admin_note: string;
  reviewed_by: string | null;
  reviewed_by_name: string;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateLeaveRequestBody {
  leave_type: string;
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  reason: string;
}

interface CreateLeaveResponse {
  success: boolean;
  message: string;
  data: LeaveRequest;
}

interface MyLeaveRequestsResponse {
  success: boolean;
  data: {
    requests: LeaveRequest[];
    total: number;
    page: number;
    limit: number;
  };
}

interface CancelLeaveResponse {
  success: boolean;
  message: string;
  data?: LeaveRequest;
}

export async function createLeaveRequest(
  body: CreateLeaveRequestBody
): Promise<CreateLeaveResponse> {
  return apiRequest<CreateLeaveResponse>("/mobile/leave/request", {
    method: "POST",
    body: body as unknown as Record<string, unknown>,
  });
}

export async function getMyLeaveRequests(
  page = 1,
  limit = 20
): Promise<MyLeaveRequestsResponse["data"]> {
  const response = await apiRequest<MyLeaveRequestsResponse>(
    `/mobile/leave/my-requests?page=${page}&limit=${limit}`
  );
  return response.data;
}

interface LeaveRequestDetailResponse {
  success: boolean;
  data: LeaveRequest;
}

export async function getLeaveRequestDetail(
  leaveRequestId: string
): Promise<LeaveRequest> {
  const response = await apiRequest<LeaveRequestDetailResponse>(
    `/mobile/leave/my-requests/${leaveRequestId}`
  );
  return response.data;
}

export async function cancelLeaveRequest(
  leaveRequestId: string
): Promise<CancelLeaveResponse> {
  return apiRequest<CancelLeaveResponse>(
    `/mobile/leave/my-requests/${leaveRequestId}/cancel`,
    { method: "PUT" }
  );
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

export interface AdminLeaveFilters {
  status?: LeaveStatus | "";
  employee_id?: string;
  from_date?: string; // YYYY-MM-DD
  to_date?: string; // YYYY-MM-DD
  page?: number;
  limit?: number;
}

export async function getAdminLeaveRequests(
  filters: AdminLeaveFilters = {}
): Promise<MyLeaveRequestsResponse["data"]> {
  const { status, employee_id, from_date, to_date, page = 1, limit = 20 } =
    filters;
  const params = new URLSearchParams();
  if (status) params.append("status", status);
  if (employee_id) params.append("employee_id", employee_id);
  if (from_date) params.append("from_date", from_date);
  if (to_date) params.append("to_date", to_date);
  params.append("page", String(page));
  params.append("limit", String(limit));

  const response = await apiRequest<MyLeaveRequestsResponse>(
    `/mobile/leave/admin/requests?${params.toString()}`
  );
  return response.data;
}

export async function getAdminLeaveRequestDetail(
  leaveRequestId: string
): Promise<LeaveRequest> {
  const response = await apiRequest<LeaveRequestDetailResponse>(
    `/mobile/leave/admin/requests/${leaveRequestId}`
  );
  return response.data;
}

interface ReviewLeaveResponse {
  success: boolean;
  message: string;
  data?: LeaveRequest;
}

export async function approveLeaveRequest(
  leaveRequestId: string,
  adminNote?: string
): Promise<ReviewLeaveResponse> {
  return apiRequest<ReviewLeaveResponse>(
    `/mobile/leave/admin/requests/${leaveRequestId}/approve`,
    {
      method: "PUT",
      body: adminNote ? { admin_note: adminNote } : undefined,
    }
  );
}

export async function rejectLeaveRequest(
  leaveRequestId: string,
  adminNote?: string
): Promise<ReviewLeaveResponse> {
  return apiRequest<ReviewLeaveResponse>(
    `/mobile/leave/admin/requests/${leaveRequestId}/reject`,
    {
      method: "PUT",
      body: adminNote ? { admin_note: adminNote } : undefined,
    }
  );
}
