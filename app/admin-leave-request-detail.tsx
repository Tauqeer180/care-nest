import { useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import useSWR, { mutate as globalMutate } from "swr";
import { useTheme } from "@/hooks/useTheme";
import { MaterialIcons } from "@expo/vector-icons";
import {
  getAdminLeaveRequestDetail,
  approveLeaveRequest,
  rejectLeaveRequest,
  LeaveStatus,
} from "@/services/leaveService";

type Action = "approve" | "reject";

export default function AdminLeaveRequestDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [action, setAction] = useState<Action | null>(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data: req, error, isLoading, mutate } = useSWR(
    id ? ["admin-leave-detail", id] : null,
    () => getAdminLeaveRequestDetail(id!),
    { revalidateOnFocus: true }
  );

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

  const openAction = (a: Action) => {
    setAction(a);
    setNote("");
  };

  const submitReview = async () => {
    if (!id || !action) return;
    if (action === "reject" && !note.trim()) {
      Alert.alert("Note required", "Please provide a reason for rejection.");
      return;
    }
    setSubmitting(true);
    try {
      if (action === "approve") {
        await approveLeaveRequest(id, note.trim() || undefined);
      } else {
        await rejectLeaveRequest(id, note.trim());
      }
      setAction(null);
      await mutate();
      globalMutate((key) => Array.isArray(key) && key[0] === "admin-leave-requests");
      Alert.alert("Success", `Leave request ${action === "approve" ? "approved" : "rejected"}.`);
    } catch (err: any) {
      if (err.message === "SESSION_EXPIRED") return;
      Alert.alert("Error", err.message || `Failed to ${action} leave request`);
    } finally {
      setSubmitting(false);
    }
  };

  const displayName = req?.employee_name?.trim() || req?.employee_email?.trim() || "Employee";

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
          {/* Employee */}
          <View style={[styles.card, { backgroundColor: colors.card.background, borderColor: colors.border }]}>
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
                {!!req.employee_email && (
                  <Text style={[styles.empEmail, { color: colors.textTertiary }]} numberOfLines={1}>
                    {req.employee_email}
                  </Text>
                )}
              </View>
            </View>
          </View>

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
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.actionBtn, { borderColor: colors.error }]}
                onPress={() => openAction("reject")}
                activeOpacity={0.8}
              >
                <MaterialIcons name="close" size={18} color={colors.error} />
                <Text style={[styles.actionBtnText, { color: colors.error }]}>Reject</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.approveBtn, { backgroundColor: colors.success }]}
                onPress={() => openAction("approve")}
                activeOpacity={0.85}
              >
                <MaterialIcons name="check" size={18} color="white" />
                <Text style={[styles.actionBtnText, { color: "white" }]}>Approve</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}

      {/* Review modal */}
      <Modal
        visible={action !== null}
        animationType="slide"
        transparent
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={() => setAction(null)}
      >
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={[styles.modalCard, { backgroundColor: colors.background, paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                {action === "approve" ? "Approve Leave" : "Reject Leave"}
              </Text>
              <TouchableOpacity onPress={() => setAction(null)}>
                <MaterialIcons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.label, { color: colors.textPrimary }]}>
              {action === "approve" ? "Note (optional)" : "Reason for rejection"}
            </Text>
            <TextInput
              style={[
                styles.input,
                styles.textArea,
                { borderColor: colors.input.border, color: colors.input.text, backgroundColor: colors.input.background },
              ]}
              placeholder={action === "approve" ? "Add an optional note" : "Why is this being rejected?"}
              placeholderTextColor={colors.input.placeholder}
              value={note}
              onChangeText={setNote}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <TouchableOpacity
              style={[
                styles.submitBtn,
                { backgroundColor: action === "approve" ? colors.success : colors.error },
              ]}
              onPress={submitReview}
              disabled={submitting}
              activeOpacity={0.85}
            >
              {submitting ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.submitBtnText}>
                  {action === "approve" ? "Confirm Approval" : "Confirm Rejection"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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

  empRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 18, fontWeight: "700" },
  empName: { fontSize: 16, fontWeight: "700" },
  empEmail: { fontSize: 12, marginTop: 2 },

  sectionTitle: { fontSize: 15, fontWeight: "700", marginBottom: 10 },
  bodyText: { fontSize: 14, lineHeight: 20 },

  row: { flexDirection: "row", alignItems: "flex-start", gap: 12, paddingVertical: 8 },
  rowText: { flex: 1 },
  rowLabel: { fontSize: 12 },
  rowValue: { fontSize: 14, fontWeight: "600", marginTop: 2 },

  actionRow: { flexDirection: "row", gap: 12, marginTop: 4 },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 14,
  },
  approveBtn: { borderWidth: 0 },
  actionBtnText: { fontSize: 14, fontWeight: "700" },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalCard: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: "700" },
  label: { fontSize: 13, fontWeight: "600", marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 8, paddingVertical: 12, paddingHorizontal: 14, fontSize: 14 },
  textArea: { height: 100 },
  submitBtn: { paddingVertical: 14, borderRadius: 8, alignItems: "center", marginTop: 20 },
  submitBtnText: { color: "white", fontSize: 16, fontWeight: "700" },
});
