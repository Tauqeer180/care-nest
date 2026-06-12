import { useEffect, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/hooks/useTheme";
import { MaterialIcons } from "@expo/vector-icons";
import { getStoredUser, getStoredCompanyInfo } from "@/services/api";
import { forgotPassword, resetPassword, UserType } from "@/services/authService";

type Step = "request" | "verify";

export default function ChangePasswordScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState("");
  const [companyCode, setCompanyCode] = useState("");
  const [userType, setUserType] = useState<UserType>("employee");
  const [userId, setUserId] = useState("");

  const [step, setStep] = useState<Step>("request");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const [otpError, setOtpError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmError, setConfirmError] = useState("");

  useEffect(() => {
    Promise.all([getStoredUser(), getStoredCompanyInfo()]).then(([u, c]) => {
      if (u) {
        setEmail(u.email);
        setUserType((u.userType as UserType) ?? "employee");
      }
      if (c?.companyCode) setCompanyCode(c.companyCode);
    });
  }, []);

  const handleSendOtp = async () => {
    if (!email || !companyCode) {
      Alert.alert("Error", "Missing account information. Please re-login and try again.");
      return;
    }
    setLoading(true);
    try {
      const res = await forgotPassword(email, companyCode, userType);
      setUserId(res.data.userId);
      setStep("verify");
    } catch (error: any) {
      if (error.message === "SESSION_EXPIRED") return;
      Alert.alert("Error", error.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    let hasError = false;
    setOtpError("");
    setPasswordError("");
    setConfirmError("");

    if (!otp.trim()) {
      setOtpError("OTP is required");
      hasError = true;
    }
    if (!newPassword.trim()) {
      setPasswordError("Password is required");
      hasError = true;
    } else if (newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters");
      hasError = true;
    }
    if (newPassword !== confirmPassword) {
      setConfirmError("Passwords do not match");
      hasError = true;
    }
    if (hasError) return;

    setLoading(true);
    try {
      await resetPassword(userId, otp, newPassword, userType);
      Alert.alert("Success", "Your password has been changed successfully.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error: any) {
      if (error.message === "SESSION_EXPIRED") return;
      Alert.alert("Error", error.message || "Failed to change password");
    } finally {
      setLoading(false);
    }
  };

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
        <Text style={styles.headerTitle}>Change Password</Text>
        <View style={{ width: 32 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + 24 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {step === "request" ? (
            <>
              <View style={[styles.iconCircle, { backgroundColor: colors.primary + "15" }]}>
                <MaterialIcons name="lock-reset" size={36} color={colors.primary} />
              </View>
              <Text style={[styles.title, { color: colors.textPrimary }]}>
                Verify it&apos;s you
              </Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                We&apos;ll send a one-time code to{" "}
                <Text style={{ fontWeight: "700", color: colors.primary }}>{email}</Text> to
                confirm the password change.
              </Text>

              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: colors.primary }]}
                onPress={handleSendOtp}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.submitBtnText}>Send OTP</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={[styles.subtitle, { color: colors.textSecondary, marginTop: 8 }]}>
                Enter the OTP sent to{" "}
                <Text style={{ fontWeight: "700", color: colors.primary }}>{email}</Text> and
                set your new password.
              </Text>

              {/* OTP */}
              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.textPrimary }]}>OTP Code</Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      borderColor: colors.input.border,
                      color: colors.input.text,
                      backgroundColor: colors.input.background,
                    },
                  ]}
                  placeholder="Enter 6-digit OTP"
                  placeholderTextColor={colors.input.placeholder}
                  value={otp}
                  onChangeText={(t) => {
                    setOtp(t);
                    setOtpError("");
                  }}
                  keyboardType="number-pad"
                  maxLength={6}
                />
                {otpError ? <Text style={[styles.errorText, { color: colors.error }]}>{otpError}</Text> : null}
              </View>

              {/* New Password */}
              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.textPrimary }]}>New Password</Text>
                <View
                  style={[
                    styles.passwordRow,
                    { borderColor: colors.input.border, backgroundColor: colors.input.background },
                  ]}
                >
                  <TextInput
                    style={[styles.passwordInput, { color: colors.input.text }]}
                    placeholder="Enter new password"
                    placeholderTextColor={colors.input.placeholder}
                    value={newPassword}
                    onChangeText={(t) => {
                      setNewPassword(t);
                      setPasswordError("");
                    }}
                    secureTextEntry={!showPassword}
                  />
                  <Pressable style={styles.eyeBtn} onPress={() => setShowPassword(!showPassword)}>
                    <MaterialIcons
                      name={showPassword ? "visibility" : "visibility-off"}
                      size={22}
                      color={colors.textTertiary}
                    />
                  </Pressable>
                </View>
                {passwordError ? (
                  <Text style={[styles.errorText, { color: colors.error }]}>{passwordError}</Text>
                ) : null}
              </View>

              {/* Confirm Password */}
              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.textPrimary }]}>Confirm Password</Text>
                <View
                  style={[
                    styles.passwordRow,
                    { borderColor: colors.input.border, backgroundColor: colors.input.background },
                  ]}
                >
                  <TextInput
                    style={[styles.passwordInput, { color: colors.input.text }]}
                    placeholder="Confirm new password"
                    placeholderTextColor={colors.input.placeholder}
                    value={confirmPassword}
                    onChangeText={(t) => {
                      setConfirmPassword(t);
                      setConfirmError("");
                    }}
                    secureTextEntry={!showConfirm}
                  />
                  <Pressable style={styles.eyeBtn} onPress={() => setShowConfirm(!showConfirm)}>
                    <MaterialIcons
                      name={showConfirm ? "visibility" : "visibility-off"}
                      size={22}
                      color={colors.textTertiary}
                    />
                  </Pressable>
                </View>
                {confirmError ? (
                  <Text style={[styles.errorText, { color: colors.error }]}>{confirmError}</Text>
                ) : null}
              </View>

              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: colors.primary }]}
                onPress={handleReset}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.submitBtnText}>Change Password</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.resendBtn}
                onPress={handleSendOtp}
                disabled={loading}
              >
                <Text style={[styles.resendText, { color: colors.secondary }]}>
                  Didn&apos;t get the code? Resend
                </Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
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

  content: { padding: 20 },

  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginTop: 16,
    marginBottom: 16,
  },
  title: { fontSize: 22, fontWeight: "700", textAlign: "center", marginBottom: 8 },
  subtitle: { fontSize: 14, textAlign: "center", lineHeight: 20, marginBottom: 24 },

  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: "600", marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 14,
  },
  passwordRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 8,
  },
  passwordInput: { flex: 1, paddingVertical: 12, paddingHorizontal: 14, fontSize: 14 },
  eyeBtn: { paddingHorizontal: 12 },
  errorText: { fontSize: 12, marginTop: 6 },

  submitBtn: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  submitBtnText: { color: "white", fontSize: 16, fontWeight: "700", letterSpacing: 0.5 },
  resendBtn: { alignItems: "center", marginTop: 16 },
  resendText: { fontSize: 13, fontWeight: "600" },
});
