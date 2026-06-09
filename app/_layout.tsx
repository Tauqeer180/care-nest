import { useEffect } from "react";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider as NavigationThemeProvider,
} from "@react-navigation/native";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import "react-native-reanimated";

// Keep the splash visible until auth state is resolved + navigation settled
SplashScreen.preventAutoHideAsync().catch(() => {});

import { useColorScheme } from "@/hooks/use-color-scheme";
import { ThemeProvider } from "@/hooks/useTheme";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import {
  registerFCMToken,
  onTokenRefresh,
  onForegroundMessage,
  onNotificationOpenedApp,
  getInitialNotification,
  setBackgroundMessageHandler,
} from "@/services/notificationService";
import NotificationBanner, {
  showInAppNotification,
} from "@/components/NotificationBanner";

const PUBLIC_ROUTES = ["login", "forgot-password", "reset-password", "register"];

function useProtectedRoute(authChecked: boolean, isAuthed: boolean, isAdmin: boolean) {
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!authChecked) return;
    const first = segments[0];
    const second = segments[1];
    const isPublic = !first || PUBLIC_ROUTES.includes(first);
    const isOnHomeTab = first === "(tabs)" && !second;

    if (!isAuthed && !isPublic) {
      router.replace("/login");
    } else if (isAuthed && isPublic) {
      router.replace(isAdmin ? "/(tabs)/admin-jobs" : "/(tabs)");
    } else if (isAuthed && isAdmin && isOnHomeTab) {
      // Admin has no home screen — redirect to Manage Jobs
      router.replace("/(tabs)/admin-jobs");
    }
  }, [authChecked, isAuthed, isAdmin, segments, router]);
}

// Register background handler — must be outside component
setBackgroundMessageHandler();

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutContent />
    </AuthProvider>
  );
}

function RootLayoutContent() {
  const colorScheme = useColorScheme();
  const { authChecked, isAuthed, isAdmin } = useAuth();

  useProtectedRoute(authChecked, isAuthed, isAdmin);

  // Hide native splash only after auth state is resolved AND navigation has settled
  // on the correct screen — eliminates the (tabs) → login flicker on cold start.
  useEffect(() => {
    if (!authChecked) return;
    // Two frames: first lets the navigation effect run, second lets it render.
    const id1 = requestAnimationFrame(() => {
      const id2 = requestAnimationFrame(() => {
        SplashScreen.hideAsync().catch(() => {});
      });
      return () => cancelAnimationFrame(id2);
    });
    return () => cancelAnimationFrame(id1);
  }, [authChecked]);

  useEffect(() => {
    // Register FCM token
    registerFCMToken();

    // Listen for token refresh
    const unsubTokenRefresh = onTokenRefresh();

    // Handle foreground notifications — show in-app banner
    const unsubForeground = onForegroundMessage((message) => {
      showInAppNotification(message);
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

  // While auth is being checked, render null — the native splash stays visible.
  if (!authChecked) return null;

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
            name="admin-job-detail"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="admin-attendance-detail"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="earnings-history"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="modal"
            options={{ presentation: "modal", title: "Modal" }}
          />
        </Stack>
        <StatusBar style="auto" />
        <NotificationBanner />
      </NavigationThemeProvider>
    </ThemeProvider>
  );
}
