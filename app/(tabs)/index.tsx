import { useEffect, useState } from "react";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useTheme } from "@/hooks/useTheme";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { MaterialIcons, Feather } from "@expo/vector-icons";
import { fetchMyJobs, Job } from "@/services/jobPoolService";

export default function HomeScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [myJobs, setMyJobs] = useState<Job[]>([]);
  const [myJobsLoading, setMyJobsLoading] = useState(true);

  useEffect(() => {
    fetchMyJobs(1, 5)
      .then((response) => {
        console.log("My Jobs API Response:", JSON.stringify(response, null, 2));
        setMyJobs(response.data.jobs);
      })
      .catch((err) => {
        console.error("My Jobs API Error:", err.message);
      })
      .finally(() => setMyJobsLoading(false));
  }, []);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const formatTime = (time: string) => {
    const [h, m] = time.split(":");
    const hour = parseInt(h, 10);
    const suffix = hour >= 12 ? "PM" : "AM";
    const display = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${display}:${m} ${suffix}`;
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <View style={styles.headerTop}>
          <IconSymbol name="gearshape.fill" size={24} color="white" />
          <Text style={styles.headerTitle}>CareNest</Text>
          <IconSymbol name="bell.fill" size={24} color="white" />
        </View>
        {/* <Text style={styles.location}>Thumbu Chatty St, Chennai</Text> */}
        <View style={styles.welcomeRow}>
          <View>
            <Text style={styles.welcome}>Welcome,</Text>
            <Text style={styles.welcome}>Tauqeer Abbas</Text>
          </View>

          <View style={styles.profileIcon}>
            <IconSymbol name="person" size={20} color="white" />
          </View>
        </View>
      </View>

      {/* Check In Section */}
      <View style={styles.content}>
        <View
          style={[styles.card, { backgroundColor: colors.card.background }]}
        >
          <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>
            OVERALL TIME
          </Text>
          <View style={styles.timeRow}>
            <Text style={[styles.time, { color: colors.textPrimary }]}>
              09 : 50 : 22 AM
            </Text>
            <TouchableOpacity
              style={[styles.checkInBtn, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.checkInText}>Check In</Text>
            </TouchableOpacity>
          </View>

          {/* Time Stats */}
          <View style={styles.timeStats}>
            <View style={styles.timeStat}>
              <IconSymbol
                name="arrow.down.circle.fill"
                size={24}
                color={colors.primary}
              />
              <Text
                style={[styles.timeStatValue, { color: colors.textPrimary }]}
              >
                10:00 AM
              </Text>
            </View>
            <View style={styles.timeStat}>
              <IconSymbol
                name="arrow.up.circle.fill"
                size={24}
                color={colors.primary}
              />
              <Text
                style={[styles.timeStatValue, { color: colors.textPrimary }]}
              >
                06:30 PM
              </Text>
            </View>
            <View style={styles.timeStat}>
              <IconSymbol name="clock.fill" size={24} color={colors.primary} />
              <Text
                style={[styles.timeStatValue, { color: colors.textPrimary }]}
              >
                00:00:00
              </Text>
            </View>
          </View>
        </View>

        {/* Attendance Summary */}
        <View
          style={[styles.card, { backgroundColor: colors.card.background }]}
        >
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
              Attendance for this Month
            </Text>
            <Text style={[styles.percentage, { color: colors.textSecondary }]}>
              68%
            </Text>
          </View>

          <View style={styles.attendanceStats}>
            <View style={styles.attendanceStat}>
              <Text style={[styles.statLabel, { color: colors.success }]}>
                Present
              </Text>
              <Text style={[styles.statValue, { color: colors.success }]}>
                13
              </Text>
            </View>
            <View style={styles.attendanceStat}>
              <Text style={[styles.statLabel, { color: colors.error }]}>
                Absents
              </Text>
              <Text style={[styles.statValue, { color: colors.error }]}>
                02
              </Text>
            </View>
            <View style={styles.attendanceStat}>
              <Text style={[styles.statLabel, { color: colors.warning }]}>
                Late In
              </Text>
              <Text style={[styles.statValue, { color: colors.warning }]}>
                04
              </Text>
            </View>
          </View>
        </View>

        {/* My Applied Jobs */}
        <View style={[styles.card, { backgroundColor: colors.card.background }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
              My Applied Jobs
            </Text>
          </View>

          {myJobsLoading ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ paddingVertical: 20 }} />
          ) : myJobs.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialIcons name="work-outline" size={36} color={colors.textTertiary} />
              <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
                No applied jobs yet
              </Text>
            </View>
          ) : (
            myJobs.map((job) => (
              <TouchableOpacity
                key={job._id}
                style={[styles.myJobItem, { borderBottomColor: colors.divider }]}
                activeOpacity={0.7}
                onPress={() => router.push({ pathname: "/my-job-detail", params: { id: job._id } })}
              >
                <View style={styles.myJobLeft}>
                  <Text style={[styles.myJobTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                    {job.title}
                  </Text>
                  <View style={styles.myJobMeta}>
                    <MaterialIcons name="location-pin" size={12} color={colors.textTertiary} />
                    <Text style={[styles.myJobMetaText, { color: colors.textSecondary }]}>
                      {job.location}
                    </Text>
                    <Feather name="clock" size={12} color={colors.textTertiary} />
                    <Text style={[styles.myJobMetaText, { color: colors.textSecondary }]}>
                      {formatDate(job.job_date)} · {formatTime(job.start_time)}
                    </Text>
                  </View>
                </View>
                <View style={styles.myJobRight}>
                  <Text style={[styles.myJobPay, { color: colors.success }]}>${job.pay_rate}/hr</Text>
                  <MaterialIcons name="chevron-right" size={20} color={colors.textTertiary} />
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </View>
    </ScrollView>
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
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "white",
  },
  location: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
    marginBottom: 8,
  },
  welcomeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
    justifyContent: "space-between",
  },
  profileIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  welcome: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
  },
  actionButtons: {
    flexDirection: "row",
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: "600",
  },
  content: {
    padding: 20,
  },
  card: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 8,
  },
  timeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  time: {
    fontSize: 18,
    fontWeight: "600",
  },
  checkInBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
  },
  checkInText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  timeStats: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  timeStat: {
    alignItems: "center",
    gap: 8,
  },
  timeStatValue: {
    fontSize: 12,
    fontWeight: "500",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  percentage: {
    fontSize: 14,
    fontWeight: "600",
  },
  attendanceStats: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  attendanceStat: {
    alignItems: "center",
    gap: 8,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "500",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
  },
  requestBtn: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  requestBtnText: {
    fontSize: 14,
    fontWeight: "600",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 20,
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
    fontWeight: "500",
  },
  myJobItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  myJobLeft: {
    flex: 1,
    marginRight: 12,
  },
  myJobTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  myJobMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  myJobMetaText: {
    fontSize: 11,
    fontWeight: "500",
    marginRight: 6,
  },
  myJobRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  myJobPay: {
    fontSize: 13,
    fontWeight: "700",
  },
});
