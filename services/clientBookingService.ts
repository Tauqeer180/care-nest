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

export interface DeleteBookingRequestResponse {
  success: boolean;
  message?: string;
}

/** DELETE /mobile/client/booking-requests/:id */
export async function deleteClientBookingRequest(
  bookingRequestId: string
): Promise<DeleteBookingRequestResponse> {
  return apiRequest<DeleteBookingRequestResponse>(
    `/mobile/client/booking-requests/${bookingRequestId}`,
    { method: "DELETE" }
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

// ---------------------------------------------------------------------------
// Booking creation — multi-step form
//
// Field names below mirror the create endpoint's body exactly:
//   POST /mobile/client/booking-requests
//   { booking_type, start_date, end_date, often_type,
//     selected_week_days, booking_details: [...] }
// ---------------------------------------------------------------------------

/** Whether the booking covers one day or a span of days. */
export const BOOKING_TYPE_SINGLE = 1;
export const BOOKING_TYPE_RANGE = 2;
export type BookingType =
  | typeof BOOKING_TYPE_SINGLE
  | typeof BOOKING_TYPE_RANGE;

/** How often the service recurs. */
export const OFTEN_ONE_TIME = 1;
export const OFTEN_MONTHLY = 2;
export const OFTEN_WEEKLY_DAYS = 3;
export type OftenType =
  | typeof OFTEN_ONE_TIME
  | typeof OFTEN_MONTHLY
  | typeof OFTEN_WEEKLY_DAYS;

/**
 * Weekdays for the "Weekly (Selected Days)" option.
 *
 * Front-end only: this selection never reaches the API — it exists solely to
 * work out which dates become booking_details rows. So the values are plain
 * JS getDay() indices (0 = Sunday) and need no mapping.
 */
export type BookingWeekDay = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const WEEK_DAY_OPTIONS: { value: BookingWeekDay; label: string }[] = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

export function weekDayCodeOf(date: Date): BookingWeekDay {
  return date.getDay() as BookingWeekDay;
}

/** True when the service recurs rather than happening once. */
export function isRecurring(oftenType: OftenType): boolean {
  return oftenType !== OFTEN_ONE_TIME;
}

/**
 * Repeat options valid for a booking type. A date range already spans multiple
 * days, so the per-weekday option is offered for single dates only.
 */
export function oftenTypesFor<T extends { value: number }>(
  oftenTypes: T[],
  bookingType: BookingType
): T[] {
  return bookingType === BOOKING_TYPE_RANGE
    ? oftenTypes.filter((option) => option.value !== OFTEN_WEEKLY_DAYS)
    : oftenTypes;
}

/** True when `oftenType` is still selectable under `bookingType`. */
export function isOftenTypeAllowed(
  oftenType: OftenType,
  bookingType: BookingType
): boolean {
  return !(
    bookingType === BOOKING_TYPE_RANGE && oftenType === OFTEN_WEEKLY_DAYS
  );
}

// ---------------------------------------------------------------------------
// Booking options (step 2 selectable data)
// ---------------------------------------------------------------------------

export interface BookingService {
  _id: string;
  title: string;
  rate_perhour: string;
  source: string;
}

export interface BookingFloor {
  _id?: string;
  name?: string;
  floor_name?: string;
}

export interface LabelledOption {
  value: number;
  label: string;
}

export interface BookingOptions {
  services: BookingService[];
  floors: BookingFloor[];
  booking_types: LabelledOption[];
  often_types: LabelledOption[];
  /** Hard cap on how many rows `booking_details` may contain. */
  max_booking_details: number;
}

interface BookingOptionsResponse {
  success: boolean;
  data: BookingOptions;
}

/** GET /mobile/client/booking-options */
export async function fetchBookingOptions(): Promise<BookingOptions> {
  const response = await apiRequest<BookingOptionsResponse>(
    "/mobile/client/booking-options"
  );
  return response.data;
}

// ---------------------------------------------------------------------------
// Create booking request
// ---------------------------------------------------------------------------

export interface BookingDetailRow {
  booking_date: string;
  start_time: string;
  end_time: string;
  service_id: string;
  floor_name: string;
}

/**
 * Note: the selected weekdays are deliberately absent. They only drive row
 * generation on the client — booking_details already encodes every date the
 * server needs.
 */
export interface CreateBookingPayload {
  booking_type: BookingType;
  start_date: string;
  end_date: string;
  often_type: OftenType;
  booking_details: BookingDetailRow[];
  /**
   * Also a client-side generation input. Not in the documented body — sent
   * only when the user set one, so the server can persist the recurrence end
   * if it supports it.
   */
  often_end_date?: string;
}

export interface CreateBookingResponse {
  success: boolean;
  message: string;
  data?: unknown;
}

/** POST /mobile/client/booking-requests */
export async function createBookingRequest(
  payload: CreateBookingPayload
): Promise<CreateBookingResponse> {
  return apiRequest<CreateBookingResponse>("/mobile/client/booking-requests", {
    method: "POST",
    body: payload as unknown as Record<string, unknown>,
  });
}

// ---------------------------------------------------------------------------
// Row generation
// ---------------------------------------------------------------------------

/** Local-midnight copy, so date maths never trips over times or DST. */
function atMidnight(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number): Date {
  const next = atMidnight(date);
  next.setDate(next.getDate() + days);
  return next;
}

/** Adds months, clamping to the last valid day (Jan 31 + 1 month → Feb 28). */
function addMonths(date: Date, months: number): Date {
  const base = atMidnight(date);
  const day = base.getDate();
  const shifted = new Date(base.getFullYear(), base.getMonth() + months, 1);
  const daysInMonth = new Date(
    shifted.getFullYear(),
    shifted.getMonth() + 1,
    0
  ).getDate();
  shifted.setDate(Math.min(day, daysInMonth));
  return shifted;
}

export function toYMD(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(date.getDate()).padStart(2, "0")}`;
}

export interface ScheduleInput {
  bookingType: BookingType;
  oftenType: OftenType;
  startDate: Date;
  endDate: Date | null;
  oftenEndDate: Date | null;
  selectedWeekDays: BookingWeekDay[];
}

export interface GeneratedDates {
  dates: Date[];
  /** True when generation stopped at the cap rather than at its natural end. */
  truncated: boolean;
}

/**
 * Expands a schedule into the individual dates that become booking_details rows:
 *
 *  single + one time   → the start date alone
 *  single + monthly    → the same day each month, until often_end_date
 *  single + weekly     → every selected weekday from start until often_end_date
 *  range  + one time   → every day from start to end
 *  range  + monthly    → that whole range, repeated monthly until often_end_date
 *
 * `often_end_date` is optional, so an open-ended recurrence is bounded by
 * `maxRows` instead (the API's max_booking_details) and reports `truncated`.
 */
export function generateBookingDates(
  input: ScheduleInput,
  maxRows: number
): GeneratedDates {
  const {
    bookingType,
    oftenType,
    selectedWeekDays,
    oftenEndDate: rawOftenEnd,
  } = input;
  const start = atMidnight(input.startDate);
  const end = input.endDate ? atMidnight(input.endDate) : null;
  const oftenEnd = rawOftenEnd ? atMidnight(rawOftenEnd) : null;

  const cap = Math.max(1, maxRows);
  const dates: Date[] = [];
  let truncated = false;

  /** Returns false once the cap is hit, so callers can stop looping. */
  const push = (date: Date): boolean => {
    if (dates.length >= cap) {
      truncated = true;
      return false;
    }
    dates.push(date);
    return true;
  };

  if (bookingType === BOOKING_TYPE_SINGLE) {
    if (oftenType === OFTEN_ONE_TIME) {
      push(start);
      return { dates, truncated };
    }

    if (oftenType === OFTEN_WEEKLY_DAYS) {
      // Without this guard an open-ended run would never match a day.
      if (selectedWeekDays.length === 0) return { dates, truncated };
      let cursor = start;
      for (;;) {
        if (oftenEnd && cursor > oftenEnd) break;
        if (selectedWeekDays.includes(weekDayCodeOf(cursor))) {
          // push() refusing is what bounds an open-ended recurrence.
          if (!push(cursor)) break;
        }
        cursor = addDays(cursor, 1);
      }
      return { dates, truncated };
    }

    // Monthly on a single date: same day, each month.
    let month = 0;
    for (;;) {
      const cursor = addMonths(start, month);
      if (oftenEnd && cursor > oftenEnd) break;
      if (!push(cursor)) break;
      month += 1;
    }
    return { dates, truncated };
  }

  // --- Date range -----------------------------------------------------------
  const rangeEnd = end ?? start;

  if (oftenType === OFTEN_ONE_TIME) {
    let cursor = start;
    while (cursor <= rangeEnd) {
      if (!push(cursor)) break;
      cursor = addDays(cursor, 1);
    }
    return { dates, truncated };
  }

  // Monthly: repeat the whole range, shifted a month at a time.
  const rangeLengthDays = Math.round(
    (rangeEnd.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)
  );
  let month = 0;
  for (;;) {
    const blockStart = addMonths(start, month);
    if (oftenEnd && blockStart > oftenEnd) break;

    let stopped = false;
    for (let offset = 0; offset <= rangeLengthDays; offset += 1) {
      const day = addDays(blockStart, offset);
      // A block may run past the recurrence end — stop at the boundary.
      if (oftenEnd && day > oftenEnd) {
        stopped = true;
        break;
      }
      if (!push(day)) {
        stopped = true;
        break;
      }
    }
    if (stopped) break;
    month += 1;
  }
  return { dates, truncated };
}
