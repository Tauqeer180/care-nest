import { apiRequest } from "./api";

export interface EmployeeDashboardStats {
  available_jobs: number;
  pending_approval: number;
  total_accepted_jobs: number;
  upcoming_shifts_7days: number;
  earnings_this_month: number;
  hours_this_month: number;
  shifts_this_month: number;
  paid_this_month: number;
}

export interface UpcomingShift {
  _id: string;
  title: string;
  location: string;
  job_date: string;
  start_time: string;
  end_time: string;
  pay_rate: number;
}

export interface EmployeeDashboard {
  employee: {
    name: string;
    hourly_rate: number;
  };
  stats: EmployeeDashboardStats;
  upcoming_shifts: UpcomingShift[];
}

interface EmployeeDashboardResponse {
  success: boolean;
  data: EmployeeDashboard;
}

export async function getEmployeeDashboard(): Promise<EmployeeDashboard> {
  const response = await apiRequest<EmployeeDashboardResponse>(
    "/mobile/employee/dashboard"
  );
  return response.data;
}

export interface EarningsSummary {
  total_earnings: number;
  total_hours: number;
  total_shifts: number;
  paid_earnings: number;
  unpaid_earnings: number;
  current_hourly_rate: number;
}

export interface EarningsRecord {
  booking_id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  client_id: string;
  service_id: string;
  employee_rate: number;
  total_hours: number;
  total_earning: number;
  is_paid: boolean;
  paid_amount: number;
  time_index: number;
  is_holiday_shift: boolean;
  time_label: string;
}

export interface EarningsPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export interface EmployeeEarningsHistory {
  summary: EarningsSummary;
  records: EarningsRecord[];
  pagination: EarningsPagination;
}

interface EarningsHistoryResponse {
  success: boolean;
  data: EmployeeEarningsHistory;
}

export async function getEmployeeEarningsHistory(
  page = 1,
  limit = 20
): Promise<EmployeeEarningsHistory> {
  const response = await apiRequest<EarningsHistoryResponse>(
    `/mobile/employee/earnings-history?page=${page}&limit=${limit}`
  );
  return response.data;
}
