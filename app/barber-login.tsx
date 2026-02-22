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
} from 'react-native';
import { useRouter } from 'expo-router';
import { Eye, EyeOff, ArrowRight, UserPlus, ArrowLeft, MapPin, DollarSign, Plus, X, Check } from 'lucide-react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useBarbers } from '@/hooks/useBarbers';
import { HAIRCUTS } from '@/constants/haircuts';
import { BarberService } from '@/constants/barbers';
import LocationSearchComponent from '@/components/LocationSearch';

type AuthMode = 'login' | 'signup';
type SignupStep = 'credentials' | 'profile' | 'services';

export default function BarberLoginScreen() {
  const router = useRouter();
  const { barberLogin, barberSignup, isBarberLoggingIn, isBarberSigningUp } = useBarbers();

  const [mode, setMode] = useState<AuthMode>('login');
  const [signupStep, setSignupStep] = useState<SignupStep>('credentials');

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [bio, setBio] = useState('');
  const [address, setAddress] = useState('');
  const [selectedServices, setSelectedServices] = useState<BarberService[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(logoScale, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, delay: 200, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, delay: 200, useNativeDriver: true }),
    ]).start();
  }, []);

  const toggleMode = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMode((m) => (m === 'login' ? 'signup' : 'login'));
    setSignupStep('credentials');
    setError(null);
    setPassword('');
    setConfirmPassword('');
  }, []);

  const toggleService = useCallback((haircutId: string, haircutName: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedServices((prev) => {
      const exists = prev.find((s) => s.haircutId === haircutId);
      if (exists) return prev.filter((s) => s.haircutId !== haircutId);
      return [...prev, { haircutId, haircutName, rate: 30 }];
    });
  }, []);

  const updateRate = useCallback((haircutId: string, rate: string) => {
    const num = parseInt(rate, 10);
    if (isNaN(num)) return;
    setSelectedServices((prev) =>
      prev.map((s) => (s.haircutId === haircutId ? { ...s, rate: num } : s))
    );
  }, []);

  const handleLogin = useCallback(async () => {
    setError(null);
    if (!email.trim() || !password) {
      setError('Please fill in all fields');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await barberLogin(email.trim(), password);
      router.replace('/barber-dashboard' as any);
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [email, password, barberLogin, router]);

  const handleNextStep = useCallback(() => {
    setError(null);
    if (signupStep === 'credentials') {
      if (!fullName.trim()) { setError('Please enter your full name'); return; }
      if (!email.trim()) { setError('Please enter your email'); return; }
      if (!password || password.length < 6) { setError('Password must be at least 6 characters'); return; }
      if (password !== confirmPassword) { setError('Passwords do not match'); return; }
      setSignupStep('profile');
    } else if (signupStep === 'profile') {
      if (!bio.trim()) { setError('Please enter a bio'); return; }
      if (!address.trim()) { setError('Please enter your shop location'); return; }
      setSignupStep('services');
    }
  }, [signupStep, fullName, email, password, confirmPassword, bio, address]);

  const handleSignup = useCallback(async () => {
    setError(null);
    if (selectedServices.length < 3) {
      setError('Please select at least 3 haircut services');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await barberSignup({
        fullName: fullName.trim(),
        email: email.trim(),
        password,
        bio: bio.trim(),
        location: {
          address: address.trim(),
          latitude: 42.6856 + (Math.random() - 0.5) * 0.1,
          longitude: -73.7254 + (Math.random() - 0.5) * 0.1,
        },
        services: selectedServices,
        avatarUrl: null,
      });
      router.replace('/barber-dashboard' as any);
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [selectedServices, fullName, email, password, bio, address, barberSignup, router]);

  const isSubmitting = isBarberLoggingIn || isBarberSigningUp;

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
            <ArrowLeft color={Colors.text} size={20} />
          </Pressable>

          <Animated.View style={[styles.logoSection, { transform: [{ scale: logoScale }] }]}>
            <Image
              source={require('@/assets/images/cuttr-logo.png')}
              style={{ width: 140, height: 48 }}
              contentFit="contain"
            />
            <Text style={styles.appTagline}>Barber Portal</Text>
          </Animated.View>

          <Animated.View style={[styles.formSection, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            {mode === 'login' ? (
              <>
                <Text style={styles.formTitle}>Barber Sign In</Text>
                <Text style={styles.formSubtitle}>Access your barber dashboard</Text>

                {error && <View style={styles.errorBanner}><Text style={styles.errorText}>{error}</Text></View>}

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Email</Text>
                  <TextInput style={styles.input} placeholder="you@example.com" placeholderTextColor={Colors.textMuted} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" testID="barber-email" />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Password</Text>
                  <View style={styles.passwordWrap}>
                    <TextInput style={[styles.input, styles.passwordInput]} placeholder="Your password" placeholderTextColor={Colors.textMuted} value={password} onChangeText={setPassword} secureTextEntry={!showPassword} returnKeyType="done" onSubmitEditing={handleLogin} testID="barber-password" />
                    <Pressable onPress={() => setShowPassword((s) => !s)} style={styles.eyeBtn} hitSlop={10}>
                      {showPassword ? <EyeOff color={Colors.textMuted} size={18} /> : <Eye color={Colors.textMuted} size={18} />}
                    </Pressable>
                  </View>
                </View>

                <Pressable onPress={handleLogin} style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]} disabled={isSubmitting} testID="barber-login-btn">
                  {isSubmitting ? <ActivityIndicator color={Colors.black} size="small" /> : (
                    <><Text style={styles.submitBtnText}>Sign In</Text><ArrowRight color={Colors.black} size={18} /></>
                  )}
                </Pressable>
              </>
            ) : (
              <>
                <View style={styles.stepIndicator}>
                  {(['credentials', 'profile', 'services'] as SignupStep[]).map((s, i) => (
                    <View key={s} style={[styles.stepDot, signupStep === s && styles.stepDotActive, (['credentials', 'profile', 'services'].indexOf(signupStep) > i) && styles.stepDotDone]} />
                  ))}
                </View>

                <Text style={styles.formTitle}>
                  {signupStep === 'credentials' ? 'Create Barber Account' : signupStep === 'profile' ? 'Your Profile' : 'Your Services'}
                </Text>
                <Text style={styles.formSubtitle}>
                  {signupStep === 'credentials' ? 'Step 1: Account details' : signupStep === 'profile' ? 'Step 2: Bio & location' : 'Step 3: Pick at least 3 haircuts & set rates'}
                </Text>

                {error && <View style={styles.errorBanner}><Text style={styles.errorText}>{error}</Text></View>}

                {signupStep === 'credentials' && (
                  <>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Full Name</Text>
                      <TextInput style={styles.input} placeholder="Your name" placeholderTextColor={Colors.textMuted} value={fullName} onChangeText={setFullName} autoCapitalize="words" testID="barber-name" />
                    </View>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Email</Text>
                      <TextInput style={styles.input} placeholder="you@example.com" placeholderTextColor={Colors.textMuted} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" testID="barber-signup-email" />
                    </View>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Password</Text>
                      <TextInput style={styles.input} placeholder="Min. 6 characters" placeholderTextColor={Colors.textMuted} value={password} onChangeText={setPassword} secureTextEntry={!showPassword} testID="barber-signup-password" />
                    </View>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Confirm Password</Text>
                      <TextInput style={styles.input} placeholder="Re-enter password" placeholderTextColor={Colors.textMuted} value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry={!showPassword} testID="barber-signup-confirm" />
                    </View>
                    <Pressable onPress={handleNextStep} style={styles.submitBtn} testID="barber-next-step">
                      <Text style={styles.submitBtnText}>Next</Text>
                      <ArrowRight color={Colors.black} size={18} />
                    </Pressable>
                  </>
                )}

                {signupStep === 'profile' && (
                  <>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Bio</Text>
                      <TextInput style={[styles.input, styles.bioInput]} placeholder="Tell clients about yourself..." placeholderTextColor={Colors.textMuted} value={bio} onChangeText={setBio} multiline numberOfLines={3} testID="barber-bio" />
                    </View>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Shop Location</Text>
                      <LocationSearchComponent
                        value={address}
                        onSelect={(loc) => setAddress(loc.address)}
                        placeholder="Start typing your address..."
                        testID="barber-address"
                      />
                    </View>
                    <View style={styles.stepButtons}>
                      <Pressable onPress={() => setSignupStep('credentials')} style={styles.backStepBtn}>
                        <ArrowLeft color={Colors.textSecondary} size={16} />
                        <Text style={styles.backStepText}>Back</Text>
                      </Pressable>
                      <Pressable onPress={handleNextStep} style={[styles.submitBtn, { flex: 1 }]}>
                        <Text style={styles.submitBtnText}>Next</Text>
                        <ArrowRight color={Colors.black} size={18} />
                      </Pressable>
                    </View>
                  </>
                )}

                {signupStep === 'services' && (
                  <>
                    <Text style={styles.serviceCount}>
                      {selectedServices.length} selected {selectedServices.length < 3 ? `(need ${3 - selectedServices.length} more)` : ''}
                    </Text>
                    <View style={styles.servicesList}>
                      {HAIRCUTS.slice(0, 15).map((h) => {
                        const selected = selectedServices.find((s) => s.haircutId === h.id);
                        return (
                          <Pressable key={h.id} onPress={() => toggleService(h.id, h.name)} style={[styles.serviceItem, selected && styles.serviceItemSelected]}>
                            <View style={styles.serviceItemTop}>
                              {selected ? <Check color={Colors.teal} size={14} /> : <Plus color={Colors.textMuted} size={14} />}
                              <Text style={[styles.serviceItemName, selected && styles.serviceItemNameSelected]}>{h.name}</Text>
                            </View>
                            {selected && (
                              <View style={styles.rateRow}>
                                <DollarSign color={Colors.accent} size={13} />
                                <TextInput style={styles.rateInput} value={String(selected.rate)} onChangeText={(t) => updateRate(h.id, t)} keyboardType="numeric" testID={`rate-${h.id}`} />
                              </View>
                            )}
                          </Pressable>
                        );
                      })}
                    </View>
                    <View style={styles.stepButtons}>
                      <Pressable onPress={() => setSignupStep('profile')} style={styles.backStepBtn}>
                        <ArrowLeft color={Colors.textSecondary} size={16} />
                        <Text style={styles.backStepText}>Back</Text>
                      </Pressable>
                      <Pressable onPress={handleSignup} style={[styles.submitBtn, { flex: 1 }, isSubmitting && styles.submitBtnDisabled]} disabled={isSubmitting}>
                        {isSubmitting ? <ActivityIndicator color={Colors.black} size="small" /> : (
                          <><Text style={styles.submitBtnText}>Create Account</Text><UserPlus color={Colors.black} size={18} /></>
                        )}
                      </Pressable>
                    </View>
                  </>
                )}
              </>
            )}

            <Pressable onPress={toggleMode} style={styles.switchBtn} testID="barber-switch-mode">
              <Text style={styles.switchText}>
                {mode === 'login' ? "Don't have a barber account? " : 'Already have an account? '}
                <Text style={styles.switchTextAccent}>{mode === 'login' ? 'Sign Up' : 'Sign In'}</Text>
              </Text>
            </Pressable>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 24, paddingVertical: 48, paddingTop: 20 },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center', marginBottom: 12, borderWidth: 1, borderColor: Colors.border },
  logoSection: { alignItems: 'center', marginBottom: 32 },
  logoCircle: { width: 64, height: 64, borderRadius: 18, backgroundColor: Colors.tealMuted, alignItems: 'center', justifyContent: 'center', marginBottom: 14, borderWidth: 1, borderColor: Colors.tealBorder },
  appName: { fontSize: 24, fontWeight: '800' as const, color: Colors.text, letterSpacing: 2 },
  appTagline: { fontSize: 13, color: Colors.teal, marginTop: 4, fontWeight: '600' as const },
  formSection: { width: '100%' },
  formTitle: { fontSize: 20, fontWeight: '700' as const, color: Colors.text, marginBottom: 4 },
  formSubtitle: { fontSize: 13, color: Colors.textSecondary, marginBottom: 24, lineHeight: 18 },
  stepIndicator: { flexDirection: 'row', gap: 6, marginBottom: 20 },
  stepDot: { width: 28, height: 3, borderRadius: 2, backgroundColor: Colors.border },
  stepDotActive: { backgroundColor: Colors.teal, width: 44 },
  stepDotDone: { backgroundColor: 'rgba(62,207,178,0.35)' },
  errorBanner: { backgroundColor: Colors.errorMuted, borderRadius: 12, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: Colors.errorBorder },
  errorText: { color: Colors.error, fontSize: 13, fontWeight: '500' as const, lineHeight: 18 },
  inputGroup: { marginBottom: 16 },
  inputLabel: { color: Colors.textMuted, fontSize: 10, fontWeight: '600' as const, letterSpacing: 1, marginBottom: 8, textTransform: 'uppercase' as const },
  input: { backgroundColor: Colors.surface, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: Colors.text, borderWidth: 1, borderColor: Colors.border },
  bioInput: { height: 90, textAlignVertical: 'top' as const, paddingTop: 14 },
  passwordWrap: { position: 'relative' as const },
  passwordInput: { paddingRight: 50 },
  eyeBtn: { position: 'absolute' as const, right: 16, top: 0, bottom: 0, justifyContent: 'center' as const },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  submitBtn: { backgroundColor: Colors.teal, borderRadius: 12, paddingVertical: 16, flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, gap: 8, marginTop: 8 },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { color: Colors.black, fontSize: 16, fontWeight: '700' as const },
  switchBtn: { marginTop: 24, alignItems: 'center' as const, paddingVertical: 8 },
  switchText: { color: Colors.textSecondary, fontSize: 13 },
  switchTextAccent: { color: Colors.teal, fontWeight: '700' as const },
  serviceCount: { color: Colors.textSecondary, fontSize: 12, marginBottom: 12 },
  servicesList: { gap: 8, marginBottom: 16 },
  serviceItem: { backgroundColor: Colors.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: Colors.border },
  serviceItemSelected: { borderColor: Colors.teal, backgroundColor: Colors.tealMuted },
  serviceItemTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  serviceItemName: { color: Colors.textSecondary, fontSize: 14, fontWeight: '600' as const },
  serviceItemNameSelected: { color: Colors.text },
  rateRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10, marginLeft: 24 },
  rateInput: { backgroundColor: Colors.card, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, color: Colors.text, fontSize: 15, fontWeight: '700' as const, width: 80, borderWidth: 1, borderColor: Colors.border },
  stepButtons: { flexDirection: 'row', gap: 10, marginTop: 8 },
  backStepBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 16, borderRadius: 12, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  backStepText: { color: Colors.textSecondary, fontSize: 14, fontWeight: '600' as const },
});
