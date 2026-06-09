import { useState } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useSWR from 'swr';
import { useTheme } from '@/hooks/useTheme';
import { MaterialIcons } from '@expo/vector-icons';
import {
  getAdminAttendanceSummary,
  getAdminAttendanceRecords,
  AdminSummaryPeriod,
} from '@/services/attendanceService';

const PERIODS: { label: string; value: AdminSummaryPeriod }[] = [
  { label: 'Today', value: 'today' },
  { label: 'This Week', value: 'week' },
  { label: 'This Month', value: 'month' },
];

export default function AdminAttendanceDetailScreen() {
  const { employeeId, name, email, period: initialPeriod } =
    useLocalSearchParams<{ employeeId: string; name?: string; email?: string; period?: AdminSummaryPeriod }>();
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [period, setPeriod] = useState<AdminSummaryPeriod>(initialPeriod ?? 'month');

  // Reuses the same SWR key as the list screen, so the date range is shared/cached.
  const { data: summary } = useSWR(['admin-att-summary', period], () => getAdminAttendanceSummary(period), {
    revalidateOnFocus: true,
  });

  const from = summary?.fromDate?.slice(0, 10);
  const to = summary?.toDate?.slice(0, 10);
  const employeeStats = summary?.employees.find((e) => e.userId === employeeId);

  const { data: records, error, isLoading } = useSWR(
    employeeId && from && to ? ['admin-att-emp-records', employeeId, from, to] : null,
    () => getAdminAttendanceRecords({ from: from!, to: to!, employeeId, status: 'all', limit: 100 }),
    { revalidateOnFocus: true }
  );

  const formatTime = (iso: string | null) => {
    if (!iso) return '--';
    return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const formatDuration = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.primary, paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBack}>
          <MaterialIcons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {name ?? 'Employee'}
        </Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={[styles.bodyContent, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Identity */}
        <View style={[styles.identityCard, { backgroundColor: colors.card.background, borderColor: colors.border }]}>
          <View style={[styles.avatar, { backgroundColor: colors.primary + '15' }]}>
            <Text style={[styles.avatarText, { color: colors.primary }]}>
              {(name ?? 'E').trim().charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.idName, { color: colors.textPrimary }]} numberOfLines={1}>
              {name ?? 'Employee'}
            </Text>
            {!!email && (
              <Text style={[styles.idEmail, { color: colors.textTertiary }]} numberOfLines={1}>
                {email}
              </Text>
            )}
          </View>
          {employeeStats?.isCurrentlyCheckedIn && (
            <View style={[styles.liveBadge, { backgroundColor: colors.success + '15' }]}>
              <View style={[styles.dot, { backgroundColor: colors.success }]} />
              <Text style={[styles.liveText, { color: colors.success }]}>Live</Text>
            </View>
          )}
        </View>

        {/* Period selector */}
        <View style={styles.periodRow}>
          {PERIODS.map((p) => {
            const active = period === p.value;
            return (
              <TouchableOpacity
                key={p.value}
                onPress={() => setPeriod(p.value)}
                activeOpacity={0.7}
                style={[
                  styles.periodChip,
                  {
                    backgroundColor: active ? colors.primary : colors.card.background,
                    borderColor: active ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text style={[styles.periodChipText, { color: active ? 'white' : colors.textSecondary }]}>
                  {p.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Per-employee stats */}
        {employeeStats && (
          <View style={styles.statsGrid}>
            <Stat label="Days" value={String(employeeStats.totalDays)} colors={colors} />
            <Stat label="Sessions" value={String(employeeStats.sessions)} colors={colors} />
            <Stat label="Total" value={employeeStats.totalFormatted} colors={colors} />
          </View>
        )}

        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          Sessions {records ? `(${records.pagination.total})` : ''}
        </Text>

        {isLoading && !records ? (
          <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 24 }} />
        ) : error ? (
          <View style={[styles.errorBox, { backgroundColor: colors.error + '15' }]}>
            <MaterialIcons name="error-outline" size={20} color={colors.error} />
            <Text style={[styles.errorText, { color: colors.error }]}>
              {error.message ?? 'Failed to load records'}
            </Text>
          </View>
        ) : records && records.records.length === 0 ? (
          <View style={styles.emptyBox}>
            <MaterialIcons name="event-busy" size={40} color={colors.textTertiary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No sessions for this period</Text>
          </View>
        ) : (
          records?.records.map((rec) => {
            const checkedIn = rec.status === 'checked-in';
            const duration = checkedIn ? rec.liveDurationMinutes : rec.durationMinutes;
            return (
              <View
                key={rec._id}
                style={[styles.recordCard, { backgroundColor: colors.card.background, borderColor: colors.border }]}
              >
                <View style={styles.recordTop}>
                  <Text style={[styles.recordDate, { color: colors.textPrimary }]}>{rec.checkInDate}</Text>
                  <View
                    style={[
                      styles.badge,
                      { backgroundColor: (checkedIn ? colors.success : colors.textTertiary) + '15' },
                    ]}
                  >
                    <View style={[styles.dot, { backgroundColor: checkedIn ? colors.success : colors.textTertiary }]} />
                    <Text style={[styles.badgeText, { color: checkedIn ? colors.success : colors.textTertiary }]}>
                      {checkedIn ? 'Checked In' : 'Checked Out'}
                    </Text>
                  </View>
                </View>
                <View style={styles.recordMeta}>
                  <Meta icon="login" text={formatTime(rec.checkInTime)} colors={colors} />
                  <Meta icon="logout" text={formatTime(rec.checkOutTime)} colors={colors} />
                  <Meta icon="timer" text={formatDuration(duration)} colors={colors} />
                </View>
                {!!rec.notes && (
                  <Text style={[styles.notes, { color: colors.textSecondary }]} numberOfLines={2}>
                    {rec.notes}
                  </Text>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

function Stat({ label, value, colors }: { label: string; value: string; colors: ReturnType<typeof useTheme>['colors'] }) {
  return (
    <View style={[styles.statCard, { backgroundColor: colors.card.background, borderColor: colors.border }]}>
      <Text style={[styles.statValue, { color: colors.textPrimary }]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

function Meta({
  icon,
  text,
  colors,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  text: string;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  return (
    <View style={styles.metaItem}>
      <MaterialIcons name={icon} size={14} color={colors.textTertiary} />
      <Text style={[styles.metaText, { color: colors.textSecondary }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerBack: { padding: 4, width: 32 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: 'white', flex: 1, textAlign: 'center' },

  body: { flex: 1 },
  bodyContent: { padding: 16 },

  identityCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 16 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontWeight: '700' },
  idName: { fontSize: 16, fontWeight: '600' },
  idEmail: { fontSize: 12, marginTop: 2 },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  liveText: { fontSize: 11, fontWeight: '600' },

  periodRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  periodChip: { flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1, alignItems: 'center' },
  periodChipText: { fontSize: 13, fontWeight: '600' },

  statsGrid: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard: { flex: 1, borderWidth: 1, borderRadius: 12, padding: 14, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '700' },
  statLabel: { fontSize: 12, marginTop: 2 },

  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 10 },

  recordCard: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 10 },
  recordTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  recordDate: { fontSize: 14, fontWeight: '600' },
  recordMeta: { flexDirection: 'row', gap: 16, marginTop: 10 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 13 },
  notes: { fontSize: 12, marginTop: 8, fontStyle: 'italic' },

  badge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 11, fontWeight: '600' },

  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 8 },
  errorText: { fontSize: 13, flex: 1 },
  emptyBox: { alignItems: 'center', paddingVertical: 32 },
  emptyText: { fontSize: 14, marginTop: 10 },
});
