import { useEffect, useState } from 'react';
import { StyleSheet, ScrollView, View, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { fetchJobDetail, acceptJob, Job } from '@/services/jobPoolService';

export default function JobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const router = useRouter();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetchJobDetail(id)
      .then((response) => {
        console.log('Job Detail API Response:', JSON.stringify(response, null, 2));
        setJob(response.data);
      })
      .catch((err) => {
        setError(err.message ?? 'Failed to load job details');
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleApply = async () => {
    if (!id) return;
    setApplying(true);
    try {
      const response = await acceptJob(id);
      console.log('Accept Job Response:', JSON.stringify(response, null, 2));
      Alert.alert('Success', response.message ?? 'Job application submitted!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: any) {
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
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>{error ?? 'Job not found'}</Text>
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
          <Text style={[styles.jobTitle, { color: colors.textPrimary }]}>{job.title}</Text>
          <View style={styles.postedRow}>
            <MaterialIcons name="person" size={16} color={colors.textTertiary} />
            <Text style={[styles.postedBy, { color: colors.textSecondary }]}>Posted by {job.posted_by_name}</Text>
          </View>
          <View style={[styles.payChip, { backgroundColor: colors.success + '15' }]}>
            <Text style={[styles.payRate, { color: colors.success }]}>${job.pay_rate}/hr</Text>
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
                {formatTime(job.start_time)} - {formatTime(job.end_time)}
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
          style={[styles.applyBtn, { backgroundColor: applying ? colors.disabled : colors.primary }]}
          activeOpacity={0.8}
          onPress={handleApply}
          disabled={applying}
        >
          {applying ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text style={styles.applyBtnText}>Apply for Job</Text>
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
  jobTitle: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  postedRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  postedBy: { fontSize: 14, fontWeight: '500' },
  payChip: { alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 },
  payRate: { fontSize: 18, fontWeight: '700' },
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
