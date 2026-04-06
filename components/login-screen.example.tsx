/**
 * Example Login Screen Component
 *
 * This is a reference implementation showing how to use the new theme system
 * in a real component. You can use this as a template for your own components.
 */

import { useTheme } from "@/hooks/useTheme";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

export default function LoginScreen() {
  const { colors, theme } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Create dynamic styles based on current theme
  const dynamicStyles = StyleSheet.create({
    container: {
      backgroundColor: colors.background,
      flex: 1,
    },
    contentContainer: {
      flex: 1,
      justifyContent: "center",
      paddingHorizontal: 24,
      paddingVertical: 32,
    },
    headerContainer: {
      marginBottom: 32,
      alignItems: "center",
    },
    welcomeText: {
      fontSize: 28,
      fontWeight: "700",
      color: colors.textPrimary,
      marginBottom: 8,
    },
    subtitleText: {
      fontSize: 14,
      color: colors.link.color,
      marginTop: 8,
    },
    inputContainer: {
      marginBottom: 16,
    },
    inputLabel: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.textPrimary,
      marginBottom: 8,
      display: "flex",
    },
    input: {
      borderWidth: 1,
      borderColor: colors.input.border,
      borderRadius: 8,
      paddingVertical: 12,
      paddingHorizontal: 16,
      fontSize: 16,
      color: colors.input.text,
      backgroundColor: colors.input.background,
    },
    inputFocused: {
      borderColor: colors.input.focused,
    },
    passwordContainer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderWidth: 1,
      borderColor: colors.input.border,
      borderRadius: 8,
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: colors.input.background,
    },
    passwordInput: {
      flex: 1,
      fontSize: 16,
      color: colors.input.text,
    },
    togglePasswordButton: {
      padding: 8,
    },
    togglePasswordText: {
      fontSize: 18,
      color: colors.textTertiary,
    },
    checkboxContainer: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 24,
      justifyContent: "space-between",
    },
    checkboxLabel: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
    },
    checkbox: {
      width: 20,
      height: 20,
      borderWidth: 2,
      borderColor: colors.input.border,
      borderRadius: 4,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 8,
      backgroundColor: rememberMe ? colors.primary : "transparent",
    },
    checkboxCheckmark: {
      color: colors.button.primaryText,
      fontSize: 14,
      fontWeight: "bold",
    },
    checkboxText: {
      fontSize: 14,
      color: colors.textPrimary,
    },
    forgotPasswordText: {
      fontSize: 14,
      color: colors.link.color,
      fontWeight: "600",
    },
    signInButton: {
      backgroundColor: colors.button.primary,
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderRadius: 8,
      alignItems: "center",
      marginBottom: 16,
      flexDirection: "row",
      justifyContent: "center",
    },
    signInButtonText: {
      color: colors.button.primaryText,
      fontSize: 16,
      fontWeight: "700",
    },
    signInButtonPressed: {
      backgroundColor: colors.primary,
      opacity: 0.8,
    },
    bottomContainer: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      paddingBottom: 24,
    },
    signUpText: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    signUpLink: {
      fontSize: 14,
      color: colors.link.color,
      fontWeight: "700",
      marginLeft: 4,
    },
    featureContainer: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 20,
      paddingHorizontal: 20,
    },
    featureIcon: {
      width: 48,
      height: 48,
      borderRadius: 8,
      backgroundColor: colors.card.background,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 16,
    },
    featureTitle: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.textPrimary,
      marginBottom: 2,
    },
    featureDescription: {
      fontSize: 12,
      color: colors.textTertiary,
    },
  });

  const handleSignIn = async () => {
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
    }, 1500);
  };

  return (
    <ScrollView
      style={dynamicStyles.container}
      contentContainerStyle={dynamicStyles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Header Section */}
      <View style={dynamicStyles.headerContainer}>
        <Text style={dynamicStyles.welcomeText}>Welcome Back</Text>
        <Text style={dynamicStyles.subtitleText}>
          Sign in to your CareNest account
        </Text>
      </View>

      {/* Email Input */}
      <View style={dynamicStyles.inputContainer}>
        <Text style={dynamicStyles.inputLabel}>Email Address *</Text>
        <TextInput
          style={dynamicStyles.input}
          placeholder="Enter your email"
          placeholderTextColor={colors.input.placeholder}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          editable={!loading}
        />
      </View>

      {/* Password Input */}
      <View style={dynamicStyles.inputContainer}>
        <Text style={dynamicStyles.inputLabel}>Password *</Text>
        <View style={dynamicStyles.passwordContainer}>
          <TextInput
            style={dynamicStyles.passwordInput}
            placeholder="Enter your password"
            placeholderTextColor={colors.input.placeholder}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            editable={!loading}
          />
          <Pressable
            style={dynamicStyles.togglePasswordButton}
            onPress={() => setShowPassword(!showPassword)}
          >
            <Text style={dynamicStyles.togglePasswordText}>
              {showPassword ? "👁️" : "👁️‍🗨️"}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Remember Me & Forgot Password */}
      <View style={dynamicStyles.checkboxContainer}>
        <View style={dynamicStyles.checkboxLabel}>
          <Pressable
            style={dynamicStyles.checkbox}
            onPress={() => setRememberMe(!rememberMe)}
          >
            {rememberMe && (
              <Text style={dynamicStyles.checkboxCheckmark}>✓</Text>
            )}
          </Pressable>
          <Text style={dynamicStyles.checkboxText}>Remember me</Text>
        </View>
        <Pressable>
          <Text style={dynamicStyles.forgotPasswordText}>Forgot password?</Text>
        </Pressable>
      </View>

      {/* Sign In Button */}
      <Pressable
        style={({ pressed }) => [
          dynamicStyles.signInButton,
          pressed && dynamicStyles.signInButtonPressed,
        ]}
        onPress={handleSignIn}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={colors.button.primaryText} />
        ) : (
          <Text style={dynamicStyles.signInButtonText}>Sign In</Text>
        )}
      </Pressable>

      {/* Sign Up Link */}
      <View style={dynamicStyles.bottomContainer}>
        <Text style={dynamicStyles.signUpText}>Don't have an account?</Text>
        <Pressable>
          <Text style={dynamicStyles.signUpLink}>Register now</Text>
        </Pressable>
      </View>

      {/* Feature Showcase */}
      <View
        style={{
          marginTop: 32,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          paddingTop: 24,
        }}
      >
        <View style={dynamicStyles.featureContainer}>
          <View style={dynamicStyles.featureIcon}>
            <Text style={{ fontSize: 24 }}>🔒</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={dynamicStyles.featureTitle}>Secure Login</Text>
            <Text style={dynamicStyles.featureDescription}>
              Enterprise-grade security with 2FA support
            </Text>
          </View>
        </View>

        <View style={dynamicStyles.featureContainer}>
          <View style={dynamicStyles.featureIcon}>
            <Text style={{ fontSize: 24 }}>📊</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={dynamicStyles.featureTitle}>Access Dashboard</Text>
            <Text style={dynamicStyles.featureDescription}>
              Manage your subscription and team
            </Text>
          </View>
        </View>

        <View style={dynamicStyles.featureContainer}>
          <View style={dynamicStyles.featureIcon}>
            <Text style={{ fontSize: 24 }}>🕐</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={dynamicStyles.featureTitle}>24/7 Support</Text>
            <Text style={dynamicStyles.featureDescription}>
              Get help anytime you need it
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
