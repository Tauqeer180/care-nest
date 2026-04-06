import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator, Alert, ScrollView, Pressable } from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTheme } from '@/hooks/useTheme';
import { Feather, Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  getAttendanceStatus,
  checkIn,
  checkOut,
  getAttendanceHistory,
  AttendanceSummary,
  ActiveCheckIn,
  HistoryType,
  HistoryDaySummary,
} from '@/services/attendanceService';
import { useFocusEffect } from 'expo-router';

export default function AttendanceScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [activeCheckIn, setActiveCheckIn] = useState<ActiveCheckIn | null>(null);
  const [todaySummary, setTodaySummary] = useState<AttendanceSummary | null>(null);
  const [weekSummary, setWeekSummary] = useState<AttendanceSummary | null>(null);

  // History
  const [historyType, setHistoryType] = useState<HistoryType>('daily');
  const [historyData, setHistoryData] = useState<HistoryDaySummary[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchHistory = useCallback(async (type: HistoryType) => {
    setHistoryLoading(true);
    try {
      const data = await getAttendanceHistory(type);
      const sorted = Object.values(data.summary).sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      setHistoryData(sorted);
    } catch {
      setHistoryData([]);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory(historyType);
  }, [historyType, fetchHistory]);

  // Live clock
  const [now, setNow] = useState(new Date());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    timerRef.current = setInterval(() => setNow(new Date()), 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const formattedDate = now.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  });
  const formattedTime = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  const fetchStatus = useCallback(async () => {
    try {
      const data = await getAttendanceStatus();
      setIsCheckedIn(data.isCheckedIn);
      setActiveCheckIn(data.activeCheckIn);
      setTodaySummary(data.today);
      setWeekSummary(data.thisWeek);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to fetch attendance status');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchStatus();
    }, [fetchStatus])
  );

  const formatTime = (isoString: string | null | undefined) => {
    if (!isoString) return '--:--';
    return new Date(isoString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const handleCheckIn = async () => {
    setActionLoading(true);
    try {
      await checkIn();
      await fetchStatus();
      fetchHistory(historyType);
    } catch (error: any) {
      Alert.alert('Check-in Failed', error.message || 'Could not check in');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    Alert.alert('Check Out', 'Are you sure you want to check out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Check Out',
        style: 'destructive',
        onPress: async () => {
          setActionLoading(true);
          try {
            await checkOut();
            await fetchStatus();
            fetchHistory(historyType);
          } catch (error: any) {
            Alert.alert('Check-out Failed', error.message || 'Could not check out');
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  // Compute elapsed time if checked in
  const getElapsedTime = () => {
    if (!activeCheckIn?.checkInTime || !isCheckedIn) return null;
    const diffMs = now.getTime() - new Date(activeCheckIn.checkInTime).getTime();
    const hours = Math.floor(diffMs / 3600000);
    const minutes = Math.floor((diffMs % 3600000) / 60000);
    return `${hours}h ${minutes}m`;
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const checkInTimeStr = formatTime(activeCheckIn?.checkInTime);
  const checkOutTimeStr = formatTime(activeCheckIn?.checkOutTime);
  const elapsed = getElapsedTime();

  const formatDateLabel = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.greeting, { color: colors.textPrimary }]}>
            {activeCheckIn?.userName ? `Hey ${activeCheckIn.userName.split(' ')[0]}` : 'Hey there'}
          </Text>
          <Text style={[styles.subGreeting, { color: colors.textSecondary }]}>
            {isCheckedIn ? "You're currently checked in" : 'Mark your attendance'}
          </Text>
        </View>
        <View style={[styles.avatar, { backgroundColor: colors.backgroundAlt }]}>
          <IconSymbol name="person.fill" size={24} color={colors.textSecondary} />
        </View>
      </View>

      {/* Time Display */}
      <View style={styles.timeSection}>
        <Text style={[styles.time, { color: colors.textPrimary }]}>{formattedTime}</Text>
        <Text style={[styles.date, { color: colors.textSecondary }]}>{formattedDate}</Text>
      </View>

      {/* Check-in/out Circle */}
      <View style={styles.circleContainer}>
        <View style={[styles.circle, styles.circle1, { borderColor: isCheckedIn ? colors.success : colors.border, opacity: 0.15 }]} />
        <View style={[styles.circle, styles.circle2, { borderColor: isCheckedIn ? colors.success : colors.border, opacity: 0.25 }]} />
        <View style={[styles.circle, styles.circle3, { borderColor: isCheckedIn ? colors.success : colors.border, opacity: 0.35 }]} />
        <View style={[styles.circle, styles.circle4, { borderColor: isCheckedIn ? colors.success : colors.border, opacity: 0.45 }]} />
        <View style={[styles.circle, styles.circle5, { borderColor: isCheckedIn ? colors.success : colors.border, opacity: 0.55 }]} />

        <TouchableOpacity
          style={[styles.checkInButton, { backgroundColor: 'white', shadowColor: isCheckedIn ? colors.error : colors.primary }]}
          onPress={isCheckedIn ? handleCheckOut : handleCheckIn}
          disabled={actionLoading}
          activeOpacity={0.7}
        >
          {actionLoading ? (
            <ActivityIndicator size="small" color={isCheckedIn ? colors.error : colors.primary} />
          ) : (
            <>
              <Ionicons
                name={isCheckedIn ? 'hand-left' : 'hand-right'}
                size={28}
                color={isCheckedIn ? colors.error : colors.primary}
              />
              <Text style={[styles.checkInText, { color: isCheckedIn ? colors.error : colors.primary }]}>
                {isCheckedIn ? 'Check Out' : 'Check In'}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Elapsed timer badge */}
        {isCheckedIn && elapsed && (
          <View style={[styles.elapsedBadge, { backgroundColor: colors.success + '18' }]}>
            <Text style={[styles.elapsedText, { color: colors.success }]}>{elapsed} elapsed</Text>
          </View>
        )}
      </View>

      {/* Stats */}
      <View style={styles.stats}>
        <View style={styles.statItem}>
          <View style={[styles.statIcon, { backgroundColor: colors.success + '20' }]}>
            <Feather name="log-in" size={22} color={colors.success} />
          </View>
          <Text style={[styles.statTime, { color: colors.textPrimary }]}>{checkInTimeStr}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Check In</Text>
        </View>

        <View style={styles.statItem}>
          <View style={[styles.statIcon, { backgroundColor: colors.info + '20' }]}>
            <Feather name="log-out" size={22} color={colors.info} />
          </View>
          <Text style={[styles.statTime, { color: colors.textPrimary }]}>{checkOutTimeStr}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Check Out</Text>
        </View>

        <View style={styles.statItem}>
          <View style={[styles.statIcon, { backgroundColor: colors.primary + '20' }]}>
            <Feather name="clock" size={22} color={colors.primary} />
          </View>
          <Text style={[styles.statTime, { color: colors.textPrimary }]}>
            {todaySummary?.totalFormatted || '--:--'}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Today</Text>
        </View>
      </View>

      {/* Week summary */}
      {weekSummary && (
        <View style={[styles.weekCard, { backgroundColor: colors.card?.background || colors.backgroundAlt, borderColor: colors.border }]}>
          <Feather name="calendar" size={16} color={colors.textTertiary} />
          <Text style={[styles.weekLabel, { color: colors.textSecondary }]}>This Week</Text>
          <Text style={[styles.weekValue, { color: colors.textPrimary }]}>{weekSummary.totalFormatted}</Text>
          <Text style={[styles.weekRecords, { color: colors.textTertiary }]}>{weekSummary.records} records</Text>
        </View>
      )}

      {/* History Section */}
      <View style={[styles.historySection, { paddingBottom: 40 + insets.bottom }]}>
        <Text style={[styles.historySectionTitle, { color: colors.textPrimary }]}>History</Text>

        {/* Tabs */}
        <View style={[styles.historyTabs, { backgroundColor: colors.backgroundAlt }]}>
          {(['daily', 'weekly', 'monthly'] as HistoryType[]).map((type) => (
            <Pressable
              key={type}
              style={[
                styles.historyTab,
                historyType === type && { backgroundColor: colors.primary },
              ]}
              onPress={() => setHistoryType(type)}
            >
              <Text
                style={[
                  styles.historyTabText,
                  { color: historyType === type ? '#FFFFFF' : colors.textSecondary },
                ]}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* History List */}
        {historyLoading ? (
          <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 24 }} />
        ) : historyData.length === 0 ? (
          <View style={styles.emptyHistory}>
            <MaterialIcons name="event-busy" size={40} color={colors.textTertiary} />
            <Text style={[styles.emptyHistoryText, { color: colors.textTertiary }]}>No records found</Text>
          </View>
        ) : (
          historyData.map((day) => (
            <View
              key={day.date}
              style={[styles.historyCard, { backgroundColor: colors.card?.background || colors.backgroundAlt, borderColor: colors.border }]}
            >
              {/* Day header */}
              <View style={styles.historyCardHeader}>
                <View>
                  {historyType == "daily" && <Text style={[styles.historyDate, { color: colors.textPrimary }]}>
                    {formatDateLabel(day.date)}
                  </Text>}
                  <Text style={[styles.historyRecordCount, { color: colors.textTertiary }]}>
                    {day.records.length} {day.records.length === 1 ? 'session' : 'sessions'}
                  </Text>
                </View>
                <View style={[styles.historyTotalBadge, { backgroundColor: colors.primary + '15' }]}>
                  <Text style={[styles.historyTotalText, { color: colors.primary }]}>
                    {day.totalFormatted}
                  </Text>
                </View>
              </View>

              {/* Records grouped by checkInDate */}
              {day.records.map((record, idx) => {
                const showDateLabel =
                  idx === 0 || record.checkInDate !== day.records[idx - 1].checkInDate;
                return (
                  <View key={record._id}>
                    {idx > 0 && <View style={[styles.historyDivider, { backgroundColor: colors.divider }]} />}
                    {showDateLabel && (
                      <Text style={[styles.recordDateLabel, { color: colors.textTertiary }]}>
                        {formatDateLabel(record.checkInDate)}
                      </Text>
                    )}
                    <View style={styles.historyRecord}>
                      <View style={styles.historyRecordTimes}>
                        <View style={styles.historyTimeRow}>
                          <Feather name="log-in" size={14} color={colors.success} />
                          <Text style={[styles.historyTimeText, { color: colors.textPrimary }]}>
                            {new Date(record.checkInTime).toLocaleTimeString('en-US', {
                              hour: '2-digit', minute: '2-digit', hour12: true,
                            })}
                          </Text>
                        </View>
                        <View style={styles.historyTimeRow}>
                          <Feather name="log-out" size={14} color={record.checkOutTime ? colors.info : colors.textTertiary} />
                          <Text style={[styles.historyTimeText, { color: colors.textPrimary }]}>
                            {record.checkOutTime
                              ? new Date(record.checkOutTime).toLocaleTimeString('en-US', {
                                  hour: '2-digit', minute: '2-digit', hour12: true,
                                })
                              : '--:--'}
                          </Text>
                        </View>
                      </View>
                      <View style={[
                        styles.historyStatusBadge,
                        { backgroundColor: record.status === 'checked-in' ? colors.success + '18' : colors.info + '18' },
                      ]}>
                        <Text style={[
                          styles.historyStatusText,
                          { color: record.status === 'checked-in' ? colors.success : colors.info },
                        ]}>
                          {record.status === 'checked-in' ? 'Active' : `${record.durationMinutes}m`}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 40,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subGreeting: {
    fontSize: 13,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeSection: {
    alignItems: 'center',
    marginBottom: 50,
  },
  time: {
    fontSize: 44,
    fontWeight: '300',
    letterSpacing: 2,
    marginBottom: 8,
  },
  date: {
    fontSize: 13,
  },
  circleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 280,
    marginBottom: 40,
  },
  circle: {
    position: 'absolute',
    borderWidth: 1.5,
    borderRadius: 1000,
  },
  circle1: { width: 280, height: 280 },
  circle2: { width: 235, height: 235 },
  circle3: { width: 190, height: 190 },
  circle4: { width: 145, height: 145 },
  circle5: { width: 110, height: 110 },
  checkInButton: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
    gap: 2,
  },
  checkInText: {
    fontSize: 11,
    fontWeight: '600',
  },
  elapsedBadge: {
    position: 'absolute',
    bottom: 10,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  elapsedText: {
    fontSize: 12,
    fontWeight: '600',
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
  },
  statItem: {
    alignItems: 'center',
    gap: 6,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statTime: {
    fontSize: 14,
    fontWeight: '600',
  },
  statLabel: {
    fontSize: 12,
  },
  weekCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 24,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  weekLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  weekValue: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
    textAlign: 'right',
  },
  weekRecords: {
    fontSize: 11,
  },
  historySection: {
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 0,
  },
  historySectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  historyTabs: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 4,
    marginBottom: 20,
  },
  historyTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  historyTabText: {
    fontSize: 13,
    fontWeight: '600',
  },
  emptyHistory: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 10,
  },
  emptyHistoryText: {
    fontSize: 14,
  },
  historyCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  historyCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  historyDate: {
    fontSize: 15,
    fontWeight: '700',
  },
  historyRecordCount: {
    fontSize: 11,
    // marginTop: 2,
  },
  historyTotalBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  historyTotalText: {
    fontSize: 13,
    fontWeight: '700',
  },
  recordDateLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 4,
  },
  historyDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 10,
  },
  historyRecord: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  historyRecordTimes: {
    gap: 6,
  },
  historyTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  historyTimeText: {
    fontSize: 13,
    fontWeight: '500',
  },
  historyStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  historyStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
