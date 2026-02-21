import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Animated,
  PanResponder,
  Pressable,
} from 'react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { RotateCw } from 'lucide-react-native';
import Colors from '@/constants/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 48;
const CARD_HEIGHT = CARD_WIDTH * 1.33;

interface AngleView {
  label: string;
  shortLabel: string;
  image: string;
  angle: number;
}

interface MultiAngleViewerProps {
  views: AngleView[];
}

export default function MultiAngleViewer({ views }: MultiAngleViewerProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const translateX = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const snapToIndex = useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(index, views.length - 1));
      setActiveIndex(clamped);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      Animated.spring(translateX, {
        toValue: -clamped * (CARD_WIDTH + 16),
        useNativeDriver: true,
        tension: 68,
        friction: 12,
      }).start();
    },
    [views.length, translateX]
  );

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) =>
        Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dy) < 30,
      onPanResponderGrant: () => {
        Animated.spring(scaleAnim, {
          toValue: 0.97,
          useNativeDriver: true,
          tension: 100,
          friction: 10,
        }).start();
      },
      onPanResponderMove: (_, gestureState) => {
        const baseOffset = -activeIndex * (CARD_WIDTH + 16);
        translateX.setValue(baseOffset + gestureState.dx * 0.8);
      },
      onPanResponderRelease: (_, gestureState) => {
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 100,
          friction: 10,
        }).start();

        const threshold = CARD_WIDTH * 0.25;
        if (gestureState.dx < -threshold && activeIndex < views.length - 1) {
          snapToIndex(activeIndex + 1);
        } else if (gestureState.dx > threshold && activeIndex > 0) {
          snapToIndex(activeIndex - 1);
        } else {
          snapToIndex(activeIndex);
        }
      },
    })
  ).current;

  const handleDotPress = useCallback(
    (index: number) => {
      snapToIndex(index);
    },
    [snapToIndex]
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <RotateCw color={Colors.accent} size={16} />
        <Text style={styles.headerText}>Swipe to rotate</Text>
      </View>

      <View style={styles.carouselClip} {...panResponder.panHandlers}>
        <Animated.View
          style={[
            styles.carouselTrack,
            {
              transform: [{ translateX }, { scale: scaleAnim }],
            },
          ]}
        >
          {views.map((view, index) => (
            <View key={view.label} style={styles.card}>
              <Image
                source={{ uri: view.image }}
                style={styles.cardImage}
                contentFit="cover"
                transition={200}
              />
              <View style={styles.angleBadge}>
                <Text style={styles.angleBadgeText}>{view.shortLabel}</Text>
              </View>
              <View style={styles.angleIndicator}>
                <View style={styles.compassOuter}>
                  <View
                    style={[
                      styles.compassNeedle,
                      { transform: [{ rotate: `${view.angle}deg` }] },
                    ]}
                  >
                    <View style={styles.needleTip} />
                  </View>
                </View>
              </View>
            </View>
          ))}
        </Animated.View>
      </View>

      <View style={styles.pagination}>
        {views.map((view, index) => (
          <Pressable
            key={view.label}
            onPress={() => handleDotPress(index)}
            style={styles.dotButton}
            hitSlop={8}
          >
            <View
              style={[
                styles.dot,
                index === activeIndex && styles.dotActive,
              ]}
            />
            <Text
              style={[
                styles.dotLabel,
                index === activeIndex && styles.dotLabelActive,
              ]}
            >
              {view.shortLabel}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 12,
  },
  headerText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '500' as const,
  },
  carouselClip: {
    overflow: 'hidden',
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    alignSelf: 'center',
    borderRadius: 20,
  },
  carouselTrack: {
    flexDirection: 'row',
    gap: 16,
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: Colors.cardBackground,
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  angleBadge: {
    position: 'absolute',
    top: 14,
    left: 14,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  angleBadgeText: {
    color: Colors.text,
    fontSize: 12,
    fontWeight: '700' as const,
    letterSpacing: 0.5,
  },
  angleIndicator: {
    position: 'absolute',
    top: 14,
    right: 14,
  },
  compassOuter: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(200,149,108,0.4)',
  },
  compassNeedle: {
    width: 2,
    height: 20,
    alignItems: 'center',
  },
  needleTip: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.accent,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: 16,
  },
  dotButton: {
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.border,
  },
  dotActive: {
    backgroundColor: Colors.accent,
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dotLabel: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '600' as const,
  },
  dotLabelActive: {
    color: Colors.accent,
  },
});
