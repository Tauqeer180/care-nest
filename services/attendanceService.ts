import { apiRequest } from "./api";

export interface AttendanceBreak {
  _id: string;
  startTime: string;
  endTime: string | null;
  durationMinutes: number;
}

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
  breaks: AttendanceBreak[];
  totalBreakMinutes: number;
  netWorkingMinutes: number;
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

// ---- Breaks ----

interface BreakStartResponse {
  success: boolean;
  message: string;
  data: {
    attendanceId: string;
    breaks: AttendanceBreak[];
  };
}

interface BreakEndResponse {
  success: boolean;
  message: string;
  data: {
    attendanceId: string;
    breakDurationMinutes: number;
    totalBreakMinutes: number;
    breaks: AttendanceBreak[];
  };
}

export async function startBreak(): Promise<BreakStartResponse["data"]> {
  const response = await apiRequest<BreakStartResponse>(
    "/mobile/attendance/break/start",
    { method: "POST" }
  );
  return response.data;
}

export async function endBreak(): Promise<BreakEndResponse["data"]> {
  const response = await apiRequest<BreakEndResponse>(
    "/mobile/attendance/break/end",
    { method: "POST" }
  );
  return response.data;
}

// The break that hasn't ended yet, if the employee is currently on one.
export function getActiveBreak(
  breaks?: AttendanceBreak[] | null
): AttendanceBreak | null {
  return breaks?.find((b) => !b.endTime) ?? null;
}

// Time worked since check-in, excluding breaks. An ongoing break counts up
// to `now`, so the result stays frozen while the employee is on a break.
export function getNetWorkingMs(
  checkInTime: string,
  breaks: AttendanceBreak[] | null | undefined,
  now: number = Date.now()
): number {
  const breakMs = (breaks ?? []).reduce((sum, b) => {
    const start = new Date(b.startTime).getTime();
    const end = b.endTime ? new Date(b.endTime).getTime() : now;
    return sum + Math.max(0, end - start);
  }, 0);
  return Math.max(0, now - new Date(checkInTime).getTime() - breakMs);
}

// ---- Manual punch requests ----

export type PunchType = "check-in" | "check-out";
export type PunchRequestStatus = "pending" | "approved" | "rejected";

export interface PunchRequest {
  _id: string;
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  requestDate: string; // YYYY-MM-DD
  punchType: PunchType;
  requestedTime: string; // ISO
  reason: string;
  status: PunchRequestStatus;
  reviewedBy: { id: string | null; name: string };
  reviewedAt: string | null;
  adminNote: string;
  appliedTime: string | null;
  attendanceId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePunchRequestBody {
  date: string; // YYYY-MM-DD
  time: string; // HH:mm (24h)
  punchType: PunchType;
  reason: string;
}

interface CreatePunchRequestResponse {
  success: boolean;
  message: string;
  data: PunchRequest;
}

interface PunchRequestsResponse {
  success: boolean;
  data: {
    requests: PunchRequest[];
  };
}

// Employee: ask admin to record a missed check-in/check-out.
export async function createPunchRequest(
  body: CreatePunchRequestBody
): Promise<CreatePunchRequestResponse> {
  console.log("Punch Request Body => ", JSON.stringify(body, null, 2));
  try {
    const response = await apiRequest<CreatePunchRequestResponse>(
      "/mobile/attendance/punch-request",
      {
        method: "POST",
        body: body as unknown as Record<string, unknown>,
      }
    );
    console.log(
      "Punch Request Response => ",
      JSON.stringify(response, null, 2)
    );
    return response;
  } catch (error: any) {
    console.log("Punch Request Error => ", error?.message ?? error);
    throw error;
  }
}

export async function getMyPunchRequests(): Promise<PunchRequest[]> {
  try {
    const response = await apiRequest<PunchRequestsResponse>(
      "/mobile/attendance/punch-requests"
    );
    console.log(
      "Punch Requests List Response => ",
      JSON.stringify(response, null, 2)
    );
    return response.data.requests;
  } catch (error: any) {
    console.log("Punch Requests List Error => ", error?.message ?? error);
    throw error;
  }
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
