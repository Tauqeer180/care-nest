/**
 * Reset Password Screen - CareNest Mobile App
 *
 * OTP verification and new password entry after forgot-password flow
 */

import { useTheme } from "@/hooks/useTheme";
import { resetPassword, UserType } from "@/services/authService";
import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  // SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ResetPasswordScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { userId, email, userType } = useLocalSearchParams<{
    userId: string;
    email: string;
    userType: string;
  }>();

  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const [otpFocused, setOtpFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [confirmFocused, setConfirmFocused] = useState(false);

  const [otpError, setOtpError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmError, setConfirmError] = useState("");

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
      await resetPassword(userId!, otp, newPassword, userType as UserType);
      setSuccess(true);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  const styles = StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    contentContainer: {
      paddingHorizontal: 20,
      paddingVertical: 24,
    },
    scrollContent: {
      flexGrow: 1,
      justifyContent: "center",
    },
    backButton: {
      alignSelf: "flex-start",
      padding: 8,
      marginBottom: 16,
    },
    backButtonText: {
      fontSize: 24,
      color: colors.textPrimary,
    },
    headerContainer: {
      marginBottom: 32,
      alignItems: "center",
    },
    headingText: {
      fontSize: 28,
      fontWeight: "700",
      color: colors.textPrimary,
      marginBottom: 8,
      textAlign: "center",
    },
    subtitleText: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: "center",
      lineHeight: 20,
    },
    emailHighlight: {
      fontWeight: "600",
      color: colors.primary,
    },
    formContainer: {
      marginBottom: 24,
    },
    inputGroup: {
      marginBottom: 16,
    },
    label: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.textPrimary,
      marginBottom: 8,
    },
    labelRequired: {
      color: colors.error,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.input.border,
      borderRadius: 8,
      paddingVertical: 12,
      paddingHorizontal: 14,
      fontSize: 14,
      color: colors.input.text,
      backgroundColor: colors.input.background,
    },
    inputFocused: {
      borderColor: colors.input.focused,
      borderWidth: 2,
      paddingHorizontal: 13,
    },
    passwordContainer: {
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.input.border,
      borderRadius: 8,
      backgroundColor: colors.input.background,
    },
    passwordContainerFocused: {
      borderColor: colors.input.focused,
      borderWidth: 2,
    },
    passwordInput: {
      flex: 1,
      paddingVertical: 12,
      paddingHorizontal: 14,
      fontSize: 14,
      color: colors.input.text,
    },
    togglePasswordButton: {
      paddingHorizontal: 12,
    },
    errorText: {
      fontSize: 12,
      color: colors.error,
      marginTop: 6,
    },
    submitButton: {
      backgroundColor: colors.button.primary,
      paddingVertical: 14,
      borderRadius: 8,
      alignItems: "center",
      marginBottom: 16,
    },
    submitButtonPressed: {
      opacity: 0.9,
    },
    submitButtonText: {
      color: colors.button.primaryText,
      fontSize: 16,
      fontWeight: "700",
      letterSpacing: 0.5,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    successContainer: {
      alignItems: "center",
      marginBottom: 32,
    },
    successIcon: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: colors.success,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 16,
    },
    successTitle: {
      fontSize: 24,
      fontWeight: "700",
      color: colors.textPrimary,
      marginBottom: 8,
      textAlign: "center",
    },
    successMessage: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: "center",
      lineHeight: 20,
    },
  });

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.subtitleText, { marginTop: 16 }]}>
            Resetting password...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (success) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.contentContainer}>
            <View style={styles.successContainer}>
              <View style={styles.successIcon}>
                <MaterialIcons name="check" size={32} color="#FFFFFF" />
              </View>
              <Text style={styles.successTitle}>Password Reset!</Text>
              <Text style={styles.successMessage}>
                Your password has been successfully reset. You can now sign in
                with your new password.
              </Text>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.submitButton,
                pressed && styles.submitButtonPressed,
              ]}
              onPress={() => router.replace("/login")}
            >
              <Text style={styles.submitButtonText}>Go to Login</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={styles.contentContainer}>
            <Pressable style={styles.backButton} onPress={() => router.back()}>
              <Text style={styles.backButtonText}>←</Text>
            </Pressable>

            <View style={styles.headerContainer}>
              <Text style={styles.headingText}>Reset Password</Text>
              <Text style={styles.subtitleText}>
                Enter the OTP sent to{" "}
                <Text style={styles.emailHighlight}>{email}</Text> and set your
                new password
              </Text>
            </View>

            <View style={styles.formContainer}>
              {/* OTP */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  OTP Code<Text style={styles.labelRequired}>*</Text>
                </Text>
                <TextInput
                  style={[styles.input, otpFocused && styles.inputFocused]}
                  placeholder="Enter 6-digit OTP"
                  placeholderTextColor={colors.input.placeholder}
                  value={otp}
                  onChangeText={(text) => {
                    setOtp(text);
                    setOtpError("");
                  }}
                  onFocus={() => setOtpFocused(true)}
                  onBlur={() => setOtpFocused(false)}
                  keyboardType="number-pad"
                  maxLength={6}
                />
                {otpError ? (
                  <Text style={styles.errorText}>{otpError}</Text>
                ) : null}
              </View>

              {/* New Password */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  New Password<Text style={styles.labelRequired}>*</Text>
                </Text>
                <View
                  style={[
                    styles.passwordContainer,
                    passwordFocused && styles.passwordContainerFocused,
                  ]}
                >
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Enter new password"
                    placeholderTextColor={colors.input.placeholder}
                    value={newPassword}
                    onChangeText={(text) => {
                      setNewPassword(text);
                      setPasswordError("");
                    }}
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => setPasswordFocused(false)}
                    secureTextEntry={!showPassword}
                  />
                  <Pressable
                    style={styles.togglePasswordButton}
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <MaterialIcons
                      name={showPassword ? "visibility" : "visibility-off"}
                      size={22}
                      color={colors.textTertiary}
                    />
                  </Pressable>
                </View>
                {passwordError ? (
                  <Text style={styles.errorText}>{passwordError}</Text>
                ) : null}
              </View>

              {/* Confirm Password */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  Confirm Password<Text style={styles.labelRequired}>*</Text>
                </Text>
                <View
                  style={[
                    styles.passwordContainer,
                    confirmFocused && styles.passwordContainerFocused,
                  ]}
                >
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Confirm new password"
                    placeholderTextColor={colors.input.placeholder}
                    value={confirmPassword}
                    onChangeText={(text) => {
                      setConfirmPassword(text);
                      setConfirmError("");
                    }}
                    onFocus={() => setConfirmFocused(true)}
                    onBlur={() => setConfirmFocused(false)}
                    secureTextEntry={!showConfirmPassword}
                  />
                  <Pressable
                    style={styles.togglePasswordButton}
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    <MaterialIcons
                      name={
                        showConfirmPassword ? "visibility" : "visibility-off"
                      }
                      size={22}
                      color={colors.textTertiary}
                    />
                  </Pressable>
                </View>
                {confirmError ? (
                  <Text style={styles.errorText}>{confirmError}</Text>
                ) : null}
              </View>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.submitButton,
                pressed && styles.submitButtonPressed,
              ]}
              onPress={handleReset}
            >
              <Text style={styles.submitButtonText}>Reset Password</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
