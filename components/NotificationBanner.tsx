import { useEffect, useRef, useState, useCallback } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  PanResponder,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import { FirebaseMessagingTypes } from "@react-native-firebase/messaging";

interface NotificationData {
  title: string;
  body: string;
  message: FirebaseMessagingTypes.RemoteMessage;
}

let showNotificationFn: ((data: NotificationData) => void) | null = null;

/**
 * Call this from anywhere to show an in-app notification banner
 */
export function showInAppNotification(
  message: FirebaseMessagingTypes.RemoteMessage
) {
  showNotificationFn?.({
    title: message.notification?.title ?? "Notification",
    body: message.notification?.body ?? "",
    message,
  });
}

const AUTO_DISMISS_MS = 4000;

export default function NotificationBanner({
  onPress,
}: {
  onPress?: (message: FirebaseMessagingTypes.RemoteMessage) => void;
}) {
  const { colors } = useTheme();
  const translateY = useRef(new Animated.Value(-150)).current;
  const [notification, setNotification] = useState<NotificationData | null>(
    null
  );
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    Animated.timing(translateY, {
      toValue: -150,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setVisible(false);
      setNotification(null);
    });
  }, [translateY]);

  const show = useCallback(
    (data: NotificationData) => {
      // Clear any existing timer
      if (timerRef.current) clearTimeout(timerRef.current);

      setNotification(data);
      setVisible(true);

      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 12,
      }).start();

      timerRef.current = setTimeout(dismiss, AUTO_DISMISS_MS);
    },
    [translateY, dismiss]
  );

  useEffect(() => {
    showNotificationFn = show;
    return () => {
      showNotificationFn = null;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [show]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) =>
        gestureState.dy < -5,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy < 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy < -30) {
          dismiss();
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 80,
            friction: 12,
          }).start();
        }
      },
    })
  ).current;

  if (!visible || !notification) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: colors.card.background,
          shadowColor: "#000",
          transform: [{ translateY }],
        },
      ]}
      {...panResponder.panHandlers}
    >
      <TouchableOpacity
        style={styles.content}
        activeOpacity={0.8}
        onPress={() => {
          dismiss();
          onPress?.(notification.message);
        }}
      >
        <View style={[styles.iconContainer, { backgroundColor: colors.primary + "15" }]}>
          <MaterialIcons name="notifications" size={22} color={colors.primary} />
        </View>
        <View style={styles.textContainer}>
          <Text
            style={[styles.title, { color: colors.textPrimary }]}
            numberOfLines={1}
          >
            {notification.title}
          </Text>
          <Text
            style={[styles.body, { color: colors.textSecondary }]}
            numberOfLines={2}
          >
            {notification.body}
          </Text>
        </View>
        <TouchableOpacity onPress={dismiss} hitSlop={8} style={styles.closeBtn}>
          <MaterialIcons name="close" size={18} color={colors.textTertiary} />
        </TouchableOpacity>
      </TouchableOpacity>
      <View style={[styles.swipeHint, { backgroundColor: colors.textTertiary }]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 2,
  },
  body: {
    fontSize: 13,
    lineHeight: 18,
  },
  closeBtn: {
    padding: 4,
  },
  swipeHint: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 8,
    opacity: 0.3,
  },
});
