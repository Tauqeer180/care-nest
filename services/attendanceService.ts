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
