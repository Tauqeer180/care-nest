import { useCallback, useEffect, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import useSWRInfinite from "swr/infinite";
import { useTheme } from "@/hooks/useTheme";
import { MaterialIcons } from "@expo/vector-icons";
import {
  getEmployeeEarningsHistory,
  EarningsRecord,
} from "@/services/dashboardService";

const PAGE_SIZE = 20;

export default function EarningsHistoryScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  const { data, error, size, setSize, isLoading, isValidating, mutate } =
    useSWRInfinite(
      (index, prev) => {
        if (prev && !prev.pagination.hasMore) return null;
        return ["earnings-history", index + 1, PAGE_SIZE] as const;
      },
      ([, page, limit]) => getEmployeeEarningsHistory(page, limit),
      { revalidateOnFocus: true, revalidateFirstPage: false }
    );

  const records = data ? data.flatMap((p) => p.records) : [];
  const summary = data?.[0]?.summary ?? null;
  const lastPage = data ? data[data.length - 1] : null;
  const hasMore = lastPage?.pagination.hasMore ?? false;
  const total = lastPage?.pagination.total ?? 0;
  const loadingMore = isValidating && size > 1 && data && size > data.length;

  useEffect(() => {
    if (data) {
      console.log("Earnings history detail =>", JSON.stringify(data, null, 2));
    }
  }, [data]);

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
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (time: string) => {
    const [h, m] = time.split(":");
    const hour = parseInt(h, 10);
    const suffix = hour >= 12 ? "PM" : "AM";
    const display = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${display}:${m} ${suffix}`;
  };

  const renderHeader = () => (
    <View>
      {summary && (
        <View style={styles.summaryWrap}>
          <View style={styles.summaryRow}>
            <View
              style={[
                styles.summaryCard,
                { backgroundColor: colors.card.background, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.summaryValue, { color: colors.success }]}>
                ${summary.total_earnings}
              </Text>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                Total Earned
              </Text>
            </View>
            <View
              style={[
                styles.summaryCard,
                { backgroundColor: colors.card.background, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.summaryValue, { color: colors.warning }]}>
                ${summary.unpaid_earnings}
              </Text>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                Unpaid
              </Text>
            </View>
          </View>
          <View style={styles.summaryRow}>
            <View
              style={[
                styles.summaryCard,
                { backgroundColor: colors.card.background, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.summaryValue, { color: colors.secondary }]}>
                ${summary.paid_earnings}
              </Text>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                Paid
              </Text>
            </View>
            <View
              style={[
                styles.summaryCard,
                { backgroundColor: colors.card.background, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>
                {summary.total_hours}h
              </Text>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                {summary.total_shifts} shifts
              </Text>
            </View>
          </View>
          <View
            style={[styles.rateBanner, { backgroundColor: colors.primary + "15" }]}
          >
            <MaterialIcons name="payments" size={16} color={colors.primary} />
            <Text style={[styles.rateText, { color: colors.primary }]}>
              Current rate: ${summary.current_hourly_rate}/hr
            </Text>
          </View>
        </View>
      )}
      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
        Records {total ? `(${total})` : ""}
      </Text>
    </View>
  );

  const renderItem = ({ item }: { item: EarningsRecord }) => (
    <View
      style={[
        styles.recordCard,
        { backgroundColor: colors.card.background, borderColor: colors.border },
      ]}
    >
      <View style={styles.recordTop}>
        <Text style={[styles.recordDate, { color: colors.textPrimary }]}>
          {formatDate(item.booking_date)}
        </Text>
        <View
          style={[
            styles.payBadge,
            {
              backgroundColor:
                (item.is_paid ? colors.success : colors.warning) + "15",
            },
          ]}
        >
          <Text
            style={[
              styles.payBadgeText,
              { color: item.is_paid ? colors.success : colors.warning },
            ]}
          >
            {item.is_paid ? "Paid" : "Unpaid"}
          </Text>
        </View>
      </View>

      <View style={styles.recordMeta}>
        <View style={styles.metaItem}>
          <MaterialIcons name="schedule" size={14} color={colors.textTertiary} />
          <Text style={[styles.metaText, { color: colors.textSecondary }]}>
            {formatTime(item.start_time)} - {formatTime(item.end_time)}
          </Text>
        </View>
        <View style={styles.metaItem}>
          <MaterialIcons name="hourglass-bottom" size={14} color={colors.textTertiary} />
          <Text style={[styles.metaText, { color: colors.textSecondary }]}>
            {item.total_hours}h @ ${item.employee_rate}/hr
          </Text>
        </View>
      </View>

      <View style={[styles.recordFooter, { borderTopColor: colors.divider }]}>
        {item.time_label ? (
          <View style={[styles.tag, { backgroundColor: colors.backgroundAlt }]}>
            <Text style={[styles.tagText, { color: colors.textSecondary }]}>
              {item.time_label}
            </Text>
          </View>
        ) : (
          <View />
        )}
        <Text style={[styles.recordEarning, { color: colors.success }]}>
          ${item.total_earning}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { backgroundColor: colors.primary, paddingTop: insets.top + 12 },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBack}>
          <MaterialIcons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Earnings History</Text>
        <View style={{ width: 32 }} />
      </View>

      {isLoading && records.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error && records.length === 0 ? (
        <View style={styles.centered}>
          <MaterialIcons name="error-outline" size={48} color={colors.error} />
          <Text style={[styles.errorText, { color: colors.textSecondary }]}>
            {error.message ?? "Failed to load earnings"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={records}
          keyExtractor={(item, index) => `${item.booking_id}-${item.booking_date}-${index}`}
          renderItem={renderItem}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + 24 },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <MaterialIcons name="receipt-long" size={40} color={colors.textTertiary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No earnings yet
              </Text>
            </View>
          }
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator
                size="small"
                color={colors.primary}
                style={{ paddingVertical: 20 }}
              />
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerBack: { padding: 4, width: 32 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "white", flex: 1, textAlign: "center" },

  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  errorText: { marginTop: 12, fontSize: 15, textAlign: "center" },

  listContent: { padding: 16 },

  summaryWrap: { marginBottom: 16 },
  summaryRow: { flexDirection: "row", gap: 10, marginBottom: 10 },
  summaryCard: { flex: 1, borderWidth: 1, borderRadius: 12, padding: 14, alignItems: "flex-start" },
  summaryValue: { fontSize: 20, fontWeight: "700" },
  summaryLabel: { fontSize: 12, marginTop: 2 },
  rateBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  rateText: { fontSize: 13, fontWeight: "600" },

  sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 10 },

  recordCard: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 10 },
  recordTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  recordDate: { fontSize: 14, fontWeight: "600" },
  recordMeta: { marginTop: 10, gap: 6 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  metaText: { fontSize: 13 },
  recordFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  tagText: { fontSize: 11, fontWeight: "600" },
  recordEarning: { fontSize: 16, fontWeight: "700" },

  payBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  payBadgeText: { fontSize: 11, fontWeight: "700" },

  emptyBox: { alignItems: "center", paddingVertical: 40 },
  emptyText: { fontSize: 14, marginTop: 10 },
});
