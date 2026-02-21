import React, { useState, useCallback, useRef } from 'react';
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
  ChevronRight,
  Pencil,
  Check,
  X,
  Scissors,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useAuth } from '@/hooks/useAuth';
import { useSavedLooks } from '@/hooks/useSavedLooks';

export default function ProfileScreen() {
  const { user, logout, updateProfile } = useAuth();
  const { looks } = useSavedLooks();
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState(user?.fullName ?? '');
  const [isUpdating, setIsUpdating] = useState(false);

  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePickAvatar = useCallback(async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!result.canceled && result.assets[0]) {
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
    }
  }, [updateProfile]);

  const handleSaveName = useCallback(async () => {
    if (!editName.trim()) {
      Alert.alert('Error', 'Name cannot be empty');
      return;
    }
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
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => logout(),
      },
    ]);
  }, [logout]);

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  }, [scaleAnim]);

  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      })
    : '';

  const initials = (user?.fullName ?? '')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.avatarSection}>
        <Pressable onPress={handlePickAvatar} style={styles.avatarWrap}>
          {user?.avatarUrl ? (
            <Image
              source={{ uri: user.avatarUrl }}
              style={styles.avatar}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.initialsText}>{initials}</Text>
            </View>
          )}
          <View style={styles.cameraIcon}>
            {isUpdating ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <Camera color={Colors.white} size={14} />
            )}
          </View>
        </Pressable>
      </View>

      <View style={styles.nameSection}>
        {isEditingName ? (
          <View style={styles.editNameRow}>
            <TextInput
              style={styles.nameInput}
              value={editName}
              onChangeText={setEditName}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleSaveName}
              testID="edit-name-input"
            />
            <Pressable onPress={handleSaveName} style={styles.editActionBtn} hitSlop={8}>
              <Check color={Colors.success} size={20} />
            </Pressable>
            <Pressable
              onPress={() => {
                setIsEditingName(false);
                setEditName(user?.fullName ?? '');
              }}
              style={styles.editActionBtn}
              hitSlop={8}
            >
              <X color={Colors.error} size={20} />
            </Pressable>
          </View>
        ) : (
          <Pressable
            onPress={() => {
              setEditName(user?.fullName ?? '');
              setIsEditingName(true);
            }}
            style={styles.nameRow}
          >
            <Text style={styles.userName}>{user?.fullName}</Text>
            <Pencil color={Colors.textMuted} size={14} />
          </Pressable>
        )}
        <Text style={styles.userEmail}>{user?.email}</Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Scissors color={Colors.accent} size={20} />
          <Text style={styles.statNumber}>{looks.length}</Text>
          <Text style={styles.statLabel}>Saved Looks</Text>
        </View>
        <View style={styles.statCard}>
          <Calendar color={Colors.accent} size={20} />
          <Text style={styles.statNumber}>{memberSince}</Text>
          <Text style={styles.statLabel}>Member Since</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ACCOUNT</Text>

        <View style={styles.menuCard}>
          <View style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIcon, { backgroundColor: 'rgba(200,149,108,0.1)' }]}>
                <User color={Colors.accent} size={18} />
              </View>
              <View>
                <Text style={styles.menuItemTitle}>Full Name</Text>
                <Text style={styles.menuItemValue}>{user?.fullName}</Text>
              </View>
            </View>
            <ChevronRight color={Colors.textMuted} size={18} />
          </View>

          <View style={styles.menuDivider} />

          <View style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIcon, { backgroundColor: 'rgba(76,175,125,0.1)' }]}>
                <Mail color={Colors.success} size={18} />
              </View>
              <View>
                <Text style={styles.menuItemTitle}>Email</Text>
                <Text style={styles.menuItemValue}>{user?.email}</Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <Pressable
          onPress={handleLogout}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={styles.logoutBtn}
          testID="logout-btn"
        >
          <LogOut color={Colors.error} size={20} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </Pressable>
      </Animated.View>

      <Text style={styles.versionText}>StyleCut v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  avatarSection: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
  avatarWrap: {
    position: 'relative',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: Colors.accent,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.cardBackgroundLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: Colors.accent,
  },
  initialsText: {
    fontSize: 32,
    fontWeight: '700' as const,
    color: Colors.accent,
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: Colors.background,
  },
  nameSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userName: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  userEmail: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  editNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nameInput: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.accent,
    minWidth: 180,
    textAlign: 'center',
  },
  editActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 28,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
    marginTop: 8,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
    fontWeight: '500' as const,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.textMuted,
    letterSpacing: 1.5,
    marginBottom: 10,
    marginLeft: 4,
  },
  menuCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  menuIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItemTitle: {
    fontSize: 13,
    color: Colors.textMuted,
    fontWeight: '500' as const,
  },
  menuItemValue: {
    fontSize: 15,
    color: Colors.text,
    fontWeight: '600' as const,
    marginTop: 1,
  },
  menuDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginLeft: 68,
  },
  logoutBtn: {
    backgroundColor: 'rgba(224,85,85,0.08)',
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(224,85,85,0.2)',
  },
  logoutText: {
    color: Colors.error,
    fontSize: 16,
    fontWeight: '600' as const,
  },
  versionText: {
    color: Colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 24,
  },
});
