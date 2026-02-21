import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Animated,
  Pressable,
} from 'react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { Play, Pause, Save } from 'lucide-react-native';
import Colors from '@/constants/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 48;
const CARD_HEIGHT = CARD_WIDTH * 1.33;
const ROTATION_INTERVAL = 2000;

interface AngleView {
  label: string;
  shortLabel: string;
  image: string;
  angle: number;
}

interface MultiAngleViewerProps {
  views: AngleView[];
  onSavePhoto?: (index: number) => void;
}

export default function MultiAngleViewer({ views, onSavePhoto }: MultiAngleViewerProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const transitionToIndex = useCallback((nextIndex: number) => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setActiveIndex(nextIndex);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();
    });
  }, [fadeAnim]);

  const startRotation = useCallback(() => {
    setIsPlaying(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    let currentIdx = activeIndex;

    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      const nextIdx = (currentIdx + 1) % views.length;
      currentIdx = nextIdx;

      progressAnim.setValue(0);
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: ROTATION_INTERVAL,
        useNativeDriver: false,
      }).start();

      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start(() => {
        setActiveIndex(nextIdx);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }).start();
      });
    }, ROTATION_INTERVAL);

    progressAnim.setValue(0);
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: ROTATION_INTERVAL,
      useNativeDriver: false,
    }).start();
  }, [activeIndex, views.length, fadeAnim, progressAnim]);

  const stopRotation = useCallback(() => {
    setIsPlaying(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    progressAnim.setValue(0);
  }, [progressAnim]);

  const togglePlayback = useCallback(() => {
    if (isPlaying) {
      stopRotation();
    } else {
      startRotation();
    }
  }, [isPlaying, startRotation, stopRotation]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const handleDotPress = useCallback((index: number) => {
    if (isPlaying) stopRotation();
    transitionToIndex(index);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [isPlaying, stopRotation, transitionToIndex]);

  const handleSavePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSavePhoto?.(activeIndex);
  }, [activeIndex, onSavePhoto]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  if (views.length === 0) return null;

  const currentView = views[activeIndex];

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.badge360}>
          <Text style={styles.badge360Text}>360°</Text>
        </View>
        <Text style={styles.headerText}>Virtual Walkthrough</Text>
      </View>

      <View style={styles.viewerContainer}>
        <Animated.View style={[styles.imageWrapper, { opacity: fadeAnim }]}>
          <Image
            source={{ uri: currentView?.image ?? '' }}
            style={styles.mainImage}
            contentFit="cover"
            transition={100}
          />
        </Animated.View>

        <View style={styles.angleBadge}>
          <Text style={styles.angleBadgeText}>{currentView?.shortLabel ?? ''}</Text>
        </View>

        <View style={styles.compassContainer}>
          <View style={styles.compassOuter}>
            <View
              style={[
                styles.compassNeedle,
                { transform: [{ rotate: `${currentView?.angle ?? 0}deg` }] },
              ]}
            >
              <View style={styles.needleTip} />
            </View>
          </View>
        </View>

        <View style={styles.controlsOverlay}>
          <Pressable
            onPress={togglePlayback}
            style={styles.playBtn}
            hitSlop={12}
            testID="play-360-btn"
          >
            {isPlaying ? (
              <Pause color={Colors.white} size={16} fill={Colors.white} />
            ) : (
              <Play color={Colors.white} size={16} fill={Colors.white} />
            )}
          </Pressable>
          {onSavePhoto && (
            <Pressable
              onPress={handleSavePress}
              style={styles.savePhotoBtn}
              hitSlop={12}
              testID="save-angle-btn"
            >
              <Save color={Colors.black} size={14} />
            </Pressable>
          )}
        </View>

        {isPlaying && (
          <View style={styles.progressBar}>
            <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
          </View>
        )}
      </View>

      <View style={styles.thumbnailRow}>
        {views.map((view, index) => (
          <Pressable
            key={view.label}
            onPress={() => handleDotPress(index)}
            style={[
              styles.thumbnail,
              index === activeIndex && styles.thumbnailActive,
            ]}
            testID={`angle-thumb-${index}`}
          >
            <Image
              source={{ uri: view.image }}
              style={styles.thumbnailImage}
              contentFit="cover"
            />
            <Text
              style={[
                styles.thumbLabel,
                index === activeIndex && styles.thumbLabelActive,
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
    gap: 8,
    marginBottom: 12,
  },
  badge360: {
    backgroundColor: Colors.accent,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
  },
  badge360Text: {
    color: Colors.black,
    fontSize: 10,
    fontWeight: '800' as const,
    letterSpacing: 0.5,
  },
  headerText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600' as const,
  },
  viewerContainer: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    alignSelf: 'center',
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  imageWrapper: {
    width: '100%',
    height: '100%',
  },
  mainImage: {
    width: '100%',
    height: '100%',
  },
  angleBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  angleBadgeText: {
    color: Colors.text,
    fontSize: 11,
    fontWeight: '700' as const,
    letterSpacing: 0.5,
  },
  compassContainer: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  compassOuter: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.accentBorder,
  },
  compassNeedle: {
    width: 2,
    height: 18,
    alignItems: 'center',
  },
  needleTip: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: Colors.accent,
  },
  controlsOverlay: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    gap: 8,
  },
  playBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  savePhotoBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.accent,
  },
  thumbnailRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    paddingHorizontal: 8,
  },
  thumbnail: {
    alignItems: 'center',
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    opacity: 0.5,
  },
  thumbnailActive: {
    borderColor: Colors.accent,
    opacity: 1,
  },
  thumbnailImage: {
    width: 56,
    height: 68,
    borderRadius: 8,
  },
  thumbLabel: {
    color: Colors.textMuted,
    fontSize: 9,
    fontWeight: '600' as const,
    marginTop: 4,
    marginBottom: 4,
  },
  thumbLabelActive: {
    color: Colors.accent,
  },
});
