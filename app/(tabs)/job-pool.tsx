import { useEffect, useState, useCallback } from 'react';
import { StyleSheet, FlatList, View, Text, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { fetchJobPoolListings, Job } from '@/services/jobPoolService';

export default function JobPoolScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const loadJobs = useCallback(async (pageNum: number, refresh = false) => {
    try {
      const response = await fetchJobPoolListings(pageNum);
      const { jobs: newJobs, pagination } = response.data;
      setJobs((prev) => (refresh ? newJobs : [...prev, ...newJobs]));
      setHasMore(pagination.hasMore);
      setPage(pageNum);
      setError(null);
    } catch (err: any) {
      setError(err.message ?? 'Failed to load jobs');
    }
  }, []);

  useEffect(() => {
    loadJobs(1, true).finally(() => setLoading(false));
  }, [loadJobs]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadJobs(1, true);
    setRefreshing(false);
  }, [loadJobs]);

  const handleLoadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    await loadJobs(page + 1);
    setLoadingMore(false);
  }, [loadingMore, hasMore, page, loadJobs]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTime = (time: string) => {
    const [h, m] = time.split(':');
    const hour = parseInt(h, 10);
    const suffix = hour >= 12 ? 'PM' : 'AM';
    const display = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${display}:${m} ${suffix}`;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <Text style={styles.headerTitle}>Job Pool</Text>
        <Text style={styles.headerSubtitle}>Find your next opportunity</Text>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <MaterialIcons name="error-outline" size={48} color={colors.error} />
          <Text style={[styles.errorText, { color: colors.textSecondary }]}>{error}</Text>
        </View>
      ) : jobs.length === 0 ? (
        <View style={styles.centered}>
          <MaterialIcons name="work-off" size={48} color={colors.textTertiary} />
          <Text style={[styles.errorText, { color: colors.textSecondary }]}>No jobs available</Text>
        </View>
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={(item) => item._id}
          style={styles.jobList}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator size="small" color={colors.primary} style={{ paddingVertical: 20 }} />
            ) : null
          }
          renderItem={({ item: job }) => (
            <View style={[styles.jobCard, { backgroundColor: colors.card.background }]}>
              <View style={styles.jobCardHeader}>
                <View style={styles.jobInfo}>
                  <Text style={[styles.jobTitle, { color: colors.textPrimary }]}>{job.title}</Text>
                  <Text style={[styles.postedBy, { color: colors.textSecondary }]}>
                    Posted by {job.posted_by_name}
                  </Text>
                </View>
                <View style={[styles.payBadge, { backgroundColor: colors.success + '15' }]}>
                  <Text style={[styles.payText, { color: colors.success }]}>${job.pay_rate}/hr</Text>
                </View>
              </View>

              <Text
                style={[styles.description, { color: colors.textSecondary }]}
                numberOfLines={2}
              >
                {job.description}
              </Text>

              <View style={styles.detailsRow}>
                <View style={styles.detailItem}>
                  <MaterialIcons name="location-pin" size={14} color={colors.textTertiary} />
                  <Text style={[styles.detailText, { color: colors.textSecondary }]}>{job.location}</Text>
                </View>
                <View style={styles.detailItem}>
                  <MaterialIcons name="calendar-today" size={14} color={colors.textTertiary} />
                  <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                    {formatDate(job.job_date)}
                  </Text>
                </View>
              </View>

              <View style={styles.detailsRow}>
                <View style={styles.detailItem}>
                  <Feather name="clock" size={14} color={colors.textTertiary} />
                  <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                    {formatTime(job.start_time)} - {formatTime(job.end_time)}
                  </Text>
                </View>
              </View>

              {job.requirements ? (
                <View style={[styles.requirementsBadge, { backgroundColor: colors.info + '10' }]}>
                  <MaterialIcons name="verified" size={14} color={colors.info} />
                  <Text style={[styles.requirementsText, { color: colors.info }]} numberOfLines={1}>
                    {job.requirements}
                  </Text>
                </View>
              ) : null}

              <TouchableOpacity
                style={[styles.applyBtn, { backgroundColor: colors.primary }]}
                activeOpacity={0.8}
                onPress={() => router.push({ pathname: '/job-detail', params: { id: job._id } })}
              >
                <Text style={styles.applyBtnText}>View Details</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  errorText: {
    fontSize: 15,
    textAlign: 'center',
  },
  jobList: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  jobCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  jobCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  jobInfo: {
    flex: 1,
    marginRight: 12,
  },
  jobTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  postedBy: {
    fontSize: 13,
    fontWeight: '500',
  },
  payBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  payText: {
    fontSize: 14,
    fontWeight: '700',
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  detailsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 12,
    fontWeight: '500',
  },
  requirementsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 4,
    marginBottom: 12,
  },
  requirementsText: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  applyBtn: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  applyBtnText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});
