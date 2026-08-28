import { useTheme } from '@/hooks/useTheme';
import {
  BOOKING_SOURCE_LABELS,
  BookingSource,
  employeeName,
  employeePhone,
  fetchClientBookingDetail,
} from '@/services/clientBookingService';
import { SWR_KEYS } from '@/services/swrKeys';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import useSWR from 'swr';

export default function ClientBookingDetailScreen() {
  const { id, source } = useLocalSearchParams<{ id: string; source: BookingSource }>();
  const { colors } = useTheme();
  const router = useRouter();

  const { data, error, isLoading } = useSWR(
    id && source ? SWR_KEYS.clientBookingDetail(id, source) : null,
    () => fetchClientBookingDetail(id!, source!),
    { revalidateOnFocus: true }
  );
  const booking = data?.data ?? null;

  useEffect(() => {
    if (data) {
      console.log('Client booking detail =>', JSON.stringify(data, null, 2));
    }
  }, [data]);

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateStr?: string | null) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return dateStr;
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatTime = (time?: string | null) => {
    if (!time) return '';
    const [h, m] = time.split(':');
    const hour = parseInt(h, 10);
    if (Number.isNaN(hour)) return time;
    const suffix = hour >= 12 ? 'PM' : 'AM';
    const display = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${display}:${m ?? '00'} ${suffix}`;
  };

  /** Renders a labelled row, or nothing when the field is absent for this source. */
  const InfoRow = ({
    icon,
    label,
    value,
  }: {
    icon: keyof typeof MaterialIcons.glyphMap;
    label: string;
    value?: string | null;
  }) => {
    if (!value) return null;
    return (
      <View style={styles.infoRow}>
        <MaterialIcons name={icon} size={18} color={colors.textTertiary} />
        <View style={styles.infoTextWrap}>
          <Text style={[styles.infoLabel, { color: colors.textTertiary }]}>{label}</Text>
          <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{value}</Text>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error || !booking) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <MaterialIcons name="error-outline" size={48} color={colors.error} />
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>
          {error?.message ?? 'Booking not found'}
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backBtn, { backgroundColor: colors.primary }]}
        >
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const staffName = employeeName(booking.employee);
  const staffPhone = employeePhone(booking.employee);
  const endDate = formatDate(booking.booking_end_date);
  const startDate = formatDate(booking.booking_date);
  const times = [formatTime(booking.start_time), formatTime(booking.end_time)]
    .filter(Boolean)
    .join(' - ');
  const shifts = Array.isArray(booking.booking_details) ? booking.booking_details : [];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBack}>
          <MaterialIcons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Booking Details
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Summary */}
        <View style={[styles.card, { backgroundColor: colors.card.background }]}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              {booking.service_title || 'Service'}
            </Text>
            <View style={[styles.sourceBadge, { backgroundColor: colors.info + '15' }]}>
              <Text style={[styles.sourceBadgeText, { color: colors.info }]}>
                {BOOKING_SOURCE_LABELS[booking.source] ?? source}
              </Text>
            </View>
          </View>

          {booking.stage_label ? (
            <View style={[styles.stageChip, { backgroundColor: colors.primary + '15' }]}>
              <MaterialIcons name="flag" size={14} color={colors.primary} />
              <Text style={[styles.stageText, { color: colors.primary }]}>
                {booking.stage_label}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Schedule */}
        <View style={[styles.card, { backgroundColor: colors.card.background }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Schedule</Text>
          <InfoRow icon="calendar-today" label="Date" value={startDate} />
          {endDate && endDate !== startDate ? (
            <InfoRow icon="event" label="End Date" value={endDate} />
          ) : null}
          <InfoRow icon="schedule" label="Time" value={times} />
          <InfoRow
            icon="event-available"
            label="Booked On"
            value={formatDateTime(booking.created_date)}
          />
        </View>

        {/* Location — present on pool and booking sources */}
        {booking.floor_name || booking.location || booking.address ? (
          <View style={[styles.card, { backgroundColor: colors.card.background }]}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Location</Text>
            <InfoRow icon="apartment" label="Floor" value={booking.floor_name} />
            <InfoRow icon="location-pin" label="Location" value={booking.location} />
            <InfoRow icon="home" label="Address" value={booking.address} />
          </View>
        ) : null}

        {/* Assigned staff */}
        {staffName ? (
          <View style={[styles.card, { backgroundColor: colors.card.background }]}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Assigned Caregiver
            </Text>
            <InfoRow icon="person" label="Name" value={staffName} />
            <InfoRow icon="phone" label="Phone" value={staffPhone} />
            <InfoRow
              icon="email"
              label="Email"
              value={typeof booking.employee === 'object' ? booking.employee?.email : null}
            />
          </View>
        ) : null}

        {/* Per-shift breakdown — source=request only */}
        {shifts.length > 0 ? (
          <View style={[styles.card, { backgroundColor: colors.card.background }]}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Shifts ({shifts.length})
            </Text>
            {shifts.map((shift, index) => {
              const shiftTimes = [formatTime(shift.start_time), formatTime(shift.end_time)]
                .filter(Boolean)
                .join(' - ');
              return (
                <View
                  key={shift._id ?? index}
                  style={[
                    styles.shiftRow,
                    index < shifts.length - 1 && {
                      borderBottomWidth: 1,
                      borderBottomColor: colors.divider,
                    },
                  ]}
                >
                  <Text style={[styles.shiftDate, { color: colors.textPrimary }]}>
                    {formatDate(shift.booking_date ?? shift.date) || `Shift ${index + 1}`}
                  </Text>
                  {shiftTimes ? (
                    <Text style={[styles.shiftTime, { color: colors.textSecondary }]}>
                      {shiftTimes}
                    </Text>
                  ) : null}
                </View>
              );
            })}
          </View>
        ) : null}

        {/* Notes */}
        {booking.notes ? (
          <View style={[styles.card, { backgroundColor: colors.card.background }]}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Notes</Text>
            <Text style={[styles.notes, { color: colors.textSecondary }]}>{booking.notes}</Text>
          </View>
        ) : null}

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    padding: 24,
  },
  errorText: { fontSize: 15, textAlign: 'center' },
  backBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 8,
  },
  backBtnText: { color: 'white', fontSize: 14, fontWeight: '600' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerBack: { padding: 4 },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
  },
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 16 },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  title: { flex: 1, fontSize: 18, fontWeight: '700' },
  sourceBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  sourceBadgeText: { fontSize: 12, fontWeight: '700' },
  stageChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 10,
  },
  stageText: { fontSize: 12, fontWeight: '700' },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  infoTextWrap: { flex: 1 },
  infoLabel: { fontSize: 11, fontWeight: '600', marginBottom: 2 },
  infoValue: { fontSize: 14, fontWeight: '500' },
  shiftRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  shiftDate: { fontSize: 13, fontWeight: '600' },
  shiftTime: { fontSize: 13, fontWeight: '500' },
  notes: { fontSize: 14, lineHeight: 20 },
});
