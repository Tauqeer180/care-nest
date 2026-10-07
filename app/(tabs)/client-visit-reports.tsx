import DateTimePicker from "@react-native-community/datetimepicker";
import { MaterialIcons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import useSWR from "swr";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import {
  ClientVisitReportRecord,
  extractClientVisitReports,
  fetchClientVisitReports,
  getClientVisitReportValue,
} from "@/services/clientBookingService";
import { SWR_KEYS } from "@/services/swrKeys";

type DateFilter = "from" | "to";

function toDateParam(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatDate(value?: string): string {
  if (!value) return "Visit report";
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      });
}

function formatCardDate(value?: string): string {
  if (!value) return "Visit date unavailable";
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
}

function formatTime(value: string): string {
  const [hourText, minute] = value.split(":");
  const hour = Number(hourText);
  if (!Number.isFinite(hour) || !minute) return value;
  const suffix = hour >= 12 ? "PM" : "AM";
  return `${hour % 12 || 12}:${minute} ${suffix}`;
}

function getReportDate(report: ClientVisitReportRecord): string {
  return reportText(
    getClientVisitReportValue(report, "visit_date") ??
      getClientVisitReportValue(report, "booking_date") ??
      getClientVisitReportValue(report, "date") ??
      getClientVisitReportValue(report, "created_at"),
  );
}

function reportText(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.filter((part) => typeof part === "string").join(", ");
  return "";
}

export default function ClientVisitReportsScreen() {
  const { colors } = useTheme();
  const { isClient } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [activeFilter, setActiveFilter] = useState<DateFilter | null>(null);
  const [pickerValue, setPickerValue] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);

  const { data, error, isLoading, mutate } = useSWR(
    isClient ? SWR_KEYS.clientVisitReports(from, to) : null,
    () => fetchClientVisitReports(from || undefined, to || undefined),
    { revalidateOnFocus: true },
  );

  const reports = useMemo(
    () =>
      extractClientVisitReports(data).sort((a, b) => {
        const dateDiff =
          new Date(getReportDate(b)).getTime() - new Date(getReportDate(a)).getTime();
        return Number.isNaN(dateDiff) ? 0 : dateDiff;
      }),
    [data],
  );

  useEffect(() => {
    if (data !== undefined) {
      console.log("Client visit reports =>", JSON.stringify(data, null, 2));
    }
  }, [data]);

  useFocusEffect(
    useCallback(() => {
      if (isClient) {
        void mutate().catch((refreshError) => {
          console.error("Client visit reports refresh error =>", refreshError);
        });
      }
    }, [isClient, mutate]),
  );

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await mutate();
    } catch (refreshError) {
      console.error("Client visit reports refresh error =>", refreshError);
    } finally {
      setRefreshing(false);
    }
  }, [mutate]);

  const openDateFilter = (filter: DateFilter) => {
    const currentValue = filter === "from" ? from : to;
    setPickerValue(currentValue ? new Date(`${currentValue}T00:00:00`) : new Date());
    setActiveFilter(filter);
  };

  const handleDateChange = (_event: unknown, selectedDate?: Date) => {
    if (Platform.OS === "android") setActiveFilter(null);
    if (!selectedDate || !activeFilter) return;

    const value = toDateParam(selectedDate);
    if (
      (activeFilter === "from" && to && value > to) ||
      (activeFilter === "to" && from && value < from)
    ) {
      Alert.alert("Invalid date range", "The start date must be on or before the end date.");
      return;
    }
    if (activeFilter === "from") setFrom(value);
    else setTo(value);
    setPickerValue(selectedDate);
  };

  const clearFilters = () => {
    setFrom("");
    setTo("");
    setActiveFilter(null);
  };

  const openReport = (report: ClientVisitReportRecord) => {
    const bookingId = reportText(
      getClientVisitReportValue(report, "booking_id") ?? report._id,
    );
    if (!bookingId) {
      Alert.alert("Report unavailable", "This report does not include a booking ID.");
      return;
    }
    router.push({
      pathname: "/client-visit-report-detail",
      params: { booking_id: bookingId },
    });
  };

  const renderEmpty = () => (
    <View style={styles.centered}>
      {isLoading ? (
        <ActivityIndicator size="large" color={colors.primary} />
      ) : (
        <>
          <MaterialIcons
            name={error ? "error-outline" : "description"}
            size={42}
            color={error ? colors.error : colors.textTertiary}
          />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            {error?.message ?? "No report yet"}
          </Text>
        </>
      )}
    </View>
  );

  const renderReport = ({ item }: { item: ClientVisitReportRecord }) => {
    const title =
      reportText(getClientVisitReportValue(item, "service_name")) ||
      reportText(getClientVisitReportValue(item, "service_title")) ||
      "Visit report";
    const date = reportText(getClientVisitReportValue(item, "visit_date") ?? getReportDate(item));
    const startTime = reportText(getClientVisitReportValue(item, "start_time"));
    const endTime = reportText(getClientVisitReportValue(item, "end_time"));
    const bookingId = reportText(
      getClientVisitReportValue(item, "booking_id") ?? item._id,
    );
    const note = reportText(getClientVisitReportValue(item, "tasks_note"));
    const employee = reportText(getClientVisitReportValue(item, "employee_name"));
    const attachments = getClientVisitReportValue(item, "attachments");
    const attachmentCount = Array.isArray(attachments) ? attachments.length : 0;

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        disabled={!bookingId}
        onPress={() => openReport(item)}
        style={[
          styles.reportCard,
          { backgroundColor: colors.card.background, borderColor: colors.border },
        ]}
      >
        <View style={[styles.cardAccent, { backgroundColor: colors.primary }]} />
        <View style={styles.cardContent}>
          <View style={[styles.reportHeading, { borderBottomColor: colors.divider }]}>
            <Text style={[styles.reportTitle, { color: colors.textPrimary }]} numberOfLines={1}>
              {employee || "Caregiver"}
            </Text>
          </View>
          <View style={styles.detailsColumns}>
            <View style={styles.leftColumn}>
              <View style={styles.serviceRow}>
                <MaterialIcons name="medical-services" size={13} color={colors.textTertiary} />
                <Text style={[styles.serviceText, { color: colors.textSecondary }]} numberOfLines={2}>
                  {title}
                </Text>
              </View>
              {note ? (
                <Text style={[styles.reportNote, { color: colors.textSecondary }]} numberOfLines={2}>
                  {note}
                </Text>
              ) : null}
              {attachmentCount ? (
                <View style={styles.serviceRow}>
                  <MaterialIcons name="attach-file" size={13} color={colors.textTertiary} />
                  <Text style={[styles.serviceText, { color: colors.textSecondary }]}>
                    {attachmentCount} attachment{attachmentCount === 1 ? "" : "s"}
                  </Text>
                </View>
              ) : null}
            </View>
            <View style={[styles.rightColumn, { borderLeftColor: colors.divider }]}>
              <View style={styles.infoRow}>
                <MaterialIcons name="event" size={13} color={colors.textTertiary} />
                <Text style={[styles.appointmentText, { color: colors.textPrimary }]} numberOfLines={1}>
                  {formatCardDate(date)}
                </Text>
              </View>
              {startTime || endTime ? (
                <View style={styles.infoRow}>
                  <MaterialIcons name="schedule" size={13} color={colors.textTertiary} />
                  <Text style={[styles.appointmentText, { color: colors.primary }]} numberOfLines={1}>
                    {startTime ? formatTime(startTime) : ""}
                    {startTime && endTime ? " - " : ""}
                    {endTime ? formatTime(endTime) : ""}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { backgroundColor: colors.primary, paddingTop: insets.top + 12 },
        ]}
      >
        <Text style={styles.headerTitle}>Visit Reports</Text>
        <Text style={styles.headerSubtitle}>Reports from your care visits</Text>
      </View>

      <View style={styles.filters}>
        <TouchableOpacity
          onPress={() => openDateFilter("from")}
          style={[styles.dateButton, { backgroundColor: colors.card.background, borderColor: colors.border }]}
        >
          <MaterialIcons name="event" size={16} color={colors.primary} />
          <Text style={[styles.dateButtonText, { color: colors.textPrimary }]}>
            {from ? formatDate(from) : "From date"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => openDateFilter("to")}
          style={[styles.dateButton, { backgroundColor: colors.card.background, borderColor: colors.border }]}
        >
          <MaterialIcons name="event" size={16} color={colors.primary} />
          <Text style={[styles.dateButtonText, { color: colors.textPrimary }]}>
            {to ? formatDate(to) : "To date"}
          </Text>
        </TouchableOpacity>
        {(from || to) ? (
          <TouchableOpacity onPress={clearFilters} style={styles.clearButton}>
            <Text style={[styles.clearText, { color: colors.primary }]}>Clear</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {activeFilter ? (
        <View style={[styles.pickerWrap, { backgroundColor: colors.card.background }]}>
          <View style={styles.pickerHeading}>
            <Text style={[styles.pickerTitle, { color: colors.textPrimary }]}>
              Select {activeFilter === "from" ? "start" : "end"} date
            </Text>
            <TouchableOpacity onPress={() => setActiveFilter(null)}>
              <MaterialIcons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <DateTimePicker
            value={pickerValue}
            mode="date"
            display={Platform.OS === "ios" ? "inline" : "default"}
            onChange={handleDateChange}
          />
          {Platform.OS === "ios" ? (
            <TouchableOpacity
              onPress={() => setActiveFilter(null)}
              style={[styles.doneButton, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.doneText}>Done</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

      <FlatList
        data={reports}
        keyExtractor={(item, index) =>
          `${reportText(getClientVisitReportValue(item, "booking_id") ?? item._id) || "visit-report"}-${getReportDate(item)}-${index}`
        }
        renderItem={renderReport}
        contentContainerStyle={[styles.listContent, reports.length === 0 && styles.emptyList]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={renderEmpty}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
  },
  headerTitle: { color: "#FFFFFF", fontSize: 22, fontWeight: "700" },
  headerSubtitle: { color: "#FFFFFF", fontSize: 13, marginTop: 3, opacity: 0.9 },
  filters: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12 },
  dateButton: {
    minWidth: 0,
    flex: 1,
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 9,
  },
  dateButtonText: { flex: 1, fontSize: 11 },
  clearButton: { paddingHorizontal: 3, paddingVertical: 8 },
  clearText: { fontSize: 12, fontWeight: "600" },
  pickerWrap: { marginHorizontal: 12, marginBottom: 8, borderRadius: 12, padding: 10 },
  pickerHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  pickerTitle: { fontSize: 14, fontWeight: "600" },
  doneButton: { alignSelf: "flex-end", marginTop: 4, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 7 },
  doneText: { color: "#FFFFFF", fontWeight: "600" },
  listContent: { padding: 12, paddingBottom: 22 },
  emptyList: { flexGrow: 1 },
  reportCard: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 10,
  },
  cardAccent: { width: 3 },
  cardContent: { flex: 1, paddingHorizontal: 11, paddingVertical: 9 },
  reportHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: 5,
  },
  reportTitle: { flex: 1, minWidth: 0, fontSize: 13, fontWeight: "600" },
  detailsColumns: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 7,
  },
  leftColumn: { width: "55%", justifyContent: "center", paddingRight: 6 },
  rightColumn: {
    width: "43%",
    borderLeftWidth: StyleSheet.hairlineWidth,
    paddingLeft: 9,
    gap: 5,
  },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  appointmentText: { fontSize: 11, fontWeight: "600", flexShrink: 1 },
  serviceRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 5,
    marginTop: 6,
  },
  serviceText: { flex: 1, fontSize: 11, lineHeight: 15 },
  reportNote: { fontSize: 11, lineHeight: 15, marginTop: 6 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  emptyText: { fontSize: 14, marginTop: 10, textAlign: "center" },
});
