import { useEffect } from "react";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider as NavigationThemeProvider,
} from "@react-navigation/native";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { mutate as globalMutate } from "swr";
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
import { SWR_KEYS } from "@/services/swrKeys";

// Refresh the notifications list + unread badge whenever a push arrives.
function refreshNotificationData() {
  globalMutate(SWR_KEYS.notificationsUnreadCount());
  globalMutate((key) => Array.isArray(key) && key[0] === "notifications");
}

// Revalidate domain data affected by a push, based on its type. e.g. a new
// pool job should refresh the job listing + the employee dashboard stats so
// they update live without the user pulling to refresh.
function refreshDataForMessage(data: Record<string, any> | undefined) {
  switch (data?.type) {
    case "NEW_POOL_JOB":
      // Note: the job-pool listing is a useSWRInfinite list whose internal cache
      // key isn't matchable here, so it self-refreshes via its own foreground
      // listener in (tabs)/job-pool.tsx. Here we only refresh the dashboard stats.
      globalMutate(SWR_KEYS.employeeDashboard());
      break;
    default:
      break;
  }
}

// Resolves the in-app route for a tapped push, based on its data payload.
function routeForMessageData(data: Record<string, any> | undefined) {
  if (!data) return null;
  const jobId = data.jobId ?? data.job_id;
  switch (data.type) {
    case "NEW_POOL_JOB":
      return jobId
        ? { pathname: "/job-detail" as const, params: { id: String(jobId) } }
        : null;
    default:
      return null;
  }
}

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
  const router = useRouter();
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
    registerFCMToken().then((token) => {
      console.log("[NOTIF] FCM token registered:", token);
    });

    // Listen for token refresh
    const unsubTokenRefresh = onTokenRefresh((token) => {
      console.log("[NOTIF] FCM token refreshed:", token);
    });

    // Handle foreground notifications — show in-app banner
    const unsubForeground = onForegroundMessage((message) => {
      console.log(
        "[NOTIF] Foreground received:",
        JSON.stringify(
          { notification: message.notification, data: message.data, from: message.from },
          null,
          2
        )
      );
      showInAppNotification(message);
      // Keep the bell badge + list in sync with the new notification.
      refreshNotificationData();
      // Refresh any domain data the notification affects (e.g. job listing + dashboard).
      refreshDataForMessage(message.data);
    });

    // Handle notification tap from background
    const unsubOpenedApp = onNotificationOpenedApp((message) => {
      console.log(
        "[NOTIF] Tapped (background):",
        JSON.stringify({ notification: message.notification, data: message.data }, null, 2)
      );
      refreshNotificationData();
      const route = routeForMessageData(message.data);
      router.push(route ?? "/notifications");
    });

    // Check if app was opened from a quit-state notification
    getInitialNotification().then((message) => {
      if (message) {
        console.log(
          "[NOTIF] Tapped (quit state):",
          JSON.stringify({ notification: message.notification, data: message.data }, null, 2)
        );
        const route = routeForMessageData(message.data);
        if (route) router.push(route);
      } else {
        console.log("[NOTIF] No quit-state notification");
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
            name="personal-information"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="change-password"
            options={{ headerShown: false }}
          />
          <Stack.Screen name="webview" options={{ headerShown: false }} />
          <Stack.Screen
            name="notifications"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="leave-requests"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="leave-request-detail"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="admin-leave-request-detail"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="modal"
            options={{ presentation: "modal", title: "Modal" }}
          />
        </Stack>
        <StatusBar style="auto" />
        <NotificationBanner
          onPress={(message) => {
            const route = routeForMessageData(message.data);
            router.push(route ?? "/notifications");
          }}
        />
      </NavigationThemeProvider>
    </ThemeProvider>
  );
}
