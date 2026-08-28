export const SWR_KEYS = {
  jobPool: (page: number, limit: number) => ["job-pool", page, limit] as const,
  myJobs: (page: number, limit: number) => ["my-jobs", page, limit] as const,
  jobDetail: (id: string) => ["job-detail", id] as const,
  myJobDetail: (id: string) => ["my-job-detail", id] as const,
  attendanceStatus: () => ["attendance-status"] as const,
  adminJobs: (page: number, limit: number, status: string) =>
    ["admin-jobs", page, limit, status] as const,
  adminJobDetail: (id: string) => ["admin-job-detail", id] as const,
  adminEmployees: () => ["admin-employees"] as const,
  employeeDashboard: () => ["employee-dashboard"] as const,
  employeeEarningsHistory: () => ["employee-earnings-history"] as const,
  notifications: (page: number, limit: number) =>
    ["notifications", page, limit] as const,
  notificationsUnreadCount: () => ["notifications-unread-count"] as const,
  clientBookings: (source: string, page: number, limit: number) =>
    ["client-bookings", source, page, limit] as const,
  clientBookingDetail: (id: string, source: string) =>
    ["client-booking-detail", id, source] as const,
  clientProfile: () => ["client-profile"] as const,
};
