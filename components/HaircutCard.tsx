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
      toValue: 0.96,
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
        <View style={styles.gradientOverlay} />

        <Pressable
          onPress={handleFavorite}
          style={styles.favoriteBtn}
          hitSlop={10}
          testID={`favorite-${haircut.id}`}
        >
          <Animated.View style={{ transform: [{ scale: heartAnim }] }}>
            <Heart
              color={liked ? '#E85050' : 'rgba(255,255,255,0.7)'}
              size={16}
              fill={liked ? '#E85050' : 'transparent'}
            />
          </Animated.View>
        </Pressable>

        <View style={styles.info}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{haircut.category}</Text>
          </View>
          <Text style={styles.name}>{haircut.name}</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
});

HaircutCard.displayName = 'HaircutCard';

const styles = StyleSheet.create({
  cardWrapper: {
    width: '50%',
    marginBottom: 10,
  },
  cardLeft: {
    paddingRight: 5,
  },
  cardRight: {
    paddingLeft: 5,
  },
  card: {
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: Colors.card,
  },
  image: {
    width: '100%',
    height: 210,
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
  },
  favoriteBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  info: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 10,
    paddingTop: 28,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 4,
  },
  categoryText: {
    color: Colors.white,
    fontSize: 9,
    fontWeight: '700' as const,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
  },
  name: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '600' as const,
  },
});

export default HaircutCard;
