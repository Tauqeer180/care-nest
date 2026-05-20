import { useState } from 'react';
import { StyleSheet, ScrollView, View, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import useSWR, { mutate } from 'swr';
import { fetchJobDetail, acceptJob } from '@/services/jobPoolService';
import { SWR_KEYS } from '@/services/swrKeys';

export default function JobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const router = useRouter();
  const [applying, setApplying] = useState(false);

  const { data, error, isLoading } = useSWR(
    id ? SWR_KEYS.jobDetail(id) : null,
    () => fetchJobDetail(id!),
    { revalidateOnFocus: true }
  );
  const job = data?.data ?? null;
  const loading = isLoading;

  const handleApply = async () => {
    if (!id) return;
    setApplying(true);
    try {
      const response = await acceptJob(id);
      console.log('Accept Job Response:', JSON.stringify(response, null, 2));
      // Invalidate job pool list + my jobs list so they refetch on next focus
      mutate((key) => Array.isArray(key) && (key[0] === 'job-pool' || key[0] === 'my-jobs'));
      Alert.alert('Success', response.message ?? 'Job application submitted!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      // Session-expired errors are handled globally — don't show alert
      if (err.message === 'SESSION_EXPIRED') return;
      Alert.alert('Error', err.message ?? 'Failed to apply for job');
    } finally {
      setApplying(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTime = (time: string) => {
    const [h, m] = time.split(':');
    const hour = parseInt(h, 10);
    const suffix = hour >= 12 ? 'PM' : 'AM';
    const display = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${display}:${m} ${suffix}`;
  };

  const calculateShiftHours = (start: string, end: string): number => {
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    let startMinutes = sh * 60 + sm;
    let endMinutes = eh * 60 + em;
    if (endMinutes <= startMinutes) endMinutes += 24 * 60; // overnight shift
    return Math.round(((endMinutes - startMinutes) / 60) * 100) / 100;
  };

  const formatRelativeTime = (dateStr: string): string => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 30) return `${days}d ago`;
    const months = Math.floor(days / 30);
    return `${months}mo ago`;
  };

  const getStatusInfo = (status: number) => {
    switch (status) {
      case 1:
        return { label: 'Open', color: colors.success };
      case 2:
        return { label: 'Filled', color: colors.warning };
      case 3:
        return { label: 'Cancelled', color: colors.error };
      case 4:
        return { label: 'Pending Approval', color: colors.info };
      default:
        return { label: 'Unknown', color: colors.textTertiary };
    }
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error || !job) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <MaterialIcons name="error-outline" size={48} color={colors.error} />
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>{error?.message ?? 'Job not found'}</Text>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.primary }]}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBack}>
          <MaterialIcons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>Job Details</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Title & Pay */}
        <View style={[styles.card, { backgroundColor: colors.card.background }]}>
          <View style={styles.titleRow}>
            <Text style={[styles.jobTitle, { color: colors.textPrimary }]}>{job.title}</Text>
            {(() => {
              const status = getStatusInfo(job.status);
              return (
                <View style={[styles.statusBadge, { backgroundColor: status.color + '15' }]}>
                  <View style={[styles.statusDot, { backgroundColor: status.color }]} />
                  <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
                </View>
              );
            })()}
          </View>
          <View style={styles.postedRow}>
            <MaterialIcons name="person" size={16} color={colors.textTertiary} />
            <Text style={[styles.postedBy, { color: colors.textSecondary }]}>Posted by {job.posted_by_name}</Text>
          </View>
          <View style={styles.postedRow}>
            <Feather name="clock" size={14} color={colors.textTertiary} />
            <Text style={[styles.postedAgo, { color: colors.textTertiary }]}>
              Posted {formatRelativeTime(job.created_date)}
            </Text>
          </View>
          <View style={[styles.payChip, { backgroundColor: colors.success + '15' }]}>
            <Text style={[styles.payRate, { color: colors.success }]}>${job.pay_rate ?? 0}/hr</Text>
          </View>
        </View>

        {/* Earnings Summary */}
        <View style={[styles.card, { backgroundColor: colors.card.background }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Earnings Summary</Text>
          <View style={styles.earningsRow}>
            <View style={styles.earningsItem}>
              <Text style={[styles.earningsLabel, { color: colors.textTertiary }]}>Shift Hours</Text>
              <Text style={[styles.earningsValue, { color: colors.textPrimary }]}>
                {calculateShiftHours(job.start_time, job.end_time)}h
              </Text>
            </View>
            <View style={[styles.earningsDivider, { backgroundColor: colors.divider }]} />
            <View style={styles.earningsItem}>
              <Text style={[styles.earningsLabel, { color: colors.textTertiary }]}>Hourly Rate</Text>
              <Text style={[styles.earningsValue, { color: colors.textPrimary }]}>
                ${job.pay_rate ?? 0}
              </Text>
            </View>
            <View style={[styles.earningsDivider, { backgroundColor: colors.divider }]} />
            <View style={styles.earningsItem}>
              <Text style={[styles.earningsLabel, { color: colors.textTertiary }]}>Estimated Total</Text>
              <Text style={[styles.earningsValue, { color: colors.success }]}>
                ${(calculateShiftHours(job.start_time, job.end_time) * (job.pay_rate ?? 0)).toFixed(2)}
              </Text>
            </View>
          </View>
        </View>

        {/* Description */}
        <View style={[styles.card, { backgroundColor: colors.card.background }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Description</Text>
          <Text style={[styles.bodyText, { color: colors.textSecondary }]}>{job.description}</Text>
        </View>

        {/* Schedule & Location */}
        <View style={[styles.card, { backgroundColor: colors.card.background }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Schedule & Location</Text>

          <View style={styles.infoRow}>
            <MaterialIcons name="calendar-today" size={18} color={colors.primary} />
            <View>
              <Text style={[styles.infoLabel, { color: colors.textTertiary }]}>Date</Text>
              <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{formatDate(job.job_date)}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Feather name="clock" size={18} color={colors.primary} />
            <View>
              <Text style={[styles.infoLabel, { color: colors.textTertiary }]}>Time</Text>
              <Text style={[styles.infoValue, { color: colors.textPrimary }]}>
                {formatTime(job.start_time)} - {formatTime(job.end_time)} ({calculateShiftHours(job.start_time, job.end_time)}h)
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <MaterialIcons name="location-pin" size={18} color={colors.primary} />
            <View>
              <Text style={[styles.infoLabel, { color: colors.textTertiary }]}>Location</Text>
              <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{job.location}</Text>
            </View>
          </View>
        </View>

        {/* Requirements */}
        {job.requirements ? (
          <View style={[styles.card, { backgroundColor: colors.card.background }]}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Requirements</Text>
            <Text style={[styles.bodyText, { color: colors.textSecondary }]}>{job.requirements}</Text>
          </View>
        ) : null}

        {/* Notes */}
        {job.notes ? (
          <View style={[styles.card, { backgroundColor: colors.card.background }]}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Notes</Text>
            <Text style={[styles.bodyText, { color: colors.textSecondary }]}>{job.notes}</Text>
          </View>
        ) : null}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom Action */}
      <View style={[styles.bottomBar, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={[
            styles.applyBtn,
            { backgroundColor: applying || job.status !== 1 ? colors.disabled : colors.primary },
          ]}
          activeOpacity={0.8}
          onPress={handleApply}
          disabled={applying || job.status !== 1}
        >
          {applying ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text style={styles.applyBtnText}>
              {job.status !== 1 ? 'Not Available' : 'Apply for Job'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  errorText: { fontSize: 15, textAlign: 'center' },
  backBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, marginTop: 8 },
  backBtnText: { color: 'white', fontWeight: '600' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerBack: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: 'white' },
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
  jobTitle: { fontSize: 20, fontWeight: '700', flex: 1, marginRight: 8 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 12, fontWeight: '700' },
  postedRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  postedBy: { fontSize: 14, fontWeight: '500' },
  postedAgo: { fontSize: 12, fontWeight: '500' },
  payChip: { alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, marginTop: 8 },
  payRate: { fontSize: 18, fontWeight: '700' },
  earningsRow: { flexDirection: 'row', alignItems: 'center' },
  earningsItem: { flex: 1, alignItems: 'center' },
  earningsDivider: { width: 1, height: 36 },
  earningsLabel: { fontSize: 11, fontWeight: '500', marginBottom: 6, textAlign: 'center' },
  earningsValue: { fontSize: 16, fontWeight: '700' },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  bodyText: { fontSize: 14, lineHeight: 22 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  infoLabel: { fontSize: 12, fontWeight: '500' },
  infoValue: { fontSize: 14, fontWeight: '600', marginTop: 2 },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 34,
    borderTopWidth: 1,
  },
  applyBtn: { paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  applyBtnText: { color: 'white', fontSize: 16, fontWeight: '700' },
});
