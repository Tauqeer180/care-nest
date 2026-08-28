import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { CompanyInfo, getStoredCompanyInfo } from "@/services/api";
import { getClientProfile } from "@/services/clientAuthService";
import { SWR_KEYS } from "@/services/swrKeys";
import { MaterialIcons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import useSWR, { useSWRConfig } from "swr";

interface MenuItem {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  subtitle?: string;
  onPress?: () => void;
  showChevron?: boolean;
}

export default function ClientProfileScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const { cache } = useSWRConfig();
  const { signOut, user } = useAuth();

  // Live profile from the server — the cached AuthUser is only a fallback for
  // the first paint (and if the request fails).
  const { data: profile, isLoading, mutate } = useSWR(
    SWR_KEYS.clientProfile(),
    getClientProfile,
    { revalidateOnFocus: true }
  );

  useEffect(() => {
    getStoredCompanyInfo().then(setCompanyInfo);
  }, []);

  // Pick up edits made on the edit screen.
  useFocusEffect(
    useCallback(() => {
      mutate();
    }, [mutate])
  );

  // Fall back to the user cached at login so the header still renders on first
  // paint and when the profile request fails (e.g. offline).
  const firstName = profile?.firstName || user?.firstName || "";
  const lastName = profile?.lastName || user?.lastName || "";
  const emailAddress = profile?.email || user?.email || "";

  const fullName = `${firstName} ${lastName}`.trim();
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`
    .trim()
    .toUpperCase();

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          setLoggingOut(true);
          try {
            // Clear SWR cache so the next user's data doesn't leak
            for (const key of cache.keys()) cache.delete(key);
            await signOut();
            // Route protection will auto-redirect to /login
          } finally {
            setLoggingOut(false);
          }
        },
      },
    ]);
  };

  const menuSections: { title: string; items: MenuItem[] }[] = [
    {
      title: "Account",
      items: [
        {
          icon: "person-outline",
          label: "Personal Information",
          subtitle: "Name, email, phone",
          showChevron: true,
          onPress: () => router.push("/client-edit-profile"),
        },
        {
          icon: "lock-outline",
          label: "Change Password",
          subtitle: "Update your password",
          showChevron: true,
          onPress: () => router.push("/change-password"),
        },
      ],
    },
    {
      title: "Bookings",
      items: [
        {
          icon: "event-available",
          label: "My Bookings",
          subtitle: "Appointments and services",
          showChevron: true,
          onPress: () => router.push("/(tabs)/client-bookings"),
        },
      ],
    },
    {
      title: "Support",
      items: [
        {
          icon: "help-outline",
          label: "Help & Support",
          subtitle: "FAQs, contact support",
          showChevron: true,
          onPress: () =>
            router.push({
              pathname: "/webview",
              params: {
                url: "https://www.carenestlink.com/contactus",
                title: "Help & Support",
              },
            }),
        },
      ],
    },
  ];

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      backgroundColor: colors.primary,
      paddingTop: 60,
      paddingBottom: 40,
      paddingHorizontal: 20,
      borderBottomLeftRadius: 30,
      borderBottomRightRadius: 30,
    },
    profileSection: {
      alignItems: "center",
    },
    avatarContainer: {
      width: 88,
      height: 88,
      borderRadius: 44,
      backgroundColor: "rgba(255,255,255,0.25)",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 14,
      borderWidth: 3,
      borderColor: "rgba(255,255,255,0.4)",
    },
    avatarText: {
      fontSize: 32,
      fontWeight: "700",
      color: "#FFFFFF",
    },
    profileName: {
      fontSize: 22,
      fontWeight: "700",
      color: "#FFFFFF",
      marginBottom: 4,
    },
    profileRole: {
      fontSize: 13,
      color: "rgba(255,255,255,0.8)",
      fontWeight: "500",
      marginBottom: 4,
    },
    profileEmail: {
      fontSize: 12,
      color: "rgba(255,255,255,0.65)",
      fontWeight: "400",
      marginBottom: 12,
    },
    companyChip: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "rgba(255,255,255,0.15)",
      borderRadius: 20,
      paddingVertical: 6,
      paddingHorizontal: 14,
      gap: 6,
    },
    companyChipText: {
      fontSize: 12,
      color: "rgba(255,255,255,0.9)",
      fontWeight: "600",
    },
    content: {
      paddingHorizontal: 20,
      paddingTop: 24,
      paddingBottom: 40,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.textTertiary,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: 10,
      marginTop: 8,
    },
    menuCard: {
      backgroundColor: colors.card.background,
      borderRadius: 16,
      marginBottom: 16,
      overflow: "hidden",
    },
    menuItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 14,
      paddingHorizontal: 16,
    },
    menuItemPressed: {
      backgroundColor: colors.backgroundAlt,
    },
    menuIconContainer: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: colors.primary + "15",
      alignItems: "center",
      justifyContent: "center",
      marginRight: 14,
    },
    menuTextContainer: {
      flex: 1,
    },
    menuLabel: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.textPrimary,
    },
    menuSubtitle: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    menuDivider: {
      height: 1,
      backgroundColor: colors.divider,
      marginLeft: 66,
    },
    logoutButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingVertical: 14,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.error,
      marginTop: 8,
    },
    logoutText: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.error,
    },
    versionText: {
      fontSize: 12,
      textAlign: "center",
      color: colors.textTertiary,
      marginTop: 20,
    },
    logoutOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.45)",
      alignItems: "center",
      justifyContent: "center",
    },
    logoutOverlayCard: {
      backgroundColor: colors.card.background,
      borderRadius: 16,
      paddingVertical: 24,
      paddingHorizontal: 32,
      alignItems: "center",
      gap: 14,
      minWidth: 160,
    },
    logoutOverlayText: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.textPrimary,
    },
  });

  return (
    <>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.profileSection}>
            <View style={styles.avatarContainer}>
              <Text style={styles.avatarText}>{initials || "?"}</Text>
            </View>
            <Text style={styles.profileName}>
              {fullName || (isLoading ? "Loading..." : "Client")}
            </Text>
            <Text style={styles.profileRole}>Client</Text>
            {emailAddress ? (
              <Text style={styles.profileEmail}>{emailAddress}</Text>
            ) : null}
            {companyInfo && (
              <View style={styles.companyChip}>
                <MaterialIcons
                  name="business"
                  size={14}
                  color="rgba(255,255,255,0.9)"
                />
                <Text style={styles.companyChipText}>
                  {companyInfo.companyName}
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.content}>
          {menuSections.map((section) => (
            <View key={section.title}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <View style={styles.menuCard}>
                {section.items.map((item, index) => (
                  <React.Fragment key={item.label}>
                    {index > 0 && <View style={styles.menuDivider} />}
                    <Pressable
                      style={({ pressed }) => [
                        styles.menuItem,
                        pressed && styles.menuItemPressed,
                      ]}
                      onPress={item.onPress}
                    >
                      <View style={styles.menuIconContainer}>
                        <MaterialIcons
                          name={item.icon}
                          size={20}
                          color={colors.primary}
                        />
                      </View>
                      <View style={styles.menuTextContainer}>
                        <Text style={styles.menuLabel}>{item.label}</Text>
                        {item.subtitle && (
                          <Text style={styles.menuSubtitle}>
                            {item.subtitle}
                          </Text>
                        )}
                      </View>
                      {item.showChevron && (
                        <MaterialIcons
                          name="chevron-right"
                          size={22}
                          color={colors.textTertiary}
                        />
                      )}
                    </Pressable>
                  </React.Fragment>
                ))}
              </View>
            </View>
          ))}

          <Pressable style={styles.logoutButton} onPress={handleLogout}>
            <MaterialIcons name="logout" size={20} color={colors.error} />
            <Text style={styles.logoutText}>Logout</Text>
          </Pressable>

          <Text style={styles.versionText}>
            HomeCare+ v{Constants.expoConfig?.version ?? "1.0.0"}
          </Text>
        </View>
      </ScrollView>

      <Modal
        visible={loggingOut}
        transparent
        animationType="fade"
        statusBarTranslucent
      >
        <View style={styles.logoutOverlay}>
          <View style={styles.logoutOverlayCard}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.logoutOverlayText}>Logging out…</Text>
          </View>
        </View>
      </Modal>
    </>
  );
}
