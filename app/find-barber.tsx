import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Animated,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import {
  MapPin,
  Navigation,
  ChevronLeft,
  Minus,
  Plus,
  DollarSign,
  Scissors,
  Star,
  Calendar,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useBarbers } from '@/hooks/useBarbers';
import { getDistanceMiles, BarberProfile } from '@/constants/barbers';

const DEFAULT_LAT = 42.6856;
const DEFAULT_LON = -73.7254;

export default function FindBarberScreen() {
  const router = useRouter();
  const { haircutName } = useLocalSearchParams<{ haircutName?: string }>();
  const { barbers } = useBarbers();
  const [rangeMiles, setRangeMiles] = useState(25);
  const [userLat] = useState(DEFAULT_LAT);
  const [userLon] = useState(DEFAULT_LON);

  const nearbyBarbers = useMemo(() => {
    return barbers
      .map((b) => ({
        ...b,
        distance: getDistanceMiles(userLat, userLon, b.location.latitude, b.location.longitude),
      }))
      .filter((b) => b.distance <= rangeMiles)
      .sort((a, b) => a.distance - b.distance);
  }, [barbers, rangeMiles, userLat, userLon]);

  const adjustRange = useCallback((delta: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRangeMiles((prev) => Math.max(5, Math.min(100, prev + delta)));
  }, []);

  const handleBookBarber = useCallback(
    (barber: BarberProfile & { distance: number }) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      router.push({
        pathname: '/book-appointment' as any,
        params: {
          barberId: barber.id,
          barberName: barber.fullName,
          haircutName: haircutName ?? '',
        },
      });
    },
    [router, haircutName]
  );

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Find a Barber',
          headerStyle: { backgroundColor: Colors.background },
          headerTintColor: Colors.text,
          headerTitleStyle: { fontWeight: '700' as const },
          headerLeft: () => (
            <Pressable onPress={() => router.back()} hitSlop={12}>
              <ChevronLeft color={Colors.text} size={24} />
            </Pressable>
          ),
        }}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroSection}>
          <View style={styles.heroIconWrap}>
            <Navigation color={Colors.accent} size={24} />
          </View>
          <Text style={styles.heroTitle}>Barbers Near You</Text>
          {haircutName ? (
            <Text style={styles.heroSubtitle}>
              Find a barber who can do your <Text style={styles.heroAccent}>{haircutName}</Text>
            </Text>
          ) : (
            <Text style={styles.heroSubtitle}>Browse barbers in your area</Text>
          )}
        </View>

        <View style={styles.rangeControl}>
          <Text style={styles.rangeLabel}>SEARCH RADIUS</Text>
          <View style={styles.rangeRow}>
            <Pressable onPress={() => adjustRange(-5)} style={styles.rangeBtn} hitSlop={8} testID="range-minus">
              <Minus color={Colors.text} size={18} />
            </Pressable>
            <View style={styles.rangeValueWrap}>
              <Text style={styles.rangeValue}>{rangeMiles}</Text>
              <Text style={styles.rangeUnit}>miles</Text>
            </View>
            <Pressable onPress={() => adjustRange(5)} style={styles.rangeBtn} hitSlop={8} testID="range-plus">
              <Plus color={Colors.text} size={18} />
            </Pressable>
          </View>
        </View>

        <Text style={styles.resultsCount}>
          {nearbyBarbers.length} barber{nearbyBarbers.length !== 1 ? 's' : ''} found
        </Text>

        {nearbyBarbers.length === 0 ? (
          <View style={styles.emptyCard}>
            <MapPin color={Colors.textMuted} size={32} />
            <Text style={styles.emptyTitle}>No Barbers Found</Text>
            <Text style={styles.emptySubtext}>Try increasing your search radius</Text>
          </View>
        ) : (
          <View style={styles.barbersList}>
            {nearbyBarbers.map((barber) => {
              const initials = barber.fullName
                .split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2);

              const matchingService = haircutName
                ? barber.services.find(
                    (s) => s.haircutName.toLowerCase() === haircutName.toLowerCase()
                  )
                : null;

              return (
                <BarberCard
                  key={barber.id}
                  barber={barber}
                  initials={initials}
                  matchingService={matchingService}
                  onBook={() => handleBookBarber(barber)}
                />
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const BarberCard = React.memo(({
  barber,
  initials,
  matchingService,
  onBook,
}: {
  barber: BarberProfile & { distance: number };
  initials: string;
  matchingService: { haircutId: string; haircutName: string; rate: number } | null | undefined;
  onBook: () => void;
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  return (
    <Animated.View style={[styles.barberCard, { transform: [{ scale: scaleAnim }] }]}>
      <Pressable
        onPressIn={() => {
          Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
        }}
        onPressOut={() => {
          Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
        }}
        style={styles.barberCardInner}
      >
        <View style={styles.barberTop}>
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
              <MapPin color={Colors.textMuted} size={12} />
              <Text style={styles.barberDistance}>{barber.distance.toFixed(1)} mi away</Text>
            </View>
            <Text style={styles.barberAddress} numberOfLines={1}>{barber.location.address}</Text>
          </View>
        </View>

        <Text style={styles.barberBio} numberOfLines={2}>{barber.bio}</Text>

        {matchingService && (
          <View style={styles.matchBadge}>
            <Scissors color={Colors.success} size={13} />
            <Text style={styles.matchText}>
              Offers {matchingService.haircutName} — ${matchingService.rate}
            </Text>
          </View>
        )}

        <View style={styles.servicesPreview}>
          <Text style={styles.servicesPreviewLabel}>Services ({barber.services.length})</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.serviceChips}>
            {barber.services.slice(0, 5).map((s) => (
              <View key={s.haircutId} style={styles.serviceChip}>
                <Text style={styles.serviceChipText}>{s.haircutName}</Text>
                <Text style={styles.serviceChipRate}>${s.rate}</Text>
              </View>
            ))}
            {barber.services.length > 5 && (
              <View style={styles.serviceChip}>
                <Text style={styles.serviceChipText}>+{barber.services.length - 5} more</Text>
              </View>
            )}
          </ScrollView>
        </View>

        <Pressable onPress={onBook} style={styles.bookBtn} testID={`book-${barber.id}`}>
          <Calendar color={Colors.white} size={18} />
          <Text style={styles.bookBtnText}>Book Appointment</Text>
        </Pressable>
      </Pressable>
    </Animated.View>
  );
});

BarberCard.displayName = 'BarberCard';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: 20, paddingBottom: 40 },
  heroSection: { alignItems: 'center', paddingVertical: 20 },
  heroIconWrap: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(200,149,108,0.12)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  heroTitle: { fontSize: 24, fontWeight: '800' as const, color: Colors.text, marginBottom: 6 },
  heroSubtitle: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  heroAccent: { color: Colors.accent, fontWeight: '700' as const },
  rangeControl: { backgroundColor: Colors.cardBackground, borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: Colors.border },
  rangeLabel: { fontSize: 10, fontWeight: '700' as const, color: Colors.textMuted, letterSpacing: 1.5, textAlign: 'center', marginBottom: 12 },
  rangeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20 },
  rangeBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
  rangeValueWrap: { alignItems: 'center' },
  rangeValue: { fontSize: 32, fontWeight: '800' as const, color: Colors.accent },
  rangeUnit: { fontSize: 12, color: Colors.textMuted, marginTop: -2 },
  resultsCount: { color: Colors.textSecondary, fontSize: 13, fontWeight: '600' as const, marginBottom: 16 },
  emptyCard: { backgroundColor: Colors.cardBackground, borderRadius: 16, padding: 40, alignItems: 'center', borderWidth: 1, borderColor: Colors.border, gap: 8 },
  emptyTitle: { color: Colors.text, fontSize: 18, fontWeight: '700' as const },
  emptySubtext: { color: Colors.textMuted, fontSize: 13 },
  barbersList: { gap: 16 },
  barberCard: { marginBottom: 4 },
  barberCardInner: { backgroundColor: Colors.cardBackground, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: Colors.border },
  barberTop: { flexDirection: 'row', gap: 14, marginBottom: 12 },
  barberAvatar: { width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderColor: Colors.accent },
  barberAvatarPlaceholder: { width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.cardBackgroundLight, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.accent },
  barberInitials: { fontSize: 20, fontWeight: '700' as const, color: Colors.accent },
  barberInfo: { flex: 1, justifyContent: 'center' },
  barberName: { fontSize: 18, fontWeight: '700' as const, color: Colors.text },
  barberLocationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  barberDistance: { color: Colors.textSecondary, fontSize: 12, fontWeight: '600' as const },
  barberAddress: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },
  barberBio: { color: Colors.textSecondary, fontSize: 13, lineHeight: 18, marginBottom: 12 },
  matchBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(76,175,125,0.1)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(76,175,125,0.2)' },
  matchText: { color: Colors.success, fontSize: 13, fontWeight: '600' as const },
  servicesPreview: { marginBottom: 14 },
  servicesPreviewLabel: { color: Colors.textMuted, fontSize: 11, fontWeight: '600' as const, letterSpacing: 0.5, marginBottom: 8 },
  serviceChips: { gap: 8 },
  serviceChip: { flexDirection: 'row', gap: 6, backgroundColor: 'rgba(255,255,255,0.06)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: Colors.border },
  serviceChipText: { color: Colors.textSecondary, fontSize: 12, fontWeight: '500' as const },
  serviceChipRate: { color: Colors.accent, fontSize: 12, fontWeight: '700' as const },
  bookBtn: { backgroundColor: Colors.accent, borderRadius: 14, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  bookBtnText: { color: Colors.white, fontSize: 16, fontWeight: '700' as const },
});
