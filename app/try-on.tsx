import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
  ScrollView,
  Animated,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import {
  Camera,
  ImagePlus,
  Sparkles,
  Save,
  X,
  RotateCcw,
  ChevronLeft,
  Eye,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { HAIRCUTS } from '@/constants/haircuts';
import { useSavedLooks } from '@/hooks/useSavedLooks';
import MultiAngleViewer from '@/components/MultiAngleViewer';

type TryOnStep = 'select-photo' | 'processing' | 'result';

interface AngleView {
  label: string;
  shortLabel: string;
  image: string;
  angle: number;
}

const ANGLE_CONFIGS = [
  {
    label: 'Front View',
    shortLabel: 'Front',
    angle: 0,
    promptSuffix: 'Show the person from the front, facing the camera directly. Keep the same face, skin tone, and features.',
  },
  {
    label: 'Left Side',
    shortLabel: 'Left',
    angle: -90,
    promptSuffix: 'Show the person from their left side profile view (3/4 angle from the left). Keep the same face, skin tone, and features. Show how the hairstyle looks from the left side.',
  },
  {
    label: 'Right Side',
    shortLabel: 'Right',
    angle: 90,
    promptSuffix: 'Show the person from their right side profile view (3/4 angle from the right). Keep the same face, skin tone, and features. Show how the hairstyle looks from the right side.',
  },
  {
    label: 'Back View',
    shortLabel: 'Back',
    angle: 180,
    promptSuffix: 'Show the back of the person\'s head to display the hairstyle from behind. Keep the same skin tone, head shape, and neck. Focus on showing the back of the hairstyle clearly.',
  },
];

export default function TryOnScreen() {
  const { haircutId } = useLocalSearchParams<{ haircutId: string }>();
  const router = useRouter();
  const { saveLook } = useSavedLooks();

  const haircut = HAIRCUTS.find((h) => h.id === haircutId);

  const [step, setStep] = useState<TryOnStep>('select-photo');
  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  const [userPhotoBase64, setUserPhotoBase64] = useState<string | null>(null);
  const [angleViews, setAngleViews] = useState<AngleView[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingText, setProcessingText] = useState('Analyzing your photo...');
  const [processingProgress, setProcessingProgress] = useState(0);
  const [generatedCount, setGeneratedCount] = useState(0);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, [step]);

  useEffect(() => {
    if (isProcessing) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [isProcessing, pulseAnim]);

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: processingProgress,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [processingProgress, progressAnim]);

  const takePhoto = useCallback(async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Needed', 'Camera access is required to take a photo.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.8,
        base64: true,
        cameraType: ImagePicker.CameraType.front,
      });

      if (!result.canceled && result.assets[0]) {
        console.log('[TryOn] Photo taken successfully');
        setUserPhoto(result.assets[0].uri);
        setUserPhotoBase64(result.assets[0].base64 ?? null);
      }
    } catch (error) {
      console.error('[TryOn] Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  }, []);

  const pickFromGallery = useCallback(async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        console.log('[TryOn] Photo picked from gallery');
        setUserPhoto(result.assets[0].uri);
        setUserPhotoBase64(result.assets[0].base64 ?? null);
      }
    } catch (error) {
      console.error('[TryOn] Error picking photo:', error);
      Alert.alert('Error', 'Failed to pick photo. Please try again.');
    }
  }, []);

  const generateAngle = useCallback(
    async (
      base64: string,
      haircutPrompt: string,
      angleConfig: typeof ANGLE_CONFIGS[number]
    ): Promise<string | null> => {
      try {
        console.log(`[TryOn] Generating ${angleConfig.label}...`);
        const response = await fetch('https://toolkit.rork.com/images/edit/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: `This is a photo of a person. ${haircutPrompt}. ${angleConfig.promptSuffix} Make it look natural and photorealistic.`,
            images: [{ type: 'image', image: base64 }],
            aspectRatio: '3:4',
          }),
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        if (data.image?.base64Data) {
          return `data:${data.image.mimeType};base64,${data.image.base64Data}`;
        }
        throw new Error('No image data in response');
      } catch (error) {
        console.error(`[TryOn] Error generating ${angleConfig.label}:`, error);
        return null;
      }
    },
    []
  );

  const processImage = useCallback(async () => {
    if (!userPhotoBase64 || !haircut) {
      Alert.alert('Error', 'Please select a photo first.');
      return;
    }

    setStep('processing');
    setIsProcessing(true);
    setGeneratedCount(0);
    setProcessingProgress(0);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    const processingMessages = [
      'Analyzing your facial features...',
      'Generating front view...',
      'Creating side angles...',
      'Rendering back view...',
      'Applying final details...',
    ];

    let msgIndex = 0;
    const msgInterval = setInterval(() => {
      msgIndex = (msgIndex + 1) % processingMessages.length;
      setProcessingText(processingMessages[msgIndex]);
    }, 4000);

    try {
      console.log('[TryOn] Starting multi-angle generation for:', haircut.name);
      const results: AngleView[] = [];

      for (let i = 0; i < ANGLE_CONFIGS.length; i++) {
        const config = ANGLE_CONFIGS[i];
        setProcessingText(`Generating ${config.shortLabel.toLowerCase()} view...`);
        setProcessingProgress((i / ANGLE_CONFIGS.length) * 100);

        const imageUri = await generateAngle(userPhotoBase64, haircut.prompt, config);
        if (imageUri) {
          results.push({
            label: config.label,
            shortLabel: config.shortLabel,
            image: imageUri,
            angle: config.angle,
          });
          setGeneratedCount(results.length);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      }

      if (results.length === 0) {
        throw new Error('Failed to generate any angle views');
      }

      setProcessingProgress(100);
      console.log(`[TryOn] Generated ${results.length}/${ANGLE_CONFIGS.length} angles`);

      setAngleViews(results);
      setStep('result');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('[TryOn] Error processing image:', error);
      Alert.alert(
        'Processing Failed',
        'The AI could not process your photo. Please try again with a clear, well-lit face photo.',
        [{ text: 'OK', onPress: () => setStep('select-photo') }]
      );
    } finally {
      clearInterval(msgInterval);
      setIsProcessing(false);
    }
  }, [userPhotoBase64, haircut, generateAngle]);

  const handleSave = useCallback(() => {
    if (angleViews.length === 0 || !haircut || !userPhoto) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    saveLook({
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      haircutId: haircut.id,
      haircutName: haircut.name,
      originalPhoto: userPhoto,
      resultPhoto: angleViews[0].image,
      createdAt: new Date().toISOString(),
    });

    Alert.alert('Saved!', 'Your new look has been saved to My Looks.', [
      { text: 'OK' },
    ]);
  }, [angleViews, haircut, userPhoto, saveLook]);

  const handleReset = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setUserPhoto(null);
    setUserPhotoBase64(null);
    setAngleViews([]);
    setGeneratedCount(0);
    setProcessingProgress(0);
    setStep('select-photo');
    fadeAnim.setValue(0);
    slideAnim.setValue(30);
  }, [fadeAnim, slideAnim]);

  if (!haircut) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Haircut not found</Text>
      </View>
    );
  }

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: haircut.name,
          headerStyle: { backgroundColor: Colors.background },
          headerTintColor: Colors.text,
          headerTitleStyle: { fontWeight: '700' as const },
          presentation: 'modal',
          headerLeft: () => (
            <Pressable onPress={() => router.back()} hitSlop={12}>
              <ChevronLeft color={Colors.text} size={24} />
            </Pressable>
          ),
        }}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {step === 'select-photo' && (
          <Animated.View
            style={[
              styles.stepContainer,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}
          >
            <View style={styles.haircutPreview}>
              <Image
                source={{ uri: haircut.image }}
                style={styles.haircutImage}
                contentFit="cover"
                transition={300}
              />
              <View style={styles.haircutPreviewOverlay}>
                <Text style={styles.haircutPreviewCategory}>
                  {haircut.category.toUpperCase()}
                </Text>
                <Text style={styles.haircutPreviewName}>{haircut.name}</Text>
                <Text style={styles.haircutPreviewDesc}>
                  {haircut.description}
                </Text>
              </View>
            </View>

            <View style={styles.featureBadge}>
              <Eye color={Colors.accent} size={14} />
              <Text style={styles.featureBadgeText}>
                Multi-angle 360° preview
              </Text>
            </View>

            {userPhoto ? (
              <View style={styles.photoSection}>
                <Text style={styles.sectionLabel}>YOUR PHOTO</Text>
                <View style={styles.userPhotoContainer}>
                  <Image
                    source={{ uri: userPhoto }}
                    style={styles.userPhotoImage}
                    contentFit="cover"
                    transition={200}
                  />
                  <Pressable
                    onPress={handleReset}
                    style={styles.removePhotoBtn}
                    hitSlop={8}
                  >
                    <X color={Colors.white} size={16} />
                  </Pressable>
                </View>

                <Pressable
                  onPress={processImage}
                  style={styles.generateBtn}
                  testID="generate-btn"
                >
                  <Sparkles color={Colors.white} size={20} />
                  <Text style={styles.generateBtnText}>
                    Generate 360° Preview
                  </Text>
                </Pressable>
                <Text style={styles.generateHint}>
                  Generates front, side, and back views
                </Text>
              </View>
            ) : (
              <View style={styles.photoSection}>
                <Text style={styles.sectionLabel}>ADD YOUR PHOTO</Text>
                <Text style={styles.photoHint}>
                  Take a clear, front-facing photo for best results
                </Text>
                <View style={styles.photoButtons}>
                  <Pressable
                    onPress={takePhoto}
                    style={styles.photoOptionBtn}
                    testID="take-photo-btn"
                  >
                    <View style={styles.photoOptionIcon}>
                      <Camera color={Colors.accent} size={28} />
                    </View>
                    <Text style={styles.photoOptionTitle}>Take Selfie</Text>
                    <Text style={styles.photoOptionSub}>Use camera</Text>
                  </Pressable>
                  <Pressable
                    onPress={pickFromGallery}
                    style={styles.photoOptionBtn}
                    testID="gallery-btn"
                  >
                    <View style={styles.photoOptionIcon}>
                      <ImagePlus color={Colors.accent} size={28} />
                    </View>
                    <Text style={styles.photoOptionTitle}>Gallery</Text>
                    <Text style={styles.photoOptionSub}>Choose photo</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </Animated.View>
        )}

        {step === 'processing' && (
          <View style={styles.processingContainer}>
            <Animated.View
              style={[
                styles.processingImageWrap,
                { transform: [{ scale: pulseAnim }] },
              ]}
            >
              <Image
                source={{ uri: userPhoto ?? '' }}
                style={styles.processingImage}
                contentFit="cover"
              />
              <View style={styles.processingOverlay}>
                <Sparkles color={Colors.accent} size={32} />
              </View>
            </Animated.View>

            <Text style={styles.processingTitle}>Creating your 360° preview</Text>
            <Text style={styles.processingSubtitle}>{processingText}</Text>

            <View style={styles.progressContainer}>
              <View style={styles.progressTrack}>
                <Animated.View
                  style={[styles.progressFill, { width: progressWidth }]}
                />
              </View>
              <Text style={styles.progressText}>
                {generatedCount} of {ANGLE_CONFIGS.length} angles
              </Text>
            </View>

            <View style={styles.angleDotsRow}>
              {ANGLE_CONFIGS.map((config, i) => (
                <View key={config.label} style={styles.angleDotItem}>
                  <View
                    style={[
                      styles.angleDot,
                      i < generatedCount && styles.angleDotDone,
                      i === generatedCount && isProcessing && styles.angleDotActive,
                    ]}
                  />
                  <Text
                    style={[
                      styles.angleDotLabel,
                      i < generatedCount && styles.angleDotLabelDone,
                    ]}
                  >
                    {config.shortLabel}
                  </Text>
                </View>
              ))}
            </View>

            <Text style={styles.processingNote}>
              This may take up to a minute
            </Text>
          </View>
        )}

        {step === 'result' && angleViews.length > 0 && (
          <Animated.View
            style={[
              styles.resultContainer,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}
          >
            <Text style={styles.resultTitle}>Your New Look</Text>
            <Text style={styles.resultSubtitle}>
              {haircut.name} · {angleViews.length} angles generated
            </Text>

            <MultiAngleViewer views={angleViews} />

            <View style={styles.beforeAfterRow}>
              <View style={styles.beforeCard}>
                <Text style={styles.beforeLabel}>ORIGINAL</Text>
                <Image
                  source={{ uri: userPhoto ?? '' }}
                  style={styles.beforeImage}
                  contentFit="cover"
                  transition={300}
                />
              </View>
            </View>

            <View style={styles.resultActions}>
              <Pressable
                onPress={handleSave}
                style={styles.saveBtn}
                testID="save-btn"
              >
                <Save color={Colors.white} size={20} />
                <Text style={styles.saveBtnText}>Save Look</Text>
              </Pressable>
              <Pressable
                onPress={handleReset}
                style={styles.retryBtn}
                testID="retry-btn"
              >
                <RotateCcw color={Colors.accent} size={20} />
                <Text style={styles.retryBtnText}>Try Again</Text>
              </Pressable>
            </View>
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  errorText: {
    color: Colors.error,
    fontSize: 16,
    textAlign: 'center',
    marginTop: 60,
  },
  stepContainer: {
    flex: 1,
  },
  haircutPreview: {
    margin: 16,
    borderRadius: 20,
    overflow: 'hidden',
    height: 200,
  },
  haircutImage: {
    width: '100%',
    height: '100%',
  },
  haircutPreviewOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  haircutPreviewCategory: {
    color: Colors.accent,
    fontSize: 10,
    fontWeight: '700' as const,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  haircutPreviewName: {
    color: Colors.text,
    fontSize: 22,
    fontWeight: '800' as const,
  },
  haircutPreviewDesc: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  featureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 6,
    backgroundColor: 'rgba(200,149,108,0.12)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    marginBottom: 8,
  },
  featureBadgeText: {
    color: Colors.accent,
    fontSize: 12,
    fontWeight: '600' as const,
  },
  photoSection: {
    paddingHorizontal: 16,
    marginTop: 8,
  },
  sectionLabel: {
    color: Colors.accent,
    fontSize: 11,
    fontWeight: '700' as const,
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  photoHint: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginBottom: 20,
    lineHeight: 18,
  },
  photoButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  photoOptionBtn: {
    flex: 1,
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  photoOptionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(200,149,108,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  photoOptionTitle: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '700' as const,
    marginBottom: 2,
  },
  photoOptionSub: {
    color: Colors.textMuted,
    fontSize: 12,
  },
  userPhotoContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  userPhotoImage: {
    width: '100%',
    height: 350,
    borderRadius: 16,
  },
  removePhotoBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  generateBtn: {
    backgroundColor: Colors.accent,
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  generateBtnText: {
    color: Colors.white,
    fontSize: 17,
    fontWeight: '700' as const,
  },
  generateHint: {
    color: Colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },
  processingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  processingImageWrap: {
    width: 140,
    height: 180,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 28,
  },
  processingImage: {
    width: '100%',
    height: '100%',
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(200,149,108,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  processingTitle: {
    color: Colors.text,
    fontSize: 20,
    fontWeight: '700' as const,
    marginBottom: 6,
    textAlign: 'center',
  },
  processingSubtitle: {
    color: Colors.textSecondary,
    fontSize: 14,
    marginBottom: 24,
    textAlign: 'center',
  },
  progressContainer: {
    width: '100%',
    marginBottom: 20,
  },
  progressTrack: {
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.accent,
    borderRadius: 2,
  },
  progressText: {
    color: Colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
  },
  angleDotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginBottom: 24,
  },
  angleDotItem: {
    alignItems: 'center',
    gap: 6,
  },
  angleDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.border,
  },
  angleDotDone: {
    backgroundColor: Colors.success,
  },
  angleDotActive: {
    backgroundColor: Colors.accent,
  },
  angleDotLabel: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '600' as const,
  },
  angleDotLabelDone: {
    color: Colors.success,
  },
  processingNote: {
    color: Colors.textMuted,
    fontSize: 12,
  },
  resultContainer: {
    padding: 16,
  },
  resultTitle: {
    color: Colors.text,
    fontSize: 24,
    fontWeight: '800' as const,
    textAlign: 'center',
    marginTop: 8,
  },
  resultSubtitle: {
    color: Colors.accent,
    fontSize: 14,
    fontWeight: '600' as const,
    textAlign: 'center',
    marginBottom: 20,
    marginTop: 4,
  },
  beforeAfterRow: {
    marginTop: 20,
    marginBottom: 20,
  },
  beforeCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  beforeLabel: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '700' as const,
    letterSpacing: 1.5,
    marginBottom: 8,
    textAlign: 'center',
  },
  beforeImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  resultActions: {
    gap: 12,
  },
  saveBtn: {
    backgroundColor: Colors.accent,
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  saveBtnText: {
    color: Colors.white,
    fontSize: 17,
    fontWeight: '700' as const,
  },
  retryBtn: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  retryBtnText: {
    color: Colors.accent,
    fontSize: 17,
    fontWeight: '600' as const,
  },
});
