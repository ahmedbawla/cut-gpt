import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { Eye, EyeOff, ArrowRight, UserPlus, Briefcase, Phone, Mail, ShieldCheck } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useAuth } from '@/hooks/useAuth';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type AuthMode = 'login' | 'signup';
type SignupMethod = 'email' | 'phone';
type SignupStep = 'info' | 'verify';

function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export default function LoginScreen() {
  const router = useRouter();
  const { login, signup, isLoggingIn, isSigningUp } = useAuth();

  const [mode, setMode] = useState<AuthMode>('login');
  const [signupMethod, setSignupMethod] = useState<SignupMethod>('email');
  const [signupStep, setSignupStep] = useState<SignupStep>('info');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const logoFade = useRef(new Animated.Value(0)).current;
  const logoSlide = useRef(new Animated.Value(-20)).current;

  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(logoFade, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(logoSlide, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  const toggleMode = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMode((m) => (m === 'login' ? 'signup' : 'login'));
    setSignupStep('info');
    setError(null);
    setPassword('');
    setConfirmPassword('');
    setVerificationCode('');
  }, []);

  const validateEmail = useCallback((e: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  }, []);

  const validatePhone = useCallback((p: string) => {
    return /^\+?[\d\s\-()]{10,}$/.test(p);
  }, []);

  const handleLogin = useCallback(async () => {
    setError(null);
    if (!email.trim()) { setError('Please enter your email'); return; }
    if (!validateEmail(email.trim())) { setError('Please enter a valid email'); return; }
    if (!password || password.length < 6) { setError('Password must be at least 6 characters'); return; }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await login(email.trim(), password);
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [email, password, login, validateEmail]);

  const handleSignupStep1 = useCallback(() => {
    setError(null);
    if (!fullName.trim()) { setError('Please enter your full name'); return; }

    if (signupMethod === 'email') {
      if (!email.trim()) { setError('Please enter your email'); return; }
      if (!validateEmail(email.trim())) { setError('Please enter a valid email'); return; }
    } else {
      if (!phone.trim()) { setError('Please enter your phone number'); return; }
      if (!validatePhone(phone.trim())) { setError('Please enter a valid phone number'); return; }
    }

    if (!password || password.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const code = generateCode();
    setGeneratedCode(code);
    setSignupStep('verify');

    const target = signupMethod === 'email' ? email.trim() : phone.trim();
    console.log(`[Auth] Verification code for ${target}: ${code}`);
    Alert.alert(
      'Verification Code Sent',
      `A 6-digit code has been sent to ${target}.\n\nFor demo: ${code}`,
    );
  }, [fullName, email, phone, password, confirmPassword, signupMethod, validateEmail, validatePhone]);

  const handleVerifyAndSignup = useCallback(async () => {
    setError(null);
    if (verificationCode.length !== 6) { setError('Please enter the 6-digit code'); return; }
    if (verificationCode !== generatedCode) { setError('Invalid verification code'); return; }

    setIsVerifying(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    try {
      const signupEmail = signupMethod === 'email' ? email.trim() : `${phone.replace(/\D/g, '')}@phone.cuttr.app`;
      await signup(fullName.trim(), signupEmail, password);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsVerifying(false);
    }
  }, [verificationCode, generatedCode, signupMethod, email, phone, fullName, password, signup]);

  const handleResendCode = useCallback(() => {
    const code = generateCode();
    setGeneratedCode(code);
    setVerificationCode('');
    const target = signupMethod === 'email' ? email.trim() : phone.trim();
    console.log(`[Auth] Resent verification code for ${target}: ${code}`);
    Alert.alert('Code Resent', `A new code has been sent.\n\nFor demo: ${code}`);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [signupMethod, email, phone]);

  const isSubmitting = isLoggingIn || isSigningUp || isVerifying;

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View
            style={[
              styles.brandSection,
              { opacity: logoFade, transform: [{ translateY: logoSlide }] },
            ]}
          >
            <Image
              source={require('@/assets/images/cuttr-logo.png')}
              style={styles.logoImage}
              contentFit="contain"
            />
          </Animated.View>

          <Animated.View
            style={[
              styles.formCard,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}
          >
            {mode === 'login' ? (
              <>
                <Text style={styles.formTitle}>Welcome back</Text>
                <Text style={styles.formSubtitle}>Sign in to your account</Text>

                {error && (
                  <View style={styles.errorBanner}>
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                )}

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Email</Text>
                  <TextInput
                    ref={emailRef}
                    style={styles.input}
                    placeholder="you@example.com"
                    placeholderTextColor={Colors.textMuted}
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    autoComplete="email"
                    returnKeyType="next"
                    onSubmitEditing={() => passwordRef.current?.focus()}
                    testID="input-email"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Password</Text>
                  <View style={styles.passwordWrap}>
                    <TextInput
                      ref={passwordRef}
                      style={[styles.input, styles.passwordInput]}
                      placeholder="Min. 6 characters"
                      placeholderTextColor={Colors.textMuted}
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      autoComplete="password"
                      returnKeyType="done"
                      onSubmitEditing={handleLogin}
                      testID="input-password"
                    />
                    <Pressable
                      onPress={() => setShowPassword((s) => !s)}
                      style={styles.eyeBtn}
                      hitSlop={10}
                    >
                      {showPassword ? (
                        <EyeOff color={Colors.textMuted} size={18} />
                      ) : (
                        <Eye color={Colors.textMuted} size={18} />
                      )}
                    </Pressable>
                  </View>
                </View>

                <Pressable
                  onPress={handleLogin}
                  style={({ pressed }) => [
                    styles.submitBtn,
                    isSubmitting && styles.submitBtnDisabled,
                    pressed && !isSubmitting && styles.submitBtnPressed,
                  ]}
                  disabled={isSubmitting}
                  testID="submit-btn"
                >
                  {isSubmitting ? (
                    <ActivityIndicator color={Colors.white} size="small" />
                  ) : (
                    <>
                      <Text style={styles.submitBtnText}>Sign In</Text>
                      <ArrowRight color={Colors.white} size={18} />
                    </>
                  )}
                </Pressable>
              </>
            ) : signupStep === 'info' ? (
              <>
                <Text style={styles.formTitle}>Create account</Text>
                <Text style={styles.formSubtitle}>Start your style journey</Text>

                {error && (
                  <View style={styles.errorBanner}>
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                )}

                <View style={styles.methodToggle}>
                  <Pressable
                    onPress={() => { setSignupMethod('email'); setError(null); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                    style={[styles.methodBtn, signupMethod === 'email' && styles.methodBtnActive]}
                  >
                    <Mail color={signupMethod === 'email' ? Colors.white : Colors.textMuted} size={14} />
                    <Text style={[styles.methodBtnText, signupMethod === 'email' && styles.methodBtnTextActive]}>Email</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => { setSignupMethod('phone'); setError(null); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                    style={[styles.methodBtn, signupMethod === 'phone' && styles.methodBtnActive]}
                  >
                    <Phone color={signupMethod === 'phone' ? Colors.white : Colors.textMuted} size={14} />
                    <Text style={[styles.methodBtnText, signupMethod === 'phone' && styles.methodBtnTextActive]}>Phone</Text>
                  </Pressable>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Full Name</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Your name"
                    placeholderTextColor={Colors.textMuted}
                    value={fullName}
                    onChangeText={setFullName}
                    autoCapitalize="words"
                    returnKeyType="next"
                    testID="input-fullname"
                  />
                </View>

                {signupMethod === 'email' ? (
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Email</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="you@example.com"
                      placeholderTextColor={Colors.textMuted}
                      value={email}
                      onChangeText={setEmail}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      autoComplete="email"
                      returnKeyType="next"
                      testID="input-signup-email"
                    />
                  </View>
                ) : (
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Phone Number</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="+1 (555) 123-4567"
                      placeholderTextColor={Colors.textMuted}
                      value={phone}
                      onChangeText={setPhone}
                      keyboardType="phone-pad"
                      returnKeyType="next"
                      testID="input-signup-phone"
                    />
                  </View>
                )}

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Password</Text>
                  <View style={styles.passwordWrap}>
                    <TextInput
                      style={[styles.input, styles.passwordInput]}
                      placeholder="Min. 6 characters"
                      placeholderTextColor={Colors.textMuted}
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      returnKeyType="next"
                      onSubmitEditing={() => confirmRef.current?.focus()}
                      testID="input-password"
                    />
                    <Pressable
                      onPress={() => setShowPassword((s) => !s)}
                      style={styles.eyeBtn}
                      hitSlop={10}
                    >
                      {showPassword ? (
                        <EyeOff color={Colors.textMuted} size={18} />
                      ) : (
                        <Eye color={Colors.textMuted} size={18} />
                      )}
                    </Pressable>
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Confirm Password</Text>
                  <TextInput
                    ref={confirmRef}
                    style={styles.input}
                    placeholder="Re-enter password"
                    placeholderTextColor={Colors.textMuted}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showPassword}
                    returnKeyType="done"
                    onSubmitEditing={handleSignupStep1}
                    testID="input-confirm-password"
                  />
                </View>

                <Pressable
                  onPress={handleSignupStep1}
                  style={({ pressed }) => [
                    styles.submitBtn,
                    pressed && styles.submitBtnPressed,
                  ]}
                  testID="signup-next-btn"
                >
                  <Text style={styles.submitBtnText}>Continue</Text>
                  <ShieldCheck color={Colors.white} size={18} />
                </Pressable>
              </>
            ) : (
              <>
                <View style={styles.verifyHeader}>
                  <View style={styles.verifyIconWrap}>
                    <ShieldCheck color={Colors.accent} size={28} />
                  </View>
                  <Text style={styles.formTitle}>Verify Your Account</Text>
                  <Text style={styles.formSubtitle}>
                    Enter the 6-digit code sent to{'\n'}
                    <Text style={styles.verifyTarget}>
                      {signupMethod === 'email' ? email : phone}
                    </Text>
                  </Text>
                </View>

                {error && (
                  <View style={styles.errorBanner}>
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                )}

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Verification Code</Text>
                  <TextInput
                    style={[styles.input, styles.codeInput]}
                    placeholder="000000"
                    placeholderTextColor={Colors.textMuted}
                    value={verificationCode}
                    onChangeText={(t) => setVerificationCode(t.replace(/\D/g, '').slice(0, 6))}
                    keyboardType="number-pad"
                    maxLength={6}
                    returnKeyType="done"
                    onSubmitEditing={handleVerifyAndSignup}
                    testID="input-verification-code"
                  />
                </View>

                <Pressable
                  onPress={handleVerifyAndSignup}
                  style={({ pressed }) => [
                    styles.submitBtn,
                    isSubmitting && styles.submitBtnDisabled,
                    pressed && !isSubmitting && styles.submitBtnPressed,
                  ]}
                  disabled={isSubmitting}
                  testID="verify-btn"
                >
                  {isSubmitting ? (
                    <ActivityIndicator color={Colors.white} size="small" />
                  ) : (
                    <>
                      <Text style={styles.submitBtnText}>Verify & Create Account</Text>
                      <UserPlus color={Colors.white} size={18} />
                    </>
                  )}
                </Pressable>

                <View style={styles.resendRow}>
                  <Text style={styles.resendText}>Didn't receive the code?</Text>
                  <Pressable onPress={handleResendCode} hitSlop={8}>
                    <Text style={styles.resendLink}>Resend</Text>
                  </Pressable>
                </View>

                <Pressable onPress={() => { setSignupStep('info'); setError(null); }} style={styles.backToInfoBtn}>
                  <Text style={styles.backToInfoText}>Back to account details</Text>
                </Pressable>
              </>
            )}

            <Pressable onPress={toggleMode} style={styles.switchBtn} testID="switch-mode-btn">
              <Text style={styles.switchText}>
                {mode === 'login'
                  ? "Don't have an account? "
                  : 'Already have an account? '}
                <Text style={styles.switchTextAccent}>
                  {mode === 'login' ? 'Sign Up' : 'Sign In'}
                </Text>
              </Text>
            </Pressable>
          </Animated.View>

          <View style={styles.barberSection}>
            <View style={styles.barberDivider}>
              <View style={styles.barberDividerLine} />
              <Text style={styles.barberDividerText}>OR</Text>
              <View style={styles.barberDividerLine} />
            </View>

            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/barber-login' as any);
              }}
              style={({ pressed }) => [
                styles.barberLoginBtn,
                pressed && styles.barberLoginBtnPressed,
              ]}
              testID="barber-login-btn"
            >
              <Briefcase color={Colors.text} size={18} />
              <Text style={styles.barberLoginText}>Barber Portal</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  brandSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
    width: '100%',
  },
  logoImage: {
    width: SCREEN_WIDTH * 0.75,
    height: 180,
    alignSelf: 'center',
  },
  formCard: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  formTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  formSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 24,
  },
  verifyHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  verifyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  verifyTarget: {
    color: Colors.accent,
    fontWeight: '600' as const,
  },
  methodToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 3,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  methodBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  methodBtnActive: {
    backgroundColor: Colors.accent,
  },
  methodBtnText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textMuted,
  },
  methodBtnTextActive: {
    color: Colors.white,
  },
  errorBanner: {
    backgroundColor: Colors.errorMuted,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.errorBorder,
  },
  errorText: {
    color: Colors.error,
    fontSize: 13,
    fontWeight: '500' as const,
    lineHeight: 18,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '600' as const,
    letterSpacing: 1,
    marginBottom: 8,
    textTransform: 'uppercase' as const,
  },
  input: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  codeInput: {
    fontSize: 24,
    fontWeight: '700' as const,
    textAlign: 'center' as const,
    letterSpacing: 8,
  },
  passwordWrap: {
    position: 'relative' as const,
  },
  passwordInput: {
    paddingRight: 50,
  },
  eyeBtn: {
    position: 'absolute' as const,
    right: 16,
    top: 0,
    bottom: 0,
    justifyContent: 'center' as const,
  },
  submitBtn: {
    backgroundColor: Colors.accent,
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
    marginTop: 8,
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitBtnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  submitBtnText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700' as const,
  },
  resendRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 6,
    marginTop: 20,
  },
  resendText: {
    color: Colors.textSecondary,
    fontSize: 13,
  },
  resendLink: {
    color: Colors.accent,
    fontSize: 13,
    fontWeight: '700' as const,
  },
  backToInfoBtn: {
    alignItems: 'center' as const,
    marginTop: 12,
    paddingVertical: 8,
  },
  backToInfoText: {
    color: Colors.textMuted,
    fontSize: 13,
  },
  switchBtn: {
    marginTop: 20,
    alignItems: 'center' as const,
    paddingVertical: 8,
  },
  switchText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  switchTextAccent: {
    color: Colors.accent,
    fontWeight: '700' as const,
  },
  barberSection: {
    marginTop: 32,
  },
  barberDivider: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: 20,
    gap: 12,
  },
  barberDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  barberDividerText: {
    color: Colors.textDim,
    fontSize: 11,
    fontWeight: '600' as const,
    letterSpacing: 1,
  },
  barberLoginBtn: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  barberLoginBtnPressed: {
    opacity: 0.8,
  },
  barberLoginText: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '600' as const,
  },
});
