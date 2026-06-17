import { useCallback, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import useSWR from "swr";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useTheme } from "@/hooks/useTheme";
import { MaterialIcons } from "@expo/vector-icons";
import {
  createLeaveRequest,
  getMyLeaveRequests,
  cancelLeaveRequest,
  LeaveRequest,
  LeaveStatus,
} from "@/services/leaveService";

const LEAVE_TYPES: { value: string; label: string }[] = [
  { value: "sick_leave", label: "Sick Leave" },
  { value: "casual_leave", label: "Casual Leave" },
  { value: "annual_leave", label: "Annual Leave" },
  { value: "unpaid_leave", label: "Unpaid Leave" },
  { value: "other", label: "Other" },
];

export default function LeaveRequestsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { data, error, isLoading, mutate } = useSWR(
    ["leave-my-requests"],
    () => getMyLeaveRequests(1, 50),
    { revalidateOnFocus: true }
  );
  const requests = data?.requests ?? [];

  const [refreshing, setRefreshing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  // Form state
  const [leaveType, setLeaveType] = useState("sick_leave");
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [reason, setReason] = useState("");
  const [formError, setFormError] = useState("");

  const toYMD = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const fmtDisplay = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

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

  const resetForm = () => {
    setLeaveType("sick_leave");
    setStartDate(null);
    setEndDate(null);
    setReason("");
    setFormError("");
  };

  const handleSubmit = async () => {
    setFormError("");
    if (!startDate || !endDate) {
      setFormError("Please select start and end dates");
      return;
    }
    if (endDate < startDate) {
      setFormError("End date can't be before start date");
      return;
    }
    if (!reason.trim()) {
      setFormError("Please enter a reason");
      return;
    }
    setSubmitting(true);
    try {
      await createLeaveRequest({
        leave_type: leaveType,
        start_date: toYMD(startDate),
        end_date: toYMD(endDate),
        reason: reason.trim(),
      });
      setModalOpen(false);
      resetForm();
      await mutate();
      Alert.alert("Success", "Leave request submitted successfully");
    } catch (err: any) {
      if (err.message === "SESSION_EXPIRED") return;
      setFormError(err.message || "Failed to submit leave request");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = (req: LeaveRequest) => {
    Alert.alert("Cancel Leave", "Are you sure you want to cancel this leave request?", [
      { text: "No", style: "cancel" },
      {
        text: "Yes, Cancel",
        style: "destructive",
        onPress: async () => {
          setCancellingId(req._id);
          try {
            await cancelLeaveRequest(req._id);
            await mutate();
          } catch (err: any) {
            if (err.message === "SESSION_EXPIRED") return;
            Alert.alert("Error", err.message || "Failed to cancel leave request");
          } finally {
            setCancellingId(null);
          }
        },
      },
    ]);
  };

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
    new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.primary, paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBack}>
          <MaterialIcons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Leave Requests</Text>
        <View style={{ width: 32 }} />
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
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 90 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
          }
        >
          {requests.length === 0 ? (
            <View style={styles.emptyBox}>
              <MaterialIcons name="event-note" size={44} color={colors.textTertiary} />
              <Text style={[styles.muted, { color: colors.textSecondary }]}>No leave requests yet</Text>
            </View>
          ) : (
            requests.map((req) => {
              const s = statusInfo(req.status);
              return (
                <TouchableOpacity
                  key={req._id}
                  activeOpacity={0.8}
                  onPress={() =>
                    router.push({ pathname: "/leave-request-detail", params: { id: req._id } })
                  }
                  style={[styles.card, { backgroundColor: colors.card.background, borderColor: colors.border }]}
                >
                  <View style={styles.cardTop}>
                    <Text style={[styles.leaveType, { color: colors.textPrimary }]}>
                      {req.leave_type_label}
                    </Text>
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
                    <Text style={[styles.reason, { color: colors.textSecondary }]}>{req.reason}</Text>
                  ) : null}

                  {req.status === "rejected" && req.admin_note ? (
                    <View style={[styles.noteBox, { backgroundColor: colors.error + "10" }]}>
                      <Text style={[styles.noteText, { color: colors.error }]}>
                        Admin: {req.admin_note}
                      </Text>
                    </View>
                  ) : null}

                  {req.status === "pending" && (
                    <TouchableOpacity
                      style={[styles.cancelBtn, { borderColor: colors.error }]}
                      onPress={() => handleCancel(req)}
                      disabled={cancellingId === req._id}
                      activeOpacity={0.7}
                    >
                      {cancellingId === req._id ? (
                        <ActivityIndicator size="small" color={colors.error} />
                      ) : (
                        <Text style={[styles.cancelBtnText, { color: colors.error }]}>Cancel Request</Text>
                      )}
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      )}

      {/* Apply FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary, bottom: insets.bottom + 20 }]}
        onPress={() => setModalOpen(true)}
        activeOpacity={0.85}
      >
        <MaterialIcons name="add" size={22} color="white" />
        <Text style={styles.fabText}>Apply for Leave</Text>
      </TouchableOpacity>

      {/* Apply Modal */}
      <Modal
        visible={modalOpen}
        animationType="slide"
        transparent
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={() => setModalOpen(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior="padding"
        >
          <View style={[styles.modalCard, { backgroundColor: colors.background, paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Apply for Leave</Text>
              <TouchableOpacity onPress={() => setModalOpen(false)}>
                <MaterialIcons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 40 }}
            >
              {/* Leave type */}
              <Text style={[styles.label, { color: colors.textPrimary }]}>Leave Type</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.typeRow}
              >
                {LEAVE_TYPES.map((t) => {
                  const active = leaveType === t.value;
                  return (
                    <TouchableOpacity
                      key={t.value}
                      onPress={() => setLeaveType(t.value)}
                      style={[
                        styles.typeChip,
                        {
                          backgroundColor: active ? colors.primary : colors.card.background,
                          borderColor: active ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      <Text style={[styles.typeChipText, { color: active ? "white" : colors.textSecondary }]}>
                        {t.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Dates */}
              <View style={styles.dateRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.label, { color: colors.textPrimary }]}>Start Date</Text>
                  <TouchableOpacity
                    style={[styles.input, styles.dateInput, { borderColor: colors.input.border, backgroundColor: colors.input.background }]}
                    onPress={() => setShowStartPicker(true)}
                    activeOpacity={0.7}
                  >
                    <Text style={{ color: startDate ? colors.input.text : colors.input.placeholder, fontSize: 14 }}>
                      {startDate ? fmtDisplay(startDate) : "Select date"}
                    </Text>
                    <MaterialIcons name="calendar-today" size={18} color={colors.textTertiary} />
                  </TouchableOpacity>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.label, { color: colors.textPrimary }]}>End Date</Text>
                  <TouchableOpacity
                    style={[styles.input, styles.dateInput, { borderColor: colors.input.border, backgroundColor: colors.input.background }]}
                    onPress={() => setShowEndPicker(true)}
                    activeOpacity={0.7}
                  >
                    <Text style={{ color: endDate ? colors.input.text : colors.input.placeholder, fontSize: 14 }}>
                      {endDate ? fmtDisplay(endDate) : "Select date"}
                    </Text>
                    <MaterialIcons name="calendar-today" size={18} color={colors.textTertiary} />
                  </TouchableOpacity>
                </View>
              </View>

              {showStartPicker && (
                <DateTimePicker
                  value={startDate ?? new Date()}
                  mode="date"
                  display={Platform.OS === "ios" ? "inline" : "default"}
                  minimumDate={new Date()}
                  onChange={(event, selected) => {
                    setShowStartPicker(Platform.OS === "ios");
                    if (event.type === "set" && selected) {
                      setStartDate(selected);
                      // Keep end date valid
                      if (endDate && endDate < selected) setEndDate(selected);
                    }
                  }}
                />
              )}
              {showEndPicker && (
                <DateTimePicker
                  value={endDate ?? startDate ?? new Date()}
                  mode="date"
                  display={Platform.OS === "ios" ? "inline" : "default"}
                  minimumDate={startDate ?? new Date()}
                  onChange={(event, selected) => {
                    setShowEndPicker(Platform.OS === "ios");
                    if (event.type === "set" && selected) setEndDate(selected);
                  }}
                />
              )}

              {/* Reason */}
              <Text style={[styles.label, { color: colors.textPrimary }]}>Reason</Text>
              <TextInput
                style={[styles.input, styles.textArea, { borderColor: colors.input.border, color: colors.input.text, backgroundColor: colors.input.background }]}
                placeholder="Reason for leave"
                placeholderTextColor={colors.input.placeholder}
                value={reason}
                onChangeText={setReason}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />

              {formError ? <Text style={[styles.errorText, { color: colors.error }]}>{formError}</Text> : null}

              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: colors.primary }]}
                onPress={handleSubmit}
                disabled={submitting}
                activeOpacity={0.85}
              >
                {submitting ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.submitBtnText}>Submit Request</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  emptyBox: { alignItems: "center", paddingVertical: 60, gap: 12 },

  card: { borderWidth: 1, borderRadius: 14, padding: 16, marginBottom: 12 },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  leaveType: { fontSize: 16, fontWeight: "700", flex: 1, marginRight: 8 },
  badge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 11, fontWeight: "700" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10 },
  metaText: { fontSize: 13 },
  reason: { fontSize: 13, marginTop: 8, lineHeight: 18 },
  noteBox: { borderRadius: 8, padding: 10, marginTop: 10 },
  noteText: { fontSize: 12 },
  cancelBtn: { borderWidth: 1, borderRadius: 8, paddingVertical: 10, alignItems: "center", marginTop: 12 },
  cancelBtnText: { fontSize: 13, fontWeight: "700" },

  fab: {
    position: "absolute",
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 28,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  fabText: { color: "white", fontSize: 14, fontWeight: "700" },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "88%",
  },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: "700" },

  label: { fontSize: 13, fontWeight: "600", marginBottom: 8, marginTop: 12 },
  typeRow: { flexDirection: "row", gap: 8, paddingRight: 8 },
  typeChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  typeChipText: { fontSize: 13, fontWeight: "600" },
  dateRow: { flexDirection: "row", gap: 12 },
  input: { borderWidth: 1, borderRadius: 8, paddingVertical: 12, paddingHorizontal: 14, fontSize: 14 },
  dateInput: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  textArea: { height: 100 },
  errorText: { fontSize: 13, marginTop: 12 },
  submitBtn: { paddingVertical: 14, borderRadius: 8, alignItems: "center", marginTop: 20 },
  submitBtnText: { color: "white", fontSize: 16, fontWeight: "700" },
});
