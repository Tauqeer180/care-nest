import { useCallback, useEffect, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import useSWRInfinite from "swr/infinite";
import { mutate as globalMutate } from "swr";
import { useTheme } from "@/hooks/useTheme";
import { MaterialIcons } from "@expo/vector-icons";
import { SWR_KEYS } from "@/services/swrKeys";
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  NotificationItem,
} from "@/services/notificationsService";

const PAGE_SIZE = 20;

export default function NotificationsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [refreshing, setRefreshing] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  const { data, error, size, setSize, isLoading, isValidating, mutate } =
    useSWRInfinite(
      (index, prev) => {
        if (prev && prev.pagination.page >= prev.pagination.totalPages) return null;
        return SWR_KEYS.notifications(index + 1, PAGE_SIZE);
      },
      ([, page, limit]) => getNotifications(page, limit),
      { revalidateOnFocus: true, revalidateFirstPage: true }
    );

  const notifications = data ? data.flatMap((p) => p.notifications) : [];
  const lastPage = data ? data[data.length - 1] : null;
  const unreadCount = data?.[0]?.unreadCount ?? 0;
  const hasMore = lastPage
    ? lastPage.pagination.page < lastPage.pagination.totalPages
    : false;
  const loadingMore = isValidating && size > 1 && data && size > data.length;

  useEffect(() => {
    console.log(
      "[NOTIF] List =>",
      JSON.stringify(
        { unreadCount, total: notifications.length, notifications },
        null,
        2
      )
    );
  }, [notifications, unreadCount]);

  useFocusEffect(
    useCallback(() => {
      mutate();
    }, [mutate])
  );

  const refreshUnreadBadge = useCallback(() => {
    globalMutate(SWR_KEYS.notificationsUnreadCount());
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await mutate();
    refreshUnreadBadge();
    setRefreshing(false);
  }, [mutate, refreshUnreadBadge]);

  const handleLoadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    setSize(size + 1);
  }, [loadingMore, hasMore, size, setSize]);

  // Maps a notification to the screen it should open, based on type/data.
  const routeFor = useCallback((item: NotificationItem) => {
    const jobId = item.data?.jobId ?? item.data?.job_id;
    switch (item.type) {
      case "NEW_POOL_JOB":
        return jobId
          ? { pathname: "/job-detail" as const, params: { id: String(jobId) } }
          : null;
      default:
        return null;
    }
  }, []);

  const handlePress = useCallback(
    async (item: NotificationItem) => {
      // Navigate first so the tap feels instant.
      const route = routeFor(item);
      if (route) router.push(route);

      if (!item.is_read) {
        // Optimistically flip the read flag across all loaded pages.
        mutate(
          (pages) =>
            pages?.map((p) => ({
              ...p,
              unreadCount: Math.max(0, p.unreadCount - 1),
              notifications: p.notifications.map((n) =>
                n._id === item._id ? { ...n, is_read: true } : n
              ),
            })),
          { revalidate: false }
        );
        try {
          await markNotificationRead(item._id);
          refreshUnreadBadge();
        } catch (err: any) {
          if (err.message !== "SESSION_EXPIRED") mutate();
        }
      }
    },
    [routeFor, router, mutate, refreshUnreadBadge]
  );

  const handleMarkAll = useCallback(async () => {
    if (unreadCount === 0 || markingAll) return;
    setMarkingAll(true);
    // Optimistic: mark everything read locally.
    mutate(
      (pages) =>
        pages?.map((p) => ({
          ...p,
          unreadCount: 0,
          notifications: p.notifications.map((n) => ({ ...n, is_read: true })),
        })),
      { revalidate: false }
    );
    try {
      await markAllNotificationsRead();
      refreshUnreadBadge();
    } catch (err: any) {
      if (err.message !== "SESSION_EXPIRED") mutate();
    } finally {
      setMarkingAll(false);
    }
  }, [unreadCount, markingAll, mutate, refreshUnreadBadge]);

  const iconFor = (type: string): keyof typeof MaterialIcons.glyphMap => {
    switch (type) {
      case "NEW_POOL_JOB":
        return "work";
      case "LEAVE":
        return "event-note";
      case "ATTENDANCE":
        return "access-time";
      default:
        return "notifications";
    }
  };

  const formatWhen = (iso: string) => {
    const then = new Date(iso).getTime();
    const diff = Date.now() - then;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.primary, paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBack}>
          <MaterialIcons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={{ width: 32 }} />
      </View>

      {unreadCount > 0 && (
        <View style={[styles.markAllBar, { borderBottomColor: colors.border }]}>
          <Text style={[styles.unreadText, { color: colors.textSecondary }]}>
            {unreadCount} unread
          </Text>
          <TouchableOpacity onPress={handleMarkAll} disabled={markingAll} activeOpacity={0.7}>
            {markingAll ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text style={[styles.markAllText, { color: colors.primary }]}>Mark all read</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {isLoading && notifications.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error && notifications.length === 0 ? (
        <View style={styles.centered}>
          <MaterialIcons name="error-outline" size={48} color={colors.error} />
          <Text style={[styles.muted, { color: colors.textSecondary }]}>
            {error.message ?? "Failed to load notifications"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item._id}
          contentContainerStyle={[
            notifications.length === 0 ? styles.flexGrow : styles.content,
            { paddingBottom: insets.bottom + 24 },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <MaterialIcons name="notifications-none" size={48} color={colors.textTertiary} />
              <Text style={[styles.muted, { color: colors.textSecondary }]}>No notifications yet</Text>
            </View>
          }
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator size="small" color={colors.primary} style={{ paddingVertical: 20 }} />
            ) : null
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => handlePress(item)}
              style={[
                styles.card,
                {
                  backgroundColor: item.is_read ? colors.card.background : colors.primary + "0D",
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={[styles.iconWrap, { backgroundColor: colors.primary + "15" }]}>
                <MaterialIcons name={iconFor(item.type)} size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.titleRow}>
                  <Text
                    style={[
                      styles.title,
                      { color: colors.textPrimary, fontWeight: item.is_read ? "600" : "700" },
                    ]}
                    numberOfLines={1}
                  >
                    {item.title}
                  </Text>
                  {!item.is_read && <View style={[styles.dot, { backgroundColor: colors.primary }]} />}
                </View>
                {!!item.body && (
                  <Text style={[styles.body, { color: colors.textSecondary }]} numberOfLines={2}>
                    {item.body}
                  </Text>
                )}
                <Text style={[styles.when, { color: colors.textTertiary }]}>
                  {formatWhen(item.created_at)}
                </Text>
              </View>
            </TouchableOpacity>
          )}
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

  markAllBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  unreadText: { fontSize: 13, fontWeight: "500" },
  markAllText: { fontSize: 13, fontWeight: "700" },

  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 },
  flexGrow: { flexGrow: 1 },
  muted: { fontSize: 14, textAlign: "center" },
  content: { padding: 16 },
  emptyBox: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },

  card: {
    flexDirection: "row",
    gap: 12,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  iconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { fontSize: 15, flex: 1 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  body: { fontSize: 13, marginTop: 3, lineHeight: 18 },
  when: { fontSize: 12, marginTop: 6 },
});
