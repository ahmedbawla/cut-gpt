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
  Modal,
  FlatList,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
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
  Plus,
  Trash2,
  List,
  ChevronLeft,
  ChevronRight,
  Camera,
  MoreVertical,
  CheckCircle,
  XCircle,
  Settings,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useBarbers } from '@/hooks/useBarbers';
import LocationSearchComponent from '@/components/LocationSearch';
import { Appointment, BarberService } from '@/constants/barbers';
import { HAIRCUTS } from '@/constants/haircuts';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IMAGE_WIDTH = SCREEN_WIDTH - 80;
const IMAGE_HEIGHT = IMAGE_WIDTH * 1.33;

type DashboardTab = 'appointments' | 'profile';
type AppointmentView = 'list' | 'calendar';
type ProfileSubView = 'main' | 'services';

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function formatDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

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
          {isPlaying ? <Pause color={Colors.white} size={14} /> : <Play color={Colors.white} size={14} />}
          <Text style={imgStyles.playText}>{isPlaying ? 'Pause' : '360° View'}</Text>
        </Pressable>
      </View>
    </View>
  );
});
AppointmentImageViewer.displayName = 'AppointmentImageViewer';

interface AppointmentCardProps {
  apt: Appointment;
  isBarber?: boolean;
  onComplete?: (id: string) => void;
  onCancel?: (id: string) => void;
  onDelete?: (id: string) => void;
}

const AppointmentCard = React.memo(({ apt, isBarber, onComplete, onCancel, onDelete, onDecline }: AppointmentCardProps & { onDecline?: (id: string) => void }) => {
  const [expanded, setExpanded] = useState(false);
  const [showActions, setShowActions] = useState(false);
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

  const handleComplete = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Complete Appointment', `Mark ${apt.customerName}'s appointment as completed?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Complete', onPress: () => { onComplete?.(apt.id); setShowActions(false); } },
    ]);
  }, [apt, onComplete]);

  const handleCancel = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Cancel Appointment', `Cancel ${apt.customerName}'s ${apt.haircutName} appointment?`, [
      { text: 'No', style: 'cancel' },
      { text: 'Cancel It', style: 'destructive', onPress: () => { onCancel?.(apt.id); setShowActions(false); } },
    ]);
  }, [apt, onCancel]);

  const handleDelete = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert('Delete Appointment', 'This will permanently remove this appointment.', [
      { text: 'Keep', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { onDelete?.(apt.id); setShowActions(false); } },
    ]);
  }, [apt, onDelete]);

  const canDecline = isBarber && apt.status === 'confirmed' && (() => {
    try {
      const bookedAt = new Date(apt.createdAt).getTime();
      const now = Date.now();
      return (now - bookedAt) <= 60 * 60 * 1000;
    } catch { return false; }
  })();

  const statusColor = apt.status === 'confirmed' ? Colors.success : apt.status === 'completed' ? Colors.teal : apt.status === 'cancelled' || apt.status === 'declined' ? Colors.error : Colors.accent;
  const statusBg = apt.status === 'confirmed' ? Colors.successMuted : apt.status === 'completed' ? Colors.tealMuted : apt.status === 'cancelled' || apt.status === 'declined' ? Colors.errorMuted : Colors.accentMuted;

  return (
    <View style={[styles.appointmentCard, apt.status === 'cancelled' && { opacity: 0.6 }]}>
      <Pressable onPress={hasImages ? toggleExpand : undefined} style={styles.appointmentCardInner}>
        <View style={styles.appointmentTop}>
          <View style={styles.appointmentLeft}>
            {apt.customerAvatarUrl ? (
              <Image source={{ uri: apt.customerAvatarUrl }} style={styles.clientAvatar} contentFit="cover" />
            ) : (
              <View style={styles.clientIconWrap}>
                <User color={Colors.accent} size={14} />
              </View>
            )}
            <Text style={styles.appointmentClient}>{apt.customerName}</Text>
          </View>
          <View style={{ flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6 }}>
            {hasImages && (
              <View style={styles.hasImagesBadge}>
                <ImageIcon color={Colors.teal} size={10} />
              </View>
            )}
            <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
              <Text style={[styles.statusText, { color: statusColor }]}>{apt.status}</Text>
            </View>
            {isBarber && apt.status !== 'cancelled' && apt.status !== 'completed' && (
              <Pressable
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowActions(!showActions); }}
                style={styles.moreBtn}
                hitSlop={8}
              >
                <MoreVertical color={Colors.textMuted} size={16} />
              </Pressable>
            )}
          </View>
        </View>
        <View style={styles.appointmentDetails}>
          <Text style={styles.appointmentService}>{apt.haircutName}</Text>
          <Text style={styles.appointmentTime}>{apt.date} at {apt.time}</Text>
          <Text style={styles.appointmentRate}>${apt.rate}</Text>
        </View>

        {showActions && isBarber && (
          <View style={styles.actionRow}>
            <Pressable onPress={handleComplete} style={styles.actionBtnComplete}>
              <CheckCircle color={Colors.white} size={14} />
              <Text style={styles.actionBtnText}>Complete</Text>
            </Pressable>
            {canDecline && (
              <Pressable onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                Alert.alert('Decline Appointment', `Decline ${apt.customerName}'s appointment? You can only decline within 1 hour of booking.`, [
                  { text: 'Keep', style: 'cancel' },
                  { text: 'Decline', style: 'destructive', onPress: () => { onDecline?.(apt.id); setShowActions(false); } },
                ]);
              }} style={styles.actionBtnCancel}>
                <XCircle color={Colors.error} size={14} />
                <Text style={[styles.actionBtnText, { color: Colors.error }]}>Decline</Text>
              </Pressable>
            )}
            <Pressable onPress={handleCancel} style={styles.actionBtnCancel}>
              <XCircle color={Colors.error} size={14} />
              <Text style={[styles.actionBtnText, { color: Colors.error }]}>Cancel</Text>
            </Pressable>
            <Pressable onPress={handleDelete} style={styles.actionBtnDelete}>
              <Trash2 color={Colors.error} size={14} />
            </Pressable>
          </View>
        )}

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
  onRemove: (haircutId: string) => void;
}

const ServiceEditor = React.memo(({ service, onUpdate, onRemove }: ServiceEditorProps) => {
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

  const handleRemove = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Remove Service', `Remove "${service.haircutName}" from your services?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => onRemove(service.haircutId) },
    ]);
  }, [service.haircutId, service.haircutName, onRemove]);

  if (editing) {
    return (
      <View style={styles.serviceEditCard}>
        <View style={styles.serviceEditHeader}>
          <Text style={styles.serviceEditName}>{service.haircutName}</Text>
          <Pressable onPress={handleRemove} style={styles.removeBtn} hitSlop={8}>
            <Trash2 color={Colors.error} size={16} />
          </Pressable>
        </View>
        <View style={styles.serviceEditRow}>
          <Text style={styles.serviceEditLabel}>PRICE</Text>
          <View style={styles.serviceEditInputWrap}>
            <DollarSign color={Colors.accent} size={14} />
            <TextInput style={styles.serviceEditInput} value={editRate} onChangeText={setEditRate} keyboardType="numeric" testID={`edit-rate-${service.haircutId}`} />
          </View>
        </View>
        <View style={styles.serviceEditRow}>
          <Text style={styles.serviceEditLabel}>DESCRIPTION</Text>
          <TextInput style={styles.serviceEditDescInput} value={editDesc} onChangeText={setEditDesc} placeholder="Describe this service..." placeholderTextColor={Colors.textMuted} multiline testID={`edit-desc-${service.haircutId}`} />
        </View>
        <View style={styles.serviceEditActions}>
          <Pressable onPress={handleCancel} style={styles.serviceEditCancelBtn}>
            <X color={Colors.textSecondary} size={16} />
            <Text style={styles.serviceEditCancelText}>Cancel</Text>
          </Pressable>
          <Pressable onPress={handleSave} style={styles.serviceEditSaveBtn}>
            <Check color={Colors.white} size={16} />
            <Text style={styles.serviceEditSaveText}>Save</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setEditing(true); }} style={styles.serviceViewCard}>
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

function AddServiceModal({ visible, existingServiceIds, onAdd, onClose }: {
  visible: boolean;
  existingServiceIds: string[];
  onAdd: (service: BarberService) => void;
  onClose: () => void;
}) {
  const [selectedHaircut, setSelectedHaircut] = useState<string | null>(null);
  const [customName, setCustomName] = useState('');
  const [rate, setRate] = useState('');
  const [description, setDescription] = useState('');

  const availableHaircuts = useMemo(() => HAIRCUTS.filter((h) => h.id !== 'custom' && !existingServiceIds.includes(h.id)), [existingServiceIds]);

  const handleAdd = useCallback(() => {
    const parsedRate = parseInt(rate, 10);
    if (isNaN(parsedRate) || parsedRate <= 0) { Alert.alert('Invalid Price', 'Please enter a valid price.'); return; }
    if (selectedHaircut === '__custom__') {
      if (!customName.trim()) { Alert.alert('Missing Name', 'Please enter a service name.'); return; }
      onAdd({ haircutId: `custom_${Date.now()}`, haircutName: customName.trim(), rate: parsedRate, description: description.trim() || undefined });
    } else if (selectedHaircut) {
      const haircut = HAIRCUTS.find((h) => h.id === selectedHaircut);
      if (!haircut) return;
      onAdd({ haircutId: haircut.id, haircutName: haircut.name, rate: parsedRate, description: description.trim() || haircut.description });
    }
    setSelectedHaircut(null); setCustomName(''); setRate(''); setDescription(''); onClose();
  }, [selectedHaircut, customName, rate, description, onAdd, onClose]);

  const handleClose = useCallback(() => {
    setSelectedHaircut(null); setCustomName(''); setRate(''); setDescription(''); onClose();
  }, [onClose]);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={modalStyles.overlay}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={modalStyles.keyboardView}>
          <View style={modalStyles.container}>
            <View style={modalStyles.header}>
              <Text style={modalStyles.title}>Add Service</Text>
              <Pressable onPress={handleClose} style={modalStyles.closeBtn} hitSlop={8}>
                <X color={Colors.textSecondary} size={20} />
              </Pressable>
            </View>
            {!selectedHaircut ? (
              <ScrollView style={modalStyles.listScroll} showsVerticalScrollIndicator={false}>
                <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelectedHaircut('__custom__'); }} style={modalStyles.haircutOption}>
                  <View style={[modalStyles.haircutIconWrap, { backgroundColor: Colors.accentMuted }]}>
                    <Plus color={Colors.accent} size={16} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={modalStyles.haircutOptionName}>Custom Service</Text>
                    <Text style={modalStyles.haircutOptionDesc}>Add your own custom service</Text>
                  </View>
                </Pressable>
                {availableHaircuts.map((h) => (
                  <Pressable key={h.id} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelectedHaircut(h.id); setDescription(h.description); }} style={modalStyles.haircutOption}>
                    <View style={modalStyles.haircutIconWrap}><Scissors color={Colors.teal} size={14} /></View>
                    <View style={{ flex: 1 }}>
                      <Text style={modalStyles.haircutOptionName}>{h.name}</Text>
                      <Text style={modalStyles.haircutOptionDesc} numberOfLines={1}>{h.description}</Text>
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
            ) : (
              <ScrollView style={modalStyles.formScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                {selectedHaircut === '__custom__' && (
                  <View style={modalStyles.formField}>
                    <Text style={modalStyles.formLabel}>SERVICE NAME</Text>
                    <TextInput style={modalStyles.formInput} value={customName} onChangeText={setCustomName} placeholder="e.g. Line Up, Beard Trim..." placeholderTextColor={Colors.textMuted} testID="add-service-name" />
                  </View>
                )}
                {selectedHaircut !== '__custom__' && (
                  <View style={modalStyles.selectedPreview}>
                    <Scissors color={Colors.teal} size={16} />
                    <Text style={modalStyles.selectedName}>{HAIRCUTS.find((h) => h.id === selectedHaircut)?.name ?? ''}</Text>
                  </View>
                )}
                <View style={modalStyles.formField}>
                  <Text style={modalStyles.formLabel}>PRICE ($)</Text>
                  <View style={modalStyles.priceRow}>
                    <DollarSign color={Colors.accent} size={16} />
                    <TextInput style={modalStyles.formInputPrice} value={rate} onChangeText={setRate} placeholder="0" placeholderTextColor={Colors.textMuted} keyboardType="numeric" testID="add-service-rate" />
                  </View>
                </View>
                <View style={modalStyles.formField}>
                  <Text style={modalStyles.formLabel}>DESCRIPTION (optional)</Text>
                  <TextInput style={[modalStyles.formInput, { minHeight: 70, textAlignVertical: 'top' as const }]} value={description} onChangeText={setDescription} placeholder="Describe this service..." placeholderTextColor={Colors.textMuted} multiline testID="add-service-desc" />
                </View>
                <View style={modalStyles.formActions}>
                  <Pressable onPress={() => setSelectedHaircut(null)} style={modalStyles.backBtn}>
                    <ChevronLeft color={Colors.textSecondary} size={16} />
                    <Text style={modalStyles.backBtnText}>Back</Text>
                  </Pressable>
                  <Pressable onPress={handleAdd} style={modalStyles.addBtn}>
                    <Plus color={Colors.white} size={16} />
                    <Text style={modalStyles.addBtnText}>Add Service</Text>
                  </Pressable>
                </View>
              </ScrollView>
            )}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function ServicesView({ barber, onUpdateServices, onBack }: {
  barber: NonNullable<ReturnType<typeof useBarbers>['barberAuth']['barber']>;
  onUpdateServices: (services: BarberService[]) => void;
  onBack: () => void;
}) {
  const [showAddModal, setShowAddModal] = useState(false);

  const handleUpdateService = useCallback((haircutId: string, updates: { rate?: number; description?: string }) => {
    const updated = barber.services.map((s) => s.haircutId === haircutId ? { ...s, ...updates } : s);
    onUpdateServices(updated);
  }, [barber.services, onUpdateServices]);

  const handleRemoveService = useCallback((haircutId: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onUpdateServices(barber.services.filter((s) => s.haircutId !== haircutId));
  }, [barber.services, onUpdateServices]);

  const handleAddService = useCallback((service: BarberService) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onUpdateServices([...barber.services, service]);
  }, [barber.services, onUpdateServices]);

  const existingIds = useMemo(() => barber.services.map((s) => s.haircutId), [barber.services]);

  return (
    <ScrollView contentContainerStyle={styles.tabContent} showsVerticalScrollIndicator={false}>
      <View style={styles.servicesHeader}>
        <Pressable onPress={onBack} style={styles.servicesBackBtn} hitSlop={8}>
          <ChevronLeft color={Colors.text} size={20} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.tabHeaderTitle}>Your Services</Text>
          <Text style={styles.tabHeaderSub}>{barber.services.length} services offered</Text>
        </View>
        <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowAddModal(true); }} style={styles.addServiceBtn} testID="add-service-btn">
          <Plus color={Colors.white} size={16} />
          <Text style={styles.addServiceBtnText}>Add</Text>
        </Pressable>
      </View>
      <Text style={styles.tapHint}>Tap any service to edit or remove</Text>
      <View style={styles.servicesList}>
        {barber.services.map((service) => (
          <ServiceEditor key={service.haircutId} service={service} onUpdate={handleUpdateService} onRemove={handleRemoveService} />
        ))}
        {barber.services.length === 0 && (
          <View style={styles.emptyCard}>
            <Scissors color={Colors.textMuted} size={28} />
            <Text style={styles.emptyText}>No services yet</Text>
            <Text style={styles.emptySubtext}>Tap "Add" to get started</Text>
          </View>
        )}
      </View>
      <AddServiceModal visible={showAddModal} existingServiceIds={existingIds} onAdd={handleAddService} onClose={() => setShowAddModal(false)} />
    </ScrollView>
  );
}

function CalendarView({ appointments, year, month, onComplete, onCancel, onDelete }: {
  appointments: Appointment[];
  year: number;
  month: number;
  onComplete?: (id: string) => void;
  onCancel?: (id: string) => void;
  onDelete?: (id: string) => void;
}) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const appointmentsByDate = useMemo(() => {
    const map: Record<string, Appointment[]> = {};
    appointments.forEach((apt) => {
      if (!map[apt.date]) map[apt.date] = [];
      map[apt.date].push(apt);
    });
    return map;
  }, [appointments]);

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const calendarDays = useMemo(() => {
    const days: Array<{ day: number; dateKey: string } | null> = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push({ day: d, dateKey: formatDateKey(year, month, d) });
    return days;
  }, [year, month, daysInMonth, firstDay]);

  const selectedAppointments = useMemo(() => {
    if (!selectedDate) return [];
    return appointmentsByDate[selectedDate] ?? [];
  }, [selectedDate, appointmentsByDate]);

  const today = new Date();
  const todayKey = formatDateKey(today.getFullYear(), today.getMonth(), today.getDate());

  return (
    <View>
      <View style={calStyles.grid}>
        {DAYS_OF_WEEK.map((d) => (
          <View key={d} style={calStyles.dayHeader}><Text style={calStyles.dayHeaderText}>{d}</Text></View>
        ))}
        {calendarDays.map((item, idx) => {
          if (!item) return <View key={`empty-${idx}`} style={calStyles.dayCell} />;
          const count = appointmentsByDate[item.dateKey]?.length ?? 0;
          const isToday = item.dateKey === todayKey;
          const isSelected = item.dateKey === selectedDate;
          return (
            <Pressable key={item.dateKey} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelectedDate(isSelected ? null : item.dateKey); }}
              style={[calStyles.dayCell, isToday && calStyles.dayCellToday, isSelected && calStyles.dayCellSelected]}>
              <Text style={[calStyles.dayNum, isToday && calStyles.dayNumToday, isSelected && calStyles.dayNumSelected]}>{item.day}</Text>
              {count > 0 && (
                <View style={[calStyles.countBadge, isSelected && calStyles.countBadgeSelected]}>
                  <Text style={[calStyles.countText, isSelected && calStyles.countTextSelected]}>{count}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
      {selectedDate && (
        <View style={calStyles.selectedSection}>
          <Text style={calStyles.selectedTitle}>{selectedAppointments.length} appointment{selectedAppointments.length !== 1 ? 's' : ''} on {selectedDate}</Text>
          {selectedAppointments.length === 0 ? (
            <View style={styles.emptyCard}><Clock color={Colors.textMuted} size={22} /><Text style={styles.emptyText}>No appointments</Text></View>
          ) : (
            <View style={{ gap: 10 }}>
              {selectedAppointments.map((apt) => (
                <AppointmentCard key={apt.id} apt={apt} isBarber onComplete={onComplete} onCancel={onCancel} onDelete={onDelete} />
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

function AppointmentsTab({ barber }: {
  barber: NonNullable<ReturnType<typeof useBarbers>['barberAuth']['barber']>;
}) {
  const { getBarberAppointments, getBarberNotifications, getUnreadCount, markNotificationRead, markAllNotificationsRead, updateAppointment, cancelAppointment, deleteAppointment, declineAppointment } = useBarbers();
  const appointments = getBarberAppointments(barber.id);
  const allAppointments = useBarbers().appointments.filter((a) => a.barberId === barber.id);
  const upcomingAppointments = allAppointments.filter((a) => {
    if (a.status === 'completed' || a.status === 'cancelled' || a.status === 'declined') return false;
    try {
      const [year, month, day] = a.date.split('-').map(Number);
      const aptDate = new Date(year, month - 1, day, 23, 59, 59);
      if (aptDate.getTime() < Date.now()) return false;
    } catch { return false; }
    return true;
  });
  const barberNotifications = getBarberNotifications(barber.id);
  const unreadCount = getUnreadCount(barber.id);

  const [viewMode, setViewMode] = useState<AppointmentView>('list');
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());

  const handleComplete = useCallback((id: string) => {
    updateAppointment(id, { status: 'completed' });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [updateAppointment]);

  const handleCancel = useCallback((id: string) => {
    cancelAppointment(id);
  }, [cancelAppointment]);

  const handleDelete = useCallback((id: string) => {
    deleteAppointment(id);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [deleteAppointment]);

  const handleDecline = useCallback((id: string) => {
    declineAppointment(id).then(() => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }).catch((err: Error) => {
      Alert.alert('Cannot Decline', err.message);
    });
  }, [declineAppointment]);

  const goToPrevMonth = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (calendarMonth === 0) { setCalendarMonth(11); setCalendarYear((y) => y - 1); } else { setCalendarMonth((m) => m - 1); }
  }, [calendarMonth]);

  const goToNextMonth = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (calendarMonth === 11) { setCalendarMonth(0); setCalendarYear((y) => y + 1); } else { setCalendarMonth((m) => m + 1); }
  }, [calendarMonth]);

  return (
    <ScrollView contentContainerStyle={styles.tabContent} showsVerticalScrollIndicator={false}>
      <View style={styles.tabHeaderRow}>
        <View>
          <Text style={styles.tabHeaderTitle}>Bookings</Text>
          <Text style={styles.tabHeaderSub}>{upcomingAppointments.length} upcoming</Text>
        </View>
        <View style={styles.viewToggle}>
          <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setViewMode('list'); }}
            style={[styles.viewToggleBtn, viewMode === 'list' && styles.viewToggleBtnActive]} testID="view-list">
            <List color={viewMode === 'list' ? Colors.teal : Colors.textMuted} size={18} />
          </Pressable>
          <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setViewMode('calendar'); }}
            style={[styles.viewToggleBtn, viewMode === 'calendar' && styles.viewToggleBtnActive]} testID="view-calendar">
            <Calendar color={viewMode === 'calendar' ? Colors.teal : Colors.textMuted} size={18} />
          </Pressable>
        </View>
      </View>

      {viewMode === 'list' ? (
        <>
          {barberNotifications.length > 0 && (
            <View style={styles.notifSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>NOTIFICATIONS</Text>
                {unreadCount > 0 && (
                  <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); markAllNotificationsRead(barber.id); }} hitSlop={8} style={styles.markAllBtn} testID="mark-all-read">
                    <CheckCheck color={Colors.teal} size={13} />
                    <Text style={styles.markAllText}>Mark all read</Text>
                  </Pressable>
                )}
              </View>
              <View style={styles.notificationsList}>
                {barberNotifications.slice(0, 10).map((notif) => (
                  <Pressable key={notif.id} onPress={() => { if (!notif.read) { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); markNotificationRead(notif.id); } }}
                    style={[styles.notificationCard, !notif.read && styles.notificationCardUnread]} testID={`notif-${notif.id}`}>
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
                        <Text style={styles.notifTime}>{new Date(notif.createdAt).toLocaleDateString()} at {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
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
                <AppointmentCard key={apt.id} apt={apt} isBarber onComplete={handleComplete} onCancel={handleCancel} onDelete={handleDelete} onDecline={handleDecline} />
              ))}
            </View>
          )}
        </>
      ) : (
        <>
          <View style={calStyles.monthNav}>
            <Pressable onPress={goToPrevMonth} style={calStyles.monthNavBtn} hitSlop={8}><ChevronLeft color={Colors.text} size={20} /></Pressable>
            <Text style={calStyles.monthTitle}>{MONTH_NAMES[calendarMonth]} {calendarYear}</Text>
            <Pressable onPress={goToNextMonth} style={calStyles.monthNavBtn} hitSlop={8}><ChevronRight color={Colors.text} size={20} /></Pressable>
          </View>
          <CalendarView appointments={allAppointments} year={calendarYear} month={calendarMonth} onComplete={handleComplete} onCancel={handleCancel} onDelete={handleDelete} />
        </>
      )}
    </ScrollView>
  );
}

function ProfileTab({ barber, onUpdateProfile, onUpdateServices, isSaving }: {
  barber: NonNullable<ReturnType<typeof useBarbers>['barberAuth']['barber']>;
  onUpdateProfile: (updates: { fullName?: string; bio?: string; avatarUrl?: string | null; location?: { address: string; latitude: number; longitude: number } }) => void;
  onUpdateServices: (services: BarberService[]) => void;
  isSaving: boolean;
}) {
  const router = useRouter();
  const { barberLogout } = useBarbers();
  const [subView, setSubView] = useState<ProfileSubView>('main');
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(barber.fullName);
  const [editBio, setEditBio] = useState(barber.bio);
  const [editAddress, setEditAddress] = useState(barber.location.address);
  const [editAvatar, setEditAvatar] = useState(barber.avatarUrl ?? '');
  const [isPickingImage, setIsPickingImage] = useState(false);

  const handlePickAvatar = useCallback(async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setIsPickingImage(true);
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.7 });
      if (!result.canceled && result.assets[0]) {
        onUpdateProfile({ avatarUrl: result.assets[0].uri });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (err) {
      console.error('[BarberProfile] Pick avatar error:', err);
      Alert.alert('Error', 'Failed to pick image.');
    } finally {
      setIsPickingImage(false);
    }
  }, [onUpdateProfile]);

  const handleSave = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onUpdateProfile({
      fullName: editName.trim() || barber.fullName,
      bio: editBio.trim(),
      avatarUrl: editAvatar.trim() || null,
      location: { address: editAddress.trim() || barber.location.address, latitude: barber.location.latitude, longitude: barber.location.longitude },
    });
    setIsEditing(false);
  }, [editName, editBio, editAddress, editAvatar, barber, onUpdateProfile]);

  const handleCancel = useCallback(() => {
    setEditName(barber.fullName); setEditBio(barber.bio); setEditAddress(barber.location.address); setEditAvatar(barber.avatarUrl ?? ''); setIsEditing(false);
  }, [barber]);

  const handleLogout = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => { barberLogout(); router.replace('/login' as any); } },
    ]);
  }, [barberLogout, router]);

  if (subView === 'services') {
    return <ServicesView barber={barber} onUpdateServices={onUpdateServices} onBack={() => setSubView('main')} />;
  }

  const initials = barber.fullName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  if (isEditing) {
    return (
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }} keyboardVerticalOffset={Platform.OS === 'ios' ? 120 : 0}>
        <ScrollView contentContainerStyle={styles.tabContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentInsetAdjustmentBehavior="automatic">
          <View style={styles.editHeader}>
            <Text style={styles.tabHeaderTitle}>Edit Profile</Text>
            <View style={styles.editHeaderActions}>
              <Pressable onPress={handleCancel} style={styles.editCancelBtn}><X color={Colors.textSecondary} size={18} /></Pressable>
              <Pressable onPress={handleSave} style={styles.editSaveBtn} disabled={isSaving}>
                {isSaving ? <ActivityIndicator color={Colors.white} size="small" /> : <><Save color={Colors.white} size={16} /><Text style={styles.editSaveBtnText}>Save</Text></>}
              </Pressable>
            </View>
          </View>
          <View style={styles.editSection}>
            <Text style={styles.editLabel}>FULL NAME</Text>
            <TextInput style={styles.editInput} value={editName} onChangeText={setEditName} placeholder="Your name" placeholderTextColor={Colors.textMuted} testID="edit-barber-name" />
          </View>
          <View style={styles.editSection}>
            <Text style={styles.editLabel}>AVATAR URL</Text>
            <TextInput style={styles.editInput} value={editAvatar} onChangeText={setEditAvatar} placeholder="https://example.com/photo.jpg" placeholderTextColor={Colors.textMuted} autoCapitalize="none" testID="edit-barber-avatar" />
          </View>
          <View style={styles.editSection}>
            <Text style={styles.editLabel}>BIO</Text>
            <TextInput style={[styles.editInput, styles.editBioInput]} value={editBio} onChangeText={setEditBio} placeholder="Tell clients about yourself..." placeholderTextColor={Colors.textMuted} multiline testID="edit-barber-bio" />
          </View>
          <View style={[styles.editSection, { zIndex: 100 }]}>
            <Text style={styles.editLabel}>LOCATION</Text>
            <LocationSearchComponent
              value={editAddress}
              onSelect={(loc) => {
                setEditAddress(loc.address);
              }}
              placeholder="Start typing your address..."
              testID="edit-barber-address"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.tabContent} showsVerticalScrollIndicator={false}>
      <View style={styles.profileCard}>
        <Pressable onPress={handlePickAvatar} style={styles.avatarTouchable}>
          {barber.avatarUrl ? (
            <Image source={{ uri: barber.avatarUrl }} style={styles.avatar} contentFit="cover" />
          ) : (
            <View style={styles.avatarPlaceholder}><Text style={styles.initialsText}>{initials}</Text></View>
          )}
          <View style={styles.cameraIconBadge}>
            {isPickingImage ? <ActivityIndicator size="small" color={Colors.white} /> : <Camera color={Colors.white} size={12} />}
          </View>
        </Pressable>
        <Text style={styles.profileName}>{barber.fullName}</Text>
        <Text style={styles.profileEmail}>{barber.email}</Text>
        <View style={styles.locationRow}>
          <MapPin color={Colors.teal} size={13} />
          <Text style={styles.locationText}>{barber.location.address}</Text>
        </View>
        <Text style={styles.profileBio}>{barber.bio}</Text>
        <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setIsEditing(true); }} style={styles.editProfileBtn} testID="edit-profile-btn">
          <Pencil color={Colors.teal} size={16} />
          <Text style={styles.editProfileBtnText}>Edit Profile</Text>
        </Pressable>
      </View>

      <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSubView('services'); }} style={styles.servicesMenuBtn} testID="manage-services-btn">
        <View style={styles.servicesMenuLeft}>
          <View style={styles.servicesMenuIcon}>
            <Settings color={Colors.teal} size={18} />
          </View>
          <View>
            <Text style={styles.servicesMenuTitle}>Manage Services</Text>
            <Text style={styles.servicesMenuSub}>{barber.services.length} services · Tap to edit</Text>
          </View>
        </View>
        <ChevronRight color={Colors.textMuted} size={18} />
      </Pressable>

      <View style={styles.profileStatsRow}>
        <View style={styles.profileStatCard}>
          <Text style={styles.profileStatNum}>{barber.services.length}</Text>
          <Text style={styles.profileStatLabel}>Services</Text>
        </View>
        <View style={styles.profileStatCard}>
          <Text style={styles.profileStatNum}>{new Date(barber.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</Text>
          <Text style={styles.profileStatLabel}>Member since</Text>
        </View>
      </View>

      <Pressable onPress={handleLogout} style={styles.logoutBtn} testID="barber-logout-btn">
        <LogOut color={Colors.error} size={18} />
        <Text style={styles.logoutText}>Sign Out</Text>
      </Pressable>
      <Text style={styles.versionText}>Cuttr Barber v1.0.0</Text>
    </ScrollView>
  );
}

export default function BarberDashboardScreen() {
  const router = useRouter();
  const { barberAuth, updateBarberProfile, updateBarberServices, isUpdatingProfile, isUpdatingServices } = useBarbers();
  const barber = barberAuth.barber;
  const [activeTab, setActiveTab] = useState<DashboardTab>('appointments');

  const tabIndicatorAnim = useRef(new Animated.Value(0)).current;

  const tabs: { key: DashboardTab; label: string; icon: typeof Calendar }[] = useMemo(() => [
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
        <View style={styles.errorContainer}><Text style={styles.errorText}>Not logged in as barber</Text></View>
      </View>
    );
  }

  const tabWidth = (SCREEN_WIDTH - 40) / 2;
  const translateX = tabIndicatorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, tabWidth],
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
            <Image source={require('@/assets/images/cuttr-logo.png')} style={{ width: 220, height: 70 }} contentFit="contain" />
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
        {activeTab === 'appointments' && <AppointmentsTab barber={barber} />}
        {activeTab === 'profile' && <ProfileTab barber={barber} onUpdateProfile={handleUpdateProfile} onUpdateServices={handleUpdateServices} isSaving={isUpdatingProfile} />}
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
  playText: { color: Colors.white, fontSize: 11, fontWeight: '700' as const },
});

const calStyles = StyleSheet.create({
  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 16, paddingHorizontal: 4, gap: 20 },
  monthNavBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
  monthTitle: { fontSize: 17, fontWeight: '700' as const, color: Colors.text },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  dayHeader: { width: `${100 / 7}%` as any, alignItems: 'center', paddingVertical: 8 },
  dayHeaderText: { fontSize: 11, fontWeight: '600' as const, color: Colors.textMuted, letterSpacing: 0.5 },
  dayCell: { width: `${100 / 7}%` as any, alignItems: 'center', paddingVertical: 6, minHeight: 52 },
  dayCellToday: { backgroundColor: Colors.surface, borderRadius: 10 },
  dayCellSelected: { backgroundColor: Colors.tealMuted, borderRadius: 10 },
  dayNum: { fontSize: 14, fontWeight: '500' as const, color: Colors.textSecondary },
  dayNumToday: { color: Colors.accent, fontWeight: '700' as const },
  dayNumSelected: { color: Colors.teal, fontWeight: '700' as const },
  countBadge: { marginTop: 3, backgroundColor: Colors.accentMuted, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, minWidth: 20, alignItems: 'center' },
  countBadgeSelected: { backgroundColor: Colors.teal },
  countText: { fontSize: 9, fontWeight: '700' as const, color: Colors.accent },
  countTextSelected: { color: Colors.white },
  selectedSection: { marginTop: 20 },
  selectedTitle: { fontSize: 13, fontWeight: '600' as const, color: Colors.textSecondary, marginBottom: 12 },
});

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  keyboardView: { justifyContent: 'flex-end' },
  container: { backgroundColor: Colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%', paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  title: { fontSize: 18, fontWeight: '700' as const, color: Colors.text },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' },
  listScroll: { paddingHorizontal: 20, paddingTop: 12, maxHeight: 400 },
  haircutOption: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 12, borderRadius: 12, backgroundColor: Colors.surface, marginBottom: 8, borderWidth: 1, borderColor: Colors.border },
  haircutIconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.tealMuted, alignItems: 'center', justifyContent: 'center' },
  haircutOptionName: { fontSize: 14, fontWeight: '600' as const, color: Colors.text },
  haircutOptionDesc: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  formScroll: { paddingHorizontal: 20, paddingTop: 16 },
  formField: { marginBottom: 16 },
  formLabel: { fontSize: 10, fontWeight: '700' as const, color: Colors.textMuted, letterSpacing: 1.2, marginBottom: 8 },
  formInput: { backgroundColor: Colors.surface, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: Colors.text, borderWidth: 1, borderColor: Colors.border },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.surface, borderRadius: 12, paddingHorizontal: 14, borderWidth: 1, borderColor: Colors.border },
  formInputPrice: { flex: 1, fontSize: 18, fontWeight: '700' as const, color: Colors.text, paddingVertical: 12 },
  selectedPreview: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.tealMuted, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, marginBottom: 16, borderWidth: 1, borderColor: Colors.tealBorder },
  selectedName: { fontSize: 15, fontWeight: '600' as const, color: Colors.teal },
  formActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  backBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, borderRadius: 12, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  backBtnText: { fontSize: 14, fontWeight: '600' as const, color: Colors.textSecondary },
  addBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, borderRadius: 12, backgroundColor: Colors.teal },
  addBtnText: { fontSize: 14, fontWeight: '700' as const, color: Colors.white },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  errorContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { color: Colors.error, fontSize: 16, textAlign: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800' as const, color: Colors.text, letterSpacing: 1.5 },
  headerTitleAccent: { color: Colors.teal, fontWeight: '800' as const },
  tabBar: { flexDirection: 'row', marginHorizontal: 20, backgroundColor: Colors.surface, borderRadius: 14, padding: 4, borderWidth: 1, borderColor: Colors.border, position: 'relative' },
  tabIndicator: { position: 'absolute', top: 4, left: 4, bottom: 4, backgroundColor: Colors.card, borderRadius: 11, borderWidth: 1, borderColor: Colors.tealBorder },
  tabItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, zIndex: 1 },
  tabLabel: { fontSize: 12, fontWeight: '600' as const, color: Colors.textMuted },
  tabLabelActive: { color: Colors.teal },
  tabContainer: { flex: 1 },
  tabContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },
  tabHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  tabHeaderTitle: { fontSize: 22, fontWeight: '700' as const, color: Colors.text },
  tabHeaderSub: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  tapHint: { fontSize: 11, color: Colors.textMuted, marginBottom: 16, fontStyle: 'italic' as const },
  servicesHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 6 },
  servicesBackBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
  addServiceBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.teal, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  addServiceBtnText: { color: Colors.white, fontSize: 13, fontWeight: '700' as const },
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
  serviceEditHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  serviceEditName: { color: Colors.text, fontSize: 16, fontWeight: '700' as const },
  removeBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: Colors.errorMuted, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.errorBorder },
  serviceEditRow: { marginBottom: 12 },
  serviceEditLabel: { fontSize: 9, fontWeight: '700' as const, color: Colors.textMuted, letterSpacing: 1.2, marginBottom: 6 },
  serviceEditInputWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.card, borderRadius: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: Colors.border },
  serviceEditInput: { flex: 1, color: Colors.text, fontSize: 16, fontWeight: '700' as const, paddingVertical: 10 },
  serviceEditDescInput: { backgroundColor: Colors.card, borderRadius: 10, padding: 12, color: Colors.text, fontSize: 14, borderWidth: 1, borderColor: Colors.border, minHeight: 60, textAlignVertical: 'top' as const },
  serviceEditActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  serviceEditCancelBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 10, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border },
  serviceEditCancelText: { color: Colors.textSecondary, fontSize: 13, fontWeight: '600' as const },
  serviceEditSaveBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 10, backgroundColor: Colors.teal },
  serviceEditSaveText: { color: Colors.white, fontSize: 13, fontWeight: '700' as const },
  viewToggle: { flexDirection: 'row', backgroundColor: Colors.surface, borderRadius: 10, padding: 3, borderWidth: 1, borderColor: Colors.border },
  viewToggleBtn: { width: 40, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  viewToggleBtnActive: { backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.tealBorder },
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
  clientAvatar: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, borderColor: Colors.accent },
  appointmentClient: { color: Colors.text, fontSize: 14, fontWeight: '600' as const },
  hasImagesBadge: { width: 22, height: 22, borderRadius: 6, backgroundColor: Colors.tealMuted, alignItems: 'center', justifyContent: 'center' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: '700' as const, textTransform: 'capitalize' as const },
  moreBtn: { width: 28, height: 28, borderRadius: 8, backgroundColor: Colors.card, alignItems: 'center', justifyContent: 'center' },
  appointmentDetails: { marginLeft: 38 },
  appointmentService: { color: Colors.textSecondary, fontSize: 13, fontWeight: '500' as const },
  appointmentTime: { color: Colors.textMuted, fontSize: 11, marginTop: 2 },
  appointmentRate: { color: Colors.success, fontSize: 13, fontWeight: '700' as const, marginTop: 4 },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 12, marginLeft: 38, paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.border },
  actionBtnComplete: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, backgroundColor: Colors.teal },
  actionBtnCancel: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, backgroundColor: Colors.errorMuted, borderWidth: 1, borderColor: Colors.errorBorder },
  actionBtnDelete: { width: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: Colors.errorMuted, borderWidth: 1, borderColor: Colors.errorBorder },
  actionBtnText: { fontSize: 12, fontWeight: '700' as const, color: Colors.white },
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
  avatarTouchable: { position: 'relative' },
  avatar: { width: 88, height: 88, borderRadius: 44, borderWidth: 2, borderColor: Colors.teal },
  avatarPlaceholder: { width: 88, height: 88, borderRadius: 44, backgroundColor: Colors.card, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.teal },
  initialsText: { fontSize: 28, fontWeight: '700' as const, color: Colors.teal },
  cameraIconBadge: { position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.teal, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.background },
  profileName: { fontSize: 22, fontWeight: '700' as const, color: Colors.text, marginTop: 14 },
  profileEmail: { fontSize: 13, color: Colors.textMuted, marginTop: 4 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 10 },
  locationText: { color: Colors.textSecondary, fontSize: 12 },
  profileBio: { color: Colors.textSecondary, fontSize: 13, textAlign: 'center', marginTop: 12, lineHeight: 19, paddingHorizontal: 12 },
  editProfileBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 20, backgroundColor: Colors.tealMuted, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: Colors.tealBorder },
  editProfileBtnText: { color: Colors.teal, fontSize: 14, fontWeight: '600' as const },
  servicesMenuBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.surface, borderRadius: 16, padding: 16, marginTop: 16, borderWidth: 1, borderColor: Colors.border },
  servicesMenuLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  servicesMenuIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: Colors.tealMuted, alignItems: 'center', justifyContent: 'center' },
  servicesMenuTitle: { fontSize: 15, fontWeight: '600' as const, color: Colors.text },
  servicesMenuSub: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  profileStatsRow: { flexDirection: 'row', gap: 10, marginTop: 16, marginBottom: 24 },
  profileStatCard: { flex: 1, backgroundColor: Colors.surface, borderRadius: 14, padding: 18, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  profileStatNum: { fontSize: 17, fontWeight: '700' as const, color: Colors.text },
  profileStatLabel: { fontSize: 11, color: Colors.textMuted, marginTop: 4, fontWeight: '500' as const },
  editHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  editHeaderActions: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  editCancelBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
  editSaveBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.teal, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12 },
  editSaveBtnText: { color: Colors.white, fontSize: 14, fontWeight: '700' as const },
  editSection: { marginBottom: 20 },
  editLabel: { fontSize: 10, fontWeight: '700' as const, color: Colors.textMuted, letterSpacing: 1.2, marginBottom: 8 },
  editInput: { backgroundColor: Colors.surface, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: Colors.text, borderWidth: 1, borderColor: Colors.border },
  editBioInput: { minHeight: 100, textAlignVertical: 'top' as const, paddingTop: 14 },
  editLocationRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoutBtn: { backgroundColor: Colors.errorMuted, borderRadius: 14, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderWidth: 1, borderColor: Colors.errorBorder },
  logoutText: { color: Colors.error, fontSize: 15, fontWeight: '600' as const },
  versionText: { color: Colors.textDim, fontSize: 11, textAlign: 'center', marginTop: 20 },
});
