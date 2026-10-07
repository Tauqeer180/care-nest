import { apiRequest } from "./api";

export interface EmployeeVisitClient {
  fullname: string;
  email: string;
  alt_email: string;
  address: string;
  city: string;
  postal_code: string;
  phone: string;
  _id: string;
}

export interface EmployeeVisit {
  _id: string;
  client_type: number;
  booking_start_date: string;
  booking_start_time: string;
  booking_end_date: string;
  booking_end_time: string;
  service_title: string[];
  client_details: EmployeeVisitClient[];
  appointment_status: string;
}

export interface EmployeeVisitsResponse {
  success: boolean;
  status: boolean;
  message: string;
  results: EmployeeVisit[];
}

export interface VisitReportAttachment {
  name: string;
  key: string;
  url: string;
  size: number;
  type: string;
}

export interface EmployeeVisitReport {
  tasks_note?: string;
  attachments?: VisitReportAttachment[];
  status?: string;
  submitted_at?: string | null;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export interface EmployeeVisitReportContext {
  success: boolean;
  status: boolean;
  message: string;
  visit: {
    booking_id: string;
    booking_detail_id: string;
    client_id: string;
    client_name: string;
    employee_id: string;
    employee_name: string;
    visit_date: string;
    start_time: string;
    end_time: string;
    service_name: string;
  };
  report: EmployeeVisitReport | null;
  reports: EmployeeVisitReport[];
  submitted_at?: string | null;
  can_write: boolean;
  has_happened: boolean;
  editable_until: string | null;
  booking_status: number;
  booking_status_label: string;
  booking_visit_count: number;
}

export async function fetchEmployeeVisits(): Promise<EmployeeVisitsResponse> {
  return apiRequest<EmployeeVisitsResponse>("/mobile/employee/visits");
}

export async function fetchEmployeeVisitContext(
  bookingId: string,
  visitDate: string,
): Promise<EmployeeVisitReportContext> {
  return apiRequest<EmployeeVisitReportContext>(
    `/mobile/employee/visit-report/context?booking_id=${encodeURIComponent(bookingId)}&visit_date=${encodeURIComponent(visitDate)}`,
  );
}

export async function uploadEmployeeVisitReportAttachment(
  file: { uri: string; name: string; mimeType?: string | null },
): Promise<VisitReportAttachment> {
  const formData = new FormData();
  formData.append(
    "file",
    // React Native FormData supports URI-backed file descriptors; DOM typings only accept Blob.
    {
      uri: file.uri,
      name: file.name,
      type: file.mimeType ?? "application/octet-stream",
    } as unknown as Blob,
  );
  return apiRequest<VisitReportAttachment>(
    "/mobile/employee/visit-report/upload",
    { method: "POST", body: formData },
  );
}

export interface SaveEmployeeVisitReportPayload {
  [key: string]: unknown;
  booking_id: string;
  visit_date: string;
  start_time: string;
  tasks_note: string;
  attachments: VisitReportAttachment[];
  status: "Completed";
}

export async function saveEmployeeVisitReport(
  payload: SaveEmployeeVisitReportPayload,
): Promise<unknown> {
  return apiRequest<unknown>("/mobile/employee/visit-report/save", {
    method: "POST",
    body: payload,
  });
}
