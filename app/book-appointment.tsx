import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import {
  ChevronLeft,
  Calendar,
  Clock,
  MapPin,
  DollarSign,
  CheckCircle,
  Scissors,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useBarbers } from '@/hooks/useBarbers';
import { useAuth } from '@/hooks/useAuth';

const TIME_SLOTS = [
  '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM',
  '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM',
  '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM',
  '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM',
  '5:00 PM', '5:30 PM',
];

function getNextDays(count: number): { label: string; dateStr: string; dayName: string }[] {
  const days: { label: string; dateStr: string; dayName: string }[] = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    days.push({
      label: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : `${monthNames[d.getMonth()]} ${d.getDate()}`,
      dateStr: d.toISOString().split('T')[0],
      dayName: dayNames[d.getDay()],
    });
  }
  return days;
}

export default function BookAppointmentScreen() {
  const router = useRouter();
  const { barberId, barberName, haircutName } = useLocalSearchParams<{
    barberId: string;
    barberName: string;
    haircutName?: string;
  }>();
  const { barbers, bookAppointment, isBooking, getBarberAppointments } = useBarbers();
  const { user } = useAuth();

  const barber = barbers.find((b) => b.id === barberId);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(
    haircutName
      ? barber?.services.find((s) => s.haircutName.toLowerCase() === haircutName?.toLowerCase())?.haircutId ?? null
      : null
  );
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [isBooked, setIsBooked] = useState(false);

  const days = useMemo(() => getNextDays(14), []);

  const existingAppointments = barber ? getBarberAppointments(barber.id) : [];

  const availableSlots = useMemo(() => {
    if (!selectedDate) return TIME_SLOTS;
    const booked = existingAppointments
      .filter((a) => a.date === selectedDate)
      .map((a) => a.time);
    return TIME_SLOTS.filter((t) => !booked.includes(t));
  }, [selectedDate, existingAppointments]);

  const selectedService = barber?.services.find((s) => s.haircutId === selectedServiceId);

  const handleBook = useCallback(async () => {
    if (!barber || !selectedService || !selectedDate || !selectedTime || !user) {
      Alert.alert('Missing Info', 'Please select a service, date, and time.');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    try {
      await bookAppointment({
        id: `apt_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        barberId: barber.id,
        barberName: barber.fullName,
        customerId: user.id,
        customerName: user.fullName,
        customerEmail: user.email,
        haircutName: selectedService.haircutName,
        rate: selectedService.rate,
        date: selectedDate,
        time: selectedTime,
        status: 'confirmed',
        visibleToBarber: true,
        visibleToCustomer: true,
        createdAt: new Date().toISOString(),
      });

      setIsBooked(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to book appointment');
    }
  }, [barber, selectedService, selectedDate, selectedTime, user, bookAppointment]);

  if (!barber) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Book Appointment' }} />
        <Text style={styles.errorText}>Barber not found</Text>
      </View>
    );
  }

  if (isBooked) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            title: 'Booked!',
            headerStyle: { backgroundColor: Colors.background },
            headerTintColor: Colors.text,
            headerShadowVisible: false,
            headerLeft: () => null,
          }}
        />
        <View style={styles.successContainer}>
          <View style={styles.successIconWrap}>
            <CheckCircle color={Colors.success} size={48} />
          </View>
          <Text style={styles.successTitle}>Appointment Booked!</Text>
          <Text style={styles.successSubtitle}>
            Your appointment with {barber.fullName} has been confirmed
          </Text>

          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Scissors color={Colors.accent} size={15} />
              <Text style={styles.summaryLabel}>Service</Text>
              <Text style={styles.summaryValue}>{selectedService?.haircutName}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryRow}>
              <Calendar color={Colors.accent} size={15} />
              <Text style={styles.summaryLabel}>Date</Text>
              <Text style={styles.summaryValue}>
                {days.find((d) => d.dateStr === selectedDate)?.label ?? selectedDate}
              </Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryRow}>
              <Clock color={Colors.accent} size={15} />
              <Text style={styles.summaryLabel}>Time</Text>
              <Text style={styles.summaryValue}>{selectedTime}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryRow}>
              <DollarSign color={Colors.success} size={15} />
              <Text style={styles.summaryLabel}>Price</Text>
              <Text style={[styles.summaryValue, { color: Colors.success }]}>
                ${selectedService?.rate}
              </Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryRow}>
              <MapPin color={Colors.accent} size={15} />
              <Text style={styles.summaryLabel}>Location</Text>
              <Text style={styles.summaryValue} numberOfLines={1}>
                {barber.location.address}
              </Text>
            </View>
          </View>

          <Pressable
            onPress={() => router.dismissAll()}
            style={({ pressed }) => [styles.doneBtn, pressed && styles.doneBtnPressed]}
            testID="done-btn"
          >
            <Text style={styles.doneBtnText}>Done</Text>
          </Pressable>
        </View>
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
          title: 'Book Appointment',
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
        <View style={styles.barberHeader}>
          {barber.avatarUrl ? (
            <Image source={{ uri: barber.avatarUrl }} style={styles.barberAvatar} contentFit="cover" />
          ) : (
            <View style={styles.barberAvatarPlaceholder}>
              <Text style={styles.barberInitials}>{initials}</Text>
            </View>
          )}
          <View style={styles.barberInfo}>
            <Text style={styles.barberName}>{barber.fullName}</Text>
            <View style={styles.barberLocationRow}>
              <MapPin color={Colors.textMuted} size={11} />
              <Text style={styles.barberAddress} numberOfLines={1}>{barber.location.address}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{haircutName ? 'YOUR SERVICE' : 'SELECT SERVICE'}</Text>
          <View style={styles.servicesList}>
            {(haircutName
              ? barber.services.filter((s) => s.haircutName.toLowerCase() === haircutName.toLowerCase())
              : barber.services
            ).map((service) => (
              <Pressable
                key={service.haircutId}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedServiceId(service.haircutId);
                }}
                style={[
                  styles.serviceOption,
                  selectedServiceId === service.haircutId && styles.serviceOptionSelected,
                ]}
                testID={`service-${service.haircutId}`}
              >
                <View style={styles.serviceOptionLeft}>
                  <Scissors color={selectedServiceId === service.haircutId ? Colors.accent : Colors.textMuted} size={14} />
                  <Text style={[styles.serviceOptionName, selectedServiceId === service.haircutId && styles.serviceOptionNameSelected]}>
                    {service.haircutName}
                  </Text>
                </View>
                <Text style={[styles.serviceOptionRate, selectedServiceId === service.haircutId && styles.serviceOptionRateSelected]}>
                  ${service.rate}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>SELECT DATE</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.daysRow}>
            {days.map((day) => (
              <Pressable
                key={day.dateStr}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedDate(day.dateStr);
                  setSelectedTime(null);
                }}
                style={[styles.dayCard, selectedDate === day.dateStr && styles.dayCardSelected]}
                testID={`day-${day.dateStr}`}
              >
                <Text style={[styles.dayName, selectedDate === day.dateStr && styles.dayTextSelected]}>{day.dayName}</Text>
                <Text style={[styles.dayLabel, selectedDate === day.dateStr && styles.dayTextSelected]}>{day.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {selectedDate && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>SELECT TIME</Text>
            <View style={styles.timeSlotsGrid}>
              {availableSlots.map((time) => (
                <Pressable
                  key={time}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedTime(time);
                  }}
                  style={[styles.timeSlot, selectedTime === time && styles.timeSlotSelected]}
                  testID={`time-${time}`}
                >
                  <Text style={[styles.timeSlotText, selectedTime === time && styles.timeSlotTextSelected]}>
                    {time}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {selectedService && selectedDate && selectedTime && (
          <View style={styles.bookingFooter}>
            <View style={styles.bookingSummary}>
              <Text style={styles.bookingSummaryText}>
                {selectedService.haircutName} · {days.find((d) => d.dateStr === selectedDate)?.label} · {selectedTime}
              </Text>
              <Text style={styles.bookingTotal}>${selectedService.rate}</Text>
            </View>

            <Pressable
              onPress={handleBook}
              style={[styles.confirmBtn, isBooking && styles.confirmBtnDisabled]}
              disabled={isBooking}
              testID="confirm-booking-btn"
            >
              {isBooking ? (
                <ActivityIndicator color={Colors.black} size="small" />
              ) : (
                <>
                  <CheckCircle color={Colors.black} size={18} />
                  <Text style={styles.confirmBtnText}>Confirm Booking</Text>
                </>
              )}
            </Pressable>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: 20, paddingBottom: 40 },
  errorText: { color: Colors.error, fontSize: 16, textAlign: 'center', marginTop: 60 },
  barberHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 16, marginBottom: 8 },
  barberAvatar: { width: 50, height: 50, borderRadius: 25, borderWidth: 2, borderColor: Colors.accent },
  barberAvatarPlaceholder: { width: 50, height: 50, borderRadius: 25, backgroundColor: Colors.card, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.accent },
  barberInitials: { fontSize: 18, fontWeight: '700' as const, color: Colors.accent },
  barberInfo: { flex: 1 },
  barberName: { fontSize: 19, fontWeight: '700' as const, color: Colors.text },
  barberLocationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  barberAddress: { color: Colors.textMuted, fontSize: 11, flex: 1 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 10, fontWeight: '700' as const, color: Colors.textMuted, letterSpacing: 1.5, marginBottom: 12, marginLeft: 4 },
  servicesList: { gap: 8 },
  serviceOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: Colors.border },
  serviceOptionSelected: { borderColor: Colors.accent, backgroundColor: Colors.accentMuted },
  serviceOptionLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  serviceOptionName: { color: Colors.textSecondary, fontSize: 14, fontWeight: '600' as const },
  serviceOptionNameSelected: { color: Colors.text },
  serviceOptionRate: { color: Colors.textMuted, fontSize: 15, fontWeight: '700' as const },
  serviceOptionRateSelected: { color: Colors.accent },
  daysRow: { gap: 8 },
  dayCard: { backgroundColor: Colors.surface, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: Colors.border, minWidth: 76 },
  dayCardSelected: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  dayName: { color: Colors.textMuted, fontSize: 10, fontWeight: '600' as const, marginBottom: 4 },
  dayLabel: { color: Colors.textSecondary, fontSize: 12, fontWeight: '700' as const },
  dayTextSelected: { color: Colors.black },
  timeSlotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  timeSlot: { backgroundColor: Colors.surface, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: Colors.border },
  timeSlotSelected: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  timeSlotText: { color: Colors.textSecondary, fontSize: 12, fontWeight: '600' as const },
  timeSlotTextSelected: { color: Colors.black },
  bookingFooter: { marginTop: 8 },
  bookingSummary: { backgroundColor: Colors.surface, borderRadius: 14, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: Colors.border },
  bookingSummaryText: { color: Colors.textSecondary, fontSize: 13, fontWeight: '500' as const },
  bookingTotal: { color: Colors.accent, fontSize: 24, fontWeight: '800' as const, marginTop: 4 },
  confirmBtn: { backgroundColor: Colors.success, borderRadius: 12, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  confirmBtnDisabled: { opacity: 0.5 },
  confirmBtnText: { color: Colors.black, fontSize: 16, fontWeight: '700' as const },
  successContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  successIconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.successMuted, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  successTitle: { fontSize: 24, fontWeight: '800' as const, color: Colors.text, marginBottom: 8, letterSpacing: -0.3 },
  successSubtitle: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 28 },
  summaryCard: { backgroundColor: Colors.surface, borderRadius: 18, padding: 16, width: '100%', borderWidth: 1, borderColor: Colors.border, marginBottom: 28 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  summaryLabel: { color: Colors.textMuted, fontSize: 12, fontWeight: '500' as const, width: 65 },
  summaryValue: { color: Colors.text, fontSize: 14, fontWeight: '600' as const, flex: 1 },
  summaryDivider: { height: 1, backgroundColor: Colors.border },
  doneBtn: { backgroundColor: Colors.accent, borderRadius: 12, paddingVertical: 16, paddingHorizontal: 48, alignItems: 'center' },
  doneBtnPressed: { opacity: 0.85 },
  doneBtnText: { color: Colors.black, fontSize: 16, fontWeight: '700' as const },
});
