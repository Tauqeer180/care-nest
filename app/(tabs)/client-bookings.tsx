import { useTheme } from '@/hooks/useTheme';
import {
  BOOKING_SOURCE_FILTERS,
  BOOKING_SOURCE_LABELS,
  BookingSourceFilter,
  ClientBooking,
  bookingKey,
  employeeName,
  fetchClientBookings,
  hasMorePages,
} from '@/services/clientBookingService';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import useSWRInfinite from 'swr/infinite';

const PAGE_SIZE = 20;

export default function ClientBookingsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [source, setSource] = useState<BookingSourceFilter>('all');

  const { data, error, size, setSize, isLoading, isValidating, mutate } = useSWRInfinite(
    (index, prev) => {
      if (prev && !hasMorePages(prev.data.pagination)) return null;
      return ['client-bookings', source, index + 1, PAGE_SIZE] as const;
    },
    ([, src, page, limit]) => fetchClientBookings(src, page, limit),
    { revalidateOnFocus: true, revalidateFirstPage: false }
  );

  const bookings = data ? data.flatMap((page) => page.data.bookings) : [];
  const lastPage = data ? data[data.length - 1] : null;
  const hasMore = lastPage ? hasMorePages(lastPage.data.pagination) : true;
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

  // Switching filter starts a fresh feed — without resetting size, SWR would
  // immediately refetch as many pages of the new source as were open on the old.
  const handleSourceChange = useCallback(
    (value: BookingSourceFilter) => {
      if (value === source) return;
      setSource(value);
      setSize(1);
    },
    [source, setSize]
  );

  const handleLoadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    setSize(size + 1);
  }, [loadingMore, hasMore, size, setSize]);

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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

  /** A multi-day booking shows a range; a single-day one shows just the date. */
  const dateRange = (booking: ClientBooking) => {
    const start = formatDate(booking.booking_date);
    const end = formatDate(booking.booking_end_date);
    return end && end !== start ? `${start} – ${end}` : start;
  };

  const timeRange = (booking: ClientBooking) => {
    const start = formatTime(booking.start_time);
    const end = formatTime(booking.end_time);
    if (start && end) return `${start} - ${end}`;
    return start || end;
  };

  const openDetail = (booking: ClientBooking) => {
    // source is required by the detail endpoint and must match the list item.
    router.push({
      pathname: '/client-booking-detail',
      params: { id: booking._id, source: booking.source },
    });
  };

  const renderEmpty = () => {
    if (isLoading) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      );
    }
    if (error) {
      return (
        <View style={styles.centered}>
          <MaterialIcons name="error-outline" size={48} color={colors.error} />
          <Text style={[styles.errorText, { color: colors.textSecondary }]}>
            {error.message ?? 'Failed to load bookings'}
          </Text>
        </View>
      );
    }
    return (
      <View style={styles.centered}>
        <MaterialIcons name="event-busy" size={48} color={colors.textTertiary} />
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>
          {source === 'all' ? 'No bookings yet' : 'No bookings in this category'}
        </Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <Text style={styles.headerTitle}>My Bookings</Text>
        <Text style={styles.headerSubtitle}>Your appointments and services</Text>
      </View>

      {/* Source filter — mirrors the endpoint's source param */}
      <View style={styles.filterWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {BOOKING_SOURCE_FILTERS.map((filter) => {
            const active = source === filter.value;
            return (
              <TouchableOpacity
                key={filter.value}
                activeOpacity={0.8}
                onPress={() => handleSourceChange(filter.value)}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: active ? colors.primary : colors.card.background,
                    borderColor: active ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    { color: active ? colors.button.primaryText : colors.textSecondary },
                  ]}
                >
                  {filter.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {bookings.length === 0 ? (
        renderEmpty()
      ) : (
        <FlatList
          data={bookings}
          // A multi-day booking repeats one _id across dates — see bookingKey().
          keyExtractor={bookingKey}
          style={styles.list}
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
          renderItem={({ item: booking }) => {
            const staff = employeeName(booking.employee);
            return (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => openDetail(booking)}
                style={[styles.card, { backgroundColor: colors.card.background }]}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.cardInfo}>
                    <Text style={[styles.cardTitle, { color: colors.textPrimary }]} numberOfLines={2}>
                      {booking.service_title || 'Service'}
                    </Text>
                    {booking.floor_name ? (
                      <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
                        {booking.floor_name}
                      </Text>
                    ) : null}
                  </View>
                  <View style={[styles.sourceBadge, { backgroundColor: colors.info + '15' }]}>
                    <Text style={[styles.sourceBadgeText, { color: colors.info }]}>
                      {BOOKING_SOURCE_LABELS[booking.source] ?? booking.source}
                    </Text>
                  </View>
                </View>

                {booking.stage_label ? (
                  <View style={[styles.stageBadge, { backgroundColor: colors.primary + '15' }]}>
                    <MaterialIcons name="flag" size={12} color={colors.primary} />
                    <Text style={[styles.stageBadgeText, { color: colors.primary }]}>
                      {booking.stage_label}
                    </Text>
                  </View>
                ) : null}

                <View style={styles.detailsRow}>
                  <View style={styles.detailItem}>
                    <MaterialIcons name="calendar-today" size={14} color={colors.textTertiary} />
                    <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                      {dateRange(booking)}
                    </Text>
                  </View>
                  {timeRange(booking) ? (
                    <View style={styles.detailItem}>
                      <MaterialIcons name="schedule" size={14} color={colors.textTertiary} />
                      <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                        {timeRange(booking)}
                      </Text>
                    </View>
                  ) : null}
                </View>

                {staff ? (
                  <View style={styles.detailsRow}>
                    <View style={styles.detailItem}>
                      <MaterialIcons name="person" size={14} color={colors.textTertiary} />
                      <Text style={[styles.detailText, { color: colors.textSecondary }]}>{staff}</Text>
                    </View>
                  </View>
                ) : null}

                <View style={styles.cardFooter}>
                  <Text style={[styles.viewDetail, { color: colors.link.color }]}>View Details</Text>
                  <MaterialIcons name="chevron-right" size={18} color={colors.link.color} />
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
  filterWrapper: {
    paddingTop: 16,
  },
  filterRow: {
    paddingHorizontal: 20,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
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
  list: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cardInfo: {
    flex: 1,
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13,
    fontWeight: '500',
  },
  sourceBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  sourceBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  stageBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 10,
  },
  stageBadgeText: {
    fontSize: 11,
    fontWeight: '700',
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
    flexShrink: 1,
  },
  detailText: {
    fontSize: 12,
    fontWeight: '500',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 2,
    marginTop: 4,
  },
  viewDetail: {
    fontSize: 13,
    fontWeight: '600',
  },
});
