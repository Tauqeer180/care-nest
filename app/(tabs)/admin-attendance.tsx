import { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import useSWR from 'swr';
import { useTheme } from '@/hooks/useTheme';
import { MaterialIcons } from '@expo/vector-icons';
import {
  getAdminAttendanceSummary,
  getAdminAttendanceRecords,
  AdminSummaryPeriod,
  AdminRecordStatus,
} from '@/services/attendanceService';

const PERIODS: { label: string; value: AdminSummaryPeriod }[] = [
  { label: 'Today', value: 'today' },
  { label: 'This Week', value: 'week' },
  { label: 'This Month', value: 'month' },
];

const STATUS_FILTERS: { label: string; value: AdminRecordStatus }[] = [
  { label: 'All', value: 'all' },
  { label: 'Checked In', value: 'checked-in' },
  { label: 'Checked Out', value: 'checked-out' },
];

export default function AdminAttendanceScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [period, setPeriod] = useState<AdminSummaryPeriod>('today');
  const [status, setStatus] = useState<AdminRecordStatus>('all');
  const [refreshing, setRefreshing] = useState(false);

  const {
    data: summary,
    error: summaryError,
    isLoading: summaryLoading,
    mutate: mutateSummary,
  } = useSWR(['admin-att-summary', period], () => getAdminAttendanceSummary(period), {
    revalidateOnFocus: true,
  });

  const from = summary?.fromDate?.slice(0, 10);
  const to = summary?.toDate?.slice(0, 10);

  const {
    data: records,
    error: recordsError,
    isLoading: recordsLoading,
    mutate: mutateRecords,
  } = useSWR(
    from && to ? ['admin-att-records', from, to, status] : null,
    () => getAdminAttendanceRecords({ from: from!, to: to!, status, limit: 100 }),
    { revalidateOnFocus: true }
  );

  useFocusEffect(
    useCallback(() => {
      mutateSummary();
      mutateRecords();
    }, [mutateSummary, mutateRecords])
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([mutateSummary(), mutateRecords()]);
    setRefreshing(false);
  }, [mutateSummary, mutateRecords]);

  const formatTime = (iso: string | null) => {
    if (!iso) return '--';
    const d = new Date(iso);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const formatDuration = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const stats = summary?.summary;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <Text style={styles.headerTitle}>Attendance</Text>
        <Text style={styles.headerSubtitle}>Employee attendance overview</Text>
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

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
      >
        {/* Stats */}
        {summaryLoading && !summary ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 32 }} />
        ) : summaryError ? (
          <View style={[styles.errorBox, { backgroundColor: colors.error + '15' }]}>
            <MaterialIcons name="error-outline" size={20} color={colors.error} />
            <Text style={[styles.errorText, { color: colors.error }]}>
              {summaryError.message ?? 'Failed to load summary'}
            </Text>
          </View>
        ) : stats ? (
          <View style={styles.statsGrid}>
            <StatCard
              icon="groups"
              label="Employees"
              value={String(stats.totalEmployees)}
              color={colors.secondary}
              colors={colors}
            />
            <StatCard
              icon="login"
              label="Checked In"
              value={String(stats.currentlyCheckedIn)}
              color={colors.success}
              colors={colors}
            />
            <StatCard
              icon="schedule"
              label="Total Hours"
              value={stats.totalFormatted}
              color={colors.primary}
              colors={colors}
            />
          </View>
        ) : null}

        {/* Status filter */}
        <View style={styles.statusRow}>
          {STATUS_FILTERS.map((f) => {
            const active = status === f.value;
            return (
              <TouchableOpacity
                key={f.value}
                onPress={() => setStatus(f.value)}
                activeOpacity={0.7}
                style={[
                  styles.statusChip,
                  {
                    backgroundColor: active ? colors.primary + '15' : 'transparent',
                    borderColor: active ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text style={[styles.statusChipText, { color: active ? colors.primary : colors.textSecondary }]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Records */}
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          Records {records ? `(${records.pagination.total})` : ''}
        </Text>

        {recordsLoading && !records ? (
          <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 24 }} />
        ) : recordsError ? (
          <View style={[styles.errorBox, { backgroundColor: colors.error + '15' }]}>
            <MaterialIcons name="error-outline" size={20} color={colors.error} />
            <Text style={[styles.errorText, { color: colors.error }]}>
              {recordsError.message ?? 'Failed to load records'}
            </Text>
          </View>
        ) : records && records.records.length === 0 ? (
          <View style={styles.emptyBox}>
            <MaterialIcons name="event-busy" size={40} color={colors.textTertiary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No records for this period</Text>
          </View>
        ) : (
          records?.records.map((rec) => {
            const checkedIn = rec.status === 'checked-in';
            const duration = checkedIn ? rec.liveDurationMinutes : rec.durationMinutes;
            return (
              <TouchableOpacity
                key={rec._id}
                activeOpacity={0.8}
                onPress={() =>
                  router.push({
                    pathname: '/admin-attendance-detail',
                    params: { employeeId: rec.userId, name: rec.userName, email: rec.userEmail, period },
                  })
                }
                style={[styles.recordCard, { backgroundColor: colors.card.background, borderColor: colors.border }]}
              >
                <View style={styles.recordTop}>
                  <Text style={[styles.recordName, { color: colors.textPrimary }]} numberOfLines={1}>
                    {rec.userName}
                  </Text>
                  <View
                    style={[
                      styles.badge,
                      { backgroundColor: (checkedIn ? colors.success : colors.textTertiary) + '15' },
                    ]}
                  >
                    <View
                      style={[styles.dot, { backgroundColor: checkedIn ? colors.success : colors.textTertiary }]}
                    />
                    <Text style={[styles.badgeText, { color: checkedIn ? colors.success : colors.textTertiary }]}>
                      {checkedIn ? 'Checked In' : 'Checked Out'}
                    </Text>
                  </View>
                </View>

                <Text style={[styles.recordEmail, { color: colors.textTertiary }]} numberOfLines={1}>
                  {rec.userEmail}
                </Text>

                <View style={styles.recordMeta}>
                  <MetaItem icon="login" text={formatTime(rec.checkInTime)} colors={colors} />
                  <MetaItem icon="logout" text={formatTime(rec.checkOutTime)} colors={colors} />
                  <MetaItem icon="timer" text={formatDuration(duration)} colors={colors} />
                </View>
                <Text style={[styles.recordDate, { color: colors.textTertiary }]}>{rec.checkInDate}</Text>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
  colors,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  value: string;
  color: string;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  return (
    <View style={[styles.statCard, { backgroundColor: colors.card.background, borderColor: colors.border }]}>
      <View style={[styles.statIcon, { backgroundColor: color + '15' }]}>
        <MaterialIcons name={icon} size={20} color={color} />
      </View>
      <Text style={[styles.statValue, { color: colors.textPrimary }]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

function MetaItem({
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
  header: { paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20 },
  headerTitle: { color: 'white', fontSize: 24, fontWeight: '700' },
  headerSubtitle: { color: 'rgba(255,255,255,0.85)', fontSize: 14, marginTop: 4 },

  periodRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 16 },
  periodChip: { flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1, alignItems: 'center' },
  periodChipText: { fontSize: 13, fontWeight: '600' },

  body: { flex: 1 },
  bodyContent: { padding: 16, paddingBottom: 32 },

  statsGrid: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard: { flex: 1, borderWidth: 1, borderRadius: 12, padding: 12, alignItems: 'flex-start' },
  statIcon: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statValue: { fontSize: 18, fontWeight: '700' },
  statLabel: { fontSize: 12, marginTop: 2 },

  statusRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statusChip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16, borderWidth: 1 },
  statusChipText: { fontSize: 12, fontWeight: '600' },

  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 10 },

  recordCard: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 10 },
  recordTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  recordName: { fontSize: 15, fontWeight: '600', flex: 1, marginRight: 8 },
  recordEmail: { fontSize: 12, marginTop: 2 },
  recordMeta: { flexDirection: 'row', gap: 16, marginTop: 10 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 13 },
  recordDate: { fontSize: 11, marginTop: 8 },

  badge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 11, fontWeight: '600' },

  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 8, marginBottom: 16 },
  errorText: { fontSize: 13, flex: 1 },
  emptyBox: { alignItems: 'center', paddingVertical: 32 },
  emptyText: { fontSize: 14, marginTop: 10 },
});
