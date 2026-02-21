import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Animated,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter, Stack } from 'expo-router';
import {
  LogOut,
  MapPin,
  DollarSign,
  Calendar,
  Scissors,
  Clock,
  User,
  ChevronLeft,
  Bell,
  CheckCheck,
  ChevronDown,
  ChevronUp,
  ImageIcon,
  Play,
  Pause,
  Eye,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useBarbers } from '@/hooks/useBarbers';
import { Appointment } from '@/constants/barbers';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IMAGE_WIDTH = SCREEN_WIDTH - 80;
const IMAGE_HEIGHT = IMAGE_WIDTH * 1.33;

interface AppointmentCardProps {
  apt: Appointment;
}

const AppointmentImageViewer = React.memo(({ angleImages }: { angleImages: string[] }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const angleLabels = ['Front', 'Left', 'Right', 'Back'];

  const transitionToIndex = useCallback((nextIndex: number) => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setActiveIndex(nextIndex);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    });
  }, [fadeAnim]);

  const togglePlayback = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isPlaying) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      let idx = activeIndex;
      intervalRef.current = setInterval(() => {
        idx = (idx + 1) % angleImages.length;
        transitionToIndex(idx);
      }, 1800);
    }
  }, [isPlaying, activeIndex, angleImages.length, transitionToIndex]);

  React.useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return (
    <View style={imgStyles.container}>
      <View style={imgStyles.imageWrap}>
        <Animated.View style={{ opacity: fadeAnim }}>
          <Image
            source={{ uri: angleImages[activeIndex] }}
            style={imgStyles.image}
            contentFit="cover"
            transition={150}
          />
        </Animated.View>
        <View style={imgStyles.labelBadge}>
          <Text style={imgStyles.labelText}>
            {angleLabels[activeIndex] ?? `Angle ${activeIndex + 1}`}
          </Text>
        </View>
      </View>

      <View style={imgStyles.controls}>
        <View style={imgStyles.dots}>
          {angleImages.map((_, i) => (
            <Pressable
              key={i}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                if (isPlaying) {
                  if (intervalRef.current) clearInterval(intervalRef.current);
                  intervalRef.current = null;
                  setIsPlaying(false);
                }
                transitionToIndex(i);
              }}
              hitSlop={6}
            >
              <View
                style={[
                  imgStyles.dot,
                  i === activeIndex && imgStyles.dotActive,
                ]}
              />
            </Pressable>
          ))}
        </View>
        <Pressable onPress={togglePlayback} style={imgStyles.playBtn} hitSlop={8}>
          {isPlaying ? (
            <Pause color={Colors.black} size={14} />
          ) : (
            <Play color={Colors.black} size={14} />
          )}
          <Text style={imgStyles.playText}>{isPlaying ? 'Pause' : '360° View'}</Text>
        </Pressable>
      </View>
    </View>
  );
});

AppointmentImageViewer.displayName = 'AppointmentImageViewer';

const AppointmentCard = React.memo(({ apt }: AppointmentCardProps) => {
  const [expanded, setExpanded] = useState(false);
  const heightAnim = useRef(new Animated.Value(0)).current;
  const hasImages = !!(apt.frontImage || (apt.angleImages && apt.angleImages.length > 0));

  const toggleExpand = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const toValue = expanded ? 0 : 1;
    setExpanded(!expanded);
    Animated.spring(heightAnim, {
      toValue,
      useNativeDriver: false,
      speed: 14,
      bounciness: 2,
    }).start();
  }, [expanded, heightAnim]);

  const expandHeight = heightAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, apt.angleImages && apt.angleImages.length > 0 ? IMAGE_HEIGHT + 120 : apt.frontImage ? IMAGE_HEIGHT + 60 : 0],
  });

  return (
    <View style={styles.appointmentCard}>
      <Pressable onPress={hasImages ? toggleExpand : undefined} style={styles.appointmentCardInner}>
        <View style={styles.appointmentTop}>
          <View style={styles.appointmentLeft}>
            <View style={styles.clientIconWrap}>
              <User color={Colors.accent} size={14} />
            </View>
            <Text style={styles.appointmentClient}>{apt.customerName}</Text>
          </View>
          <View style={{ flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6 }}>
            {hasImages && (
              <View style={styles.hasImagesBadge}>
                <ImageIcon color={Colors.teal} size={10} />
              </View>
            )}
            <View style={[styles.statusBadge, apt.status === 'confirmed' ? styles.statusConfirmed : styles.statusPending]}>
              <Text style={[styles.statusText, apt.status === 'confirmed' ? styles.statusTextConfirmed : styles.statusTextPending]}>{apt.status}</Text>
            </View>
          </View>
        </View>
        <View style={styles.appointmentDetails}>
          <Text style={styles.appointmentService}>{apt.haircutName}</Text>
          <Text style={styles.appointmentTime}>{apt.date} at {apt.time}</Text>
          <Text style={styles.appointmentRate}>${apt.rate}</Text>
        </View>
        {hasImages && (
          <View style={styles.expandHint}>
            <Eye color={Colors.textMuted} size={12} />
            <Text style={styles.expandHintText}>
              {expanded ? 'Hide customer rendering' : 'View customer rendering'}
            </Text>
            {expanded ? (
              <ChevronUp color={Colors.textMuted} size={14} />
            ) : (
              <ChevronDown color={Colors.textMuted} size={14} />
            )}
          </View>
        )}
      </Pressable>

      {hasImages && (
        <Animated.View style={[styles.imageSection, { height: expandHeight, overflow: 'hidden' as const }]}>
          {expanded && (
            <View style={styles.imageSectionInner}>
              <View style={styles.imageSectionHeader}>
                <View style={styles.imageSectionDot} />
                <Text style={styles.imageSectionTitle}>CUSTOMER'S AI RENDERING</Text>
              </View>

              {apt.angleImages && apt.angleImages.length > 1 ? (
                <AppointmentImageViewer angleImages={apt.angleImages} />
              ) : apt.frontImage ? (
                <View style={imgStyles.container}>
                  <View style={imgStyles.imageWrap}>
                    <Image
                      source={{ uri: apt.frontImage }}
                      style={imgStyles.image}
                      contentFit="cover"
                    />
                    <View style={imgStyles.labelBadge}>
                      <Text style={imgStyles.labelText}>Front View</Text>
                    </View>
                  </View>
                </View>
              ) : null}
            </View>
          )}
        </Animated.View>
      )}
    </View>
  );
});

AppointmentCard.displayName = 'AppointmentCard';

export default function BarberDashboardScreen() {
  const router = useRouter();
  const { barberAuth, barberLogout, getBarberAppointments, getBarberNotifications, getUnreadCount, markNotificationRead, markAllNotificationsRead } = useBarbers();
  const barber = barberAuth.barber;

  const appointments = barber ? getBarberAppointments(barber.id) : [];
  const upcomingAppointments = appointments.filter((a) => a.status !== 'completed');
  const barberNotifications = barber ? getBarberNotifications(barber.id) : [];
  const unreadCount = barber ? getUnreadCount(barber.id) : 0;

  const handleLogout = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => {
          barberLogout();
          router.replace('/login' as any);
        },
      },
    ]);
  }, [barberLogout, router]);

  if (!barber) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Not logged in as barber</Text>
      </View>
    );
  }

  const initials = barber.fullName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Barber Dashboard',
          headerStyle: { backgroundColor: Colors.background },
          headerTintColor: Colors.text,
          headerTitleStyle: { fontWeight: '700' as const },
          headerShadowVisible: false,
          headerLeft: () => (
            <Pressable onPress={() => router.back()} hitSlop={12}>
              <ChevronLeft color={Colors.text} size={24} />
            </Pressable>
          ),
        }}
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.profileCard}>
          {barber.avatarUrl ? (
            <Image source={{ uri: barber.avatarUrl }} style={styles.avatar} contentFit="cover" />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.initialsText}>{initials}</Text>
            </View>
          )}
          <Text style={styles.name}>{barber.fullName}</Text>
          <View style={styles.locationRow}>
            <MapPin color={Colors.teal} size={13} />
            <Text style={styles.locationText}>{barber.location.address}</Text>
          </View>
          <Text style={styles.bio}>{barber.bio}</Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={[styles.statIconWrap, { backgroundColor: Colors.tealMuted }]}>
              <Scissors color={Colors.teal} size={16} />
            </View>
            <Text style={styles.statNumber}>{barber.services.length}</Text>
            <Text style={styles.statLabel}>Services</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIconWrap, { backgroundColor: Colors.accentMuted }]}>
              <Calendar color={Colors.accent} size={16} />
            </View>
            <Text style={styles.statNumber}>{upcomingAppointments.length}</Text>
            <Text style={styles.statLabel}>Bookings</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIconWrap, { backgroundColor: unreadCount > 0 ? 'rgba(232,80,80,0.12)' : Colors.accentMuted }]}>
              <Bell color={unreadCount > 0 ? Colors.error : Colors.accent} size={16} />
            </View>
            <Text style={styles.statNumber}>{unreadCount}</Text>
            <Text style={styles.statLabel}>New</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>YOUR SERVICES</Text>
          <View style={styles.servicesCard}>
            {barber.services.map((service, index) => (
              <View key={service.haircutId}>
                <View style={styles.serviceRow}>
                  <View style={styles.serviceLeft}>
                    <Scissors color={Colors.textMuted} size={13} />
                    <Text style={styles.serviceName}>{service.haircutName}</Text>
                  </View>
                  <View style={styles.serviceRight}>
                    <DollarSign color={Colors.success} size={13} />
                    <Text style={styles.serviceRate}>{service.rate}</Text>
                  </View>
                </View>
                {index < barber.services.length - 1 && <View style={styles.serviceDivider} />}
              </View>
            ))}
          </View>
        </View>

        {barberNotifications.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>NOTIFICATIONS</Text>
              {unreadCount > 0 && (
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    markAllNotificationsRead(barber.id);
                  }}
                  hitSlop={8}
                  style={styles.markAllBtn}
                  testID="mark-all-read"
                >
                  <CheckCheck color={Colors.teal} size={13} />
                  <Text style={styles.markAllText}>Mark all read</Text>
                </Pressable>
              )}
            </View>
            <View style={styles.notificationsList}>
              {barberNotifications.slice(0, 10).map((notif) => (
                <Pressable
                  key={notif.id}
                  onPress={() => {
                    if (!notif.read) {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      markNotificationRead(notif.id);
                    }
                  }}
                  style={[styles.notificationCard, !notif.read && styles.notificationCardUnread]}
                  testID={`notif-${notif.id}`}
                >
                  <View style={styles.notificationTop}>
                    <View style={[styles.notifIconWrap, !notif.read && styles.notifIconWrapUnread]}>
                      <Bell color={!notif.read ? Colors.accent : Colors.textMuted} size={13} />
                    </View>
                    <View style={styles.notifContent}>
                      <View style={styles.notifTitleRow}>
                        <Text style={[styles.notifTitle, !notif.read && styles.notifTitleUnread]}>{notif.title}</Text>
                        {!notif.read && <View style={styles.unreadDot} />}
                      </View>
                      <Text style={styles.notifMessage} numberOfLines={2}>{notif.message}</Text>
                      <Text style={styles.notifTime}>
                        {new Date(notif.createdAt).toLocaleDateString()} at {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>UPCOMING APPOINTMENTS</Text>
          {upcomingAppointments.length === 0 ? (
            <View style={styles.emptyCard}>
              <Clock color={Colors.textMuted} size={24} />
              <Text style={styles.emptyText}>No upcoming appointments</Text>
              <Text style={styles.emptySubtext}>Your bookings will appear here</Text>
            </View>
          ) : (
            <View style={styles.appointmentsList}>
              {upcomingAppointments.map((apt) => (
                <AppointmentCard key={apt.id} apt={apt} />
              ))}
            </View>
          )}
        </View>

        <Pressable
          onPress={handleLogout}
          style={styles.logoutBtn}
          testID="barber-logout-btn"
        >
          <LogOut color={Colors.error} size={18} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </Pressable>

        <Text style={styles.versionText}>Cut-GPT Barber v1.0.0</Text>
      </ScrollView>
    </View>
  );
}

const imgStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  imageWrap: {
    width: IMAGE_WIDTH,
    height: IMAGE_HEIGHT,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  image: {
    width: IMAGE_WIDTH,
    height: IMAGE_HEIGHT,
  },
  labelBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  labelText: {
    color: Colors.white,
    fontSize: 11,
    fontWeight: '600' as const,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: IMAGE_WIDTH,
    marginTop: 10,
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.borderLight,
  },
  dotActive: {
    backgroundColor: Colors.accent,
    width: 20,
    borderRadius: 4,
  },
  playBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.accent,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  playText: {
    color: Colors.black,
    fontSize: 11,
    fontWeight: '700' as const,
  },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: 20, paddingBottom: 40 },
  errorText: { color: Colors.error, fontSize: 16, textAlign: 'center', marginTop: 60 },
  profileCard: { backgroundColor: Colors.surface, borderRadius: 20, padding: 24, marginTop: 8, marginBottom: 16, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  avatar: { width: 80, height: 80, borderRadius: 40, borderWidth: 2, borderColor: Colors.teal },
  avatarPlaceholder: { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.card, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.teal },
  initialsText: { fontSize: 26, fontWeight: '700' as const, color: Colors.teal },
  name: { fontSize: 20, fontWeight: '700' as const, color: Colors.text, marginTop: 12 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
  locationText: { color: Colors.textSecondary, fontSize: 12 },
  bio: { color: Colors.textSecondary, fontSize: 13, textAlign: 'center', marginTop: 10, lineHeight: 18, paddingHorizontal: 16 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  statCard: { flex: 1, backgroundColor: Colors.surface, borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  statIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statNumber: { fontSize: 18, fontWeight: '700' as const, color: Colors.text },
  statLabel: { fontSize: 10, color: Colors.textMuted, marginTop: 2, fontWeight: '500' as const, letterSpacing: 0.3 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 10, fontWeight: '700' as const, color: Colors.textMuted, letterSpacing: 1.5, marginBottom: 10, marginLeft: 4 },
  servicesCard: { backgroundColor: Colors.surface, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border },
  serviceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14 },
  serviceLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  serviceName: { color: Colors.text, fontSize: 14, fontWeight: '600' as const },
  serviceRight: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  serviceRate: { color: Colors.success, fontSize: 15, fontWeight: '700' as const },
  serviceDivider: { height: 1, backgroundColor: Colors.border, marginLeft: 37 },
  emptyCard: { backgroundColor: Colors.surface, borderRadius: 16, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: Colors.border, gap: 8 },
  emptyText: { color: Colors.text, fontSize: 15, fontWeight: '600' as const },
  emptySubtext: { color: Colors.textMuted, fontSize: 12 },
  appointmentsList: { gap: 10 },
  appointmentCard: { backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  appointmentCardInner: { padding: 14 },
  appointmentTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  appointmentLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  clientIconWrap: { width: 30, height: 30, borderRadius: 15, backgroundColor: Colors.accentMuted, alignItems: 'center', justifyContent: 'center' },
  appointmentClient: { color: Colors.text, fontSize: 14, fontWeight: '600' as const },
  hasImagesBadge: { width: 22, height: 22, borderRadius: 6, backgroundColor: Colors.tealMuted, alignItems: 'center', justifyContent: 'center' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusConfirmed: { backgroundColor: Colors.successMuted },
  statusPending: { backgroundColor: Colors.accentMuted },
  statusText: { fontSize: 10, fontWeight: '700' as const, textTransform: 'capitalize' as const },
  statusTextConfirmed: { color: Colors.success },
  statusTextPending: { color: Colors.accent },
  appointmentDetails: { marginLeft: 38 },
  appointmentService: { color: Colors.textSecondary, fontSize: 13, fontWeight: '500' as const },
  appointmentTime: { color: Colors.textMuted, fontSize: 11, marginTop: 2 },
  appointmentRate: { color: Colors.success, fontSize: 13, fontWeight: '700' as const, marginTop: 4 },
  expandHint: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.border },
  expandHintText: { color: Colors.textMuted, fontSize: 11, fontWeight: '500' as const },
  imageSection: { backgroundColor: Colors.card },
  imageSectionInner: { paddingHorizontal: 14, paddingVertical: 16 },
  imageSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 },
  imageSectionDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.teal },
  imageSectionTitle: { fontSize: 10, fontWeight: '700' as const, color: Colors.teal, letterSpacing: 1.2 },
  logoutBtn: { backgroundColor: Colors.errorMuted, borderRadius: 14, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderWidth: 1, borderColor: Colors.errorBorder, marginTop: 8 },
  logoutText: { color: Colors.error, fontSize: 15, fontWeight: '600' as const },
  versionText: { color: Colors.textDim, fontSize: 11, textAlign: 'center', marginTop: 24 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  markAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 8 },
  markAllText: { color: Colors.teal, fontSize: 11, fontWeight: '600' as const },
  notificationsList: { gap: 8 },
  notificationCard: { backgroundColor: Colors.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: Colors.border },
  notificationCardUnread: { borderColor: Colors.accentBorder, backgroundColor: 'rgba(201,165,92,0.05)' },
  notificationTop: { flexDirection: 'row', gap: 10 },
  notifIconWrap: { width: 32, height: 32, borderRadius: 10, backgroundColor: Colors.card, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  notifIconWrapUnread: { backgroundColor: Colors.accentMuted },
  notifContent: { flex: 1 },
  notifTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  notifTitle: { color: Colors.textSecondary, fontSize: 13, fontWeight: '600' as const },
  notifTitleUnread: { color: Colors.text, fontWeight: '700' as const },
  unreadDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.accent },
  notifMessage: { color: Colors.textSecondary, fontSize: 12, lineHeight: 17, marginBottom: 4 },
  notifTime: { color: Colors.textMuted, fontSize: 10 },
});
