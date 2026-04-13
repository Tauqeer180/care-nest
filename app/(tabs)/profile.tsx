import { useTheme } from "@/hooks/useTheme";
import { getStoredCompanyInfo, getStoredUser, clearAuthData, CompanyInfo, AuthUser } from "@/services/api";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

interface MenuItem {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  subtitle?: string;
  onPress?: () => void;
  color?: string;
  showChevron?: boolean;
}

export default function ProfileScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    getStoredCompanyInfo().then(setCompanyInfo);
    getStoredUser().then(setUser);
  }, []);

  const fullName = user ? `${user.firstName} ${user.lastName}` : "";
  const initials = user
    ? `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase()
    : "";
  const roleLabel = user?.userType === "superadmin" ? "Admin" : "Employee";

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await clearAuthData();
          router.replace("/login");
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
        },
        {
          icon: "lock-outline",
          label: "Change Password",
          subtitle: "Update your password",
          showChevron: true,
        },
        {
          icon: "notifications-none",
          label: "Notifications",
          subtitle: "Push, email preferences",
          showChevron: true,
        },
      ],
    },
    {
      title: "Work",
      items: [
        {
          icon: "access-time",
          label: "Attendance History",
          subtitle: "View past attendance records",
          showChevron: true,
        },
        {
          icon: "event-note",
          label: "Leave Requests",
          subtitle: "Apply & track leaves",
          showChevron: true,
        },
        {
          icon: "description",
          label: "Documents",
          subtitle: "Payslips, letters, certificates",
          showChevron: true,
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
        },
        {
          icon: "info-outline",
          label: "About",
          subtitle: "App version, terms",
          showChevron: true,
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
    headerTopRow: {
      flexDirection: "row",
      justifyContent: "flex-end",
      marginBottom: 16,
    },
    settingsButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: "rgba(255,255,255,0.2)",
      alignItems: "center",
      justifyContent: "center",
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
    statsRow: {
      flexDirection: "row",
      marginHorizontal: 20,
      marginTop: -24,
      backgroundColor: colors.card.background,
      borderRadius: 16,
      paddingVertical: 18,
      paddingHorizontal: 8,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 4,
    },
    statItem: {
      flex: 1,
      alignItems: "center",
    },
    statDivider: {
      width: 1,
      backgroundColor: colors.divider,
      marginVertical: 4,
    },
    statValue: {
      fontSize: 20,
      fontWeight: "700",
      color: colors.textPrimary,
      marginBottom: 4,
    },
    statLabel: {
      fontSize: 11,
      color: colors.textTertiary,
      fontWeight: "500",
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    content: {
      paddingHorizontal: 20,
      paddingTop: 24,
      paddingBottom: 40,
    },
    sectionTitle: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.textTertiary,
      textTransform: "uppercase",
      letterSpacing: 1,
      marginBottom: 10,
      marginTop: 20,
      marginLeft: 4,
    },
    menuCard: {
      backgroundColor: colors.card.background,
      borderRadius: 14,
      overflow: "hidden",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 6,
      elevation: 2,
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
      width: 38,
      height: 38,
      borderRadius: 10,
      backgroundColor: colors.backgroundAlt,
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
      marginBottom: 2,
    },
    menuSubtitle: {
      fontSize: 12,
      color: colors.textTertiary,
    },
    menuDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.divider,
      marginLeft: 68,
    },
    logoutButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.card.background,
      borderRadius: 14,
      paddingVertical: 16,
      marginTop: 28,
      gap: 8,
      borderWidth: 1,
      borderColor: colors.error + "30",
    },
    logoutText: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.error,
    },
    versionText: {
      textAlign: "center",
      fontSize: 12,
      color: colors.textTertiary,
      marginTop: 20,
    },
  });

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header with Avatar */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <Pressable style={styles.settingsButton}>
            <MaterialIcons name="settings" size={20} color="#FFFFFF" />
          </Pressable>
        </View>
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>{initials || "?"}</Text>
          </View>
          <Text style={styles.profileName}>{fullName || "Loading..."}</Text>
          <Text style={styles.profileRole}>{roleLabel}</Text>
          {user?.email && (
            <Text style={styles.profileEmail}>{user.email}</Text>
          )}
          {companyInfo && (
            <View style={styles.companyChip}>
              <MaterialIcons name="business" size={14} color="rgba(255,255,255,0.9)" />
              <Text style={styles.companyChipText}>
                {companyInfo.companyName}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Quick Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>13</Text>
          <Text style={styles.statLabel}>Present</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>02</Text>
          <Text style={styles.statLabel}>Absent</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>04</Text>
          <Text style={styles.statLabel}>Late</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>01</Text>
          <Text style={styles.statLabel}>Leave</Text>
        </View>
      </View>

      {/* Menu Sections */}
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

        {/* Logout */}
        <Pressable style={styles.logoutButton} onPress={handleLogout}>
          <MaterialIcons name="logout" size={20} color={colors.error} />
          <Text style={styles.logoutText}>Logout</Text>
        </Pressable>

        <Text style={styles.versionText}>CareNest v1.0.0</Text>
      </View>
    </ScrollView>
  );
}
