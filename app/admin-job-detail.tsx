import { useState } from 'react';
import { StyleSheet, ScrollView, View, Text, TouchableOpacity, ActivityIndicator, Linking, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import useSWR, { mutate as globalMutate } from 'swr';
import { fetchAdminJobDetail, releaseJob, assignJob, approveJob, Employee } from '@/services/jobPoolService';
import { SWR_KEYS } from '@/services/swrKeys';
import EmployeePickerModal from '@/components/EmployeePickerModal';

export default function AdminJobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { data, error, isLoading, mutate } = useSWR(
    id ? SWR_KEYS.adminJobDetail(id) : null,
    () => fetchAdminJobDetail(id!),
    { revalidateOnFocus: true }
  );
  const job = data?.data.job ?? null;
  const employee = data?.data.acceptedEmployee ?? null;
  const loading = isLoading;
  const [releasing, setReleasing] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [approving, setApproving] = useState(false);

  const handleApprove = () => {
    if (!id) return;
    Alert.alert(
      'Approve Job',
      'Are you sure you want to approve this job? It will become open for caregivers to accept.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            setApproving(true);
            try {
              const response = await approveJob(id);
              console.log('Approve Job Response:', JSON.stringify(response, null, 2));
              mutate();
              globalMutate((key) => Array.isArray(key) && key[0] === 'admin-jobs');
            } catch (err: any) {
              if (err.message === 'SESSION_EXPIRED') return;
              Alert.alert('Error', err.message ?? 'Failed to approve job');
            } finally {
              setApproving(false);
            }
          },
        },
      ]
    );
  };

  const handleSelectEmployee = async (employee: Employee) => {
    if (!id) return;
    setAssigning(true);
    try {
      const response = await assignJob(id, employee._id);
      console.log('Assign Job Response:', JSON.stringify(response, null, 2));
      mutate();
      globalMutate((key) => Array.isArray(key) && key[0] === 'admin-jobs');
      setPickerOpen(false);
    } catch (err: any) {
      if (err.message === 'SESSION_EXPIRED') return;
      Alert.alert('Error', err.message ?? 'Failed to assign job');
    } finally {
      setAssigning(false);
    }
  };

  const handleRelease = () => {
    if (!id) return;
    Alert.alert(
      'Release Job',
      'Are you sure you want to release this job? The assigned caregiver will be unassigned and the job will become open again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Release',
          style: 'destructive',
          onPress: async () => {
            setReleasing(true);
            try {
              const response = await releaseJob(id);
              console.log('Release Job Response:', JSON.stringify(response, null, 2));
              // Revalidate detail + list
              mutate();
              globalMutate((key) => Array.isArray(key) && key[0] === 'admin-jobs');
            } catch (err: any) {
              if (err.message === 'SESSION_EXPIRED') return;
              Alert.alert('Error', err.message ?? 'Failed to release job');
            } finally {
              setReleasing(false);
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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
    if (endMinutes <= startMinutes) endMinutes += 24 * 60;
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

  const status = getStatusInfo(job.status);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.primary, paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBack}>
          <MaterialIcons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>Job Details</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{
          paddingBottom: insets.bottom + ([1, 2, 4].includes(job.status) ? 100 : 20),
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Title & Status */}
        <View style={[styles.card, { backgroundColor: colors.card.background }]}>
          <View style={styles.titleRow}>
            <Text style={[styles.jobTitle, { color: colors.textPrimary }]}>{job.title}</Text>
            <View style={[styles.statusBadge, { backgroundColor: status.color + '15' }]}>
              <View style={[styles.statusDot, { backgroundColor: status.color }]} />
              <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
            </View>
          </View>
          {job.posted_by_name ? (
            <View style={styles.postedRow}>
              <MaterialIcons name="person" size={16} color={colors.textTertiary} />
              <Text style={[styles.postedBy, { color: colors.textSecondary }]}>Posted by {job.posted_by_name}</Text>
            </View>
          ) : null}
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

        {/* Assignee */}
        {employee ? (
          <View style={[styles.assigneeCard, { backgroundColor: colors.info + '12', borderColor: colors.info + '40' }]}>
            <View style={styles.acceptedHeader}>
              <MaterialIcons name="assignment-ind" size={20} color={colors.info} />
              <Text style={[styles.sectionTitle, { color: colors.info, marginBottom: 0 }]}>Assigned Caregiver</Text>
            </View>

            {/* Employee header — avatar + name */}
            <View style={styles.employeeHeader}>
              <View style={[styles.avatar, { backgroundColor: colors.info + '25' }]}>
                <Text style={[styles.avatarText, { color: colors.info }]}>
                  {(employee.first_name.charAt(0) + employee.last_name.charAt(0)).toUpperCase()}
                </Text>
              </View>
              <View style={styles.employeeHeaderText}>
                <Text style={[styles.employeeName, { color: colors.textPrimary }]} numberOfLines={1}>
                  {employee.first_name} {employee.last_name}
                </Text>
                <Text style={[styles.employeeCode, { color: colors.textSecondary }]} numberOfLines={1}>
                  {employee.emp_code}
                </Text>
              </View>
            </View>

            {/* Contact actions */}
            <View style={styles.contactRow}>
              <TouchableOpacity
                style={[styles.contactBtn, { backgroundColor: colors.success + '15' }]}
                onPress={() => Linking.openURL(`tel:${employee.cell || employee.phone}`)}
                activeOpacity={0.8}
              >
                <MaterialIcons name="call" size={16} color={colors.success} />
                <Text style={[styles.contactBtnText, { color: colors.success }]}>Call</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.contactBtn, { backgroundColor: colors.info + '15' }]}
                onPress={() => Linking.openURL(`sms:${employee.cell || employee.phone}`)}
                activeOpacity={0.8}
              >
                <MaterialIcons name="sms" size={16} color={colors.info} />
                <Text style={[styles.contactBtnText, { color: colors.info }]}>SMS</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.contactBtn, { backgroundColor: colors.primary + '15' }]}
                onPress={() => Linking.openURL(`mailto:${employee.email}`)}
                activeOpacity={0.8}
              >
                <MaterialIcons name="email" size={16} color={colors.primary} />
                <Text style={[styles.contactBtnText, { color: colors.primary }]}>Email</Text>
              </TouchableOpacity>
            </View>

            {/* Contact info */}
            <View style={styles.infoRow}>
              <MaterialIcons name="email" size={18} color={colors.info} style={styles.infoIcon} />
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: colors.textTertiary }]}>Email</Text>
                <Text style={[styles.infoValue, { color: colors.textPrimary }]} selectable>{employee.email}</Text>
              </View>
            </View>

            {employee.cell ? (
              <View style={styles.infoRow}>
                <MaterialIcons name="phone-iphone" size={18} color={colors.info} style={styles.infoIcon} />
                <View style={styles.infoContent}>
                  <Text style={[styles.infoLabel, { color: colors.textTertiary }]}>Cell</Text>
                  <Text style={[styles.infoValue, { color: colors.textPrimary }]} selectable>{employee.cell}</Text>
                </View>
              </View>
            ) : null}

            {employee.phone ? (
              <View style={styles.infoRow}>
                <MaterialIcons name="phone" size={18} color={colors.info} style={styles.infoIcon} />
                <View style={styles.infoContent}>
                  <Text style={[styles.infoLabel, { color: colors.textTertiary }]}>Phone</Text>
                  <Text style={[styles.infoValue, { color: colors.textPrimary }]} selectable>{employee.phone}</Text>
                </View>
              </View>
            ) : null}

            {job.accepted_at ? (
              <View style={[styles.infoRow, styles.infoRowLast]}>
                <MaterialIcons name="event-available" size={18} color={colors.info} style={styles.infoIcon} />
                <View style={styles.infoContent}>
                  <Text style={[styles.infoLabel, { color: colors.textTertiary }]}>Accepted On</Text>
                  <Text style={[styles.infoValue, { color: colors.textPrimary }]}>
                    {formatDateTime(job.accepted_at)} ({formatRelativeTime(job.accepted_at)})
                  </Text>
                </View>
              </View>
            ) : null}
          </View>
        ) : (
          <View style={[styles.assigneeCard, { backgroundColor: colors.backgroundAlt, borderColor: colors.border }]}>
            <View style={styles.acceptedHeader}>
              <MaterialIcons name="person-outline" size={20} color={colors.textTertiary} />
              <Text style={[styles.sectionTitle, { color: colors.textTertiary, marginBottom: 0 }]}>Unassigned</Text>
            </View>
            <Text style={[styles.bodyText, { color: colors.textSecondary }]}>
              No caregiver has accepted this job yet.
            </Text>
          </View>
        )}

        {/* Earnings Summary */}
        <View style={[styles.card, { backgroundColor: colors.card.background }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Compensation</Text>
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
              <Text style={[styles.earningsLabel, { color: colors.textTertiary }]}>Total Cost</Text>
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
            <MaterialIcons name="calendar-today" size={18} color={colors.primary} style={styles.infoIcon} />
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: colors.textTertiary }]}>Date</Text>
              <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{formatDate(job.job_date)}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Feather name="clock" size={18} color={colors.primary} style={styles.infoIcon} />
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: colors.textTertiary }]}>Time</Text>
              <Text style={[styles.infoValue, { color: colors.textPrimary }]}>
                {formatTime(job.start_time)} - {formatTime(job.end_time)} ({calculateShiftHours(job.start_time, job.end_time)}h)
              </Text>
            </View>
          </View>

          <View style={[styles.infoRow, styles.infoRowLast]}>
            <MaterialIcons name="location-pin" size={18} color={colors.primary} style={styles.infoIcon} />
            <View style={styles.infoContent}>
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

      </ScrollView>

      {/* Bottom Action */}
      {job.status === 1 ? (
        <View style={[styles.bottomBar, { backgroundColor: colors.background, borderTopColor: colors.border, paddingBottom: insets.bottom + 12 }]}>
          <TouchableOpacity
            style={[styles.releaseBtn, { backgroundColor: colors.primary }]}
            activeOpacity={0.8}
            onPress={() => setPickerOpen(true)}
          >
            <MaterialIcons name="person-add" size={18} color="white" />
            <Text style={styles.releaseBtnText}>Assign to Employee</Text>
          </TouchableOpacity>
        </View>
      ) : job.status === 2 ? (
        <View style={[styles.bottomBar, { backgroundColor: colors.background, borderTopColor: colors.border, paddingBottom: insets.bottom + 12 }]}>
          <TouchableOpacity
            style={[styles.releaseBtn, { backgroundColor: releasing ? colors.disabled : colors.error }]}
            activeOpacity={0.8}
            onPress={handleRelease}
            disabled={releasing}
          >
            {releasing ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <MaterialIcons name="person-remove" size={18} color="white" />
                <Text style={styles.releaseBtnText}>Release Job</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      ) : job.status === 4 ? (
        <View style={[styles.bottomBar, { backgroundColor: colors.background, borderTopColor: colors.border, paddingBottom: insets.bottom + 12 }]}>
          <TouchableOpacity
            style={[styles.releaseBtn, { backgroundColor: approving ? colors.disabled : colors.success }]}
            activeOpacity={0.8}
            onPress={handleApprove}
            disabled={approving}
          >
            {approving ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <MaterialIcons name="check-circle" size={18} color="white" />
                <Text style={styles.releaseBtnText}>Approve Job</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      ) : null}

      <EmployeePickerModal
        visible={pickerOpen}
        onClose={() => !assigning && setPickerOpen(false)}
        onSelect={handleSelectEmployee}
        submitting={assigning}
      />
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
  assigneeCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  jobTitle: { fontSize: 20, fontWeight: '700', flex: 1, marginRight: 8 },
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
  acceptedHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  employeeHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  employeeHeaderText: { flex: 1, marginLeft: 12, minWidth: 0 },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { fontSize: 18, fontWeight: '700' },
  employeeName: { fontSize: 17, fontWeight: '700', marginBottom: 2 },
  employeeCode: { fontSize: 13, fontWeight: '500' },
  contactRow: { flexDirection: 'row', marginBottom: 16 },
  contactBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    marginHorizontal: 4,
  },
  contactBtnText: { fontSize: 13, fontWeight: '700', marginLeft: 6 },
  earningsRow: { flexDirection: 'row', alignItems: 'center' },
  earningsItem: { flex: 1, alignItems: 'center' },
  earningsDivider: { width: 1, height: 36 },
  earningsLabel: { fontSize: 11, fontWeight: '500', marginBottom: 6, textAlign: 'center' },
  earningsValue: { fontSize: 16, fontWeight: '700' },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  bodyText: { fontSize: 14, lineHeight: 22 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  infoRowLast: { marginBottom: 0 },
  infoIcon: { marginTop: 2, marginRight: 12, width: 18 },
  infoContent: { flex: 1, minWidth: 0 },
  infoLabel: { fontSize: 12, fontWeight: '500' },
  infoValue: { fontSize: 14, fontWeight: '600', marginTop: 2 },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  releaseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  releaseBtnText: { color: 'white', fontSize: 16, fontWeight: '700' },
});
