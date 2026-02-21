import React, { useState, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  Alert,
  Animated,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import {
  LogOut,
  Camera,
  User,
  Mail,
  Calendar,
  Pencil,
  Check,
  X,
  Scissors,
  ChevronRight,
  Clock,
  MapPin,
  DollarSign,
  XCircle,
  AlertTriangle,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import Colors from '@/constants/colors';
import { useAuth } from '@/hooks/useAuth';
import { useSavedLooks } from '@/hooks/useSavedLooks';
import { useBarbers } from '@/hooks/useBarbers';
import { Appointment } from '@/constants/barbers';

function canCancelAppointment(apt: Appointment): boolean {
  try {
    const [year, month, day] = apt.date.split('-').map(Number);
    const timeParts = apt.time.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!timeParts) return false;
    let hours = parseInt(timeParts[1], 10);
    const minutes = parseInt(timeParts[2], 10);
    const ampm = timeParts[3].toUpperCase();
    if (ampm === 'PM' && hours !== 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;
    const aptDate = new Date(year, month - 1, day, hours, minutes);
    const now = new Date();
    const diffMs = aptDate.getTime() - now.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    return diffHours > 24;
  } catch {
    return false;
  }
}

function ClientAppointmentCard({ apt, onCancel }: { apt: Appointment; onCancel: (id: string) => void }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const isCancellable = canCancelAppointment(apt);
  const isCancelled = apt.status === 'cancelled';
  const isCompleted = apt.status === 'completed';

  const handleCancel = useCallback(() => {
    if (!isCancellable) {
      Alert.alert('Cannot Cancel', 'Appointments can only be cancelled more than 24 hours in advance.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Cancel Appointment',
      `Cancel your ${apt.haircutName} appointment with ${apt.barberName}?`,
      [
        { text: 'Keep', style: 'cancel' },
        { text: 'Cancel It', style: 'destructive', onPress: () => onCancel(apt.id) },
      ]
    );
  }, [apt, isCancellable, onCancel]);

  const statusColor = isCancelled ? Colors.error : isCompleted ? Colors.teal : Colors.success;
  const statusBg = isCancelled ? Colors.errorMuted : isCompleted ? Colors.tealMuted : Colors.successMuted;

  return (
    <Animated.View style={[aptStyles.card, { transform: [{ scale: scaleAnim }] }, isCancelled && { opacity: 0.5 }]}>
      <View style={aptStyles.cardTop}>
        <View style={aptStyles.cardInfo}>
          <Text style={aptStyles.cardService}>{apt.haircutName}</Text>
          <View style={aptStyles.cardRow}>
            <Scissors color={Colors.textMuted} size={11} />
            <Text style={aptStyles.cardBarber}>{apt.barberName}</Text>
          </View>
          <View style={aptStyles.cardRow}>
            <Calendar color={Colors.textMuted} size={11} />
            <Text style={aptStyles.cardDate}>{apt.date}</Text>
            <Clock color={Colors.textMuted} size={11} />
            <Text style={aptStyles.cardDate}>{apt.time}</Text>
          </View>
        </View>
        <View style={aptStyles.cardRight}>
          <View style={[aptStyles.statusBadge, { backgroundColor: statusBg }]}>
            <Text style={[aptStyles.statusText, { color: statusColor }]}>{apt.status}</Text>
          </View>
          <Text style={aptStyles.cardRate}>${apt.rate}</Text>
        </View>
      </View>
      {!isCancelled && !isCompleted && (
        <Pressable
          onPress={handleCancel}
          style={[aptStyles.cancelBtn, !isCancellable && aptStyles.cancelBtnDisabled]}
        >
          {isCancellable ? (
            <>
              <XCircle color={Colors.error} size={14} />
              <Text style={aptStyles.cancelBtnText}>Cancel Appointment</Text>
            </>
          ) : (
            <>
              <AlertTriangle color={Colors.textMuted} size={14} />
              <Text style={[aptStyles.cancelBtnText, { color: Colors.textMuted }]}>Cancel unavailable (&lt;24h)</Text>
            </>
          )}
        </Pressable>
      )}
    </Animated.View>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout, updateProfile, isLoading } = useAuth();
  const { looks } = useSavedLooks();
  const { getCustomerAppointments, cancelAppointment } = useBarbers();
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState(user?.fullName ?? '');
  const [isUpdating, setIsUpdating] = useState(false);

  const scaleAnim = useRef(new Animated.Value(1)).current;

  const customerAppointments = useMemo(() => {
    if (!user) return [];
    return getCustomerAppointments(user.id).sort((a, b) => {
      if (a.status === 'cancelled' && b.status !== 'cancelled') return 1;
      if (a.status !== 'cancelled' && b.status === 'cancelled') return -1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [user, getCustomerAppointments]);

  const upcomingCount = useMemo(() => customerAppointments.filter((a) => a.status !== 'cancelled' && a.status !== 'completed').length, [customerAppointments]);

  const handleCancelAppointment = useCallback((id: string) => {
    cancelAppointment(id);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [cancelAppointment]);

  const handlePickAvatar = useCallback(async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission needed', 'Please grant photo library access to change your profile picture.');
          return;
        }
      }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.7 });
      if (!result.canceled && result.assets && result.assets[0]) {
        setIsUpdating(true);
        try {
          await updateProfile({ avatarUrl: result.assets[0].uri });
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (err) {
          console.error('[Profile] Avatar update error:', err);
          Alert.alert('Error', 'Failed to update avatar.');
        } finally {
          setIsUpdating(false);
        }
      }
    } catch (err) {
      console.error('[Profile] Pick avatar error:', err);
      Alert.alert('Error', 'Could not open image picker.');
    }
  }, [updateProfile]);

  const handleSaveName = useCallback(async () => {
    if (!editName.trim()) { Alert.alert('Error', 'Name cannot be empty'); return; }
    setIsUpdating(true);
    try {
      await updateProfile({ fullName: editName.trim() });
      setIsEditingName(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      console.error('[Profile] Name update error:', err);
      Alert.alert('Error', 'Failed to update name.');
    } finally {
      setIsUpdating(false);
    }
  }, [editName, updateProfile]);

  const handleLogout = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => { logout(); router.replace('/login' as any); } },
    ]);
  }, [logout, router]);

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  }, [scaleAnim]);

  const memberSince = user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '';

  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={Colors.accent} size="large" />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 32 }]}>
        <Text style={{ color: Colors.textSecondary, fontSize: 16, textAlign: 'center', marginBottom: 16 }}>You're not signed in</Text>
        <Pressable onPress={() => router.replace('/login' as any)} style={[styles.logoutBtn, { backgroundColor: Colors.accent, borderColor: Colors.accent }]}>
          <Text style={[styles.logoutText, { color: '#fff' }]}>Sign In</Text>
        </Pressable>
      </View>
    );
  }

  const initials = (user.fullName ?? '').split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.profileCard}>
        <View style={styles.avatarSection}>
          <Pressable onPress={handlePickAvatar} style={styles.avatarWrap}>
            {user.avatarUrl ? (
              <Image source={{ uri: user.avatarUrl }} style={styles.avatar} contentFit="cover" transition={200} />
            ) : (
              <View style={styles.avatarPlaceholder}><Text style={styles.initialsText}>{initials}</Text></View>
            )}
            <View style={styles.cameraIcon}>
              {isUpdating ? <ActivityIndicator size="small" color={Colors.black} /> : <Camera color={Colors.black} size={12} />}
            </View>
          </Pressable>
        </View>
        <View style={styles.nameSection}>
          {isEditingName ? (
            <View style={styles.editNameRow}>
              <TextInput style={styles.nameInput} value={editName} onChangeText={setEditName} autoFocus returnKeyType="done" onSubmitEditing={handleSaveName} testID="edit-name-input" />
              <Pressable onPress={handleSaveName} style={styles.editActionBtn} hitSlop={8}><Check color={Colors.success} size={18} /></Pressable>
              <Pressable onPress={() => { setIsEditingName(false); setEditName(user.fullName ?? ''); }} style={styles.editActionBtn} hitSlop={8}><X color={Colors.error} size={18} /></Pressable>
            </View>
          ) : (
            <Pressable onPress={() => { setEditName(user?.fullName ?? ''); setIsEditingName(true); }} style={styles.nameRow}>
              <Text style={styles.userName}>{user.fullName}</Text>
              <Pencil color={Colors.textMuted} size={13} />
            </Pressable>
          )}
          <Text style={styles.userEmail}>{user.email}</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <View style={styles.statIconWrap}><Scissors color={Colors.accent} size={16} /></View>
          <Text style={styles.statNumber}>{looks.length}</Text>
          <Text style={styles.statLabel}>Saved Looks</Text>
        </View>
        <View style={styles.statCard}>
          <View style={[styles.statIconWrap, { backgroundColor: Colors.tealMuted }]}><Calendar color={Colors.teal} size={16} /></View>
          <Text style={styles.statNumber}>{upcomingCount}</Text>
          <Text style={styles.statLabel}>Appointments</Text>
        </View>
      </View>

      {customerAppointments.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>YOUR APPOINTMENTS</Text>
          <View style={styles.appointmentsList}>
            {customerAppointments.map((apt) => (
              <ClientAppointmentCard key={apt.id} apt={apt} onCancel={handleCancelAppointment} />
            ))}
          </View>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ACCOUNT</Text>
        <View style={styles.menuCard}>
          <View style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIcon, { backgroundColor: Colors.accentMuted }]}><User color={Colors.accent} size={16} /></View>
              <View>
                <Text style={styles.menuItemTitle}>Full Name</Text>
                <Text style={styles.menuItemValue}>{user.fullName}</Text>
              </View>
            </View>
            <ChevronRight color={Colors.textDim} size={16} />
          </View>
          <View style={styles.menuDivider} />
          <View style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIcon, { backgroundColor: Colors.successMuted }]}><Mail color={Colors.success} size={16} /></View>
              <View>
                <Text style={styles.menuItemTitle}>Email</Text>
                <Text style={styles.menuItemValue}>{user.email}</Text>
              </View>
            </View>
          </View>
          <View style={styles.menuDivider} />
          <View style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIcon, { backgroundColor: Colors.tealMuted }]}><Calendar color={Colors.teal} size={16} /></View>
              <View>
                <Text style={styles.menuItemTitle}>Member Since</Text>
                <Text style={styles.menuItemValue}>{memberSince}</Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <Pressable onPress={handleLogout} onPressIn={handlePressIn} onPressOut={handlePressOut} style={styles.logoutBtn} testID="logout-btn">
          <LogOut color={Colors.error} size={18} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </Pressable>
      </Animated.View>

      <Text style={styles.versionText}>Cut-GPT v1.0.0</Text>
    </ScrollView>
  );
}

const aptStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 10,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardInfo: {
    flex: 1,
    gap: 4,
  },
  cardService: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  cardBarber: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  cardDate: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  cardRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700' as const,
    textTransform: 'capitalize' as const,
  },
  cardRate: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.accent,
  },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: Colors.errorMuted,
    borderWidth: 1,
    borderColor: Colors.errorBorder,
  },
  cancelBtnDisabled: {
    backgroundColor: Colors.card,
    borderColor: Colors.border,
  },
  cancelBtnText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.error,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  profileCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 24,
    marginTop: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  avatarSection: {
    marginBottom: 16,
  },
  avatarWrap: {
    position: 'relative',
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
    borderColor: Colors.accent,
  },
  avatarPlaceholder: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.accent,
  },
  initialsText: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.accent,
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.background,
  },
  nameSection: {
    alignItems: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userName: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  userEmail: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  editNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nameInput: {
    backgroundColor: Colors.card,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 17,
    fontWeight: '600' as const,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.accent,
    minWidth: 170,
    textAlign: 'center',
  },
  editActionBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  statLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 2,
    fontWeight: '500' as const,
    letterSpacing: 0.3,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: Colors.textMuted,
    letterSpacing: 1.5,
    marginBottom: 10,
    marginLeft: 4,
  },
  appointmentsList: {
    gap: 0,
  },
  menuCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItemTitle: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '500' as const,
  },
  menuItemValue: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '600' as const,
    marginTop: 1,
  },
  menuDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginLeft: 62,
  },
  logoutBtn: {
    backgroundColor: Colors.errorMuted,
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.errorBorder,
  },
  logoutText: {
    color: Colors.error,
    fontSize: 15,
    fontWeight: '600' as const,
  },
  versionText: {
    color: Colors.textDim,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 24,
  },
});
