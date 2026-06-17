import { useEffect, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import useSWR, { mutate as globalMutate } from "swr";
import { useTheme } from "@/hooks/useTheme";
import { MaterialIcons } from "@expo/vector-icons";
import {
  getLeaveRequestDetail,
  cancelLeaveRequest,
  LeaveStatus,
} from "@/services/leaveService";

export default function LeaveRequestDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [cancelling, setCancelling] = useState(false);

  const { data: req, error, isLoading, mutate } = useSWR(
    id ? ["leave-detail", id] : null,
    () => getLeaveRequestDetail(id!),
    { revalidateOnFocus: true }
  );

  useEffect(() => {
    if (req) console.log("Leave request detail =>", JSON.stringify(req, null, 2));
  }, [req]);

  const statusInfo = (status: LeaveStatus) => {
    switch (status) {
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
    new Date(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  const formatDateTime = (iso: string) =>
    new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });

  const handleCancel = () => {
    if (!id) return;
    Alert.alert("Cancel Leave", "Are you sure you want to cancel this leave request?", [
      { text: "No", style: "cancel" },
      {
        text: "Yes, Cancel",
        style: "destructive",
        onPress: async () => {
          setCancelling(true);
          try {
            await cancelLeaveRequest(id);
            await mutate();
            globalMutate(["leave-my-requests"]);
          } catch (err: any) {
            if (err.message === "SESSION_EXPIRED") return;
            Alert.alert("Error", err.message || "Failed to cancel leave request");
          } finally {
            setCancelling(false);
          }
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.primary, paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBack}>
          <MaterialIcons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Leave Details</Text>
        <View style={{ width: 32 }} />
      </View>

      {isLoading && !req ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error || !req ? (
        <View style={styles.centered}>
          <MaterialIcons name="error-outline" size={48} color={colors.error} />
          <Text style={[styles.muted, { color: colors.textSecondary }]}>
            {error?.message ?? "Leave request not found"}
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Status + type */}
          <View style={[styles.card, { backgroundColor: colors.card.background, borderColor: colors.border }]}>
            <View style={styles.cardTop}>
              <Text style={[styles.leaveType, { color: colors.textPrimary }]}>{req.leave_type_label}</Text>
              {(() => {
                const s = statusInfo(req.status);
                return (
                  <View style={[styles.badge, { backgroundColor: s.color + "15" }]}>
                    <MaterialIcons name={s.icon} size={14} color={s.color} />
                    <Text style={[styles.badgeText, { color: s.color }]}>{s.label}</Text>
                  </View>
                );
              })()}
            </View>

            <Row icon="event" label="Start Date" value={formatDate(req.start_date)} colors={colors} />
            <Row icon="event" label="End Date" value={formatDate(req.end_date)} colors={colors} />
            <Row
              icon="schedule"
              label="Duration"
              value={`${req.total_days} ${req.total_days === 1 ? "day" : "days"}`}
              colors={colors}
            />
          </View>

          {/* Reason */}
          <View style={[styles.card, { backgroundColor: colors.card.background, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Reason</Text>
            <Text style={[styles.bodyText, { color: colors.textSecondary }]}>{req.reason || "—"}</Text>
          </View>

          {/* Review */}
          {(req.status === "approved" || req.status === "rejected") && (
            <View style={[styles.card, { backgroundColor: colors.card.background, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Review</Text>
              {req.reviewed_by_name ? (
                <Row icon="person" label="Reviewed By" value={req.reviewed_by_name} colors={colors} />
              ) : null}
              {req.reviewed_at ? (
                <Row icon="event-available" label="Reviewed At" value={formatDateTime(req.reviewed_at)} colors={colors} />
              ) : null}
              {req.admin_note ? (
                <Row icon="sticky-note-2" label="Admin Note" value={req.admin_note} colors={colors} />
              ) : null}
            </View>
          )}

          {/* Meta */}
          <View style={[styles.card, { backgroundColor: colors.card.background, borderColor: colors.border }]}>
            <Row icon="schedule" label="Submitted" value={formatDateTime(req.created_at)} colors={colors} />
          </View>

          {req.status === "pending" && (
            <TouchableOpacity
              style={[styles.cancelBtn, { borderColor: colors.error }]}
              onPress={handleCancel}
              disabled={cancelling}
              activeOpacity={0.7}
            >
              {cancelling ? (
                <ActivityIndicator size="small" color={colors.error} />
              ) : (
                <Text style={[styles.cancelBtnText, { color: colors.error }]}>Cancel Request</Text>
              )}
            </TouchableOpacity>
          )}
        </ScrollView>
      )}
    </View>
  );
}

function Row({
  icon,
  label,
  value,
  colors,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  value: string;
  colors: ReturnType<typeof useTheme>["colors"];
}) {
  return (
    <View style={styles.row}>
      <MaterialIcons name={icon} size={18} color={colors.textTertiary} />
      <View style={styles.rowText}>
        <Text style={[styles.rowLabel, { color: colors.textTertiary }]}>{label}</Text>
        <Text style={[styles.rowValue, { color: colors.textPrimary }]}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerBack: { padding: 4, width: 32 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "white", flex: 1, textAlign: "center" },

  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 },
  muted: { fontSize: 14, textAlign: "center" },
  content: { padding: 16 },

  card: { borderWidth: 1, borderRadius: 14, padding: 16, marginBottom: 12 },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  leaveType: { fontSize: 17, fontWeight: "700", flex: 1, marginRight: 8 },
  badge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 11, fontWeight: "700" },

  sectionTitle: { fontSize: 15, fontWeight: "700", marginBottom: 10 },
  bodyText: { fontSize: 14, lineHeight: 20 },

  row: { flexDirection: "row", alignItems: "flex-start", gap: 12, paddingVertical: 8 },
  rowText: { flex: 1 },
  rowLabel: { fontSize: 12 },
  rowValue: { fontSize: 14, fontWeight: "600", marginTop: 2 },

  cancelBtn: { borderWidth: 1, borderRadius: 10, paddingVertical: 14, alignItems: "center", marginTop: 4 },
  cancelBtnText: { fontSize: 14, fontWeight: "700" },
});
