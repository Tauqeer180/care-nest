import { useEffect, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/hooks/useTheme";
import { MaterialIcons } from "@expo/vector-icons";
import {
  getStoredUser,
  getStoredCompanyInfo,
  AuthUser,
  CompanyInfo,
} from "@/services/api";

export default function PersonalInformationScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [company, setCompany] = useState<CompanyInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getStoredUser(), getStoredCompanyInfo()])
      .then(([u, c]) => {
        setUser(u);
        setCompany(c);
      })
      .finally(() => setLoading(false));
  }, []);

  const fullName = user ? `${user.firstName} ${user.lastName}`.trim() : "";
  const initials = user
    ? `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase()
    : "";
  const roleLabel = user?.userType === "superadmin" ? "Admin" : "Employee";

  const fields: { icon: keyof typeof MaterialIcons.glyphMap; label: string; value: string }[] = [
    { icon: "badge", label: "First Name", value: user?.firstName || "—" },
    { icon: "badge", label: "Last Name", value: user?.lastName || "—" },
    { icon: "email", label: "Email", value: user?.email || "—" },
    { icon: "phone", label: "Phone", value: user?.phone || "—" },
    { icon: "work-outline", label: "Role", value: roleLabel },
    ...(company
      ? [
          {
            icon: "business" as const,
            label: "Company",
            value: company.companyName,
          },
        ]
      : []),
  ];

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
        <Text style={styles.headerTitle}>Personal Information</Text>
        <View style={{ width: 32 }} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + 24 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Identity */}
          <View style={styles.identity}>
            <View style={[styles.avatar, { backgroundColor: colors.primary + "15" }]}>
              <Text style={[styles.avatarText, { color: colors.primary }]}>
                {initials || "?"}
              </Text>
            </View>
            <Text style={[styles.name, { color: colors.textPrimary }]}>
              {fullName || "—"}
            </Text>
            <Text style={[styles.role, { color: colors.textSecondary }]}>{roleLabel}</Text>
          </View>

          {/* Details */}
          <View
            style={[
              styles.card,
              { backgroundColor: colors.card.background, borderColor: colors.border },
            ]}
          >
            {fields.map((f, idx) => (
              <View key={f.label}>
                {idx > 0 && (
                  <View style={[styles.divider, { backgroundColor: colors.divider }]} />
                )}
                <View style={styles.row}>
                  <View
                    style={[styles.iconBox, { backgroundColor: colors.backgroundAlt }]}
                  >
                    <MaterialIcons name={f.icon} size={18} color={colors.primary} />
                  </View>
                  <View style={styles.rowText}>
                    <Text style={[styles.label, { color: colors.textTertiary }]}>
                      {f.label}
                    </Text>
                    <Text style={[styles.value, { color: colors.textPrimary }]}>
                      {f.value}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      )}
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

  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: 16 },

  identity: { alignItems: "center", paddingVertical: 20 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  avatarText: { fontSize: 30, fontWeight: "700" },
  name: { fontSize: 20, fontWeight: "700" },
  role: { fontSize: 13, marginTop: 2 },

  card: { borderWidth: 1, borderRadius: 14, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", padding: 14 },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  rowText: { flex: 1 },
  label: { fontSize: 12 },
  value: { fontSize: 15, fontWeight: "600", marginTop: 2 },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 64 },
});
