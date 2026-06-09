import { apiRequest } from "./api";

export interface Job {
  _id: string;
  title: string;
  description: string;
  location: string;
  job_date: string;
  start_time: string;
  end_time: string;
  pay_rate: number;
  requirements: string;
  notes: string;
  status: number;
  status_label?: string;
  posted_by: string;
  posted_by_name: string;
  accepted_by?: string | null;
  accepted_by_name?: string | null;
  accepted_at?: string | null;
  created_date: string;
  modified_date: string;
  assignment_mode?: string;
  shift_index?: number;
  total_in_group?: number;
  // Booking-sourced jobs
  source?: string;
  booking_id?: string;
  booking_details_doc_id?: string;
  client_id?: string | null;
  client_name?: string;
  total_shifts?: number;
  booking_start_date?: string;
  booking_end_date?: string;
  // Split-shift grouping
  group_id?: string | null;
  group_label?: string;
  group_estimated_earnings?: number;
  // Estimated earnings / hours
  estimated_hours_per_shift?: number;
  estimated_shift_count?: number;
  estimated_hours?: number;
  estimated_earnings?: number;
  rate_used?: number;
}

export type AdminJobStatus = "all" | "1" | "2" | "3" | "4";

export const JOB_STATUS_LABELS: Record<number, string> = {
  1: "Open",
  2: "Filled",
  3: "Cancelled",
  4: "Pending Approval",
};

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export interface JobPoolResponse {
  success: boolean;
  data: {
    jobs: Job[];
    pagination: Pagination;
  };
}

export async function fetchJobPoolListings(page = 1, limit = 20): Promise<JobPoolResponse> {
  return apiRequest<JobPoolResponse>(`/mobile/pool/jobs?page=${page}&limit=${limit}`);
}

export interface JobDetailResponse {
  success: boolean;
  data: Job;
}

export async function fetchJobDetail(jobId: string): Promise<JobDetailResponse> {
  return apiRequest<JobDetailResponse>(`/mobile/pool/jobs/${jobId}`);
}

export interface AcceptJobResponse {
  success: boolean;
  message?: string;
  data?: unknown;
}

export async function acceptJob(jobId: string): Promise<AcceptJobResponse> {
  return apiRequest<AcceptJobResponse>(`/mobile/pool/jobs/${jobId}/accept`, { method: 'POST' });
}

export async function fetchMyJobs(page = 1, limit = 20): Promise<JobPoolResponse> {
  return apiRequest<JobPoolResponse>(`/mobile/pool/my-jobs?page=${page}&limit=${limit}`);
}

export async function fetchMyJobDetail(jobId: string): Promise<JobDetailResponse> {
  return apiRequest<JobDetailResponse>(`/mobile/pool/my-jobs/${jobId}`);
}

export async function fetchAdminJobs(
  page = 1,
  limit = 20,
  status: AdminJobStatus = "all"
): Promise<JobPoolResponse> {
  return apiRequest<JobPoolResponse>(
    `/mobile/pool/admin/jobs?page=${page}&limit=${limit}&status=${status}`
  );
}

export interface AcceptedEmployee {
  _id: string;
  profile_picture: string | null;
  email: string;
  emp_code: string;
  first_name: string;
  last_name: string;
  cell: string;
  phone: string;
}

export interface AdminJobDetailResponse {
  success: boolean;
  data: {
    job: Job;
    acceptedEmployee: AcceptedEmployee | null;
    bookingDetailRows: unknown | null;
  };
}

export async function fetchAdminJobDetail(jobId: string): Promise<AdminJobDetailResponse> {
  return apiRequest<AdminJobDetailResponse>(`/mobile/pool/admin/jobs/${jobId}`);
}

export interface ReleaseJobResponse {
  success: boolean;
  message?: string;
  data?: unknown;
}

export async function releaseJob(jobId: string): Promise<ReleaseJobResponse> {
  return apiRequest<ReleaseJobResponse>(`/mobile/pool/admin/jobs/${jobId}/release`, {
    method: 'POST',
  });
}

export interface Employee {
  _id: string;
  email: string;
  emp_code: string;
  first_name: string;
  last_name: string;
  hourly_rate: string;
}

interface EmployeesResponse {
  success: boolean;
  data: Employee[];
}

export async function fetchEmployees(): Promise<Employee[]> {
  const response = await apiRequest<EmployeesResponse>('/mobile/pool/admin/employees');
  return response.data;
}

export interface AssignJobResponse {
  success: boolean;
  message?: string;
  data?: unknown;
}

export async function assignJob(jobId: string, employeeId: string): Promise<AssignJobResponse> {
  return apiRequest<AssignJobResponse>(`/mobile/pool/admin/jobs/${jobId}/assign`, {
    method: 'POST',
    body: { employee_id: employeeId },
  });
}

export interface ApproveJobResponse {
  success: boolean;
  message?: string;
  data?: unknown;
}

export async function approveJob(jobId: string): Promise<ApproveJobResponse> {
  return apiRequest<ApproveJobResponse>(`/mobile/pool/admin/jobs/${jobId}/approve`, {
    method: 'POST',
  });
}
