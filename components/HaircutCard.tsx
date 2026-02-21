import React, { useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
} from 'react-native';
import { Image } from 'expo-image';
import { Heart } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { HaircutStyle } from '@/constants/haircuts';
import { useFavorites } from '@/hooks/useFavorites';

interface HaircutCardProps {
  haircut: HaircutStyle;
  onPress: (haircut: HaircutStyle) => void;
  index: number;
}

const HaircutCard = React.memo(({ haircut, onPress, index }: HaircutCardProps) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const heartAnim = useRef(new Animated.Value(1)).current;
  const { isFavorite, toggleFavorite } = useFavorites();

  const liked = isFavorite(haircut.id);

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
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

  const handlePress = useCallback(() => {
    onPress(haircut);
  }, [onPress, haircut]);

  const handleFavorite = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    toggleFavorite(haircut.id);
    Animated.sequence([
      Animated.spring(heartAnim, {
        toValue: 1.4,
        useNativeDriver: true,
        speed: 50,
        bounciness: 12,
      }),
      Animated.spring(heartAnim, {
        toValue: 1,
        useNativeDriver: true,
        speed: 50,
        bounciness: 8,
      }),
    ]).start();
  }, [haircut.id, toggleFavorite, heartAnim]);

  const isLeftColumn = index % 2 === 0;

  return (
    <Animated.View
      style={[
        styles.cardWrapper,
        { transform: [{ scale: scaleAnim }] },
        isLeftColumn ? styles.cardLeft : styles.cardRight,
      ]}
    >
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.card}
        testID={`haircut-card-${haircut.id}`}
      >
        <Image
          source={{ uri: haircut.image }}
          style={styles.image}
          contentFit="cover"
          transition={300}
        />
        <View style={styles.overlay} />
        <Pressable
          onPress={handleFavorite}
          style={styles.favoriteBtn}
          hitSlop={10}
          testID={`favorite-${haircut.id}`}
        >
          <Animated.View style={{ transform: [{ scale: heartAnim }] }}>
            <Heart
              color={liked ? '#E05555' : Colors.white}
              size={18}
              fill={liked ? '#E05555' : 'transparent'}
            />
          </Animated.View>
        </Pressable>
        <View style={styles.info}>
          <Text style={styles.category}>{haircut.category.toUpperCase()}</Text>
          <Text style={styles.name}>{haircut.name}</Text>
          <Text style={styles.description} numberOfLines={1}>
            {haircut.description}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
});

HaircutCard.displayName = 'HaircutCard';

const styles = StyleSheet.create({
  cardWrapper: {
    width: '50%',
    marginBottom: 12,
  },
  cardLeft: {
    paddingRight: 6,
  },
  cardRight: {
    paddingLeft: 6,
  },
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: Colors.cardBackground,
  },
  image: {
    width: '100%',
    height: 220,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  favoriteBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  info: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  category: {
    color: Colors.accent,
    fontSize: 9,
    fontWeight: '700' as const,
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  name: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '700' as const,
  },
  description: {
    color: Colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
});

export default HaircutCard;
