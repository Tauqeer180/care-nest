import AsyncStorage from "@react-native-async-storage/async-storage";
import messaging, { FirebaseMessagingTypes } from "@react-native-firebase/messaging";
import { PermissionsAndroid, Platform } from "react-native";
import { apiRequest } from "./api";

const FCM_TOKEN_KEY = "@carenest/fcm_token";

/**
 * Request notification permission from the user
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === "android" && Platform.Version >= 33) {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
    );
    if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
      console.log("Notification permission denied (Android 13+)");
      return false;
    }
  }

  const authStatus = await messaging().requestPermission();
  const enabled =
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL;

  console.log("FCM Permission status:", authStatus, "Enabled:", enabled);
  return enabled;
}

/**
 * Get the FCM token and register it with the backend
 */
export async function registerFCMToken(): Promise<string | null> {
  try {
    const permitted = await requestNotificationPermission();
    if (!permitted) return null;

    const token = await messaging().getToken();
    console.log("FCM Token:", token);

    // Check if token changed since last registration
    const storedToken = await AsyncStorage.getItem(FCM_TOKEN_KEY);
    if (storedToken !== token) {
      await sendTokenToBackend(token);
      await AsyncStorage.setItem(FCM_TOKEN_KEY, token);
    }

    return token;
  } catch (error) {
    console.error("Failed to get FCM token:", error);
    return null;
  }
}

/**
 * Send FCM token to the backend
 */
async function sendTokenToBackend(token: string): Promise<void> {
  try {
    await apiRequest("/mobile/fcm-token", {
      method: "POST",
      body: {
        fcm_token: token,
      },
    });
    console.log("FCM token registered with backend");
  } catch (error) {
    console.error("Failed to register FCM token with backend:", error);
  }
}

/**
 * Listen for token refresh and re-register
 */
export function onTokenRefresh(callback?: (token: string) => void): () => void {
  return messaging().onTokenRefresh(async (token) => {
    console.log("FCM Token refreshed:", token);
    await AsyncStorage.setItem(FCM_TOKEN_KEY, token);
    await sendTokenToBackend(token);
    callback?.(token);
  });
}

/**
 * Handle foreground notifications
 */
export function onForegroundMessage(
  callback: (message: FirebaseMessagingTypes.RemoteMessage) => void
): () => void {
  return messaging().onMessage(async (remoteMessage) => {
    console.log("Foreground notification:", JSON.stringify(remoteMessage, null, 2));
    callback(remoteMessage);
  });
}

/**
 * Handle notification opened from background state
 */
export function onNotificationOpenedApp(
  callback: (message: FirebaseMessagingTypes.RemoteMessage) => void
): () => void {
  return messaging().onNotificationOpenedApp((remoteMessage) => {
    console.log("Notification opened app from background:", JSON.stringify(remoteMessage, null, 2));
    callback(remoteMessage);
  });
}

/**
 * Check if app was opened from a quit-state notification
 */
export async function getInitialNotification(): Promise<FirebaseMessagingTypes.RemoteMessage | null> {
  const remoteMessage = await messaging().getInitialNotification();
  if (remoteMessage) {
    console.log("App opened from quit state notification:", JSON.stringify(remoteMessage, null, 2));
  }
  return remoteMessage;
}

/**
 * Set background message handler — call this at app entry (outside component)
 */
export function setBackgroundMessageHandler(): void {
  messaging().setBackgroundMessageHandler(async (remoteMessage) => {
    console.log("Background notification:", JSON.stringify(remoteMessage, null, 2));
  });
}
