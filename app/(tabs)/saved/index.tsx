import React, { useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Alert,
  Animated,
} from 'react-native';
import { Image } from 'expo-image';
import { Trash2, ImageOff, Calendar } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useSavedLooks, SavedLook } from '@/hooks/useSavedLooks';

function SavedLookCard({ look, onDelete }: { look: SavedLook; onDelete: (id: string) => void }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

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

  const formattedDate = new Date(look.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <Animated.View style={[styles.cardWrapper, { transform: [{ scale: scaleAnim }] }]}>
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
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
          </View>
        </View>
        <View style={styles.cardFooter}>
          <View style={styles.cardInfo}>
            <Text style={styles.haircutName}>{look.haircutName}</Text>
            <View style={styles.dateRow}>
              <Calendar color={Colors.textMuted} size={12} />
              <Text style={styles.dateText}>{formattedDate}</Text>
            </View>
          </View>
          <Pressable
            onPress={handleDelete}
            style={styles.deleteBtn}
            hitSlop={12}
            testID={`delete-look-${look.id}`}
          >
            <Trash2 color={Colors.error} size={18} />
          </Pressable>
        </View>
      </Pressable>
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
  },
  dateText: {
    color: Colors.textMuted,
    fontSize: 12,
  },
  deleteBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
