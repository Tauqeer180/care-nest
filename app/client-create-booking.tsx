import SelectField from "@/components/SelectField";
import { useTheme } from "@/hooks/useTheme";
import {
  BOOKING_TYPE_RANGE,
  BOOKING_TYPE_SINGLE,
  BookingDetailRow,
  BookingType,
  CreateBookingPayload,
  createBookingRequest,
  fetchBookingOptions,
  generateBookingDates,
  LabelledOption,
  OFTEN_ONE_TIME,
  toYMD,
} from "@/services/clientBookingService";
import { SWR_KEYS } from "@/services/swrKeys";
import { MaterialIcons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import useSWR, { useSWRConfig } from "swr";

const STEPS = [
  { key: "schedule", label: "Schedule" },
  { key: "details", label: "Details" },
] as const;

/** Fallbacks used only until /booking-options responds. */
const FALLBACK_BOOKING_TYPES: LabelledOption[] = [
  { value: BOOKING_TYPE_SINGLE, label: "Single Date" },
  { value: BOOKING_TYPE_RANGE, label: "Date Range" },
];
const DEFAULT_START_TIME = "09:00";
const DEFAULT_END_TIME = "17:00";

type DatePickerTarget = "start" | "end" | null;

interface RowDraft {
  date: Date;
  start_time: string;
  end_time: string;
  service_id: string;
}

/** "09:00" → minutes since midnight, for ordering comparisons. */
function minutesOf(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function timeToDate(time: string): Date {
  const [h, m] = time.split(":").map(Number);
  const d = new Date();
  d.setHours(h ?? 0, m ?? 0, 0, 0);
  return d;
}

function dateToTime(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes(),
  ).padStart(2, "0")}`;
}

function formatTimeLabel(time: string): string {
  const [h, m] = time.split(":");
  const hour = parseInt(h, 10);
  if (Number.isNaN(hour)) return time;
  const suffix = hour >= 12 ? "PM" : "AM";
  const display = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${display}:${m} ${suffix}`;
}

export default function ClientCreateBookingScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { mutate: globalMutate } = useSWRConfig();

  const [stepIndex, setStepIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const { data: options, isLoading: optionsLoading } = useSWR(
    SWR_KEYS.clientBookingOptions(),
    fetchBookingOptions,
  );

  const bookingTypes = options?.booking_types?.length
    ? options.booking_types
    : FALLBACK_BOOKING_TYPES;
  const maxRows = options?.max_booking_details ?? 50;

  // Depend on options.services itself — `?? []` would be a fresh array each
  // render and defeat the memo.
  const serviceOptions = useMemo(
    () =>
      (options?.services ?? []).map((s) => ({ value: s._id, label: s.title })),
    [options?.services],
  );

  // --- Step 1: schedule -----------------------------------------------------
  const [bookingType, setBookingType] =
    useState<BookingType>(BOOKING_TYPE_SINGLE);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [activePicker, setActivePicker] = useState<DatePickerTarget>(null);

  const [startDateError, setStartDateError] = useState("");
  const [endDateError, setEndDateError] = useState("");

  // --- Step 2: rows ---------------------------------------------------------
  const [rows, setRows] = useState<RowDraft[]>([]);
  const [truncated, setTruncated] = useState(false);
  const [rowsError, setRowsError] = useState("");
  const [timePicker, setTimePicker] = useState<{
    index: number;
    field: "start_time" | "end_time";
  } | null>(null);

  const isRange = bookingType === BOOKING_TYPE_RANGE;

  const fmtDisplay = (d: Date) =>
    d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  const fmtRowDate = (d: Date) =>
    d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  const handleBookingTypeChange = (value: BookingType) => {
    setBookingType(value);
    setEndDateError("");
    if (value === BOOKING_TYPE_SINGLE) setEndDate(null);
  };

  const handleStartDateChange = (selected: Date) => {
    setStartDate(selected);
    setStartDateError("");
    if (endDate && endDate < selected) setEndDate(selected);
  };

  const validateSchedule = (): boolean => {
    let valid = true;
    setStartDateError("");
    setEndDateError("");

    if (!startDate) {
      setStartDateError("Start date is required");
      valid = false;
    }
    if (isRange) {
      if (!endDate) {
        setEndDateError("End date is required");
        valid = false;
      } else if (startDate && endDate < startDate) {
        setEndDateError("End date must be on or after the start date");
        valid = false;
      }
    }
    return valid;
  };

  /** Expands the schedule into rows, keeping any edits already made per date. */
  const buildRows = () => {
    const { dates, truncated: wasTruncated } = generateBookingDates(
      {
        bookingType,
        oftenType: OFTEN_ONE_TIME,
        startDate: startDate!,
        endDate,
        oftenEndDate: null,
        selectedWeekDays: [],
      },
      maxRows,
    );

    const previous = new Map(rows.map((row) => [toYMD(row.date), row]));
    const onlyService =
      serviceOptions.length === 1 ? serviceOptions[0].value : "";

    setRows(
      dates.map((date) => {
        const existing = previous.get(toYMD(date));
        return (
          existing ?? {
            date,
            start_time: DEFAULT_START_TIME,
            end_time: DEFAULT_END_TIME,
            service_id: onlyService,
          }
        );
      }),
    );
    setTruncated(wasTruncated);
    setRowsError("");
    return dates.length;
  };

  const updateRow = (index: number, patch: Partial<RowDraft>) => {
    setRows((current) =>
      current.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
    setRowsError("");
  };

  /** Copies the first row's time + service onto every other row. */
  const applyFirstRowToAll = () => {
    if (rows.length < 2) return;
    const [first] = rows;
    setRows((current) =>
      current.map((row) => ({
        ...row,
        start_time: first.start_time,
        end_time: first.end_time,
        service_id: first.service_id,
      })),
    );
    setRowsError("");
  };

  const validateRows = (): boolean => {
    if (rows.length === 0) {
      setRowsError("No dates were generated for this schedule");
      return false;
    }
    const missingService = rows.findIndex((row) => !row.service_id);
    if (missingService >= 0) {
      setRowsError(
        `Select a service for ${fmtRowDate(rows[missingService].date)}`,
      );
      return false;
    }
    const badTime = rows.findIndex(
      (row) => minutesOf(row.end_time) <= minutesOf(row.start_time),
    );
    if (badTime >= 0) {
      setRowsError(
        `End time must be after start time for ${fmtRowDate(rows[badTime].date)}`,
      );
      return false;
    }
    setRowsError("");
    return true;
  };

  const buildPayload = (): CreateBookingPayload => ({
    booking_type: bookingType,
    start_date: toYMD(startDate!),
    end_date: toYMD(isRange ? endDate! : startDate!),
    often_type: OFTEN_ONE_TIME,
    booking_details: rows.map<BookingDetailRow>((row) => ({
      booking_date: toYMD(row.date),
      start_time: row.start_time,
      end_time: row.end_time,
      service_id: row.service_id,
      floor_name: "",
    })),
  });

  const handleSubmit = async () => {
    if (!validateRows()) return;
    const payload = buildPayload();
    // Nested booking_details collapse to [Object] in Metro without stringify.
    // console.log("Create booking body =>", JSON.stringify(payload, null, 2));
    setSubmitting(true);
    try {
      await createBookingRequest(payload);
      // Refresh the bookings list behind this screen.
      globalMutate(
        (key) => Array.isArray(key) && key[0] === "client-bookings",
        undefined,
        { revalidate: true },
      );
      Alert.alert(
        "Booking Requested",
        "Your booking request has been submitted.",
        [{ text: "OK", onPress: () => router.back() }],
      );
    } catch (error: any) {
      if (error?.message === "SESSION_EXPIRED") return;
      Alert.alert("Error", error?.message || "Failed to create booking");
    } finally {
      setSubmitting(false);
    }
  };

  const handleNext = () => {
    if (stepIndex === 0) {
      if (!validateSchedule()) return;
      const count = buildRows();
      if (count === 0) {
        setStartDateError("This schedule produces no dates");
        return;
      }
      setStepIndex(1);
      return;
    }
    handleSubmit();
  };

  const handleBack = () => {
    if (stepIndex > 0) {
      setStepIndex(stepIndex - 1);
      return;
    }
    router.back();
  };

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: colors.primary,
      paddingHorizontal: 16,
      paddingBottom: 16,
      paddingTop: insets.top + 12,
    },
    headerBack: { padding: 4 },
    headerTitle: {
      flex: 1,
      textAlign: "center",
      fontSize: 18,
      fontWeight: "700",
      color: colors.button.primaryText,
    },
    stepBar: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingVertical: 16,
      gap: 8,
    },
    stepItem: { flexDirection: "row", alignItems: "center", gap: 8 },
    stepCircle: {
      width: 26,
      height: 26,
      borderRadius: 13,
      alignItems: "center",
      justifyContent: "center",
    },
    stepCircleText: { fontSize: 12, fontWeight: "700" },
    stepLabel: { fontSize: 13, fontWeight: "600" },
    stepConnector: { flex: 1, height: 2, borderRadius: 1, marginLeft: 4 },
    content: { paddingHorizontal: 20, paddingBottom: 24 },
    sectionTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.textPrimary,
      marginBottom: 4,
    },
    sectionSubtitle: {
      fontSize: 13,
      color: colors.textSecondary,
      marginBottom: 20,
    },
    label: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.textPrimary,
      marginBottom: 8,
    },
    dateField: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      backgroundColor: colors.input.background,
      gap: 8,
    },
    dateFieldText: { fontSize: 15 },
    fieldWrapper: { marginBottom: 16 },
    errorText: { fontSize: 12, color: colors.error, marginTop: 6 },
    hintText: { fontSize: 12, color: colors.textTertiary, marginTop: 6 },
    summaryCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      backgroundColor: colors.primary + "12",
      borderRadius: 12,
      padding: 14,
      marginBottom: 12,
    },
    summaryText: { flex: 1, fontSize: 13, color: colors.textPrimary },
    warnCard: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
      backgroundColor: colors.warning + "15",
      borderRadius: 12,
      padding: 14,
      marginBottom: 12,
    },
    warnText: { flex: 1, fontSize: 12, color: colors.textSecondary },
    applyAllBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      borderWidth: 1,
      borderColor: colors.primary,
      borderRadius: 10,
      paddingVertical: 10,
      marginBottom: 16,
    },
    applyAllText: { fontSize: 13, fontWeight: "700", color: colors.primary },
    rowCard: {
      backgroundColor: colors.card.background,
      borderRadius: 14,
      padding: 14,
      marginBottom: 12,
    },
    rowHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 12,
    },
    rowIndex: {
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.primary + "18",
    },
    rowIndexText: { fontSize: 11, fontWeight: "700", color: colors.primary },
    rowDate: {
      flex: 1,
      fontSize: 14,
      fontWeight: "700",
      color: colors.textPrimary,
    },
    timeRow: { flexDirection: "row", gap: 12 },
    timeCol: { flex: 1 },
    footer: {
      flexDirection: "row",
      gap: 12,
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: insets.bottom + 12,
      borderTopWidth: 1,
      borderTopColor: colors.divider,
      backgroundColor: colors.background,
    },
    secondaryButton: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
    },
    secondaryButtonText: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.textSecondary,
    },
    primaryButton: {
      flex: 2,
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: "center",
      backgroundColor: colors.button.primary,
    },
    primaryButtonDisabled: { backgroundColor: colors.button.disabled },
    primaryButtonText: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.button.primaryText,
    },
  });

  const renderDateField = (
    label: string,
    value: Date | null,
    target: Exclude<DatePickerTarget, null>,
    error: string,
    opts: { required?: boolean; hint?: string; onClear?: () => void } = {},
  ) => {
    const { required = true, hint, onClear } = opts;
    return (
      <View style={styles.fieldWrapper}>
        <Text style={styles.label}>
          {label}
          {required ? (
            <Text style={{ color: colors.error }}>*</Text>
          ) : (
            <Text style={{ color: colors.textTertiary }}> (optional)</Text>
          )}
        </Text>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setActivePicker(target)}
          style={[
            styles.dateField,
            { borderColor: error ? colors.error : colors.input.border },
          ]}
        >
          <Text
            style={[
              styles.dateFieldText,
              { color: value ? colors.input.text : colors.input.placeholder },
            ]}
          >
            {value ? fmtDisplay(value) : "Select date"}
          </Text>
          {value && onClear ? (
            <TouchableOpacity onPress={onClear} hitSlop={8}>
              <MaterialIcons
                name="close"
                size={18}
                color={colors.textTertiary}
              />
            </TouchableOpacity>
          ) : (
            <MaterialIcons
              name="calendar-today"
              size={18}
              color={colors.textTertiary}
            />
          )}
        </TouchableOpacity>
        {hint && !error ? <Text style={styles.hintText}>{hint}</Text> : null}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </View>
    );
  };

  const renderScheduleStep = () => (
    <>
      <Text style={styles.sectionTitle}>Schedule</Text>
      <Text style={styles.sectionSubtitle}>
        Choose when you need the service.
      </Text>

      <SelectField<number>
        label="Select Type"
        question="Is this for a single date or a date range?"
        value={bookingType}
        options={bookingTypes}
        onChange={(value) => handleBookingTypeChange(value as BookingType)}
        required
      />

      {renderDateField("Start Date", startDate, "start", startDateError)}

      {isRange
        ? renderDateField("End Date", endDate, "end", endDateError)
        : null}
    </>
  );

  const renderRow = (row: RowDraft, index: number) => (
    <View style={styles.rowCard}>
      <View style={styles.rowHeader}>
        <View style={styles.rowIndex}>
          <Text style={styles.rowIndexText}>{index + 1}</Text>
        </View>
        {/* Date is derived from the schedule — read-only here. */}
        <Text style={styles.rowDate}>{fmtRowDate(row.date)}</Text>
        <MaterialIcons
          name="lock-outline"
          size={15}
          color={colors.textTertiary}
        />
      </View>

      <View style={styles.timeRow}>
        <View style={styles.timeCol}>
          <Text style={styles.label}>Start Time</Text>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setTimePicker({ index, field: "start_time" })}
            style={[styles.dateField, { borderColor: colors.input.border }]}
          >
            <Text style={[styles.dateFieldText, { color: colors.input.text }]}>
              {formatTimeLabel(row.start_time)}
            </Text>
            <MaterialIcons
              name="schedule"
              size={18}
              color={colors.textTertiary}
            />
          </TouchableOpacity>
        </View>
        <View style={styles.timeCol}>
          <Text style={styles.label}>End Time</Text>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setTimePicker({ index, field: "end_time" })}
            style={[styles.dateField, { borderColor: colors.input.border }]}
          >
            <Text style={[styles.dateFieldText, { color: colors.input.text }]}>
              {formatTimeLabel(row.end_time)}
            </Text>
            <MaterialIcons
              name="schedule"
              size={18}
              color={colors.textTertiary}
            />
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ marginTop: 16 }}>
        <SelectField<string>
          label="Service"
          question="Which service is needed?"
          value={row.service_id || null}
          options={serviceOptions}
          onChange={(service_id) => updateRow(index, { service_id })}
          placeholder={
            serviceOptions.length ? "Select a service" : "No services available"
          }
          disabled={serviceOptions.length === 0}
          required
        />
      </View>
    </View>
  );

  const renderDetailsStep = () => (
    <FlatList
      data={rows}
      keyExtractor={(row) => toYMD(row.date)}
      style={{ flex: 1 }}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={
        <>
          <Text style={styles.sectionTitle}>Booking Details</Text>
          <Text style={styles.sectionSubtitle}>
            Set the time and service for each date.
          </Text>

          <View style={styles.summaryCard}>
            <MaterialIcons name="event-note" size={20} color={colors.primary} />
            <Text style={styles.summaryText}>
              {rows.length} {rows.length === 1 ? "date" : "dates"} generated
              from your schedule.
            </Text>
          </View>

          {truncated ? (
            <View style={styles.warnCard}>
              <MaterialIcons
                name="info-outline"
                size={18}
                color={colors.warning}
              />
              <Text style={styles.warnText}>
                Stopped at the {maxRows}-date limit. Set a &quot;Repeat
                Until&quot; date or a shorter range to control which dates are
                included.
              </Text>
            </View>
          ) : null}

          {rows.length > 1 ? (
            <TouchableOpacity
              style={styles.applyAllBtn}
              onPress={applyFirstRowToAll}
              activeOpacity={0.8}
            >
              <MaterialIcons
                name="content-copy"
                size={16}
                color={colors.primary}
              />
              <Text style={styles.applyAllText}>
                Apply first row&apos;s time &amp; service to all
              </Text>
            </TouchableOpacity>
          ) : null}
        </>
      }
      renderItem={({ item, index }) => renderRow(item, index)}
      ListFooterComponent={
        rowsError ? (
          <Text style={[styles.errorText, { marginBottom: 8 }]}>
            {rowsError}
          </Text>
        ) : null
      }
    />
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.headerBack}>
          <MaterialIcons
            name="arrow-back"
            size={24}
            color={colors.button.primaryText}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Booking</Text>
        <View style={{ width: 32 }} />
      </View>

      <View style={styles.stepBar}>
        {STEPS.map((step, index) => {
          const done = index < stepIndex;
          const active = index === stepIndex;
          const tint = done || active ? colors.primary : colors.disabled;
          return (
            <View key={step.key} style={[styles.stepItem, { flex: 1 }]}>
              <View style={[styles.stepCircle, { backgroundColor: tint }]}>
                {done ? (
                  <MaterialIcons
                    name="check"
                    size={15}
                    color={colors.button.primaryText}
                  />
                ) : (
                  <Text
                    style={[
                      styles.stepCircleText,
                      { color: colors.button.primaryText },
                    ]}
                  >
                    {index + 1}
                  </Text>
                )}
              </View>
              <Text
                style={[
                  styles.stepLabel,
                  { color: active ? colors.textPrimary : colors.textTertiary },
                ]}
              >
                {step.label}
              </Text>
              {index < STEPS.length - 1 ? (
                <View
                  style={[
                    styles.stepConnector,
                    { backgroundColor: done ? colors.primary : colors.divider },
                  ]}
                />
              ) : null}
            </View>
          );
        })}
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {stepIndex === 0 ? (
          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {renderScheduleStep()}
          </ScrollView>
        ) : (
          renderDetailsStep()
        )}

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleBack}
            disabled={submitting}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryButtonText}>
              {stepIndex === 0 ? "Cancel" : "Back"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.primaryButton,
              (submitting || optionsLoading) && styles.primaryButtonDisabled,
            ]}
            onPress={handleNext}
            disabled={submitting || optionsLoading}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator
                size="small"
                color={colors.button.primaryText}
              />
            ) : (
              <Text style={styles.primaryButtonText}>
                {stepIndex === STEPS.length - 1 ? "Create Booking" : "Next"}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {activePicker === "start" && (
        <DateTimePicker
          value={startDate ?? new Date()}
          mode="date"
          display={Platform.OS === "ios" ? "inline" : "default"}
          minimumDate={new Date()}
          onChange={(event, selected) => {
            setActivePicker(Platform.OS === "ios" ? "start" : null);
            if (event.type === "set" && selected) {
              handleStartDateChange(selected);
              if (Platform.OS === "ios") setActivePicker(null);
            }
            if (event.type === "dismissed") setActivePicker(null);
          }}
        />
      )}
      {activePicker === "end" && (
        <DateTimePicker
          value={endDate ?? startDate ?? new Date()}
          mode="date"
          display={Platform.OS === "ios" ? "inline" : "default"}
          minimumDate={startDate ?? new Date()}
          onChange={(event, selected) => {
            setActivePicker(Platform.OS === "ios" ? "end" : null);
            if (event.type === "set" && selected) {
              setEndDate(selected);
              setEndDateError("");
              if (Platform.OS === "ios") setActivePicker(null);
            }
            if (event.type === "dismissed") setActivePicker(null);
          }}
        />
      )}
      {timePicker && (
        <DateTimePicker
          value={timeToDate(
            rows[timePicker.index]?.[timePicker.field] ?? "09:00",
          )}
          mode="time"
          is24Hour={false}
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={(event, selected) => {
            const target = timePicker;
            if (Platform.OS !== "ios") setTimePicker(null);
            if (event.type === "set" && selected && target) {
              updateRow(target.index, { [target.field]: dateToTime(selected) });
              if (Platform.OS === "ios") setTimePicker(null);
            }
            if (event.type === "dismissed") setTimePicker(null);
          }}
        />
      )}
    </View>
  );
}
