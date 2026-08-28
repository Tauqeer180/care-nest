import { apiRequest } from "./api";

/**
 * Client bookings — /mobile/client/bookings
 *
 * The list merges three different backend concepts into one feed, tagged by
 * `source`:
 *   request → appointment request (not yet confirmed)
 *   pool    → pool job raised for this client
 *   booking → confirmed booking
 *
 * `source` is not cosmetic: the detail endpoint REQUIRES it as a query param
 * and returns a different payload per source, so it must be carried from the
 * list item through to the detail request.
 *
 * All routes require a client JWT.
 */

export type BookingSource = "request" | "pool" | "booking";

/** `all` is valid as a list filter but never appears on an item. */
export type BookingSourceFilter = BookingSource | "all";

export const BOOKING_SOURCE_FILTERS: {
  value: BookingSourceFilter;
  label: string;
}[] = [
  { value: "all", label: "All" },
  { value: "booking", label: "Confirmed" },
  { value: "request", label: "Requests" },
  { value: "pool", label: "Pool Jobs" },
];

/**
 * Employee attached to a booking. Shape varies by source, so accept a bare
 * name string or an object and read it through employeeName().
 */
export type BookingEmployee =
  | string
  | {
      _id?: string;
      /** What the list endpoint sends. */
      full_name?: string;
      name?: string;
      first_name?: string;
      last_name?: string;
      firstName?: string;
      lastName?: string;
      phone?: string;
      cell?: string;
      email?: string;
    }
  | null;

export interface ClientBooking {
  _id: string;
  source: BookingSource;
  /** Numeric stage code; pair with stage_label for display. */
  stage: number | string;
  stage_label: string;
  booking_date: string;
  booking_end_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  service_title?: string | null;
  /** Can come back as an empty string. */
  floor_name?: string | null;
  employee?: BookingEmployee;
  notes?: string | null;
  created_date?: string;
}

/**
 * A multi-day booking is expanded into one item PER DATE, all sharing the same
 * `_id`. So `_id` alone is not a list key — compose it with the date and time.
 */
export function bookingKey(booking: ClientBooking): string {
  return [
    booking.source,
    booking._id,
    booking.booking_date,
    booking.start_time ?? "",
  ].join("-");
}

/** Note: no `hasMore` field — derive it with hasMorePages(). */
export interface ClientBookingsPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** True while further pages remain. */
export function hasMorePages(pagination?: ClientBookingsPagination): boolean {
  if (!pagination) return false;
  return pagination.page < pagination.totalPages;
}

export interface ClientBookingsResponse {
  success: boolean;
  data: {
    bookings: ClientBooking[];
    pagination: ClientBookingsPagination;
  };
}

/**
 * Detail payload. The three sources return different bodies, so the shared
 * fields are typed and the source-specific extras stay open — read them
 * through the helpers below rather than indexing blindly.
 *
 * Confirmed for source=booking: the list item's fields plus employee.email,
 * and WITHOUT booking_end_date — so every field here must stay optional and
 * every consumer must guard.
 */
export interface ClientBookingDetail extends ClientBooking {
  location?: string | null;
  address?: string | null;
  notes?: string | null;
  /** source=request only — the per-shift breakdown. */
  booking_details?: Record<string, any>[];
  [key: string]: any;
}

export interface ClientBookingDetailResponse {
  success: boolean;
  data: ClientBookingDetail;
}

/**
 * GET /mobile/client/bookings
 * @param source `all` merges every source; otherwise filters to one.
 */
export async function fetchClientBookings(
  source: BookingSourceFilter = "all",
  page = 1,
  limit = 20
): Promise<ClientBookingsResponse> {
  return apiRequest<ClientBookingsResponse>(
    `/mobile/client/bookings?source=${source}&page=${page}&limit=${limit}`
  );
}

/**
 * GET /mobile/client/bookings/:id
 * `source` must match the value from the list item — the server 400s without
 * it and 404s if the item isn't the caller's.
 */
export async function fetchClientBookingDetail(
  bookingId: string,
  source: BookingSource
): Promise<ClientBookingDetailResponse> {
  return apiRequest<ClientBookingDetailResponse>(
    `/mobile/client/bookings/${bookingId}?source=${source}`
  );
}

// ---------------------------------------------------------------------------
// Display helpers
// ---------------------------------------------------------------------------

/** Flattens the varying employee shapes into a display name. */
export function employeeName(employee: BookingEmployee | undefined): string {
  if (!employee) return "";
  if (typeof employee === "string") return employee.trim();
  const full = (employee.full_name ?? employee.name ?? "").trim();
  if (full) return full;
  const first = employee.first_name ?? employee.firstName ?? "";
  const last = employee.last_name ?? employee.lastName ?? "";
  return `${first} ${last}`.trim();
}

export function employeePhone(employee: BookingEmployee | undefined): string {
  if (!employee || typeof employee === "string") return "";
  return employee.phone ?? employee.cell ?? "";
}

/** Human label for a source tag, used on list badges. */
export const BOOKING_SOURCE_LABELS: Record<BookingSource, string> = {
  request: "Request",
  pool: "Pool Job",
  booking: "Booking",
};
