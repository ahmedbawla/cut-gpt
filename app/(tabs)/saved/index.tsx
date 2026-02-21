import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Alert,
  Animated,
  Modal,
  Dimensions,
  Platform,
  Share,
} from 'react-native';
import { Image } from 'expo-image';
import { Trash2, ImageOff, Calendar, Images, X, ChevronLeft, ChevronRight, ImageDown, Share2 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import { File, Paths } from 'expo-file-system';
import Colors from '@/constants/colors';
import { useSavedLooks, SavedLook } from '@/hooks/useSavedLooks';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

async function saveBase64ToFile(base64Uri: string, fileName: string): Promise<string | null> {
  try {
    if (Platform.OS === 'web') return null;
    const base64Data = base64Uri.replace(/^data:image\/\w+;base64,/, '');
    const file = new File(Paths.cache, fileName);
    const bytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
    file.write(bytes);
    return file.uri;
  } catch (error) {
    console.error('[Saved] Error saving base64 to file:', error);
    return null;
  }
}

function PhotoGalleryModal({
  visible,
  photos,
  title,
  onClose,
}: {
  visible: boolean;
  photos: string[];
  title: string;
  onClose: () => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const goTo = useCallback(
    (index: number) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start(() => {
        setCurrentIndex(index);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }).start();
      });
    },
    [fadeAnim]
  );

  const handleSaveToDevice = useCallback(async () => {
    const imageUri = photos[currentIndex];
    if (!imageUri) return;

    if (Platform.OS === 'web') {
      try {
        const link = document.createElement('a');
        link.href = imageUri;
        link.download = `haircut-${Date.now()}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (error) {
        console.error('[Saved] Web download error:', error);
      }
      return;
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Needed', 'Photo library access is required to save images.');
        return;
      }
      const fileName = `saved_look_${Date.now()}.jpg`;
      const filePath = await saveBase64ToFile(imageUri, fileName);
      if (filePath) {
        await MediaLibrary.saveToLibraryAsync(filePath);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Saved!', 'Photo saved to your camera roll.');
      }
    } catch (error) {
      console.error('[Saved] Error saving to device:', error);
      Alert.alert('Error', 'Failed to save image.');
    }
  }, [photos, currentIndex]);

  const handleShare = useCallback(async () => {
    const imageUri = photos[currentIndex];
    if (!imageUri) return;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      if (Platform.OS === 'web') {
        if (navigator.share) {
          await navigator.share({ title, text: 'Check out my new hairstyle!' });
        }
        return;
      }

      const fileName = `share_look_${Date.now()}.jpg`;
      const filePath = await saveBase64ToFile(imageUri, fileName);
      if (filePath) {
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(filePath, { mimeType: 'image/jpeg' });
        } else {
          await Share.share({ message: 'Check out my new hairstyle!' });
        }
      }
    } catch (error) {
      console.error('[Saved] Error sharing:', error);
    }
  }, [photos, currentIndex, title]);

  const labels = ['Front', 'Left', 'Right', 'Back'];

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={galleryStyles.overlay}>
        <View style={galleryStyles.header}>
          <Text style={galleryStyles.title}>{title}</Text>
          <Pressable onPress={onClose} style={galleryStyles.closeBtn} hitSlop={12}>
            <X color={Colors.white} size={22} />
          </Pressable>
        </View>

        <View style={galleryStyles.imageArea}>
          {currentIndex > 0 && (
            <Pressable
              onPress={() => goTo(currentIndex - 1)}
              style={[galleryStyles.navBtn, galleryStyles.navLeft]}
              hitSlop={12}
            >
              <ChevronLeft color={Colors.white} size={28} />
            </Pressable>
          )}

          <Animated.View style={{ opacity: fadeAnim, flex: 1 }}>
            <Image
              source={{ uri: photos[currentIndex] }}
              style={galleryStyles.fullImage}
              contentFit="contain"
            />
          </Animated.View>

          {currentIndex < photos.length - 1 && (
            <Pressable
              onPress={() => goTo(currentIndex + 1)}
              style={[galleryStyles.navBtn, galleryStyles.navRight]}
              hitSlop={12}
            >
              <ChevronRight color={Colors.white} size={28} />
            </Pressable>
          )}
        </View>

        <Text style={galleryStyles.label}>
          {labels[currentIndex] ?? `Photo ${currentIndex + 1}`}
        </Text>

        <View style={galleryStyles.actionRow}>
          <Pressable onPress={handleSaveToDevice} style={galleryStyles.actionBtn}>
            <ImageDown color={Colors.white} size={18} />
            <Text style={galleryStyles.actionBtnText}>Save to Device</Text>
          </Pressable>
          <Pressable onPress={handleShare} style={[galleryStyles.actionBtn, galleryStyles.shareActionBtn]}>
            <Share2 color={Colors.white} size={18} />
            <Text style={galleryStyles.actionBtnText}>Share</Text>
          </Pressable>
        </View>

        <View style={galleryStyles.dots}>
          {photos.map((_, i) => (
            <Pressable key={i} onPress={() => goTo(i)}>
              <View
                style={[
                  galleryStyles.dot,
                  i === currentIndex && galleryStyles.dotActive,
                ]}
              />
            </Pressable>
          ))}
        </View>
      </View>
    </Modal>
  );
}

function SavedLookCard({
  look,
  onDelete,
}: {
  look: SavedLook;
  onDelete: (id: string) => void;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [galleryOpen, setGalleryOpen] = useState(false);

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

  const handleDelete = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Delete Look', 'Are you sure you want to remove this look?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => onDelete(look.id),
      },
    ]);
  }, [look.id, onDelete]);

  const handleSaveToDevice = useCallback(async () => {
    const imageUri = look.resultPhoto;
    if (!imageUri) return;

    if (Platform.OS === 'web') {
      try {
        const link = document.createElement('a');
        link.href = imageUri;
        link.download = `haircut-${look.haircutName}-${Date.now()}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (error) {
        console.error('[Saved] Web download error:', error);
      }
      return;
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Needed', 'Photo library access is required.');
        return;
      }
      const fileName = `saved_${look.haircutName.replace(/\s/g, '_')}_${Date.now()}.jpg`;
      const filePath = await saveBase64ToFile(imageUri, fileName);
      if (filePath) {
        await MediaLibrary.saveToLibraryAsync(filePath);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Saved!', 'Photo saved to your camera roll.');
      }
    } catch (error) {
      console.error('[Saved] Error saving:', error);
      Alert.alert('Error', 'Failed to save image.');
    }
  }, [look]);

  const handleShare = useCallback(async () => {
    const imageUri = look.resultPhoto;
    if (!imageUri) return;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      if (Platform.OS === 'web') {
        if (navigator.share) {
          await navigator.share({
            title: look.haircutName,
            text: `Check out my ${look.haircutName} hairstyle!`,
          });
        }
        return;
      }

      const fileName = `share_${look.haircutName.replace(/\s/g, '_')}_${Date.now()}.jpg`;
      const filePath = await saveBase64ToFile(imageUri, fileName);
      if (filePath) {
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(filePath, { mimeType: 'image/jpeg' });
        } else {
          await Share.share({ message: `Check out my ${look.haircutName} hairstyle!` });
        }
      }
    } catch (error) {
      console.error('[Saved] Error sharing:', error);
    }
  }, [look]);

  const formattedDate = new Date(look.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const hasMultipleAngles = look.anglePhotos && look.anglePhotos.length > 1;

  return (
    <Animated.View style={[styles.cardWrapper, { transform: [{ scale: scaleAnim }] }]}>
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={() => {
          if (hasMultipleAngles) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setGalleryOpen(true);
          }
        }}
        style={styles.card}
        testID={`saved-look-${look.id}`}
      >
        <View style={styles.imagesRow}>
          <View style={styles.imageContainer}>
            <Text style={styles.imageLabel}>BEFORE</Text>
            <Image
              source={{ uri: look.originalPhoto }}
              style={styles.lookImage}
              contentFit="cover"
              transition={200}
            />
          </View>
          <View style={styles.arrowContainer}>
            <Text style={styles.arrowText}>→</Text>
          </View>
          <View style={styles.imageContainer}>
            <Text style={styles.imageLabel}>AFTER</Text>
            <Image
              source={{ uri: look.resultPhoto }}
              style={styles.lookImage}
              contentFit="cover"
              transition={200}
            />
            {hasMultipleAngles && (
              <View style={styles.angleBadge}>
                <Images color={Colors.white} size={12} />
                <Text style={styles.angleBadgeText}>{look.anglePhotos?.length}</Text>
              </View>
            )}
          </View>
        </View>
        <View style={styles.cardFooter}>
          <View style={styles.cardInfo}>
            <Text style={styles.haircutName}>{look.haircutName}</Text>
            <View style={styles.dateRow}>
              <Calendar color={Colors.textMuted} size={12} />
              <Text style={styles.dateText}>{formattedDate}</Text>
              {hasMultipleAngles && (
                <Text style={styles.tapHint}>Tap to view all angles</Text>
              )}
            </View>
          </View>
          <View style={styles.cardActions}>
            <Pressable
              onPress={handleSaveToDevice}
              style={styles.cardActionBtn}
              hitSlop={8}
            >
              <ImageDown color={Colors.accent} size={16} />
            </Pressable>
            <Pressable
              onPress={handleShare}
              style={styles.cardActionBtn}
              hitSlop={8}
            >
              <Share2 color={Colors.success} size={16} />
            </Pressable>
            <Pressable
              onPress={handleDelete}
              style={styles.deleteBtn}
              hitSlop={8}
              testID={`delete-look-${look.id}`}
            >
              <Trash2 color={Colors.error} size={16} />
            </Pressable>
          </View>
        </View>
      </Pressable>

      {hasMultipleAngles && look.anglePhotos && (
        <PhotoGalleryModal
          visible={galleryOpen}
          photos={look.anglePhotos}
          title={look.haircutName}
          onClose={() => setGalleryOpen(false)}
        />
      )}
    </Animated.View>
  );
}

export default function SavedScreen() {
  const { looks, deleteLook, isLoading } = useSavedLooks();

  const renderItem = useCallback(
    ({ item }: { item: SavedLook }) => (
      <SavedLookCard look={item} onDelete={deleteLook} />
    ),
    [deleteLook]
  );

  if (!isLoading && looks.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconWrap}>
          <ImageOff color={Colors.textMuted} size={40} />
        </View>
        <Text style={styles.emptyTitle}>No Saved Looks Yet</Text>
        <Text style={styles.emptySubtitle}>
          Try on a haircut and save it to see it here
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={looks}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const galleryStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
  },
  title: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '700' as const,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageArea: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: SCREEN_WIDTH - 32,
    height: SCREEN_HEIGHT * 0.55,
    borderRadius: 16,
    alignSelf: 'center',
  },
  navBtn: {
    position: 'absolute',
    top: '45%',
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navLeft: {
    left: 12,
  },
  navRight: {
    right: 12,
  },
  label: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '600' as const,
    marginTop: 12,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(200,149,108,0.85)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 22,
  },
  shareActionBtn: {
    backgroundColor: 'rgba(76,175,125,0.85)',
  },
  actionBtnText: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: '700' as const,
  },
  dots: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 24,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  dotActive: {
    backgroundColor: Colors.accent,
    width: 24,
    borderRadius: 4,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  cardWrapper: {
    marginBottom: 16,
  },
  card: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  imagesRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  imageContainer: {
    flex: 1,
  },
  imageLabel: {
    position: 'absolute',
    top: 8,
    left: 8,
    zIndex: 1,
    fontSize: 9,
    fontWeight: '700' as const,
    letterSpacing: 1,
    color: Colors.white,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    overflow: 'hidden',
  },
  lookImage: {
    width: '100%',
    height: 200,
  },
  angleBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(200,149,108,0.8)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  angleBadgeText: {
    color: Colors.white,
    fontSize: 11,
    fontWeight: '700' as const,
  },
  arrowContainer: {
    width: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.cardBackground,
  },
  arrowText: {
    color: Colors.accent,
    fontSize: 18,
    fontWeight: '700' as const,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  cardInfo: {
    flex: 1,
  },
  haircutName: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '700' as const,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  dateText: {
    color: Colors.textMuted,
    fontSize: 12,
  },
  tapHint: {
    color: Colors.accent,
    fontSize: 11,
    fontWeight: '500' as const,
    marginLeft: 6,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(224,85,85,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
