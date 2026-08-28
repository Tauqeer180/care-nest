import { useTheme } from "@/hooks/useTheme";
import { getClientProfile, updateClientProfile } from "@/services/clientAuthService";
import { SWR_KEYS } from "@/services/swrKeys";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import useSWR from "swr";

export default function ClientEditProfileScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { data: profile, isLoading, mutate } = useSWR(
    SWR_KEYS.clientProfile(),
    getClientProfile
  );

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);

  const [firstNameError, setFirstNameError] = useState("");
  const [lastNameError, setLastNameError] = useState("");
  const [emailError, setEmailError] = useState("");

  // Seed the form once the profile arrives.
  useEffect(() => {
    if (!profile) return;
    setFirstName(profile.firstName);
    setLastName(profile.lastName);
    setEmail(profile.email);
    setPhone(profile.phone);
  }, [profile]);

  const validateEmail = (value: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const handleSave = async () => {
    let hasError = false;
    setFirstNameError("");
    setLastNameError("");
    setEmailError("");

    if (!firstName.trim()) {
      setFirstNameError("First name is required");
      hasError = true;
    }
    if (!lastName.trim()) {
      setLastNameError("Last name is required");
      hasError = true;
    }
    if (!email.trim()) {
      setEmailError("Email is required");
      hasError = true;
    } else if (!validateEmail(email.trim())) {
      setEmailError("Please enter a valid email");
      hasError = true;
    }
    if (hasError) return;

    setSaving(true);
    try {
      // The API takes snake_case; updateClientProfile also refreshes the
      // cached user so the profile header reflects the change immediately.
      const updated = await updateClientProfile({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
        phone: phone.trim(),
      });
      await mutate(updated, { revalidate: false });
      Alert.alert("Saved", "Your profile has been updated.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error: any) {
      if (error.message === "SESSION_EXPIRED") return;
      Alert.alert("Error", error.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: colors.primary,
      paddingHorizontal: 16,
      paddingBottom: 16,
      paddingTop: insets.top + 12,
    },
    headerBack: { padding: 4 },
    headerTitle: {
      flex: 1,
      textAlign: "center",
      fontSize: 18,
      fontWeight: "700",
      color: "white",
    },
    centered: { flex: 1, alignItems: "center", justifyContent: "center" },
    content: { padding: 20 },
    readOnlyCard: {
      backgroundColor: colors.card.background,
      borderRadius: 14,
      padding: 14,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      marginBottom: 20,
    },
    readOnlyLabel: { fontSize: 11, fontWeight: "600", color: colors.textTertiary },
    readOnlyValue: { fontSize: 14, fontWeight: "600", color: colors.textPrimary },
    inputGroup: { marginBottom: 16 },
    label: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.textPrimary,
      marginBottom: 8,
    },
    labelRequired: { color: colors.error },
    input: {
      borderWidth: 1,
      borderColor: colors.input.border,
      backgroundColor: colors.input.background,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      color: colors.input.text,
    },
    inputFocused: { borderColor: colors.input.focused },
    errorText: { fontSize: 12, color: colors.error, marginTop: 6 },
    saveButton: {
      backgroundColor: colors.button.primary,
      borderRadius: 12,
      paddingVertical: 15,
      alignItems: "center",
      marginTop: 8,
    },
    saveButtonDisabled: { backgroundColor: colors.button.disabled },
    saveButtonText: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.button.primaryText,
    },
  });

  const field = (
    key: string,
    label: string,
    value: string,
    onChange: (text: string) => void,
    error: string,
    required = false,
    keyboardType: "default" | "email-address" | "phone-pad" = "default"
  ) => (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>
        {label}
        {required ? <Text style={styles.labelRequired}>*</Text> : null}
      </Text>
      <TextInput
        style={[styles.input, focused === key && styles.inputFocused]}
        value={value}
        onChangeText={onChange}
        onFocus={() => setFocused(key)}
        onBlur={() => setFocused(null)}
        editable={!saving}
        keyboardType={keyboardType}
        autoCapitalize={keyboardType === "email-address" ? "none" : "words"}
        autoCorrect={false}
        placeholderTextColor={colors.input.placeholder}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBack}>
          <MaterialIcons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Personal Information</Text>
        <View style={{ width: 32 }} />
      </View>

      {isLoading && !profile ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Username identifies the account and isn't editable here. */}
            {profile?.username ? (
              <View style={styles.readOnlyCard}>
                <MaterialIcons
                  name="account-circle"
                  size={22}
                  color={colors.textTertiary}
                />
                <View>
                  <Text style={styles.readOnlyLabel}>Username</Text>
                  <Text style={styles.readOnlyValue}>{profile.username}</Text>
                </View>
              </View>
            ) : null}

            {field("first", "First Name", firstName, (t) => {
              setFirstName(t);
              setFirstNameError("");
            }, firstNameError, true)}

            {field("last", "Last Name", lastName, (t) => {
              setLastName(t);
              setLastNameError("");
            }, lastNameError, true)}

            {field("email", "Email", email, (t) => {
              setEmail(t);
              setEmailError("");
            }, emailError, true, "email-address")}

            {field("phone", "Phone", phone, setPhone, "", false, "phone-pad")}

            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.85}
            >
              {saving ? (
                <ActivityIndicator size="small" color={colors.button.primaryText} />
              ) : (
                <Text style={styles.saveButtonText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}
