import React, { useCallback, useRef, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Animated,
  Dimensions,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
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
  Bell,
  CheckCheck,
  ChevronDown,
  ChevronUp,
  ImageIcon,
  Play,
  Pause,
  Eye,
  Pencil,
  Check,
  X,
  Save,
  Briefcase,
  FileText,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useBarbers } from '@/hooks/useBarbers';
import { Appointment, BarberService } from '@/constants/barbers';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IMAGE_WIDTH = SCREEN_WIDTH - 80;
const IMAGE_HEIGHT = IMAGE_WIDTH * 1.33;

type DashboardTab = 'services' | 'appointments' | 'profile';

const AppointmentImageViewer = React.memo(({ angleImages }: { angleImages: string[] }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const angleLabels = ['Front', 'Left', 'Right', 'Back'];

  const transitionToIndex = useCallback((nextIndex: number) => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
      setActiveIndex(nextIndex);
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
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
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  return (
    <View style={imgStyles.container}>
      <View style={imgStyles.imageWrap}>
        <Animated.View style={{ opacity: fadeAnim }}>
          <Image source={{ uri: angleImages[activeIndex] }} style={imgStyles.image} contentFit="cover" transition={150} />
        </Animated.View>
        <View style={imgStyles.labelBadge}>
          <Text style={imgStyles.labelText}>{angleLabels[activeIndex] ?? `Angle ${activeIndex + 1}`}</Text>
        </View>
      </View>
      <View style={imgStyles.controls}>
        <View style={imgStyles.dots}>
          {angleImages.map((_, i) => (
            <Pressable key={i} onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              if (isPlaying) { if (intervalRef.current) clearInterval(intervalRef.current); intervalRef.current = null; setIsPlaying(false); }
              transitionToIndex(i);
            }} hitSlop={6}>
              <View style={[imgStyles.dot, i === activeIndex && imgStyles.dotActive]} />
            </Pressable>
          ))}
        </View>
        <Pressable onPress={togglePlayback} style={imgStyles.playBtn} hitSlop={8}>
          {isPlaying ? <Pause color={Colors.black} size={14} /> : <Play color={Colors.black} size={14} />}
          <Text style={imgStyles.playText}>{isPlaying ? 'Pause' : '360° View'}</Text>
        </Pressable>
      </View>
    </View>
  );
});
AppointmentImageViewer.displayName = 'AppointmentImageViewer';

interface AppointmentCardProps { apt: Appointment; }

const AppointmentCard = React.memo(({ apt }: AppointmentCardProps) => {
  const [expanded, setExpanded] = useState(false);
  const heightAnim = useRef(new Animated.Value(0)).current;
  const hasImages = !!(apt.frontImage || (apt.angleImages && apt.angleImages.length > 0));

  const toggleExpand = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const toValue = expanded ? 0 : 1;
    setExpanded(!expanded);
    Animated.spring(heightAnim, { toValue, useNativeDriver: false, speed: 14, bounciness: 2 }).start();
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
            <Text style={styles.expandHintText}>{expanded ? 'Hide customer rendering' : 'View customer rendering'}</Text>
            {expanded ? <ChevronUp color={Colors.textMuted} size={14} /> : <ChevronDown color={Colors.textMuted} size={14} />}
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
                    <Image source={{ uri: apt.frontImage }} style={imgStyles.image} contentFit="cover" />
                    <View style={imgStyles.labelBadge}><Text style={imgStyles.labelText}>Front View</Text></View>
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

interface ServiceEditorProps {
  service: BarberService;
  onUpdate: (haircutId: string, updates: { rate?: number; description?: string }) => void;
}

const ServiceEditor = React.memo(({ service, onUpdate }: ServiceEditorProps) => {
  const [editing, setEditing] = useState(false);
  const [editRate, setEditRate] = useState(String(service.rate));
  const [editDesc, setEditDesc] = useState(service.description ?? '');

  const handleSave = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const rate = parseInt(editRate, 10);
    onUpdate(service.haircutId, {
      rate: isNaN(rate) ? service.rate : rate,
      description: editDesc.trim(),
    });
    setEditing(false);
  }, [editRate, editDesc, service.haircutId, service.rate, onUpdate]);

  const handleCancel = useCallback(() => {
    setEditRate(String(service.rate));
    setEditDesc(service.description ?? '');
    setEditing(false);
  }, [service.rate, service.description]);

  if (editing) {
    return (
      <View style={styles.serviceEditCard}>
        <Text style={styles.serviceEditName}>{service.haircutName}</Text>
        <View style={styles.serviceEditRow}>
          <Text style={styles.serviceEditLabel}>PRICE</Text>
          <View style={styles.serviceEditInputWrap}>
            <DollarSign color={Colors.accent} size={14} />
            <TextInput
              style={styles.serviceEditInput}
              value={editRate}
              onChangeText={setEditRate}
              keyboardType="numeric"
              testID={`edit-rate-${service.haircutId}`}
            />
          </View>
        </View>
        <View style={styles.serviceEditRow}>
          <Text style={styles.serviceEditLabel}>DESCRIPTION</Text>
          <TextInput
            style={styles.serviceEditDescInput}
            value={editDesc}
            onChangeText={setEditDesc}
            placeholder="Describe this service..."
            placeholderTextColor={Colors.textMuted}
            multiline
            testID={`edit-desc-${service.haircutId}`}
          />
        </View>
        <View style={styles.serviceEditActions}>
          <Pressable onPress={handleCancel} style={styles.serviceEditCancelBtn}>
            <X color={Colors.textSecondary} size={16} />
            <Text style={styles.serviceEditCancelText}>Cancel</Text>
          </Pressable>
          <Pressable onPress={handleSave} style={styles.serviceEditSaveBtn}>
            <Check color={Colors.black} size={16} />
            <Text style={styles.serviceEditSaveText}>Save</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setEditing(true);
      }}
      style={styles.serviceViewCard}
    >
      <View style={styles.serviceViewTop}>
        <View style={styles.serviceViewLeft}>
          <View style={styles.serviceIconWrap}>
            <Scissors color={Colors.teal} size={14} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.serviceViewName}>{service.haircutName}</Text>
            {service.description ? (
              <Text style={styles.serviceViewDesc} numberOfLines={2}>{service.description}</Text>
            ) : (
              <Text style={styles.serviceViewDescEmpty}>Tap to add a description</Text>
            )}
          </View>
        </View>
        <View style={styles.serviceViewRight}>
          <Text style={styles.serviceViewRate}>${service.rate}</Text>
          <Pencil color={Colors.textMuted} size={12} />
        </View>
      </View>
    </Pressable>
  );
});
ServiceEditor.displayName = 'ServiceEditor';

function ServicesTab({ barber, onUpdateServices }: {
  barber: NonNullable<ReturnType<typeof useBarbers>['barberAuth']['barber']>;
  onUpdateServices: (services: BarberService[]) => void;
}) {
  const handleUpdateService = useCallback((haircutId: string, updates: { rate?: number; description?: string }) => {
    const updated = barber.services.map((s) =>
      s.haircutId === haircutId ? { ...s, ...updates } : s
    );
    onUpdateServices(updated);
  }, [barber.services, onUpdateServices]);

  return (
    <ScrollView contentContainerStyle={styles.tabContent} showsVerticalScrollIndicator={false}>
      <View style={styles.tabHeaderRow}>
        <View>
          <Text style={styles.tabHeaderTitle}>Your Services</Text>
          <Text style={styles.tabHeaderSub}>{barber.services.length} services offered</Text>
        </View>
        <View style={styles.serviceCountBadge}>
          <Scissors color={Colors.teal} size={14} />
          <Text style={styles.serviceCountText}>{barber.services.length}</Text>
        </View>
      </View>
      <Text style={styles.tapHint}>Tap any service to edit price & description</Text>
      <View style={styles.servicesList}>
        {barber.services.map((service) => (
          <ServiceEditor key={service.haircutId} service={service} onUpdate={handleUpdateService} />
        ))}
      </View>
    </ScrollView>
  );
}

function AppointmentsTab({ barber }: {
  barber: NonNullable<ReturnType<typeof useBarbers>['barberAuth']['barber']>;
}) {
  const { getBarberAppointments, getBarberNotifications, getUnreadCount, markNotificationRead, markAllNotificationsRead } = useBarbers();
  const appointments = getBarberAppointments(barber.id);
  const upcomingAppointments = appointments.filter((a) => a.status !== 'completed');
  const barberNotifications = getBarberNotifications(barber.id);
  const unreadCount = getUnreadCount(barber.id);

  return (
    <ScrollView contentContainerStyle={styles.tabContent} showsVerticalScrollIndicator={false}>
      <View style={styles.tabHeaderRow}>
        <View>
          <Text style={styles.tabHeaderTitle}>Appointments</Text>
          <Text style={styles.tabHeaderSub}>{upcomingAppointments.length} upcoming</Text>
        </View>
        <View style={styles.appointmentCountBadge}>
          <Calendar color={Colors.accent} size={14} />
          <Text style={styles.appointmentCountText}>{upcomingAppointments.length}</Text>
        </View>
      </View>

      {barberNotifications.length > 0 && (
        <View style={styles.notifSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>NOTIFICATIONS</Text>
            {unreadCount > 0 && (
              <Pressable
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); markAllNotificationsRead(barber.id); }}
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
                onPress={() => { if (!notif.read) { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); markNotificationRead(notif.id); } }}
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

      <Text style={styles.sectionTitle}>UPCOMING</Text>
      {upcomingAppointments.length === 0 ? (
        <View style={styles.emptyCard}>
          <Clock color={Colors.textMuted} size={28} />
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
    </ScrollView>
  );
}

function ProfileTab({ barber, onUpdateProfile, isSaving }: {
  barber: NonNullable<ReturnType<typeof useBarbers>['barberAuth']['barber']>;
  onUpdateProfile: (updates: { fullName?: string; bio?: string; avatarUrl?: string | null; location?: { address: string; latitude: number; longitude: number } }) => void;
  isSaving: boolean;
}) {
  const router = useRouter();
  const { barberLogout } = useBarbers();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(barber.fullName);
  const [editBio, setEditBio] = useState(barber.bio);
  const [editAddress, setEditAddress] = useState(barber.location.address);
  const [editAvatar, setEditAvatar] = useState(barber.avatarUrl ?? '');

  const handleSave = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onUpdateProfile({
      fullName: editName.trim() || barber.fullName,
      bio: editBio.trim(),
      avatarUrl: editAvatar.trim() || null,
      location: {
        address: editAddress.trim() || barber.location.address,
        latitude: barber.location.latitude,
        longitude: barber.location.longitude,
      },
    });
    setIsEditing(false);
  }, [editName, editBio, editAddress, editAvatar, barber, onUpdateProfile]);

  const handleCancel = useCallback(() => {
    setEditName(barber.fullName);
    setEditBio(barber.bio);
    setEditAddress(barber.location.address);
    setEditAvatar(barber.avatarUrl ?? '');
    setIsEditing(false);
  }, [barber]);

  const handleLogout = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => { barberLogout(); router.replace('/login' as any); } },
    ]);
  }, [barberLogout, router]);

  const initials = barber.fullName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  if (isEditing) {
    return (
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.tabContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={styles.editHeader}>
            <Text style={styles.tabHeaderTitle}>Edit Profile</Text>
            <View style={styles.editHeaderActions}>
              <Pressable onPress={handleCancel} style={styles.editCancelBtn}>
                <X color={Colors.textSecondary} size={18} />
              </Pressable>
              <Pressable onPress={handleSave} style={styles.editSaveBtn} disabled={isSaving}>
                {isSaving ? (
                  <ActivityIndicator color={Colors.black} size="small" />
                ) : (
                  <>
                    <Save color={Colors.black} size={16} />
                    <Text style={styles.editSaveBtnText}>Save</Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>

          <View style={styles.editSection}>
            <Text style={styles.editLabel}>FULL NAME</Text>
            <TextInput
              style={styles.editInput}
              value={editName}
              onChangeText={setEditName}
              placeholder="Your name"
              placeholderTextColor={Colors.textMuted}
              testID="edit-barber-name"
            />
          </View>

          <View style={styles.editSection}>
            <Text style={styles.editLabel}>AVATAR URL</Text>
            <TextInput
              style={styles.editInput}
              value={editAvatar}
              onChangeText={setEditAvatar}
              placeholder="https://example.com/photo.jpg"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="none"
              testID="edit-barber-avatar"
            />
          </View>

          <View style={styles.editSection}>
            <Text style={styles.editLabel}>BIO</Text>
            <TextInput
              style={[styles.editInput, styles.editBioInput]}
              value={editBio}
              onChangeText={setEditBio}
              placeholder="Tell clients about yourself..."
              placeholderTextColor={Colors.textMuted}
              multiline
              testID="edit-barber-bio"
            />
          </View>

          <View style={styles.editSection}>
            <Text style={styles.editLabel}>LOCATION</Text>
            <View style={styles.editLocationRow}>
              <MapPin color={Colors.teal} size={16} />
              <TextInput
                style={[styles.editInput, { flex: 1 }]}
                value={editAddress}
                onChangeText={setEditAddress}
                placeholder="123 Main St, City, State ZIP"
                placeholderTextColor={Colors.textMuted}
                testID="edit-barber-address"
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.tabContent} showsVerticalScrollIndicator={false}>
      <View style={styles.profileCard}>
        {barber.avatarUrl ? (
          <Image source={{ uri: barber.avatarUrl }} style={styles.avatar} contentFit="cover" />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.initialsText}>{initials}</Text>
          </View>
        )}
        <Text style={styles.profileName}>{barber.fullName}</Text>
        <Text style={styles.profileEmail}>{barber.email}</Text>
        <View style={styles.locationRow}>
          <MapPin color={Colors.teal} size={13} />
          <Text style={styles.locationText}>{barber.location.address}</Text>
        </View>
        <Text style={styles.profileBio}>{barber.bio}</Text>
        <Pressable
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setIsEditing(true); }}
          style={styles.editProfileBtn}
          testID="edit-profile-btn"
        >
          <Pencil color={Colors.teal} size={16} />
          <Text style={styles.editProfileBtnText}>Edit Profile</Text>
        </Pressable>
      </View>

      <View style={styles.profileStatsRow}>
        <View style={styles.profileStatCard}>
          <Text style={styles.profileStatNum}>{barber.services.length}</Text>
          <Text style={styles.profileStatLabel}>Services</Text>
        </View>
        <View style={styles.profileStatCard}>
          <Text style={styles.profileStatNum}>
            {new Date(barber.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
          </Text>
          <Text style={styles.profileStatLabel}>Member since</Text>
        </View>
      </View>

      <Pressable onPress={handleLogout} style={styles.logoutBtn} testID="barber-logout-btn">
        <LogOut color={Colors.error} size={18} />
        <Text style={styles.logoutText}>Sign Out</Text>
      </Pressable>
      <Text style={styles.versionText}>Cut-GPT Barber v1.0.0</Text>
    </ScrollView>
  );
}

export default function BarberDashboardScreen() {
  const router = useRouter();
  const { barberAuth, updateBarberProfile, updateBarberServices, isUpdatingProfile, isUpdatingServices } = useBarbers();
  const barber = barberAuth.barber;
  const [activeTab, setActiveTab] = useState<DashboardTab>('services');

  const tabIndicatorAnim = useRef(new Animated.Value(0)).current;

  const tabs: { key: DashboardTab; label: string; icon: typeof Scissors }[] = useMemo(() => [
    { key: 'services', label: 'Services', icon: Scissors },
    { key: 'appointments', label: 'Bookings', icon: Calendar },
    { key: 'profile', label: 'Profile', icon: User },
  ], []);

  const handleTabChange = useCallback((tab: DashboardTab) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const index = tabs.findIndex((t) => t.key === tab);
    Animated.spring(tabIndicatorAnim, { toValue: index, useNativeDriver: true, speed: 16, bounciness: 3 }).start();
    setActiveTab(tab);
  }, [tabs, tabIndicatorAnim]);

  const handleUpdateServices = useCallback((services: BarberService[]) => {
    updateBarberServices(services).catch((err: Error) => {
      console.log('[BarberDashboard] Service update error:', err.message);
      Alert.alert('Error', 'Failed to update services');
    });
  }, [updateBarberServices]);

  const handleUpdateProfile = useCallback((updates: { fullName?: string; bio?: string; avatarUrl?: string | null; location?: { address: string; latitude: number; longitude: number } }) => {
    updateBarberProfile(updates).catch((err: Error) => {
      console.log('[BarberDashboard] Profile update error:', err.message);
      Alert.alert('Error', 'Failed to update profile');
    });
  }, [updateBarberProfile]);

  if (!barber) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Not logged in as barber</Text>
        </View>
      </View>
    );
  }

  const tabWidth = (SCREEN_WIDTH - 40) / 3;
  const translateX = tabIndicatorAnim.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [0, tabWidth, tabWidth * 2],
  });

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: '',
          headerStyle: { backgroundColor: Colors.background },
          headerTintColor: Colors.text,
          headerShadowVisible: false,
          headerLeft: () => (
            <Text style={styles.headerTitle}>Cut-GPT <Text style={styles.headerTitleAccent}>Pro</Text></Text>
          ),
        }}
      />

      <View style={styles.tabBar}>
        <Animated.View style={[styles.tabIndicator, { width: tabWidth, transform: [{ translateX }] }]} />
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          const IconComp = tab.icon;
          return (
            <Pressable key={tab.key} onPress={() => handleTabChange(tab.key)} style={styles.tabItem} testID={`tab-${tab.key}`}>
              <IconComp color={isActive ? Colors.teal : Colors.textMuted} size={18} />
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.tabContainer}>
        {activeTab === 'services' && (
          <ServicesTab barber={barber} onUpdateServices={handleUpdateServices} />
        )}
        {activeTab === 'appointments' && (
          <AppointmentsTab barber={barber} />
        )}
        {activeTab === 'profile' && (
          <ProfileTab barber={barber} onUpdateProfile={handleUpdateProfile} isSaving={isUpdatingProfile} />
        )}
      </View>
    </View>
  );
}

const imgStyles = StyleSheet.create({
  container: { alignItems: 'center' },
  imageWrap: { width: IMAGE_WIDTH, height: IMAGE_HEIGHT, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.card },
  image: { width: IMAGE_WIDTH, height: IMAGE_HEIGHT },
  labelBadge: { position: 'absolute', top: 10, left: 10, backgroundColor: 'rgba(0,0,0,0.65)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  labelText: { color: Colors.white, fontSize: 11, fontWeight: '600' as const },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: IMAGE_WIDTH, marginTop: 10 },
  dots: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.borderLight },
  dotActive: { backgroundColor: Colors.accent, width: 20, borderRadius: 4 },
  playBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: Colors.accent, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
  playText: { color: Colors.black, fontSize: 11, fontWeight: '700' as const },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  errorContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { color: Colors.error, fontSize: 16, textAlign: 'center' },

  headerTitle: { fontSize: 20, fontWeight: '800' as const, color: Colors.text, letterSpacing: 1.5 },
  headerTitleAccent: { color: Colors.teal, fontWeight: '800' as const },

  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 20,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: Colors.border,
    position: 'relative',
  },
  tabIndicator: {
    position: 'absolute',
    top: 4,
    left: 4,
    bottom: 4,
    backgroundColor: Colors.card,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: Colors.tealBorder,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    zIndex: 1,
  },
  tabLabel: { fontSize: 12, fontWeight: '600' as const, color: Colors.textMuted },
  tabLabelActive: { color: Colors.teal },

  tabContainer: { flex: 1 },
  tabContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },

  tabHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  tabHeaderTitle: { fontSize: 22, fontWeight: '700' as const, color: Colors.text },
  tabHeaderSub: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },

  tapHint: { fontSize: 11, color: Colors.textMuted, marginBottom: 16, fontStyle: 'italic' as const },

  serviceCountBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.tealMuted, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  serviceCountText: { color: Colors.teal, fontSize: 16, fontWeight: '700' as const },

  servicesList: { gap: 10 },
  serviceViewCard: { backgroundColor: Colors.surface, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: Colors.border },
  serviceViewTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  serviceViewLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  serviceIconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.tealMuted, alignItems: 'center', justifyContent: 'center' },
  serviceViewName: { color: Colors.text, fontSize: 15, fontWeight: '600' as const },
  serviceViewDesc: { color: Colors.textSecondary, fontSize: 12, marginTop: 3, lineHeight: 16 },
  serviceViewDescEmpty: { color: Colors.textMuted, fontSize: 12, marginTop: 3, fontStyle: 'italic' as const },
  serviceViewRight: { alignItems: 'flex-end', gap: 6 },
  serviceViewRate: { color: Colors.success, fontSize: 18, fontWeight: '700' as const },

  serviceEditCard: { backgroundColor: Colors.surface, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: Colors.tealBorder },
  serviceEditName: { color: Colors.text, fontSize: 16, fontWeight: '700' as const, marginBottom: 14 },
  serviceEditRow: { marginBottom: 12 },
  serviceEditLabel: { fontSize: 9, fontWeight: '700' as const, color: Colors.textMuted, letterSpacing: 1.2, marginBottom: 6 },
  serviceEditInputWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.card, borderRadius: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: Colors.border },
  serviceEditInput: { flex: 1, color: Colors.text, fontSize: 16, fontWeight: '700' as const, paddingVertical: 10 },
  serviceEditDescInput: { backgroundColor: Colors.card, borderRadius: 10, padding: 12, color: Colors.text, fontSize: 14, borderWidth: 1, borderColor: Colors.border, minHeight: 60, textAlignVertical: 'top' as const },
  serviceEditActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  serviceEditCancelBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 10, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border },
  serviceEditCancelText: { color: Colors.textSecondary, fontSize: 13, fontWeight: '600' as const },
  serviceEditSaveBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 10, backgroundColor: Colors.teal },
  serviceEditSaveText: { color: Colors.black, fontSize: 13, fontWeight: '700' as const },

  appointmentCountBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.accentMuted, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  appointmentCountText: { color: Colors.accent, fontSize: 16, fontWeight: '700' as const },

  notifSection: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  sectionTitle: { fontSize: 10, fontWeight: '700' as const, color: Colors.textMuted, letterSpacing: 1.5, marginBottom: 10, marginLeft: 4 },
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
  emptyCard: { backgroundColor: Colors.surface, borderRadius: 16, padding: 40, alignItems: 'center', borderWidth: 1, borderColor: Colors.border, gap: 8 },
  emptyText: { color: Colors.text, fontSize: 16, fontWeight: '600' as const },
  emptySubtext: { color: Colors.textMuted, fontSize: 12 },

  profileCard: { backgroundColor: Colors.surface, borderRadius: 20, padding: 28, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  avatar: { width: 88, height: 88, borderRadius: 44, borderWidth: 2, borderColor: Colors.teal },
  avatarPlaceholder: { width: 88, height: 88, borderRadius: 44, backgroundColor: Colors.card, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.teal },
  initialsText: { fontSize: 28, fontWeight: '700' as const, color: Colors.teal },
  profileName: { fontSize: 22, fontWeight: '700' as const, color: Colors.text, marginTop: 14 },
  profileEmail: { fontSize: 13, color: Colors.textMuted, marginTop: 4 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 10 },
  locationText: { color: Colors.textSecondary, fontSize: 12 },
  profileBio: { color: Colors.textSecondary, fontSize: 13, textAlign: 'center', marginTop: 12, lineHeight: 19, paddingHorizontal: 12 },
  editProfileBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 20, backgroundColor: Colors.tealMuted, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: Colors.tealBorder },
  editProfileBtnText: { color: Colors.teal, fontSize: 14, fontWeight: '600' as const },

  profileStatsRow: { flexDirection: 'row', gap: 10, marginTop: 16, marginBottom: 24 },
  profileStatCard: { flex: 1, backgroundColor: Colors.surface, borderRadius: 14, padding: 18, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  profileStatNum: { fontSize: 17, fontWeight: '700' as const, color: Colors.text },
  profileStatLabel: { fontSize: 11, color: Colors.textMuted, marginTop: 4, fontWeight: '500' as const },

  editHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  editHeaderActions: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  editCancelBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
  editSaveBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.teal, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12 },
  editSaveBtnText: { color: Colors.black, fontSize: 14, fontWeight: '700' as const },
  editSection: { marginBottom: 20 },
  editLabel: { fontSize: 10, fontWeight: '700' as const, color: Colors.textMuted, letterSpacing: 1.2, marginBottom: 8 },
  editInput: { backgroundColor: Colors.surface, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: Colors.text, borderWidth: 1, borderColor: Colors.border },
  editBioInput: { minHeight: 100, textAlignVertical: 'top' as const, paddingTop: 14 },
  editLocationRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },

  logoutBtn: { backgroundColor: Colors.errorMuted, borderRadius: 14, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderWidth: 1, borderColor: Colors.errorBorder },
  logoutText: { color: Colors.error, fontSize: 15, fontWeight: '600' as const },
  versionText: { color: Colors.textDim, fontSize: 11, textAlign: 'center', marginTop: 20 },
});
