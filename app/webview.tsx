import { useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { WebView } from "react-native-webview";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/hooks/useTheme";
import { MaterialIcons } from "@expo/vector-icons";

export default function WebViewScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { url, title } = useLocalSearchParams<{ url: string; title?: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { backgroundColor: colors.primary, paddingTop: insets.top + 12 },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBack}>
          <MaterialIcons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {title ?? "Help & Support"}
        </Text>
        <View style={{ width: 32 }} />
      </View>

      <View style={styles.body}>
        {url ? (
          <>
            <WebView
              source={{ uri: url }}
              onLoadStart={() => setLoading(true)}
              onLoadEnd={() => setLoading(false)}
              onError={() => {
                setError(true);
                setLoading(false);
              }}
              startInLoadingState
            />
            {loading && !error && (
              <View style={[styles.overlay, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            )}
            {error && (
              <View style={[styles.overlay, { backgroundColor: colors.background }]}>
                <MaterialIcons name="wifi-off" size={48} color={colors.textTertiary} />
                <Text style={[styles.errorText, { color: colors.textSecondary }]}>
                  Couldn&apos;t load the page. Check your connection and try again.
                </Text>
              </View>
            )}
          </>
        ) : (
          <View style={styles.overlay}>
            <Text style={[styles.errorText, { color: colors.textSecondary }]}>
              No page to display.
            </Text>
          </View>
        )}
      </View>
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
  body: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 12,
  },
  errorText: { fontSize: 14, textAlign: "center", lineHeight: 20 },
});
