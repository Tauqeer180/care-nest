import { useCallback, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import useSWR from "swr";
import { useTheme } from "@/hooks/useTheme";
import { MaterialIcons } from "@expo/vector-icons";
import {
  getAdminLeaveRequests,
  LeaveRequest,
  LeaveStatus,
} from "@/services/leaveService";

const STATUS_FILTERS: { value: LeaveStatus | ""; label: string }[] = [
  { value: "", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "cancelled", label: "Cancelled" },
];

export default function AdminLeaveScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [status, setStatus] = useState<LeaveStatus | "">("");
  const [refreshing, setRefreshing] = useState(false);

  const { data, error, isLoading, mutate } = useSWR(
    ["admin-leave-requests", status],
    () => getAdminLeaveRequests({ status, page: 1, limit: 50 }),
    { revalidateOnFocus: true }
  );
  const requests = data?.requests ?? [];

  useFocusEffect(
    useCallback(() => {
      mutate();
    }, [mutate])
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await mutate();
    setRefreshing(false);
  }, [mutate]);

  const statusInfo = (s: LeaveStatus) => {
    switch (s) {
      case "approved":
        return { color: colors.success, label: "Approved", icon: "check-circle" as const };
      case "rejected":
        return { color: colors.error, label: "Rejected", icon: "cancel" as const };
      case "cancelled":
        return { color: colors.textTertiary, label: "Cancelled", icon: "block" as const };
      default:
        return { color: colors.warning, label: "Pending", icon: "hourglass-empty" as const };
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.primary, paddingTop: insets.top + 16 }]}>
        <Text style={styles.headerTitle}>Leave Requests</Text>
      </View>

      {/* Status filter */}
      <View style={[styles.filterBar, { borderBottomColor: colors.border }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {STATUS_FILTERS.map((f) => {
            const active = status === f.value;
            return (
              <TouchableOpacity
                key={f.value || "all"}
                onPress={() => setStatus(f.value)}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: active ? colors.primary : colors.card.background,
                    borderColor: active ? colors.primary : colors.border,
                  },
                ]}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterChipText, { color: active ? "white" : colors.textSecondary }]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {isLoading && requests.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error && requests.length === 0 ? (
        <View style={styles.centered}>
          <MaterialIcons name="error-outline" size={48} color={colors.error} />
          <Text style={[styles.muted, { color: colors.textSecondary }]}>
            {error.message ?? "Failed to load leave requests"}
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
          }
        >
          {requests.length === 0 ? (
            <View style={styles.emptyBox}>
              <MaterialIcons name="event-note" size={44} color={colors.textTertiary} />
              <Text style={[styles.muted, { color: colors.textSecondary }]}>No leave requests found</Text>
            </View>
          ) : (
            requests.map((req: LeaveRequest) => {
              const s = statusInfo(req.status);
              const displayName =
                req.employee_name?.trim() || req.employee_email?.trim() || "Employee";
              return (
                <TouchableOpacity
                  key={req._id}
                  activeOpacity={0.8}
                  onPress={() =>
                    router.push({ pathname: "/admin-leave-request-detail", params: { id: req._id } })
                  }
                  style={[styles.card, { backgroundColor: colors.card.background, borderColor: colors.border }]}
                >
                  <View style={styles.cardTop}>
                    <View style={styles.empRow}>
                      <View style={[styles.avatar, { backgroundColor: colors.primary + "15" }]}>
                        <Text style={[styles.avatarText, { color: colors.primary }]}>
                          {displayName.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.empName, { color: colors.textPrimary }]} numberOfLines={1}>
                          {displayName}
                        </Text>
                        <Text style={[styles.leaveType, { color: colors.textSecondary }]} numberOfLines={1}>
                          {req.leave_type_label}
                        </Text>
                      </View>
                    </View>
                    <View style={[styles.badge, { backgroundColor: s.color + "15" }]}>
                      <MaterialIcons name={s.icon} size={13} color={s.color} />
                      <Text style={[styles.badgeText, { color: s.color }]}>{s.label}</Text>
                    </View>
                  </View>

                  <View style={styles.metaRow}>
                    <MaterialIcons name="date-range" size={14} color={colors.textTertiary} />
                    <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                      {formatDate(req.start_date)} – {formatDate(req.end_date)} · {req.total_days}{" "}
                      {req.total_days === 1 ? "day" : "days"}
                    </Text>
                  </View>

                  {req.reason ? (
                    <Text style={[styles.reason, { color: colors.textSecondary }]} numberOfLines={2}>
                      {req.reason}
                    </Text>
                  ) : null}
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTitle: { fontSize: 20, fontWeight: "700", color: "white", textAlign: "center" },

  filterBar: { borderBottomWidth: 1 },
  filterRow: { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  filterChipText: { fontSize: 13, fontWeight: "600" },

  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 },
  muted: { fontSize: 14, textAlign: "center" },
  content: { padding: 16 },
  emptyBox: { alignItems: "center", paddingVertical: 60, gap: 12 },

  card: { borderWidth: 1, borderRadius: 14, padding: 16, marginBottom: 12 },
  cardTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8 },
  empRow: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  avatar: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 16, fontWeight: "700" },
  empName: { fontSize: 15, fontWeight: "700" },
  leaveType: { fontSize: 13, marginTop: 1 },
  badge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 11, fontWeight: "700" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 12 },
  metaText: { fontSize: 13 },
  reason: { fontSize: 13, marginTop: 8, lineHeight: 18 },
});
