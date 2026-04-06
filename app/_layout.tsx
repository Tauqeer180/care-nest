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

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

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
