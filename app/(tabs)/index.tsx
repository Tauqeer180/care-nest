import { IconSymbol } from "@/components/ui/icon-symbol";
import { useTheme } from "@/hooks/useTheme";
import { AuthUser, getStoredUser } from "@/services/api";
import {
  checkIn,
  checkOut,
  getAttendanceStatus,
} from "@/services/attendanceService";
import { getEmployeeDashboard } from "@/services/dashboardService";
import { fetchMyJobs } from "@/services/jobPoolService";
import { getUnreadCount } from "@/services/notificationsService";
import { SWR_KEYS } from "@/services/swrKeys";
import { Feather, MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import useSWR, { mutate } from "swr";

export default function HomeScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [checkingIn, setCheckingIn] = useState(false);
  const [elapsed, setElapsed] = useState("00 : 00 : 00");

  const isAdmin = user?.userType === "superadmin";

  useEffect(() => {
    getStoredUser().then(setUser);
  }, []);

  // SWR: My Applied Jobs (employee only)
  const {
    data: myJobsData,
    isLoading: myJobsLoading,
    mutate: mutateMyJobs,
  } = useSWR(
    !isAdmin && user ? SWR_KEYS.myJobs(1, 5) : null,
    () => fetchMyJobs(1, 5),
    { revalidateOnFocus: true },
  );
  const myJobs = myJobsData?.data.jobs ?? [];

  // SWR: Attendance status (employee only)
  const { data: attendance, mutate: mutateAttendance } = useSWR(
    !isAdmin && user ? SWR_KEYS.attendanceStatus() : null,
    getAttendanceStatus,
    { revalidateOnFocus: true },
  );

  // SWR: Employee dashboard (employee only)
  const { data: dashboard, mutate: mutateDashboard } = useSWR(
    !isAdmin && user ? SWR_KEYS.employeeDashboard() : null,
    getEmployeeDashboard,
    { revalidateOnFocus: true },
  );

  // SWR: Unread notifications count (all users)
  const { data: unreadCount = 0 } = useSWR(
    user ? SWR_KEYS.notificationsUnreadCount() : null,
    getUnreadCount,
    { revalidateOnFocus: true }
  );

  useEffect(() => {
    console.log("Dashboard Stats => ", dashboard);
  }, [dashboard]);
  const stats = dashboard?.stats;
  const upcomingShifts = dashboard?.upcoming_shifts ?? [];

  // Revalidate when tab regains focus
  useFocusEffect(
    useCallback(() => {
      if (!isAdmin) {
        mutateMyJobs();
        mutateAttendance();
        mutateDashboard();
      }
    }, [isAdmin, mutateMyJobs, mutateAttendance, mutateDashboard]),
  );
  const isCheckedIn = attendance?.isCheckedIn ?? false;
  const checkInTime = attendance?.activeCheckIn?.checkInTime ?? null;
  const checkOutTime = attendance?.activeCheckIn?.checkOutTime ?? null;
  const todayTotal = attendance?.today.totalFormatted ?? "00:00";

  // Live elapsed timer when checked in
  useEffect(() => {
    if (!isCheckedIn || !checkInTime) {
      setElapsed("00 : 00 : 00");
      return;
    }
    const tick = () => {
      const diff = Math.floor(
        (Date.now() - new Date(checkInTime).getTime()) / 1000,
      );
      const h = String(Math.floor(diff / 3600)).padStart(2, "0");
      const m = String(Math.floor((diff % 3600) / 60)).padStart(2, "0");
      const s = String(diff % 60).padStart(2, "0");
      setElapsed(`${h} : ${m} : ${s}`);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [isCheckedIn, checkInTime]);

  const handleCheckInOut = async () => {
    setCheckingIn(true);
    try {
      if (isCheckedIn) {
        await checkOut();
      } else {
        await checkIn();
      }
      mutate(SWR_KEYS.attendanceStatus());
    } catch (err: any) {
      console.error("Check in/out error:", err.message);
    } finally {
      setCheckingIn(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const formatTime = (time: string) => {
    const [h, m] = time.split(":");
    const hour = parseInt(h, 10);
    const suffix = hour >= 12 ? "PM" : "AM";
    const display = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${display}:${m} ${suffix}`;
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <View style={styles.headerTop}>
          <IconSymbol name="gearshape.fill" size={24} color="white" />
          <Text style={styles.headerTitle}>CareNest</Text>
          <TouchableOpacity
            onPress={() => router.push("/notifications")}
            hitSlop={8}
            activeOpacity={0.7}
          >
            <MaterialIcons name="notifications" size={24} color="white" />
            {unreadCount > 0 && (
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>
                  {unreadCount > 99 ? "99+" : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
        {/* <Text style={styles.location}>Thumbu Chatty St, Chennai</Text> */}
        <View style={styles.welcomeRow}>
          <View>
            <Text style={styles.welcome}>Welcome,</Text>
            <Text style={styles.welcome}>
              {user ? `${user.firstName} ${user.lastName}` : ""}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.profileIcon}
            onPress={() => router.push("/(tabs)/profile")}
          >
            <IconSymbol name="person" size={20} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Check In Section — Employees only */}
      <View style={styles.content}>
        {!isAdmin && (
          <View
            style={[styles.card, { backgroundColor: colors.card.background }]}
          >
            <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>
              {isCheckedIn ? "ELAPSED TIME" : "OVERALL TIME"}
            </Text>
            <View style={styles.timeRow}>
              <Text style={[styles.time, { color: colors.textPrimary }]}>
                {isCheckedIn ? elapsed : todayTotal}
              </Text>
              <TouchableOpacity
                style={[
                  styles.checkInBtn,
                  {
                    backgroundColor: isCheckedIn
                      ? colors.error
                      : colors.primary,
                  },
                ]}
                onPress={handleCheckInOut}
                disabled={checkingIn}
              >
                {checkingIn ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.checkInText}>
                    {isCheckedIn ? "Check Out" : "Check In"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Time Stats */}
            <View style={styles.timeStats}>
              <View style={styles.timeStat}>
                <IconSymbol
                  name="arrow.down.circle.fill"
                  size={24}
                  color={colors.primary}
                />
                <Text
                  style={[styles.timeStatLabel, { color: colors.textTertiary }]}
                >
                  Check In
                </Text>
                <Text
                  style={[styles.timeStatValue, { color: colors.textPrimary }]}
                >
                  {checkInTime
                    ? new Date(checkInTime).toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: true,
                      })
                    : "--:--"}
                </Text>
              </View>
              <View style={styles.timeStat}>
                <IconSymbol
                  name="arrow.up.circle.fill"
                  size={24}
                  color={colors.primary}
                />
                <Text
                  style={[styles.timeStatLabel, { color: colors.textTertiary }]}
                >
                  Check Out
                </Text>
                <Text
                  style={[styles.timeStatValue, { color: colors.textPrimary }]}
                >
                  {checkOutTime
                    ? new Date(checkOutTime).toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: true,
                      })
                    : "--:--"}
                </Text>
              </View>
              <View style={styles.timeStat}>
                <IconSymbol
                  name="clock.fill"
                  size={24}
                  color={colors.primary}
                />
                <Text
                  style={[styles.timeStatLabel, { color: colors.textTertiary }]}
                >
                  Today
                </Text>
                <Text
                  style={[styles.timeStatValue, { color: colors.textPrimary }]}
                >
                  {todayTotal}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Attendance Summary */}
        {/* <View
          style={[styles.card, { backgroundColor: colors.card.background }]}
        >
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
              Attendance for this Month
            </Text>
            <Text style={[styles.percentage, { color: colors.textSecondary }]}>
              68%
            </Text>
          </View>

          <View style={styles.attendanceStats}>
            <View style={styles.attendanceStat}>
              <Text style={[styles.statLabel, { color: colors.success }]}>
                Present
              </Text>
              <Text style={[styles.statValue, { color: colors.success }]}>
                13
              </Text>
            </View>
            <View style={styles.attendanceStat}>
              <Text style={[styles.statLabel, { color: colors.error }]}>
                Absents
              </Text>
              <Text style={[styles.statValue, { color: colors.error }]}>
                02
              </Text>
            </View>
            <View style={styles.attendanceStat}>
              <Text style={[styles.statLabel, { color: colors.warning }]}>
                Late In
              </Text>
              <Text style={[styles.statValue, { color: colors.warning }]}>
                04
              </Text>
            </View>
          </View>
        </View> */}

        {/* Dashboard Stats — Employees only */}
        {!isAdmin && stats && (
          <View style={styles.statsGrid}>
            <View
              style={[
                styles.statCard,
                { backgroundColor: colors.card.background },
              ]}
            >
              <View
                style={[
                  styles.statIcon,
                  { backgroundColor: colors.secondary + "15" },
                ]}
              >
                <MaterialIcons name="work" size={18} color={colors.secondary} />
              </View>
              <Text style={[styles.statNumber, { color: colors.textPrimary }]}>
                {stats.available_jobs}
              </Text>
              <Text
                style={[styles.statCaption, { color: colors.textSecondary }]}
              >
                Available Jobs
              </Text>
            </View>
            <View
              style={[
                styles.statCard,
                { backgroundColor: colors.card.background },
              ]}
            >
              <View
                style={[
                  styles.statIcon,
                  { backgroundColor: colors.success + "15" },
                ]}
              >
                <MaterialIcons
                  name="check-circle"
                  size={18}
                  color={colors.success}
                />
              </View>
              <Text style={[styles.statNumber, { color: colors.textPrimary }]}>
                {stats.total_accepted_jobs}
              </Text>
              <Text
                style={[styles.statCaption, { color: colors.textSecondary }]}
              >
                Accepted Jobs
              </Text>
            </View>
            <View
              style={[
                styles.statCard,
                { backgroundColor: colors.card.background },
              ]}
            >
              <View
                style={[
                  styles.statIcon,
                  { backgroundColor: colors.warning + "15" },
                ]}
              >
                <MaterialIcons
                  name="hourglass-empty"
                  size={18}
                  color={colors.warning}
                />
              </View>
              <Text style={[styles.statNumber, { color: colors.textPrimary }]}>
                {stats.pending_approval}
              </Text>
              <Text
                style={[styles.statCaption, { color: colors.textSecondary }]}
              >
                Pending Approval
              </Text>
            </View>
            <View
              style={[
                styles.statCard,
                { backgroundColor: colors.card.background },
              ]}
            >
              <View
                style={[
                  styles.statIcon,
                  { backgroundColor: colors.primary + "15" },
                ]}
              >
                <MaterialIcons
                  name="event-available"
                  size={18}
                  color={colors.primary}
                />
              </View>
              <Text style={[styles.statNumber, { color: colors.textPrimary }]}>
                {stats.upcoming_shifts_7days}
              </Text>
              <Text
                style={[styles.statCaption, { color: colors.textSecondary }]}
              >
                Upcoming (7d)
              </Text>
            </View>
          </View>
        )}

        {/* This Month Summary — Employees only */}
        {!isAdmin && stats && (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push("/earnings-history")}
            style={[styles.card, { backgroundColor: colors.card.background }]}
          >
            <View style={styles.cardHeader}>
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                This Month
              </Text>
              <View style={styles.viewAllRow}>
                <Text style={[styles.viewAllText, { color: colors.secondary }]}>
                  Earnings History
                </Text>
                <MaterialIcons
                  name="chevron-right"
                  size={18}
                  color={colors.secondary}
                />
              </View>
            </View>
            <View style={styles.monthGrid}>
              <View style={styles.monthItem}>
                <Text style={[styles.monthValue, { color: colors.success }]}>
                  ${stats.earnings_this_month}
                </Text>
                <Text
                  style={[styles.monthLabel, { color: colors.textTertiary }]}
                >
                  Earnings
                </Text>
              </View>
              <View style={styles.monthItem}>
                <Text
                  style={[styles.monthValue, { color: colors.textPrimary }]}
                >
                  {stats.hours_this_month}h
                </Text>
                <Text
                  style={[styles.monthLabel, { color: colors.textTertiary }]}
                >
                  Hours
                </Text>
              </View>
              <View style={styles.monthItem}>
                <Text
                  style={[styles.monthValue, { color: colors.textPrimary }]}
                >
                  {stats.shifts_this_month}
                </Text>
                <Text
                  style={[styles.monthLabel, { color: colors.textTertiary }]}
                >
                  Shifts
                </Text>
              </View>
              <View style={styles.monthItem}>
                <Text style={[styles.monthValue, { color: colors.secondary }]}>
                  ${stats.paid_this_month}
                </Text>
                <Text
                  style={[styles.monthLabel, { color: colors.textTertiary }]}
                >
                  Paid
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        )}

        {/* Upcoming Shifts — Employees only */}
        {!isAdmin && (
          <View
            style={[styles.card, { backgroundColor: colors.card.background }]}
          >
            <View style={styles.cardHeader}>
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                Upcoming Shifts
              </Text>
            </View>
            {upcomingShifts.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialIcons
                  name="event-busy"
                  size={36}
                  color={colors.textTertiary}
                />
                <Text
                  style={[styles.emptyText, { color: colors.textTertiary }]}
                >
                  No upcoming shifts
                </Text>
              </View>
            ) : (
              upcomingShifts.map((shift) => (
                <TouchableOpacity
                  key={shift._id}
                  style={[
                    styles.myJobItem,
                    { borderBottomColor: colors.divider },
                  ]}
                  activeOpacity={0.7}
                  onPress={() =>
                    router.push({
                      pathname: "/my-job-detail",
                      params: { id: shift._id },
                    })
                  }
                >
                  <View style={styles.myJobLeft}>
                    <Text
                      style={[styles.myJobTitle, { color: colors.textPrimary }]}
                      numberOfLines={1}
                    >
                      {shift.title}
                    </Text>
                    <View style={styles.myJobMeta}>
                      <MaterialIcons
                        name="location-pin"
                        size={12}
                        color={colors.textTertiary}
                      />
                      <Text
                        style={[
                          styles.myJobMetaText,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {shift.location}
                      </Text>
                      <Feather
                        name="clock"
                        size={12}
                        color={colors.textTertiary}
                      />
                      <Text
                        style={[
                          styles.myJobMetaText,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {formatDate(shift.job_date)} ·{" "}
                        {formatTime(shift.start_time)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.myJobRight}>
                    <Text style={[styles.myJobPay, { color: colors.success }]}>
                      ${shift.pay_rate ?? 0}/hr
                    </Text>
                    <MaterialIcons
                      name="chevron-right"
                      size={20}
                      color={colors.textTertiary}
                    />
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {/* My Applied Jobs — Employees only */}
        {!isAdmin && (
          <View
            style={[styles.card, { backgroundColor: colors.card.background }]}
          >
            <View style={styles.cardHeader}>
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                My Applied Jobs
              </Text>
            </View>

            {myJobsLoading ? (
              <ActivityIndicator
                size="small"
                color={colors.primary}
                style={{ paddingVertical: 20 }}
              />
            ) : myJobs.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialIcons
                  name="work-outline"
                  size={36}
                  color={colors.textTertiary}
                />
                <Text
                  style={[styles.emptyText, { color: colors.textTertiary }]}
                >
                  No applied jobs yet
                </Text>
              </View>
            ) : (
              myJobs.map((job) => (
                <TouchableOpacity
                  key={job._id}
                  style={[
                    styles.myJobItem,
                    { borderBottomColor: colors.divider },
                  ]}
                  activeOpacity={0.7}
                  onPress={() =>
                    router.push({
                      pathname: "/my-job-detail",
                      params: { id: job._id },
                    })
                  }
                >
                  <View style={styles.myJobLeft}>
                    <Text
                      style={[styles.myJobTitle, { color: colors.textPrimary }]}
                      numberOfLines={1}
                    >
                      {job.title}
                    </Text>
                    <View style={styles.myJobMeta}>
                      <MaterialIcons
                        name="location-pin"
                        size={12}
                        color={colors.textTertiary}
                      />
                      <Text
                        style={[
                          styles.myJobMetaText,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {job.location}
                      </Text>
                      <Feather
                        name="clock"
                        size={12}
                        color={colors.textTertiary}
                      />
                      <Text
                        style={[
                          styles.myJobMetaText,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {formatDate(job.job_date)} ·{" "}
                        {formatTime(job.start_time)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.myJobRight}>
                    <Text style={[styles.myJobPay, { color: colors.success }]}>
                      ${job.pay_rate ?? 0}/hr
                    </Text>
                    <MaterialIcons
                      name="chevron-right"
                      size={20}
                      color={colors.textTertiary}
                    />
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "white",
  },
  bellBadge: {
    position: "absolute",
    top: -6,
    right: -8,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  bellBadgeText: {
    color: "white",
    fontSize: 10,
    fontWeight: "700",
  },
  location: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
    marginBottom: 8,
  },
  welcomeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
    justifyContent: "space-between",
  },
  profileIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  welcome: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
  },
  actionButtons: {
    flexDirection: "row",
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: "600",
  },
  content: {
    padding: 20,
  },
  card: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 8,
  },
  timeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  time: {
    fontSize: 18,
    fontWeight: "600",
  },
  checkInBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
  },
  checkInText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  timeStats: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  timeStat: {
    alignItems: "center",
    gap: 8,
  },
  timeStatLabel: {
    fontSize: 11,
    fontWeight: "500",
  },
  timeStatValue: {
    fontSize: 12,
    fontWeight: "600",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  statCard: {
    width: "48%",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: "700",
  },
  statCaption: {
    fontSize: 12,
    marginTop: 2,
  },
  viewAllRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: "600",
  },
  monthGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  monthItem: {
    alignItems: "center",
    flex: 1,
  },
  monthValue: {
    fontSize: 18,
    fontWeight: "700",
  },
  monthLabel: {
    fontSize: 11,
    marginTop: 4,
  },
  percentage: {
    fontSize: 14,
    fontWeight: "600",
  },
  attendanceStats: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  attendanceStat: {
    alignItems: "center",
    gap: 8,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "500",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
  },
  requestBtn: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  requestBtnText: {
    fontSize: 14,
    fontWeight: "600",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 20,
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
    fontWeight: "500",
  },
  myJobItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  myJobLeft: {
    flex: 1,
    marginRight: 12,
  },
  myJobTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  myJobMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  myJobMetaText: {
    fontSize: 11,
    fontWeight: "500",
    marginRight: 6,
  },
  myJobRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  myJobPay: {
    fontSize: 13,
    fontWeight: "700",
  },
});
