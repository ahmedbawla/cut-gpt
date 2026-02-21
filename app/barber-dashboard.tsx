import React, { useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Animated,
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
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useBarbers } from '@/hooks/useBarbers';

export default function BarberDashboardScreen() {
  const router = useRouter();
  const { barberAuth, barberLogout, getBarberAppointments } = useBarbers();
  const barber = barberAuth.barber;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const appointments = barber ? getBarberAppointments(barber.id) : [];
  const upcomingAppointments = appointments.filter((a) => a.status !== 'completed');

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
                <View key={apt.id} style={styles.appointmentCard}>
                  <View style={styles.appointmentTop}>
                    <View style={styles.appointmentLeft}>
                      <View style={styles.clientIconWrap}>
                        <User color={Colors.accent} size={14} />
                      </View>
                      <Text style={styles.appointmentClient}>{apt.customerName}</Text>
                    </View>
                    <View style={[styles.statusBadge, apt.status === 'confirmed' ? styles.statusConfirmed : styles.statusPending]}>
                      <Text style={[styles.statusText, apt.status === 'confirmed' ? styles.statusTextConfirmed : styles.statusTextPending]}>{apt.status}</Text>
                    </View>
                  </View>
                  <View style={styles.appointmentDetails}>
                    <Text style={styles.appointmentService}>{apt.haircutName}</Text>
                    <Text style={styles.appointmentTime}>{apt.date} at {apt.time}</Text>
                    <Text style={styles.appointmentRate}>${apt.rate}</Text>
                  </View>
                </View>
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
  appointmentCard: { backgroundColor: Colors.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: Colors.border },
  appointmentTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  appointmentLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  clientIconWrap: { width: 30, height: 30, borderRadius: 15, backgroundColor: Colors.accentMuted, alignItems: 'center', justifyContent: 'center' },
  appointmentClient: { color: Colors.text, fontSize: 14, fontWeight: '600' as const },
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
  logoutBtn: { backgroundColor: Colors.errorMuted, borderRadius: 14, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderWidth: 1, borderColor: Colors.errorBorder, marginTop: 8 },
  logoutText: { color: Colors.error, fontSize: 15, fontWeight: '600' as const },
  versionText: { color: Colors.textDim, fontSize: 11, textAlign: 'center', marginTop: 24 },
});
