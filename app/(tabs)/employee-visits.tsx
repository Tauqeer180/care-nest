import { MaterialIcons } from "@expo/vector-icons";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import useSWR from "swr";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { EmployeeVisit, fetchEmployeeVisits } from "@/services/employeeVisitsService";
import { SWR_KEYS } from "@/services/swrKeys";

export default function EmployeeVisitsScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const {
    data,
    error,
    isLoading,
    mutate,
  } = useSWR(
    user?.userType === "employee" ? SWR_KEYS.employeeVisits(user.id) : null,
    fetchEmployeeVisits,
    { revalidateOnFocus: true },
  );

  useFocusEffect(
    useCallback(() => {
      if (user?.userType === "employee") {
        void mutate().catch((focusError) => {
          console.error("Employee visits focus refresh error =>", focusError);
        });
      }
    }, [mutate, user?.userType]),
  );

  const visits = data?.results ?? [];

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await mutate();
    } catch (refreshError) {
      console.error("Employee visits refresh error =>", refreshError);
    } finally {
      setRefreshing(false);
    }
  }, [mutate]);

  const formatDate = (date: string) => {
    const parsed = new Date(`${date}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return date;
    return parsed.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (time: string) => {
    const [hourText, minute] = time.split(":");
    const hour = Number(hourText);
    if (!Number.isFinite(hour) || !minute) return time;
    const suffix = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minute} ${suffix}`;
  };

  const getStatusColor = (status: string) => {
    const normalized = status.toLowerCase();
    if (normalized.includes("complete") || normalized.includes("approved")) {
      return colors.success;
    }
    if (normalized.includes("cancel") || normalized.includes("declin")) {
      return colors.error;
    }
    return colors.warning;
  };

  const renderVisit = ({ item }: { item: EmployeeVisit }) => {
    const clients = item.client_details ?? [];
    const statusColor = getStatusColor(item.appointment_status ?? "");
    const key = `${item._id}-${item.booking_start_date}-${item.booking_start_time}`;

    return (
      <TouchableOpacity
        key={key}
        activeOpacity={0.85}
        onPress={() =>
          router.push({
            pathname: "/employee-visit-detail",
            params: {
              booking_id: item._id,
              visit_date: item.booking_start_date,
            },
          })
        }
        style={[
          styles.visitCard,
          { backgroundColor: colors.card.background, borderColor: colors.border },
        ]}
      >
        <View style={[styles.cardAccent, { backgroundColor: colors.primary }]} />
        <View style={styles.cardContent}>
          {clients.length ? clients.map((client) => (
            <View key={client._id} style={[styles.clientSection, { borderTopColor: colors.divider }]}>
              <View style={styles.clientHeading}>
                <Text style={[styles.clientName, { color: colors.textPrimary }]} numberOfLines={1}>
                  {client.fullname || "Client"}
                </Text>
                <View style={[styles.statusBadge, { backgroundColor: `${statusColor}18` }]}>
                  <Text style={[styles.statusText, { color: statusColor }]}>
                    {item.appointment_status || "Unknown"}
                  </Text>
                </View>
              </View>
              <View style={styles.detailsColumns}>
                <View style={styles.leftColumn}>
                  <View style={styles.addressRow}>
                    <MaterialIcons name="location-on" size={14} color={colors.textTertiary} />
                    <Text
                      style={[styles.addressText, { color: colors.textSecondary }]}
                      numberOfLines={2}
                    >
                      {[client.address, client.city, client.postal_code].filter(Boolean).join(", ") ||
                        "No address provided"}
                    </Text>
                  </View>
                  <View style={styles.serviceRow}>
                    <MaterialIcons name="medical-services" size={13} color={colors.textTertiary} />
                    <Text
                      style={[styles.serviceText, { color: colors.textSecondary }]}
                      numberOfLines={2}
                    >
                      {item.service_title?.length ? item.service_title.join(", ") : "Service"}
                    </Text>
                  </View>
                </View>
                <View style={[styles.rightColumn, { borderLeftColor: colors.divider }]}>
                  <View style={styles.phoneInline}>
                    {client.phone ? (
                      <>
                        <MaterialIcons name="phone" size={13} color={colors.textTertiary} />
                        <Text style={[styles.phoneText, { color: colors.textSecondary }]} numberOfLines={1}>
                          {client.phone}
                        </Text>
                      </>
                    ) : (
                      <Text style={[styles.phoneText, { color: colors.textSecondary }]}>Not provided</Text>
                    )}
                  </View>
                  <View style={styles.infoRow}>
                    <MaterialIcons name="event" size={13} color={colors.textTertiary} />
                    <Text style={[styles.appointmentText, { color: colors.textPrimary }]} numberOfLines={1}>
                      {formatDate(item.booking_start_date)}
                    </Text>
                  </View>
                  <View style={styles.infoRow}>
                    <MaterialIcons name="schedule" size={13} color={colors.textTertiary} />
                    <Text style={[styles.appointmentText, { color: colors.primary }]} numberOfLines={1}>
                      {formatTime(item.booking_start_time)} - {formatTime(item.booking_end_time)}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          )) : (
            <View style={styles.clientHeading}>
              <Text style={[styles.clientName, { color: colors.textPrimary }]}>Client</Text>
              <View style={[styles.statusBadge, { backgroundColor: `${statusColor}18` }]}>
                <Text style={[styles.statusText, { color: statusColor }]}>
                  {item.appointment_status || "Unknown"}
                </Text>
              </View>
            </View>
          )}

        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => {
    if (isLoading) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.stateText, { color: colors.textSecondary }]}>
            Loading visits...
          </Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.centered}>
          <MaterialIcons name="error-outline" size={44} color={colors.error} />
          <Text style={[styles.stateTitle, { color: colors.textPrimary }]}>
            Could not load visits
          </Text>
          <Text style={[styles.stateText, { color: colors.textSecondary }]}>
            {error.message || "Please pull down to try again."}
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.centered}>
        <MaterialIcons name="event-busy" size={44} color={colors.textTertiary} />
        <Text style={[styles.stateTitle, { color: colors.textPrimary }]}>
          No visits yet
        </Text>
        <Text style={[styles.stateText, { color: colors.textSecondary }]}>
          Your scheduled client visits will appear here.
        </Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.primary, paddingTop: insets.top + 16 }]}>
        <Text style={styles.headerTitle}>My Visits</Text>
        <Text style={styles.headerSubtitle}>Your scheduled client appointments</Text>
      </View>

      {error && visits.length > 0 ? (
        <Text style={[styles.refreshError, { color: colors.error }]}>
          Visits may be out of date. Pull down to retry.
        </Text>
      ) : null}

      <FlatList
        data={visits}
        keyExtractor={(item) =>
          `${item._id}-${item.booking_start_date}-${item.booking_start_time}`
        }
        renderItem={renderVisit}
        contentContainerStyle={[
          styles.listContent,
          visits.length === 0 && styles.emptyListContent,
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={renderEmptyState}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
  },
  headerTitle: { color: "#FFFFFF", fontSize: 22, fontWeight: "700" },
  headerSubtitle: { color: "#FFFFFF", fontSize: 13, marginTop: 3, opacity: 0.9 },
  listContent: { padding: 12, paddingBottom: 22 },
  emptyListContent: { flexGrow: 1 },
  visitCard: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 10,
  },
  cardAccent: { width: 3 },
  cardContent: { flex: 1, paddingHorizontal: 11, paddingVertical: 9 },
  clientHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: 5,
    borderColor: "#D1D5DB", // Tailwind gray-300
  },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  statusText: { fontSize: 10, fontWeight: "600" },
  clientSection: {
    // borderTopWidth: StyleSheet.hairlineWidth,
    // marginTop: 5,
    // paddingTop: 6,
  },
  detailsColumns: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 7,
  },
  leftColumn: { width: "55%", justifyContent: "center", paddingRight: 6 },
  rightColumn: {
    width: "43%",
    borderLeftWidth: StyleSheet.hairlineWidth,
    paddingLeft: 9,
    gap: 5,
  },
  clientName: { flex: 1, minWidth: 0, fontSize: 13, fontWeight: "600" },
  phoneInline: { flexDirection: "row", alignItems: "center", gap: 4, minHeight: 17 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  phoneText: { flexShrink: 1, fontSize: 11 },
  appointmentText: { fontSize: 11, fontWeight: "600", flexShrink: 1 },
  addressRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  addressText: { flex: 1, fontSize: 11, lineHeight: 15 },
  serviceRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 5,
    marginTop: 6,
  },
  serviceText: { flex: 1, fontSize: 11, lineHeight: 15 },
  centered: {
    flex: 1,
    minHeight: 230,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  stateTitle: { fontSize: 17, fontWeight: "700", marginTop: 12, textAlign: "center" },
  stateText: { fontSize: 14, lineHeight: 20, marginTop: 7, textAlign: "center" },
  refreshError: { paddingHorizontal: 16, paddingTop: 10, fontSize: 13 },
});
