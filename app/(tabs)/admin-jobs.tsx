import { useState, useCallback } from 'react';
import {
  StyleSheet,
  FlatList,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import useSWRInfinite from 'swr/infinite';
import { fetchAdminJobs, AdminJobStatus } from '@/services/jobPoolService';

const PAGE_SIZE = 20;

const STATUS_FILTERS: { label: string; value: AdminJobStatus }[] = [
  { label: 'All', value: 'all' },
  { label: 'Open', value: '1' },
  { label: 'Filled', value: '2' },
  { label: 'Pending Approval', value: '4' },
  { label: 'Cancelled', value: '3' },
];

export default function AdminJobsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<AdminJobStatus>('all');

  const { data, error, size, setSize, isLoading, isValidating, mutate } = useSWRInfinite(
    (index, prev) => {
      if (prev && !prev.data.pagination.hasMore) return null;
      return ['admin-jobs', index + 1, PAGE_SIZE, statusFilter] as const;
    },
    ([, page, limit, status]) => fetchAdminJobs(page, limit, status),
    { revalidateOnFocus: true, revalidateFirstPage: false }
  );

  const jobs = data ? data.flatMap((page) => page.data.jobs) : [];
  const lastPage = data ? data[data.length - 1] : null;
  const hasMore = lastPage?.data.pagination.hasMore ?? true;
  const totalJobs = lastPage?.data.pagination.total ?? 0;
  const loadingMore = isValidating && size > 1 && data && size > data.length;

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

  const handleLoadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    setSize(size + 1);
  }, [loadingMore, hasMore, size, setSize]);

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

  const getStatusColor = (status: number) => {
    switch (status) {
      case 1: // Open
        return colors.success;
      case 2: // Filled
        return colors.warning;
      case 3: // Cancelled
        return colors.error;
      case 4: // Pending Approval
        return colors.info;
      default:
        return colors.textTertiary;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <Text style={styles.headerTitle}>Manage Jobs</Text>
        <Text style={styles.headerSubtitle}>
          {totalJobs} {totalJobs === 1 ? 'job' : 'jobs'} total
        </Text>
      </View>

      {/* Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtersContainer}
        contentContainerStyle={styles.filtersContent}
      >
        {STATUS_FILTERS.map((filter) => {
          const active = statusFilter === filter.value;
          return (
            <TouchableOpacity
              key={filter.value}
              onPress={() => setStatusFilter(filter.value)}
              style={[
                styles.filterChip,
                {
                  backgroundColor: active ? colors.primary : colors.card.background,
                  borderColor: active ? colors.primary : colors.border,
                },
              ]}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.filterChipText,
                  { color: active ? 'white' : colors.textSecondary },
                ]}
              >
                {filter.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Content */}
      {isLoading && jobs.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error && jobs.length === 0 ? (
        <View style={styles.centered}>
          <MaterialIcons name="error-outline" size={48} color={colors.error} />
          <Text style={[styles.errorText, { color: colors.textSecondary }]}>
            {error.message ?? 'Failed to load jobs'}
          </Text>
        </View>
      ) : jobs.length === 0 ? (
        <View style={styles.centered}>
          <MaterialIcons name="work-off" size={48} color={colors.textTertiary} />
          <Text style={[styles.errorText, { color: colors.textSecondary }]}>
            No jobs found
          </Text>
        </View>
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={(item) => item._id}
          style={styles.jobList}
          contentContainerStyle={styles.jobListContent}
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
          renderItem={({ item: job }) => {
            const statusColor = getStatusColor(job.status);
            return (
              <TouchableOpacity
                style={[styles.jobCard, { backgroundColor: colors.card.background }]}
                activeOpacity={0.8}
                onPress={() => router.push({ pathname: '/admin-job-detail', params: { id: job._id } })}
              >
                <View style={styles.jobCardHeader}>
                  <Text style={[styles.jobTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                    {job.title}
                  </Text>
                  <View style={[styles.statusBadge, { backgroundColor: statusColor + '15' }]}>
                    <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                    <Text style={[styles.statusText, { color: statusColor }]}>
                      {job.status_label ?? '—'}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailsRow}>
                  <View style={styles.detailItem}>
                    <MaterialIcons name="location-pin" size={14} color={colors.textTertiary} />
                    <Text style={[styles.detailText, { color: colors.textSecondary }]} numberOfLines={1}>
                      {job.location}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailsRow}>
                  <View style={styles.detailItem}>
                    <MaterialIcons name="calendar-today" size={14} color={colors.textTertiary} />
                    <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                      {formatDate(job.job_date)}
                    </Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Feather name="clock" size={14} color={colors.textTertiary} />
                    <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                      {formatTime(job.start_time)} - {formatTime(job.end_time)}
                    </Text>
                  </View>
                </View>

                <View style={styles.footerRow}>
                  <View style={[styles.payBadge, { backgroundColor: colors.success + '15' }]}>
                    <Text style={[styles.payText, { color: colors.success }]}>${job.pay_rate ?? 0}/hr</Text>
                  </View>
                  {job.accepted_by_name ? (
                    <View style={styles.acceptedRow}>
                      <MaterialIcons name="check-circle" size={14} color={colors.success} />
                      <Text style={[styles.acceptedText, { color: colors.textSecondary }]} numberOfLines={1}>
                        {job.accepted_by_name}
                      </Text>
                    </View>
                  ) : (
                    <Text style={[styles.unassignedText, { color: colors.textTertiary }]}>Unassigned</Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 24,
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
    color: 'rgba(255,255,255,0.85)',
  },
  filtersContainer: {
    maxHeight: 60,
  },
  filtersContent: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
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
  },
  jobListContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 20,
  },
  jobCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  jobCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 8,
  },
  jobTitle: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  detailsRow: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 6,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  detailText: {
    fontSize: 12,
    fontWeight: '500',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  payBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  payText: {
    fontSize: 13,
    fontWeight: '700',
  },
  acceptedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 1,
  },
  acceptedText: {
    fontSize: 12,
    fontWeight: '600',
    maxWidth: 140,
  },
  unassignedText: {
    fontSize: 12,
    fontWeight: '500',
    fontStyle: 'italic',
  },
});
