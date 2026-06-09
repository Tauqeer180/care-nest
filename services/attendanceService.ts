import { apiRequest } from "./api";

export interface ActiveCheckIn {
  _id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userType: string;
  checkInTime: string;
  checkOutTime: string | null;
  durationMinutes: number;
  status: "checked-in" | "checked-out";
  checkInDate: string;
  notes: string;
}

export interface AttendanceSummary {
  totalMinutes: number;
  totalFormatted: string;
  records: number;
}

interface AttendanceStatusResponse {
  success: boolean;
  data: {
    isCheckedIn: boolean;
    activeCheckIn: ActiveCheckIn | null;
    today: AttendanceSummary;
    thisWeek: AttendanceSummary;
  };
}

interface CheckInResponse {
  success: boolean;
  message: string;
  data: {
    attendanceId: string;
    checkInTime: string;
    status: string;
  };
}

interface CheckOutResponse {
  success: boolean;
  message: string;
  data: {
    attendanceId: string;
    checkInTime: string;
    checkOutTime: string;
    durationMinutes: number;
    durationFormatted: string;
    status: string;
  };
}

export async function getAttendanceStatus(): Promise<AttendanceStatusResponse["data"]> {
  const response = await apiRequest<AttendanceStatusResponse>(
    "/mobile/attendance/status"
  );
  return response.data;
}

export async function checkIn(): Promise<CheckInResponse["data"]> {
  const response = await apiRequest<CheckInResponse>(
    "/mobile/attendance/checkin",
    { method: "POST" }
  );
  return response.data;
}

export type HistoryType = "daily" | "weekly" | "monthly";

export interface HistoryRecord {
  _id: string;
  userName: string;
  userEmail: string;
  checkInTime: string;
  checkOutTime: string | null;
  durationMinutes: number;
  status: "checked-in" | "checked-out";
  checkInDate: string;
  notes: string | null;
}

export interface HistoryDaySummary {
  date: string;
  totalMinutes: number;
  totalFormatted: string;
  totalHours: string;
  records: HistoryRecord[];
}

interface AttendanceHistoryResponse {
  success: boolean;
  data: {
    totalRecords: number;
    type: HistoryType;
    summary: Record<string, HistoryDaySummary>;
  };
}

export async function getAttendanceHistory(
  type: HistoryType = "daily"
): Promise<AttendanceHistoryResponse["data"]> {
  const response = await apiRequest<AttendanceHistoryResponse>(
    `/mobile/attendance/history?type=${type}`
  );
  return response.data;
}

export async function checkOut(): Promise<CheckOutResponse["data"]> {
  const response = await apiRequest<CheckOutResponse>(
    "/mobile/attendance/checkout",
    { method: "POST" }
  );
  return response.data;
}

// ---- Admin attendance ----

export type AdminSummaryPeriod = "today" | "week" | "month";

export interface AdminSummaryStats {
  totalEmployees: number;
  currentlyCheckedIn: number;
  totalMinutes: number;
  totalHours: string;
  totalFormatted: string;
}

export interface AdminSummaryEmployee {
  userId: string;
  name: string;
  email: string;
  totalDays: number;
  totalMinutes: number;
  totalHours: string;
  totalFormatted: string;
  sessions: number;
  isCurrentlyCheckedIn: boolean;
  currentCheckInTime: string | null;
  currentDurationMinutes: number;
}

interface AdminSummaryResponse {
  success: boolean;
  data: {
    period: AdminSummaryPeriod;
    fromDate: string;
    toDate: string;
    summary: AdminSummaryStats;
    employees: AdminSummaryEmployee[];
  };
}

// Admin: aggregated attendance stats + per-employee totals for a period.
export async function getAdminAttendanceSummary(
  period: AdminSummaryPeriod = "today"
): Promise<AdminSummaryResponse["data"]> {
  const response = await apiRequest<AdminSummaryResponse>(
    `/mobile/attendance/admin/summary?period=${period}`
  );
  return response.data;
}

export type AdminRecordStatus = "all" | "checked-in" | "checked-out";

export interface AdminAttendanceRecord {
  _id: string;
  userId: string;
  userModel: string;
  userType: string;
  userEmail: string;
  userName: string;
  checkInTime: string;
  checkOutTime: string | null;
  durationMinutes: number;
  checkInLocation: string | null;
  status: "checked-in" | "checked-out";
  checkInDate: string;
  checkInMonth: string;
  checkInYear: number;
  checkInWeek: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
  liveDurationMinutes: number;
}

export interface AdminRecordsPagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

interface AdminRecordsResponse {
  success: boolean;
  data: {
    type: string;
    records: AdminAttendanceRecord[];
    pagination: AdminRecordsPagination;
    summary: {
      total: number;
      checkedIn: number;
      totalMinutes: number;
      totalHours: string;
      totalFormatted: string;
    };
  };
}

export interface AdminRecordsParams {
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
  status?: AdminRecordStatus;
  page?: number;
  limit?: number;
  employeeId?: string;
}

// Admin: detailed attendance records, filterable by date range/status/employee.
export async function getAdminAttendanceRecords(
  params: AdminRecordsParams
): Promise<AdminRecordsResponse["data"]> {
  const { from, to, status = "all", page = 1, limit = 100, employeeId } = params;
  const query = new URLSearchParams({
    from,
    to,
    status,
    page: String(page),
    limit: String(limit),
  });
  if (employeeId) query.set("employee_id", employeeId);

  const response = await apiRequest<AdminRecordsResponse>(
    `/mobile/attendance/admin/records?${query.toString()}`
  );
  return response.data;
}
