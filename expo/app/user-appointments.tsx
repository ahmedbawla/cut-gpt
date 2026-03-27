import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  Alert,
  Animated,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import {
  ChevronLeft,
  Calendar,
  Clock,
  Scissors,
  XCircle,
  AlertTriangle,
  History,
  ChevronDown,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useAuth } from '@/hooks/useAuth';
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

function isUpcoming(apt: Appointment): boolean {
  if (apt.status === 'cancelled' || apt.status === 'completed' || apt.status === 'declined') return false;
  try {
    const [year, month, day] = apt.date.split('-').map(Number);
    const aptDate = new Date(year, month - 1, day, 23, 59, 59);
    return aptDate.getTime() >= Date.now();
  } catch {
    return false;
  }
}

function AppointmentCard({ apt, onCancel }: { apt: Appointment; onCancel: (id: string) => void }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const isCancellable = canCancelAppointment(apt);
  const isCancelled = apt.status === 'cancelled' || apt.status === 'declined';
  const isCompleted = apt.status === 'completed';
  const isPast = !isUpcoming(apt) && !isCancelled && !isCompleted;

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

  const statusColor = isCancelled ? Colors.error : isCompleted ? Colors.teal : isPast ? Colors.textMuted : Colors.success;
  const statusBg = isCancelled ? Colors.errorMuted : isCompleted ? Colors.tealMuted : isPast ? Colors.card : Colors.successMuted;
  const statusLabel = isCancelled ? (apt.status === 'declined' ? 'declined' : 'cancelled') : isCompleted ? 'completed' : isPast ? 'past' : apt.status;

  return (
    <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim }] }, (isCancelled || isPast) && { opacity: 0.6 }]}>
      <View style={styles.cardTop}>
        <View style={styles.cardInfo}>
          <Text style={styles.cardService}>{apt.haircutName}</Text>
          <View style={styles.cardRow}>
            <Scissors color={Colors.textMuted} size={11} />
            <Text style={styles.cardBarber}>{apt.barberName}</Text>
          </View>
          <View style={styles.cardRow}>
            <Calendar color={Colors.textMuted} size={11} />
            <Text style={styles.cardDate}>{apt.date}</Text>
            <Clock color={Colors.textMuted} size={11} />
            <Text style={styles.cardDate}>{apt.time}</Text>
          </View>
        </View>
        <View style={styles.cardRight}>
          <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
          </View>
          <Text style={styles.cardRate}>${apt.rate}</Text>
        </View>
      </View>
      {!isCancelled && !isCompleted && !isPast && (
        <Pressable
          onPress={handleCancel}
          style={[styles.cancelBtn, !isCancellable && styles.cancelBtnDisabled]}
        >
          {isCancellable ? (
            <>
              <XCircle color={Colors.error} size={14} />
              <Text style={styles.cancelBtnText}>Cancel Appointment</Text>
            </>
          ) : (
            <>
              <AlertTriangle color={Colors.textMuted} size={14} />
              <Text style={[styles.cancelBtnText, { color: Colors.textMuted }]}>Cancel unavailable (&lt;24h)</Text>
            </>
          )}
        </Pressable>
      )}
    </Animated.View>
  );
}

export default function UserAppointmentsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { getCustomerAppointments, cancelAppointment } = useBarbers();
  const [showPast, setShowPast] = useState(false);

  const allAppointments = useMemo(() => {
    if (!user) return [];
    return getCustomerAppointments(user.id).sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [user, getCustomerAppointments]);

  const upcomingAppointments = useMemo(() =>
    allAppointments.filter((a) => isUpcoming(a)),
    [allAppointments]
  );

  const pastAppointments = useMemo(() =>
    allAppointments.filter((a) => !isUpcoming(a)),
    [allAppointments]
  );

  const handleCancel = useCallback((id: string) => {
    cancelAppointment(id);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [cancelAppointment]);

  const renderItem = useCallback(({ item }: { item: Appointment }) => (
    <AppointmentCard apt={item} onCancel={handleCancel} />
  ), [handleCancel]);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'My Appointments',
          headerStyle: { backgroundColor: Colors.background },
          headerTintColor: Colors.text,
          headerShadowVisible: false,
          headerLeft: () => (
            <Pressable onPress={() => router.back()} hitSlop={12}>
              <ChevronLeft color={Colors.text} size={24} />
            </Pressable>
          ),
        }}
      />

      <FlatList
        data={upcomingAppointments}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={() => (
          <View style={styles.headerSection}>
            <Text style={styles.sectionTitle}>UPCOMING</Text>
            <Text style={styles.countText}>{upcomingAppointments.length} appointment{upcomingAppointments.length !== 1 ? 's' : ''}</Text>
          </View>
        )}
        ListEmptyComponent={() => (
          <View style={styles.emptyCard}>
            <Calendar color={Colors.textMuted} size={28} />
            <Text style={styles.emptyText}>No upcoming appointments</Text>
            <Text style={styles.emptySubtext}>Book a barber to see your appointments here</Text>
          </View>
        )}
        ListFooterComponent={() => (
          <View>
            {pastAppointments.length > 0 && (
              <>
                <Pressable
                  onPress={() => { setShowPast(!showPast); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                  style={styles.pastToggle}
                >
                  <View style={styles.pastToggleLeft}>
                    <History color={Colors.textMuted} size={16} />
                    <Text style={styles.pastToggleText}>Past Appointments ({pastAppointments.length})</Text>
                  </View>
                  <ChevronDown color={Colors.textMuted} size={16} style={showPast ? { transform: [{ rotate: '180deg' }] } : undefined} />
                </Pressable>
                {showPast && (
                  <View style={styles.pastList}>
                    {pastAppointments.map((apt) => (
                      <AppointmentCard key={apt.id} apt={apt} onCancel={handleCancel} />
                    ))}
                  </View>
                )}
              </>
            )}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  headerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: Colors.textMuted,
    letterSpacing: 1.5,
  },
  countText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
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
  emptyCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 8,
  },
  emptyText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600' as const,
  },
  emptySubtext: {
    color: Colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
  },
  pastToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    marginTop: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pastToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pastToggleText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600' as const,
  },
  pastList: {
    marginTop: 10,
  },
});
