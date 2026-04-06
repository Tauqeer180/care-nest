import { useEffect } from "react";
import { Alert } from "react-native";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider as NavigationThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { ThemeProvider } from "@/hooks/useTheme";
import {
  registerFCMToken,
  onTokenRefresh,
  onForegroundMessage,
  onNotificationOpenedApp,
  getInitialNotification,
  setBackgroundMessageHandler,
} from "@/services/notificationService";

// Register background handler — must be outside component
setBackgroundMessageHandler();

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    // Register FCM token
    registerFCMToken();

    // Listen for token refresh
    const unsubTokenRefresh = onTokenRefresh();

    // Handle foreground notifications — show an alert
    const unsubForeground = onForegroundMessage((message) => {
      Alert.alert(
        message.notification?.title ?? "Notification",
        message.notification?.body ?? ""
      );
    });

    // Handle notification tap from background
    const unsubOpenedApp = onNotificationOpenedApp((message) => {
      console.log("Notification tapped (background):", message.data);
    });

    // Check if app was opened from a quit-state notification
    getInitialNotification().then((message) => {
      if (message) {
        console.log("Notification tapped (quit state):", message.data);
      }
    });

    return () => {
      unsubTokenRefresh();
      unsubForeground();
      unsubOpenedApp();
    };
  }, []);

  return (
    <ThemeProvider>
      <NavigationThemeProvider
        value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
      >
        <Stack>
          {/* Auth Stack */}
          <Stack.Screen
            name="login"
            options={{
              headerShown: false,
              animation: "default",
            }}
          />
          <Stack.Screen
            name="register"
            options={{
              headerShown: false,
              animation: "default",
            }}
          />
          <Stack.Screen
            name="forgot-password"
            options={{
              headerShown: false,
              animation: "default",
            }}
          />
          <Stack.Screen
            name="reset-password"
            options={{
              headerShown: false,
              animation: "default",
            }}
          />

          {/* Main App Stack */}
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="job-detail"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="my-job-detail"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="modal"
            options={{ presentation: "modal", title: "Modal" }}
          />
        </Stack>
        <StatusBar style="auto" />
      </NavigationThemeProvider>
    </ThemeProvider>
  );
}
