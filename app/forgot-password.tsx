/**
 * Forgot Password Screen - CareNest Mobile App
 *
 * Screen for users to reset their password via email
 */

import { ACCOUNT_TYPE_OPTIONS, identifierLabel } from "@/constants/accountTypes";
import { useTheme } from "@/hooks/useTheme";
import { getStoredCompanyInfo } from "@/services/api";
import { AccountType, forgotPassword, UserType } from "@/services/authService";
import { clientForgotPassword } from "@/services/clientAuthService";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
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

export default function ForgotPasswordScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [userType, setUserType] = useState<AccountType>("employee");
  const [companyCode, setCompanyCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [emailError, setEmailError] = useState("");

  useEffect(() => {
    getStoredCompanyInfo().then((info) => {
      if (info) {
        setCompanyCode(info.companyCode);
      }
    });
  }, []);

  // Clients identify by username (which may also be an email), so the field
  // label and its validation differ from staff.
  const isClient = userType === "client";

  const validateEmail = (value: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  };

  const handleResetPassword = async () => {
    setEmailError("");

    if (!email.trim()) {
      setEmailError(isClient ? "Username is required" : "Email is required");
      return;
    }

    if (!isClient && !validateEmail(email)) {
      setEmailError("Please enter a valid email");
      return;
    }

    setLoading(true);
    try {
      const response = isClient
        ? await clientForgotPassword(email.trim(), companyCode)
        : await forgotPassword(email, companyCode, userType as UserType);
      router.push({
        pathname: "/reset-password",
        params: {
          userId: response.data.userId,
          email: response.data.email,
          userType: response.data.userType,
        },
      });
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to send reset OTP");
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

    headerContainer: {
      marginBottom: 32,
      alignItems: "center",
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
    headerIcon: {
      fontSize: 32,
      marginBottom: 12,
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
    errorText: {
      fontSize: 12,
      color: colors.error,
      marginTop: 6,
    },

    // User type toggle
    userTypeContainer: {
      marginBottom: 16,
    },
    userTypeToggle: {
      flexDirection: "row",
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.input.border,
      overflow: "hidden",
    },
    userTypeOption: {
      flex: 1,
      paddingVertical: 10,
      alignItems: "center",
      backgroundColor: colors.input.background,
    },
    userTypeOptionActive: {
      backgroundColor: colors.primary,
    },
    userTypeText: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.textSecondary,
    },
    userTypeTextActive: {
      color: colors.button.primaryText,
    },

    resetButton: {
      backgroundColor: colors.button.primary,
      paddingVertical: 14,
      borderRadius: 8,
      alignItems: "center",
      marginBottom: 16,
    },
    resetButtonPressed: {
      opacity: 0.9,
    },
    resetButtonText: {
      color: colors.button.primaryText,
      fontSize: 16,
      fontWeight: "700",
      letterSpacing: 0.5,
    },

    backToLoginContainer: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
    },
    backToLoginText: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    backToLoginLink: {
      fontSize: 13,
      color: colors.link.color,
      fontWeight: "700",
      marginLeft: 6,
    },

    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
  });

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.subtitleText, { marginTop: 16 }]}>
            Sending reset OTP...
          </Text>
        </View>
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
            {/* Header */}
            <Pressable style={styles.backButton} onPress={() => router.back()}>
              <Text style={styles.backButtonText}>←</Text>
            </Pressable>

            <View style={styles.headerContainer}>
              <Text style={styles.headingText}>Reset Password</Text>
              <Text style={styles.subtitleText}>
                Enter your email address and we'll send you an OTP to reset your
                password
              </Text>
            </View>

            {/* Form */}
            <View style={styles.formContainer}>
              {/* User Type Toggle */}
              <View style={styles.userTypeContainer}>
                <Text style={styles.label}>I am a</Text>
                <View style={styles.userTypeToggle}>
                  {ACCOUNT_TYPE_OPTIONS.map((option) => (
                    <Pressable
                      key={option.value}
                      style={[
                        styles.userTypeOption,
                        userType === option.value && styles.userTypeOptionActive,
                      ]}
                      onPress={() => {
                        setUserType(option.value);
                        setEmailError("");
                      }}
                      disabled={loading}
                    >
                      <Text
                        style={[
                          styles.userTypeText,
                          userType === option.value &&
                            styles.userTypeTextActive,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Email */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  {identifierLabel(userType)}
                  <Text style={styles.labelRequired}>*</Text>
                </Text>
                <TextInput
                  style={[styles.input, emailFocused && styles.inputFocused]}
                  placeholder="john.doe@example.com"
                  placeholderTextColor={colors.input.placeholder}
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    setEmailError("");
                  }}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                {emailError ? (
                  <Text style={styles.errorText}>{emailError}</Text>
                ) : null}
              </View>
            </View>

            {/* Reset Button */}
            <Pressable
              style={({ pressed }) => [
                styles.resetButton,
                pressed && styles.resetButtonPressed,
              ]}
              onPress={handleResetPassword}
            >
              <Text style={styles.resetButtonText}>Send Reset OTP</Text>
            </Pressable>

            {/* Back to Login */}
            <View style={styles.backToLoginContainer}>
              <Text style={styles.backToLoginText}>
                Remember your password?
              </Text>
              <Pressable onPress={() => router.push("/login")}>
                <Text style={styles.backToLoginLink}>Sign In</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
