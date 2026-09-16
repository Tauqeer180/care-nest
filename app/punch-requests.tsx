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
import { Feather, MaterialIcons } from "@expo/vector-icons";
import {
  createPunchRequest,
  getMyPunchRequests,
  PunchRequestStatus,
  PunchType,
} from "@/services/attendanceService";
import { SWR_KEYS } from "@/services/swrKeys";

const PUNCH_TYPES: { value: PunchType; label: string }[] = [
  { value: "check-in", label: "Check In" },
  { value: "check-out", label: "Check Out" },
];

export default function PunchRequestsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { data, error, isLoading, mutate } = useSWR(
    SWR_KEYS.punchRequests(),
    getMyPunchRequests,
    { revalidateOnFocus: true }
  );
  const requests = [...(data ?? [])].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const [refreshing, setRefreshing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [punchType, setPunchType] = useState<PunchType>("check-in");
  const [date, setDate] = useState<Date | null>(null);
  const [time, setTime] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [reason, setReason] = useState("");
  const [formError, setFormError] = useState("");

  const toYMD = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const toHM = (d: Date) =>
    `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  const fmtDisplayDate = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const fmtDisplayTime = (d: Date) =>
    d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });

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
    setPunchType("check-in");
    setDate(null);
    setTime(null);
    setReason("");
    setFormError("");
  };

  const handleSubmit = async () => {
    setFormError("");
    if (!date || !time) {
      setFormError("Please select date and time");
      return;
    }
    const combined = new Date(date);
    combined.setHours(time.getHours(), time.getMinutes(), 0, 0);
    if (combined.getTime() > Date.now()) {
      setFormError("Date and time can't be in the future");
      return;
    }
    if (!reason.trim()) {
      setFormError("Please enter a reason");
      return;
    }
    setSubmitting(true);
    try {
      const res = await createPunchRequest({
        date: toYMD(date),
        time: toHM(time),
        punchType,
        reason: reason.trim(),
      });
      setModalOpen(false);
      resetForm();
      await mutate();
      Alert.alert("Success", res.message || "Request submitted for admin approval.");
    } catch (err: any) {
      if (err.message === "SESSION_EXPIRED") return;
      setFormError(err.message || "Failed to submit punch request");
    } finally {
      setSubmitting(false);
    }
  };

  const statusInfo = (status: PunchRequestStatus) => {
    switch (status) {
      case "approved":
        return { color: colors.success, label: "Approved", icon: "check-circle" as const };
      case "rejected":
        return { color: colors.error, label: "Rejected", icon: "cancel" as const };
      default:
        return { color: colors.warning, label: "Pending", icon: "hourglass-empty" as const };
    }
  };

  const formatDate = (ymd: string) =>
    new Date(ymd + "T00:00:00").toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.primary, paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBack}>
          <MaterialIcons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Punch Requests</Text>
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
            {error.message ?? "Failed to load punch requests"}
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
              <MaterialIcons name="touch-app" size={44} color={colors.textTertiary} />
              <Text style={[styles.muted, { color: colors.textSecondary }]}>No punch requests yet</Text>
              <Text style={[styles.hint, { color: colors.textTertiary }]}>
                Forgot to check in or out? Submit a request and your admin will review it.
              </Text>
            </View>
          ) : (
            requests.map((req) => {
              const s = statusInfo(req.status);
              const isCheckIn = req.punchType === "check-in";
              return (
                <View
                  key={req._id}
                  style={[styles.card, { backgroundColor: colors.card.background, borderColor: colors.border }]}
                >
                  <View style={styles.cardTop}>
                    <View style={styles.typeRowInline}>
                      <View
                        style={[
                          styles.typeIcon,
                          { backgroundColor: (isCheckIn ? colors.success : colors.info) + "20" },
                        ]}
                      >
                        <Feather
                          name={isCheckIn ? "log-in" : "log-out"}
                          size={16}
                          color={isCheckIn ? colors.success : colors.info}
                        />
                      </View>
                      <Text style={[styles.punchType, { color: colors.textPrimary }]}>
                        {isCheckIn ? "Check In" : "Check Out"}
                      </Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: s.color + "15" }]}>
                      <MaterialIcons name={s.icon} size={13} color={s.color} />
                      <Text style={[styles.badgeText, { color: s.color }]}>{s.label}</Text>
                    </View>
                  </View>

                  <View style={styles.metaRow}>
                    <MaterialIcons name="event" size={14} color={colors.textTertiary} />
                    <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                      {formatDate(req.requestDate)} · {formatTime(req.requestedTime)}
                    </Text>
                  </View>

                  {req.reason ? (
                    <Text style={[styles.reason, { color: colors.textSecondary }]}>{req.reason}</Text>
                  ) : null}

                  {req.status === "approved" && req.appliedTime ? (
                    <View style={[styles.noteBox, { backgroundColor: colors.success + "10" }]}>
                      <Text style={[styles.noteText, { color: colors.success }]}>
                        Applied at {formatTime(req.appliedTime)}
                        {req.reviewedBy?.name ? ` by ${req.reviewedBy.name}` : ""}
                      </Text>
                    </View>
                  ) : null}

                  {req.adminNote ? (
                    <View
                      style={[
                        styles.noteBox,
                        { backgroundColor: (req.status === "rejected" ? colors.error : colors.info) + "10" },
                      ]}
                    >
                      <Text
                        style={[
                          styles.noteText,
                          { color: req.status === "rejected" ? colors.error : colors.info },
                        ]}
                      >
                        Admin: {req.adminNote}
                      </Text>
                    </View>
                  ) : null}

                  <Text style={[styles.submittedAt, { color: colors.textTertiary }]}>
                    Submitted {new Date(req.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </Text>
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* Request FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary, bottom: insets.bottom + 20 }]}
        onPress={() => setModalOpen(true)}
        activeOpacity={0.85}
      >
        <MaterialIcons name="add" size={22} color="white" />
        <Text style={styles.fabText}>Request Punch</Text>
      </TouchableOpacity>

      {/* Request Modal */}
      <Modal
        visible={modalOpen}
        animationType="slide"
        transparent
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={() => setModalOpen(false)}
      >
        <KeyboardAvoidingView style={styles.modalOverlay} behavior="padding">
          <View style={[styles.modalCard, { backgroundColor: colors.background, paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Manual Punch Request</Text>
              <TouchableOpacity onPress={() => setModalOpen(false)}>
                <MaterialIcons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 40 }}
            >
              {/* Punch type */}
              <Text style={[styles.label, { color: colors.textPrimary }]}>Punch Type</Text>
              <View style={styles.typeRow}>
                {PUNCH_TYPES.map((t) => {
                  const active = punchType === t.value;
                  return (
                    <TouchableOpacity
                      key={t.value}
                      onPress={() => setPunchType(t.value)}
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
              </View>

              {/* Date & time */}
              <View style={styles.dateRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.label, { color: colors.textPrimary }]}>Date</Text>
                  <TouchableOpacity
                    style={[styles.input, styles.dateInput, { borderColor: colors.input.border, backgroundColor: colors.input.background }]}
                    onPress={() => {
                      setShowTimePicker(false);
                      setShowDatePicker(true);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={{ color: date ? colors.input.text : colors.input.placeholder, fontSize: 14 }}>
                      {date ? fmtDisplayDate(date) : "Select date"}
                    </Text>
                    <MaterialIcons name="calendar-today" size={18} color={colors.textTertiary} />
                  </TouchableOpacity>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.label, { color: colors.textPrimary }]}>Time</Text>
                  <TouchableOpacity
                    style={[styles.input, styles.dateInput, { borderColor: colors.input.border, backgroundColor: colors.input.background }]}
                    onPress={() => {
                      setShowDatePicker(false);
                      setShowTimePicker(true);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={{ color: time ? colors.input.text : colors.input.placeholder, fontSize: 14 }}>
                      {time ? fmtDisplayTime(time) : "Select time"}
                    </Text>
                    <MaterialIcons name="access-time" size={18} color={colors.textTertiary} />
                  </TouchableOpacity>
                </View>
              </View>

              {showDatePicker && (
                <DateTimePicker
                  value={date ?? new Date()}
                  mode="date"
                  display={Platform.OS === "ios" ? "inline" : "default"}
                  maximumDate={new Date()}
                  onChange={(event, selected) => {
                    setShowDatePicker(Platform.OS === "ios");
                    if (event.type === "set" && selected) setDate(selected);
                  }}
                />
              )}
              {showTimePicker && (
                <DateTimePicker
                  value={time ?? new Date()}
                  mode="time"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  onChange={(event, selected) => {
                    setShowTimePicker(Platform.OS === "ios");
                    if (event.type === "set" && selected) setTime(selected);
                  }}
                />
              )}

              {/* Reason */}
              <Text style={[styles.label, { color: colors.textPrimary }]}>Reason</Text>
              <TextInput
                style={[styles.input, styles.textArea, { borderColor: colors.input.border, color: colors.input.text, backgroundColor: colors.input.background }]}
                placeholder="e.g. Forgot to check in this morning"
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
  hint: { fontSize: 12, textAlign: "center", paddingHorizontal: 32, lineHeight: 18 },
  content: { padding: 16 },
  emptyBox: { alignItems: "center", paddingVertical: 60, gap: 12 },

  card: { borderWidth: 1, borderRadius: 14, padding: 16, marginBottom: 12 },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  typeRowInline: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1, marginRight: 8 },
  typeIcon: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  punchType: { fontSize: 16, fontWeight: "700" },
  badge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 11, fontWeight: "700" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10 },
  metaText: { fontSize: 13 },
  reason: { fontSize: 13, marginTop: 8, lineHeight: 18 },
  noteBox: { borderRadius: 8, padding: 10, marginTop: 10 },
  noteText: { fontSize: 12 },
  submittedAt: { fontSize: 11, marginTop: 10 },

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
  typeRow: { flexDirection: "row", gap: 8 },
  typeChip: { flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 20, borderWidth: 1 },
  typeChipText: { fontSize: 13, fontWeight: "600" },
  dateRow: { flexDirection: "row", gap: 12 },
  input: { borderWidth: 1, borderRadius: 8, paddingVertical: 12, paddingHorizontal: 14, fontSize: 14 },
  dateInput: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  textArea: { height: 100 },
  errorText: { fontSize: 13, marginTop: 12 },
  submitBtn: { paddingVertical: 14, borderRadius: 8, alignItems: "center", marginTop: 20 },
  submitBtnText: { color: "white", fontSize: 16, fontWeight: "700" },
});
