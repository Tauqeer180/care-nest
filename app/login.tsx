import { ACCOUNT_TYPE_OPTIONS, identifierLabel } from "@/constants/accountTypes";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { CompanyInfo, getStoredCompanyInfo } from "@/services/api";
import {
  AccountType,
  login,
  UserType,
  validateCompanyCode,
  verifyOtp,
} from "@/services/authService";
import { clientLogin, verifyClientOtp } from "@/services/clientAuthService";
import { registerFCMToken } from "@/services/notificationService";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Step = "company" | "credentials" | "otp";

export default function LoginScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { setAuthed, refreshUser } = useAuth();

  const [step, setStep] = useState<Step>("company");
  const [companyCode, setCompanyCode] = useState("");
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [companyError, setCompanyError] = useState("");

  const [userType, setUserType] = useState<AccountType>("employee");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [companyCodeFocused, setCompanyCodeFocused] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [initialLoading, setInitialLoading] = useState(true);

  // Clients sign in through /mobile/client/* with a username (which may also be
  // an email), so the identifier field and its validation differ from staff.
  const isClientLogin = userType === "client";

  // Address the OTP was actually sent to — the client login response tells us,
  // and it can differ from the username that was typed in.
  const [otpTarget, setOtpTarget] = useState("");

  // OTP state
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState("");
  const [otpFocused, setOtpFocused] = useState(false);
  const [loginUserId, setLoginUserId] = useState("");

  useEffect(() => {
    getStoredCompanyInfo().then((info) => {
      if (info) {
        setCompanyInfo(info);
        setCompanyCode(info.companyCode);
        setStep("credentials");
      }
      setInitialLoading(false);
    });
  }, []);

  // Switching account type invalidates whatever was typed for the other one
  // (different identifier, different endpoint), so clear the form errors.
  const handleUserTypeChange = (value: AccountType) => {
    if (value === userType) return;
    setUserType(value);
    setEmailError("");
    setPasswordError("");
  };

  const validateEmail = (value: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  };

  const handleValidateCompany = async () => {
    setCompanyError("");

    if (!companyCode.trim()) {
      setCompanyError("Company code is required");
      return;
    }

    setLoading(true);
    try {
      const info = await validateCompanyCode(companyCode.trim().toUpperCase());
      setCompanyInfo(info);
      setStep("credentials");
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Invalid company code";
      setCompanyError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async () => {
    setEmailError("");
    setPasswordError("");

    if (!email.trim()) {
      setEmailError(
        isClientLogin ? "Username is required" : "Email is required"
      );
      return;
    }
    // A client identifier may be a username, so only staff get email validation.
    if (!isClientLogin && !validateEmail(email)) {
      setEmailError("Please enter a valid email");
      return;
    }
    if (!password.trim()) {
      setPasswordError("Password is required");
      return;
    }
    if (password.length < 6) {
      setPasswordError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      const data = isClientLogin
        ? await clientLogin(email.trim(), password)
        : await login(email.trim(), password, userType as UserType);
      console.log("Login response => ", data);
      setLoginUserId(data.userId);
      // Clients get back the address the OTP went to; staff only echo the input.
      setOtpTarget(("email" in data && data.email) || email.trim());
      setOtp("");
      setOtpError("");
      setStep("otp");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Login failed";
      console.log("Login error => ", error);
      setPasswordError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setOtpError("");

    if (!otp.trim()) {
      setOtpError("OTP is required");
      return;
    }
    if (otp.length < 6) {
      setOtpError("Enter the full 6-digit OTP");
      return;
    }

    setLoading(true);
    try {
      if (isClientLogin) {
        await verifyClientOtp(loginUserId, otp);
      } else {
        await verifyOtp(loginUserId, otp, userType as UserType);
      }
      // Load the freshly stored user into auth context BEFORE flipping isAuthed,
      // otherwise isAdmin stays false and admins get routed to employee screens.
      await refreshUser();
      // Register the FCM token now that we're authenticated, so it's associated
      // with this user on the backend. Fire-and-forget — must not block login.
      registerFCMToken();
      setAuthed(true);
      // Route protection will auto-redirect based on role
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "OTP verification failed";
      setOtpError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToCompany = () => {
    setStep("company");
    setCompanyInfo(null);
    setEmail("");
    setPassword("");
    setEmailError("");
    setPasswordError("");
    setOtpTarget("");
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
      justifyContent: "space-between",
    },
    scrollContent: {
      flexGrow: 1,
      justifyContent: "center",
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
      textAlign: "center",
    },
    subtitleText: {
      fontSize: 14,
      color: colors.link.color,
      textAlign: "center",
      marginBottom: 4,
    },
    companyBadge: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.card.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingVertical: 10,
      paddingHorizontal: 14,
      marginBottom: 24,
    },
    companyBadgeText: {
      flex: 1,
      marginLeft: 10,
    },
    companyBadgeName: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.textPrimary,
    },
    companyBadgeCode: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    changeButton: {
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    changeButtonText: {
      fontSize: 12,
      color: colors.link.color,
      fontWeight: "600",
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
    inputWrapper: {
      position: "relative" as const,
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
      fontFamily: Platform.OS === "ios" ? "System" : "Roboto",
    },
    inputFocused: {
      borderColor: colors.input.focused,
      borderWidth: 2,
      paddingHorizontal: 13,
    },
    passwordInputContainer: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      borderWidth: 1,
      borderColor: colors.input.border,
      borderRadius: 8,
      paddingVertical: 12,
      paddingHorizontal: 14,
      backgroundColor: colors.input.background,
    },
    passwordInputContainerFocused: {
      borderColor: colors.input.focused,
      borderWidth: 2,
      paddingHorizontal: 13,
    },
    passwordInput: {
      flex: 1,
      fontSize: 14,
      color: colors.input.text,
      fontFamily: Platform.OS === "ios" ? "System" : "Roboto",
      padding: 0,
    },
    togglePasswordButton: {
      padding: 8,
      marginLeft: 8,
    },
    errorText: {
      fontSize: 12,
      color: colors.error,
      marginTop: 6,
    },
    optionsContainer: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "space-between" as const,
      marginBottom: 24,
    },
    rememberMeContainer: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      flex: 1,
    },
    checkbox: {
      width: 18,
      height: 18,
      borderWidth: 2,
      borderColor: colors.border,
      borderRadius: 4,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      marginRight: 10,
      backgroundColor: rememberMe ? colors.primary : "transparent",
    },
    checkmark: {
      color: colors.button.primaryText,
      fontSize: 12,
      fontWeight: "bold" as const,
    },
    rememberMeText: {
      fontSize: 13,
      color: colors.textPrimary,
      fontWeight: "500" as const,
    },
    forgotPasswordText: {
      fontSize: 13,
      color: colors.link.color,
      fontWeight: "600" as const,
    },
    primaryButton: {
      backgroundColor: colors.button.primary,
      paddingVertical: 14,
      borderRadius: 8,
      alignItems: "center" as const,
      marginBottom: 16,
      flexDirection: "row" as const,
      justifyContent: "center" as const,
    },
    primaryButtonPressed: {
      opacity: 0.9,
      backgroundColor: colors.brand.primaryDark,
    },
    primaryButtonText: {
      color: colors.button.primaryText,
      fontSize: 16,
      fontWeight: "700" as const,
      letterSpacing: 0.5,
    },
    signUpContainer: {
      flexDirection: "row" as const,
      justifyContent: "center" as const,
      alignItems: "center" as const,
      paddingVertical: 16,
    },
    signUpText: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    signUpLink: {
      fontSize: 13,
      color: colors.link.color,
      fontWeight: "700" as const,
      marginLeft: 6,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center" as const,
      alignItems: "center" as const,
    },
    stepIndicator: {
      flexDirection: "row" as const,
      justifyContent: "center" as const,
      alignItems: "center" as const,
      marginBottom: 24,
    },
    stepDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginHorizontal: 4,
    },
    stepDotActive: {
      backgroundColor: colors.primary,
      width: 24,
    },
    stepDotInactive: {
      backgroundColor: colors.disabled,
    },
    userTypeContainer: {
      flexDirection: "row" as const,
      backgroundColor: colors.backgroundAlt,
      borderRadius: 8,
      padding: 4,
      marginBottom: 20,
    },
    userTypeOption: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 6,
      alignItems: "center" as const,
    },
    userTypeOptionActive: {
      backgroundColor: colors.primary,
    },
    userTypeText: {
      fontSize: 13,
      fontWeight: "600" as const,
      color: colors.textSecondary,
    },
    userTypeTextActive: {
      color: colors.button.primaryText,
    },
  });

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {(["company", "credentials", "otp"] as Step[]).map((s) => (
        <View
          key={s}
          style={[
            styles.stepDot,
            step === s ? styles.stepDotActive : styles.stepDotInactive,
          ]}
        />
      ))}
    </View>
  );

  const renderCompanyStep = () => (
    <>
      <View style={styles.headerContainer}>
        <MaterialIcons name="business" size={34} color={colors.primary} />
        <Text style={styles.welcomeText}>Company Code</Text>
        <Text style={styles.subtitleText}>
          Enter your organization's company code to get started
        </Text>
      </View>

      <View style={styles.formContainer}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            Company Code<Text style={styles.labelRequired}>*</Text>
          </Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={[styles.input, companyCodeFocused && styles.inputFocused]}
              placeholder="e.g. ANNA116"
              placeholderTextColor={colors.input.placeholder}
              value={companyCode}
              onChangeText={(text) => {
                setCompanyCode(text.toUpperCase());
                setCompanyError("");
              }}
              onFocus={() => setCompanyCodeFocused(true)}
              onBlur={() => setCompanyCodeFocused(false)}
              autoCapitalize="characters"
              editable={!loading}
              returnKeyType="go"
              onSubmitEditing={handleValidateCompany}
            />
          </View>
          {companyError ? (
            <Text style={styles.errorText}>{companyError}</Text>
          ) : null}
        </View>
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.primaryButton,
          pressed && styles.primaryButtonPressed,
        ]}
        onPress={handleValidateCompany}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color={colors.button.primaryText} />
        ) : (
          <Text style={styles.primaryButtonText}>Continue</Text>
        )}
      </Pressable>
    </>
  );

  const renderCredentialsStep = () => (
    <>
      <View style={styles.headerContainer}>
        <MaterialIcons name="login" size={34} color={colors.primary} />
        <Text style={styles.welcomeText}>Welcome Back</Text>
        <Text style={styles.subtitleText}>
          Sign in to your HomeCare+ account
        </Text>
      </View>

      {companyInfo && (
        <View style={styles.companyBadge}>
          <MaterialIcons name="business" size={20} color={colors.primary} />
          <View style={styles.companyBadgeText}>
            <Text style={styles.companyBadgeName}>
              {companyInfo.companyName}
            </Text>
            <Text style={styles.companyBadgeCode}>
              {companyInfo.companyCode}
            </Text>
          </View>
          <Pressable style={styles.changeButton} onPress={handleBackToCompany}>
            <Text style={styles.changeButtonText}>Change</Text>
          </Pressable>
        </View>
      )}

      <View style={styles.formContainer}>
        <View style={styles.userTypeContainer}>
          {ACCOUNT_TYPE_OPTIONS.map((option) => (
            <Pressable
              key={option.value}
              style={[
                styles.userTypeOption,
                userType === option.value && styles.userTypeOptionActive,
              ]}
              onPress={() => handleUserTypeChange(option.value)}
              disabled={loading}
            >
              <Text
                style={[
                  styles.userTypeText,
                  userType === option.value && styles.userTypeTextActive,
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            {identifierLabel(userType)}
            <Text style={styles.labelRequired}>*</Text>
          </Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={[styles.input, emailFocused && styles.inputFocused]}
              placeholder={
                isClientLogin ? "username or john.doe@example.com" : "john.doe@example.com"
              }
              placeholderTextColor={colors.input.placeholder}
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                setEmailError("");
              }}
              onFocus={() => setEmailFocused(true)}
              onBlur={() => setEmailFocused(false)}
              keyboardType={isClientLogin ? "default" : "email-address"}
              editable={!loading}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          {emailError ? (
            <Text style={styles.errorText}>{emailError}</Text>
          ) : null}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            Password<Text style={styles.labelRequired}>*</Text>
          </Text>
          <View
            style={[
              styles.passwordInputContainer,
              passwordFocused && styles.passwordInputContainerFocused,
            ]}
          >
            <TextInput
              style={styles.passwordInput}
              placeholder="Enter your password"
              placeholderTextColor={colors.input.placeholder}
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                setPasswordError("");
              }}
              onFocus={() => setPasswordFocused(true)}
              onBlur={() => setPasswordFocused(false)}
              secureTextEntry={!showPassword}
              editable={!loading}
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

        <View style={styles.optionsContainer}>
          <Pressable
            style={styles.rememberMeContainer}
            onPress={() => setRememberMe(!rememberMe)}
          >
            <View style={styles.checkbox}>
              {rememberMe && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.rememberMeText}>Remember me</Text>
          </Pressable>
          <Pressable onPress={() => router.push("/forgot-password")}>
            <Text style={styles.forgotPasswordText}>Forgot password?</Text>
          </Pressable>
        </View>
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.primaryButton,
          pressed && styles.primaryButtonPressed,
        ]}
        onPress={handleSignIn}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color={colors.button.primaryText} />
        ) : (
          <Text style={styles.primaryButtonText}>Sign In</Text>
        )}
      </Pressable>
    </>
  );

  const renderOtpStep = () => (
    <>
      <View style={styles.headerContainer}>
        <MaterialIcons name="verified-user" size={34} color={colors.primary} />
        <Text style={styles.welcomeText}>Verify OTP</Text>
        <Text style={styles.subtitleText}>
          We've sent a verification code to{"\n"}
          <Text style={{ fontWeight: "600", color: colors.textPrimary }}>
            {otpTarget || email}
          </Text>
        </Text>
      </View>

      <View style={styles.formContainer}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            OTP Code<Text style={styles.labelRequired}>*</Text>
          </Text>
          <View style={styles.inputWrapper}>
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
              editable={!loading}
              returnKeyType="go"
              onSubmitEditing={handleVerifyOtp}
            />
          </View>
          {otpError ? <Text style={styles.errorText}>{otpError}</Text> : null}
        </View>
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.primaryButton,
          pressed && styles.primaryButtonPressed,
        ]}
        onPress={handleVerifyOtp}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color={colors.button.primaryText} />
        ) : (
          <Text style={styles.primaryButtonText}>Verify & Sign In</Text>
        )}
      </Pressable>

      <View style={styles.signUpContainer}>
        <Text style={styles.signUpText}>Didn't receive the code?</Text>
        <Pressable
          onPress={() => {
            setStep("credentials");
            setOtp("");
            setOtpError("");
          }}
        >
          <Text style={styles.signUpLink}>Go back</Text>
        </Pressable>
      </View>
    </>
  );

  if (initialLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
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
            {renderStepIndicator()}
            {step === "company" && renderCompanyStep()}
            {step === "credentials" && renderCredentialsStep()}
            {step === "otp" && renderOtpStep()}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
