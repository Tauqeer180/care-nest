import { useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import useSWR from "swr";
import { useTheme } from "@/hooks/useTheme";
import { fetchEmployees, Employee } from "@/services/jobPoolService";
import { SWR_KEYS } from "@/services/swrKeys";

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelect: (employee: Employee) => void;
  submitting?: boolean;
}

export default function EmployeePickerModal({ visible, onClose, onSelect, submitting }: Props) {
  const { colors } = useTheme();
  const [search, setSearch] = useState("");

  const { data: employees, isLoading, error } = useSWR(
    visible ? SWR_KEYS.adminEmployees() : null,
    fetchEmployees
  );

  const filtered = (employees ?? []).filter((e) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      e.first_name.toLowerCase().includes(q) ||
      e.last_name.toLowerCase().includes(q) ||
      e.emp_code.toLowerCase().includes(q) ||
      e.email.toLowerCase().includes(q)
    );
  });

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: colors.background }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.divider }]}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Assign to Employee</Text>
            <TouchableOpacity onPress={onClose} hitSlop={8} disabled={submitting}>
              <MaterialIcons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View style={[styles.searchContainer, { backgroundColor: colors.input.background, borderColor: colors.input.border }]}>
            <MaterialIcons name="search" size={20} color={colors.textTertiary} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search by name, code, or email"
              placeholderTextColor={colors.input.placeholder}
              style={[styles.searchInput, { color: colors.input.text }]}
              editable={!submitting}
            />
          </View>

          {/* List */}
          {isLoading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : error ? (
            <View style={styles.centered}>
              <MaterialIcons name="error-outline" size={36} color={colors.error} />
              <Text style={[styles.errorText, { color: colors.textSecondary }]}>
                {(error as Error)?.message ?? "Failed to load employees"}
              </Text>
            </View>
          ) : filtered.length === 0 ? (
            <View style={styles.centered}>
              <MaterialIcons name="person-off" size={36} color={colors.textTertiary} />
              <Text style={[styles.errorText, { color: colors.textSecondary }]}>
                {search ? "No matching employees" : "No employees available"}
              </Text>
            </View>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(item) => item._id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 20 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.empRow, { borderBottomColor: colors.divider }]}
                  activeOpacity={0.7}
                  onPress={() => onSelect(item)}
                  disabled={submitting}
                >
                  <View style={[styles.avatar, { backgroundColor: colors.primary + "20" }]}>
                    <Text style={[styles.avatarText, { color: colors.primary }]}>
                      {(item.first_name.charAt(0) + item.last_name.charAt(0)).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.empInfo}>
                    <Text style={[styles.empName, { color: colors.textPrimary }]} numberOfLines={1}>
                      {item.first_name} {item.last_name}
                    </Text>
                    <Text style={[styles.empMeta, { color: colors.textSecondary }]} numberOfLines={1}>
                      {item.emp_code} · ${item.hourly_rate}/hr
                    </Text>
                    <Text style={[styles.empEmail, { color: colors.textTertiary }]} numberOfLines={1}>
                      {item.email}
                    </Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={22} color={colors.textTertiary} />
                </TouchableOpacity>
              )}
            />
          )}

          {submitting ? (
            <View style={styles.submittingOverlay}>
              <View style={[styles.submittingCard, { backgroundColor: colors.card.background }]}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.submittingText, { color: colors.textPrimary }]}>Assigning...</Text>
              </View>
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  sheet: {
    height: "85%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { fontSize: 18, fontWeight: "700" },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    marginVertical: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 14 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", gap: 10, padding: 30 },
  errorText: { fontSize: 14, textAlign: "center" },
  empRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: { fontSize: 15, fontWeight: "700" },
  empInfo: { flex: 1, minWidth: 0 },
  empName: { fontSize: 15, fontWeight: "600", marginBottom: 2 },
  empMeta: { fontSize: 12, fontWeight: "500", marginBottom: 2 },
  empEmail: { fontSize: 11, fontWeight: "400" },
  submittingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  submittingCard: {
    padding: 24,
    borderRadius: 16,
    alignItems: "center",
    gap: 12,
    minWidth: 160,
  },
  submittingText: { fontSize: 14, fontWeight: "600" },
});
