import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  ScrollView,
  Animated,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Share,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import { File, Paths } from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Camera,
  ImagePlus,
  Sparkles,
  Save,
  X,
  RotateCcw,
  ChevronLeft,
  Eye,
  Send,
  MessageCircle,
  RefreshCw,
  Share2,
  ImageDown,
  Navigation,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { HAIRCUTS, CUSTOM_HAIRCUT } from '@/constants/haircuts';
import { useSavedLooks } from '@/hooks/useSavedLooks';
import MultiAngleViewer from '@/components/MultiAngleViewer';

type TryOnStep = 'describe-custom' | 'select-photo' | 'processing' | 'result';

interface AngleView {
  label: string;
  shortLabel: string;
  image: string;
  angle: number;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  isLoading?: boolean;
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
    promptSuffix: 'Show the person\'s head from behind to display the hairstyle from the back. Keep the same skin tone, head shape, and neck. Focus on showing the back of the hairstyle clearly.',
  },
];

async function saveBase64ToFile(base64Uri: string, fileName: string): Promise<string | null> {
  try {
    if (Platform.OS === 'web') return null;

    const base64Data = base64Uri.replace(/^data:image\/\w+;base64,/, '');
    const file = new File(Paths.cache, fileName);
    const bytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
    file.write(bytes);
    return file.uri;
  } catch (error) {
    console.error('[TryOn] Error saving base64 to file:', error);
    return null;
  }
}

export default function TryOnScreen() {
  const { haircutId, editingLook } = useLocalSearchParams<{ haircutId: string; editingLook?: string }>();
  const router = useRouter();
  const { saveLook } = useSavedLooks();
  const scrollRef = useRef<ScrollView>(null);

  const haircut = HAIRCUTS.find((h) => h.id === haircutId);
  const isCustom = haircutId === 'custom';
  const isEditingLook = editingLook === 'true';

  const [step, setStep] = useState<TryOnStep>(haircutId === 'custom' ? 'describe-custom' : 'select-photo');
  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  const [userPhotoBase64, setUserPhotoBase64] = useState<string | null>(null);
  const [angleViews, setAngleViews] = useState<AngleView[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingText, setProcessingText] = useState('Analyzing your photo...');
  const [processingProgress, setProcessingProgress] = useState(0);
  const [generatedCount, setGeneratedCount] = useState(0);
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [isSavingToDevice, setIsSavingToDevice] = useState(false);
  const [editingLookId, setEditingLookId] = useState<string | null>(null);

  useEffect(() => {
    if (isEditingLook) {
      AsyncStorage.getItem('editing_look_data')
        .then((raw) => {
          if (raw) {
            const data = JSON.parse(raw);
            console.log('[TryOn] Loading saved look for editing:', data.lookId);
            setEditingLookId(data.lookId ?? null);
            setUserPhoto(data.originalPhoto ?? null);
            if (data.anglePhotos && data.anglePhotos.length > 0) {
              const angleLabels = ['Front View', 'Left Side', 'Right Side', 'Back View'];
              const shortLabels = ['Front', 'Left', 'Right', 'Back'];
              const angles = [0, -90, 90, 180];
              const views: AngleView[] = data.anglePhotos.map((img: string, i: number) => ({
                label: angleLabels[i] ?? `View ${i + 1}`,
                shortLabel: shortLabels[i] ?? `V${i + 1}`,
                image: img,
                angle: angles[i] ?? 0,
              }));
              setAngleViews(views);
              setStep('result');
              setChatMessages([{
                id: 'welcome-edit',
                role: 'assistant',
                text: `Welcome back! Your ${data.haircutName ?? 'look'} is loaded. Want to make any adjustments?\n\n• "Make the top shorter"\n• "Fade the sides more"\n• "Add more texture"`,
              }]);
            } else if (data.resultPhoto) {
              setAngleViews([{ label: 'Front View', shortLabel: 'Front', image: data.resultPhoto, angle: 0 }]);
              setStep('result');
            }
            AsyncStorage.removeItem('editing_look_data').catch(() => {});
          }
        })
        .catch((err) => console.error('[TryOn] Error loading edit data:', err));
    }
  }, [isEditingLook]);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);  
  const [chatInput, setChatInput] = useState('');
  const [isRegenerating, setIsRegenerating] = useState(false);

  const [customDescription, setCustomDescription] = useState('');
  const [customChatMessages, setCustomChatMessages] = useState<ChatMessage[]>([
    {
      id: 'custom-welcome',
      role: 'assistant',
      text: "Hey! I'm your AI barber. Describe your dream haircut in detail and I'll create it for you.\n\nBe as specific as you like:\n\n\u2022 \"High skin fade with a textured crop on top\"\n\u2022 \"Long flowing curtains with layers\"\n\u2022 \"Buzz cut with a lightning bolt design\"\n\u2022 \"Afro with a taper fade\"\n\nWhat are you thinking?",
    },
  ]);
  const [customInput, setCustomInput] = useState('');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fadeAnim.setValue(0);
    slideAnim.setValue(30);
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
            prompt: `This is a photo of a person. The photo is NOT mirrored - it shows the person as they naturally appear. ${haircutPrompt}. ${angleConfig.promptSuffix} Make it look natural and photorealistic.`,
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

  const handleCustomSubmit = useCallback(() => {
    if (!customInput.trim()) return;

    const userMessage = customInput.trim();
    setCustomInput('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const userMsg: ChatMessage = {
      id: `custom-user-${Date.now()}`,
      role: 'user',
      text: userMessage,
    };

    const confirmMsg: ChatMessage = {
      id: `custom-confirm-${Date.now()}`,
      role: 'assistant',
      text: `Great choice! I'll create: "${userMessage}"\n\nNow let's take a photo or choose one from your gallery so I can apply this style to you.`,
    };

    setCustomChatMessages((prev) => [...prev, userMsg, confirmMsg]);
    setCustomDescription(userMessage);
  }, [customInput]);

  const handleProceedToPhoto = useCallback(() => {
    if (!customDescription.trim()) {
      Alert.alert('Describe your cut', 'Please describe your ideal haircut first.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCurrentPrompt(`Apply this hairstyle: ${customDescription}. Make it look natural and photorealistic on the person.`);
    setStep('select-photo');
  }, [customDescription]);

  const processImage = useCallback(async (prompt?: string) => {
    if (!userPhotoBase64 || !haircut) {
      Alert.alert('Error', 'Please select a photo first.');
      return;
    }

    const haircutPrompt = prompt || (isCustom ? currentPrompt : haircut.prompt);
    setCurrentPrompt(haircutPrompt);

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

        const imageUri = await generateAngle(userPhotoBase64, haircutPrompt, config);
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

      if (chatMessages.length === 0) {
        setChatMessages([
          {
            id: 'welcome',
            role: 'assistant',
            text: `Your ${haircut.name} is ready! Want to make any adjustments? You can say things like:\n\n• "Make the top shorter"\n• "Fade the sides more"\n• "Add more texture"\n• "Make it look messier"\n• "Tighten the lineup"`,
          },
        ]);
      }
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
  }, [userPhotoBase64, haircut, generateAngle, chatMessages.length, isCustom, currentPrompt]);

  const handleSaveAll = useCallback(() => {
    if (angleViews.length === 0 || !haircut || !userPhoto) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    saveLook({
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      haircutId: haircut.id,
      haircutName: haircut.name,
      originalPhoto: userPhoto,
      resultPhoto: angleViews[0].image,
      anglePhotos: angleViews.map((v) => v.image),
      createdAt: new Date().toISOString(),
    });

    Alert.alert('Saved!', 'Your new look and all angles have been saved to My Looks.', [
      { text: 'OK' },
    ]);
  }, [angleViews, haircut, userPhoto, saveLook]);

  const handleSaveAnglePhoto = useCallback((index: number) => {
    if (!angleViews[index] || !haircut || !userPhoto) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    saveLook({
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      haircutId: haircut.id,
      haircutName: `${haircut.name} (${angleViews[index].shortLabel})`,
      originalPhoto: userPhoto,
      resultPhoto: angleViews[index].image,
      createdAt: new Date().toISOString(),
    });

    Alert.alert('Saved!', `${angleViews[index].shortLabel} view saved to My Looks.`);
  }, [angleViews, haircut, userPhoto, saveLook]);

  const handleSaveToDevice = useCallback(async (imageUri: string, label: string) => {
    if (Platform.OS === 'web') {
      try {
        const link = document.createElement('a');
        link.href = imageUri;
        link.download = `haircut-${label.toLowerCase().replace(/\s/g, '-')}-${Date.now()}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        Alert.alert('Downloaded!', 'Image has been downloaded.');
      } catch (error) {
        console.error('[TryOn] Web download error:', error);
        Alert.alert('Error', 'Could not download the image.');
      }
      return;
    }

    try {
      setIsSavingToDevice(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Needed', 'Photo library access is required to save images.');
        return;
      }

      const fileName = `haircut_${label.toLowerCase().replace(/\s/g, '_')}_${Date.now()}.jpg`;
      const filePath = await saveBase64ToFile(imageUri, fileName);

      if (!filePath) {
        Alert.alert('Error', 'Could not save the image to your device.');
        return;
      }

      await MediaLibrary.saveToLibraryAsync(filePath);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Saved to Photos!', `${label} has been saved to your camera roll.`);
    } catch (error) {
      console.error('[TryOn] Error saving to device:', error);
      Alert.alert('Error', 'Failed to save image to your device.');
    } finally {
      setIsSavingToDevice(false);
    }
  }, []);

  const handleSaveAllToDevice = useCallback(async () => {
    if (angleViews.length === 0) return;

    if (Platform.OS === 'web') {
      for (const view of angleViews) {
        await handleSaveToDevice(view.image, view.shortLabel);
      }
      return;
    }

    try {
      setIsSavingToDevice(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Needed', 'Photo library access is required to save images.');
        return;
      }

      let savedCount = 0;
      for (let i = 0; i < angleViews.length; i++) {
        const view = angleViews[i];
        const fileName = `haircut_${view.shortLabel.toLowerCase()}_${Date.now()}_${i}.jpg`;
        const filePath = await saveBase64ToFile(view.image, fileName);
        if (filePath) {
          await MediaLibrary.saveToLibraryAsync(filePath);
          savedCount++;
        }
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Saved to Photos!', `${savedCount} photos saved to your camera roll.`);
    } catch (error) {
      console.error('[TryOn] Error saving all to device:', error);
      Alert.alert('Error', 'Failed to save some images to your device.');
    } finally {
      setIsSavingToDevice(false);
    }
  }, [angleViews, handleSaveToDevice]);

  const handleShareImage = useCallback(async (imageUri: string, label: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      if (Platform.OS === 'web') {
        if (navigator.share) {
          await navigator.share({
            title: `My ${haircut?.name ?? 'Haircut'} - ${label}`,
            text: `Check out this ${label} view of my new hairstyle!`,
          });
        } else {
          Alert.alert('Sharing not available', 'Your browser does not support sharing.');
        }
        return;
      }

      const fileName = `share_haircut_${label.toLowerCase().replace(/\s/g, '_')}_${Date.now()}.jpg`;
      const filePath = await saveBase64ToFile(imageUri, fileName);

      if (!filePath) {
        await Share.share({
          message: `Check out my new ${haircut?.name ?? 'hairstyle'} - ${label} view!`,
        });
        return;
      }

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(filePath, {
          mimeType: 'image/jpeg',
          dialogTitle: `Share ${label}`,
        });
      } else {
        await Share.share({
          message: `Check out my new ${haircut?.name ?? 'hairstyle'} - ${label} view!`,
        });
      }
    } catch (error) {
      console.error('[TryOn] Error sharing:', error);
    }
  }, [haircut]);

  const handleSendEdit = useCallback(async () => {
    if (!chatInput.trim() || isRegenerating || !haircut || !userPhotoBase64) return;

    const userMessage = chatInput.trim();
    setChatInput('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: userMessage,
    };
    const loadingMsg: ChatMessage = {
      id: `loading-${Date.now()}`,
      role: 'assistant',
      text: '',
      isLoading: true,
    };

    setChatMessages((prev) => [...prev, userMsg, loadingMsg]);
    setIsRegenerating(true);

    try {
      const editedPrompt = `${currentPrompt || haircut.prompt}. Additional edit: ${userMessage}`;
      setCurrentPrompt(editedPrompt);

      console.log('[TryOn] Regenerating with edit:', userMessage);

      const results: AngleView[] = [];
      for (let i = 0; i < ANGLE_CONFIGS.length; i++) {
        const config = ANGLE_CONFIGS[i];
        const imageUri = await generateAngle(userPhotoBase64, editedPrompt, config);
        if (imageUri) {
          results.push({
            label: config.label,
            shortLabel: config.shortLabel,
            image: imageUri,
            angle: config.angle,
          });
        }
      }

      if (results.length > 0) {
        setAngleViews(results);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        setChatMessages((prev) =>
          prev
            .filter((m) => !m.isLoading)
            .concat({
              id: `assistant-${Date.now()}`,
              role: 'assistant',
              text: `Done! I've applied your edit: "${userMessage}". The new look is showing above. Want any more changes?`,
            })
        );
      } else {
        setChatMessages((prev) =>
          prev
            .filter((m) => !m.isLoading)
            .concat({
              id: `assistant-${Date.now()}`,
              role: 'assistant',
              text: "Sorry, I couldn't apply that edit. Try describing the change differently.",
            })
        );
      }
    } catch (error) {
      console.error('[TryOn] Error regenerating:', error);
      setChatMessages((prev) =>
        prev
          .filter((m) => !m.isLoading)
          .concat({
            id: `error-${Date.now()}`,
            role: 'assistant',
            text: 'Something went wrong while applying your edit. Please try again.',
          })
      );
    } finally {
      setIsRegenerating(false);
    }
  }, [chatInput, isRegenerating, haircut, userPhotoBase64, currentPrompt, generateAngle]);

  const handleReset = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setUserPhoto(null);
    setUserPhotoBase64(null);
    setAngleViews([]);
    setGeneratedCount(0);
    setProcessingProgress(0);
    setChatMessages([]);
    setChatInput('');
    setCurrentPrompt('');
    setCustomDescription('');
    setCustomInput('');
    setCustomChatMessages([
      {
        id: 'custom-welcome',
        role: 'assistant',
        text: "Hey! I'm your AI barber. Describe your dream haircut in detail and I'll create it for you.\n\nBe as specific as you like:\n\n\u2022 \"High skin fade with a textured crop on top\"\n\u2022 \"Long flowing curtains with layers\"\n\u2022 \"Buzz cut with a lightning bolt design\"\n\u2022 \"Afro with a taper fade\"\n\nWhat are you thinking?",
      },
    ]);
    setStep(isCustom ? 'describe-custom' : 'select-photo');
    fadeAnim.setValue(0);
    slideAnim.setValue(30);
  }, [fadeAnim, slideAnim, isCustom]);

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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <Stack.Screen
        options={{
          title: isCustom ? 'Custom Style' : haircut.name,
          headerStyle: { backgroundColor: Colors.background },
          headerTintColor: Colors.text,
          headerTitleStyle: { fontWeight: '700' as const },
          headerShadowVisible: false,
          presentation: 'modal',
          headerLeft: () => (
            <Pressable onPress={() => router.back()} hitSlop={12}>
              <ChevronLeft color={Colors.text} size={24} />
            </Pressable>
          ),
        }}
      />

      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {step === 'describe-custom' && (
          <Animated.View
            style={[
              styles.stepContainer,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}
          >
            <View style={styles.customHeroSection}>
              <View style={styles.customIconCircle}>
                <Sparkles color={Colors.black} size={28} />
              </View>
              <Text style={styles.customHeroTitle}>Design Your Cut</Text>
              <Text style={styles.customHeroSubtitle}>
                Tell me exactly what you want and I'll make it happen
              </Text>
            </View>

            <View style={styles.customChatSection}>
              <View style={styles.customChatMessages}>
                {customChatMessages.map((msg) => (
                  <View
                    key={msg.id}
                    style={[
                      styles.chatBubble,
                      msg.role === 'user' ? styles.chatBubbleUser : styles.chatBubbleAssistant,
                    ]}
                  >
                    <Text
                      style={[
                        styles.chatBubbleText,
                        msg.role === 'user' && styles.chatBubbleTextUser,
                      ]}
                    >
                      {msg.text}
                    </Text>
                  </View>
                ))}
              </View>

              {!customDescription ? (
                <View style={styles.chatInputRow}>
                  <TextInput
                    style={styles.chatInput}
                    value={customInput}
                    onChangeText={setCustomInput}
                    placeholder="Describe your ideal haircut..."
                    placeholderTextColor={Colors.textMuted}
                    multiline
                    testID="custom-chat-input"
                  />
                  <Pressable
                    onPress={handleCustomSubmit}
                    style={[
                      styles.sendBtn,
                      !customInput.trim() && styles.sendBtnDisabled,
                    ]}
                    disabled={!customInput.trim()}
                    testID="custom-send-btn"
                  >
                    <Send color={Colors.black} size={16} />
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  onPress={handleProceedToPhoto}
                  style={({ pressed }) => [
                    styles.generateBtn,
                    pressed && styles.generateBtnPressed,
                  ]}
                  testID="proceed-to-photo-btn"
                >
                  <Camera color={Colors.black} size={18} />
                  <Text style={styles.generateBtnText}>Continue to Photo</Text>
                </Pressable>
              )}
            </View>
          </Animated.View>
        )}

        {step === 'select-photo' && (
          <Animated.View
            style={[
              styles.stepContainer,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}
          >
            {isCustom && customDescription ? (
              <View style={styles.customPreviewBanner}>
                <View style={styles.customPreviewIcon}>
                  <Sparkles color={Colors.black} size={18} />
                </View>
                <View style={styles.customPreviewContent}>
                  <Text style={styles.customPreviewLabel}>CUSTOM STYLE</Text>
                  <Text style={styles.customPreviewText} numberOfLines={2}>
                    {customDescription}
                  </Text>
                </View>
              </View>
            ) : !isCustom ? (
              <View style={styles.haircutPreview}>
                <Image
                  source={{ uri: haircut.image }}
                  style={styles.haircutImage}
                  contentFit="cover"
                  transition={300}
                />
                <View style={styles.haircutPreviewOverlay}>
                  <View style={styles.previewCategoryBadge}>
                    <Text style={styles.haircutPreviewCategory}>
                      {haircut.category}
                    </Text>
                  </View>
                  <Text style={styles.haircutPreviewName}>{haircut.name}</Text>
                  <Text style={styles.haircutPreviewDesc}>
                    {haircut.description}
                  </Text>
                </View>
              </View>
            ) : null}

            <View style={styles.featureBadge}>
              <Eye color={Colors.accent} size={13} />
              <Text style={styles.featureBadgeText}>
                360° preview + AI editor
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
                    <X color={Colors.white} size={14} />
                  </Pressable>
                </View>

                <Pressable
                  onPress={() => processImage()}
                  style={({ pressed }) => [
                    styles.generateBtn,
                    pressed && styles.generateBtnPressed,
                  ]}
                  testID="generate-btn"
                >
                  <Sparkles color={Colors.black} size={18} />
                  <Text style={styles.generateBtnText}>
                    Generate 360° Preview
                  </Text>
                </Pressable>
                <Text style={styles.generateHint}>
                  Generates front, side, and back views with AI editing
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
                    style={({ pressed }) => [
                      styles.photoOptionBtn,
                      pressed && styles.photoOptionBtnPressed,
                    ]}
                    testID="take-photo-btn"
                  >
                    <View style={styles.photoOptionIcon}>
                      <Camera color={Colors.accent} size={24} />
                    </View>
                    <Text style={styles.photoOptionTitle}>Take Selfie</Text>
                    <Text style={styles.photoOptionSub}>Use camera</Text>
                  </Pressable>
                  <Pressable
                    onPress={pickFromGallery}
                    style={({ pressed }) => [
                      styles.photoOptionBtn,
                      pressed && styles.photoOptionBtnPressed,
                    ]}
                    testID="gallery-btn"
                  >
                    <View style={styles.photoOptionIcon}>
                      <ImagePlus color={Colors.accent} size={24} />
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
                <Sparkles color={Colors.accent} size={28} />
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
              {isCustom ? 'Custom Style' : haircut.name} · {angleViews.length} angles
            </Text>

            <View style={styles.frontPhotoSection}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionDot} />
                <Text style={styles.sectionHeaderText}>FRONT VIEW</Text>
              </View>
              <View style={styles.frontPhotoCard}>
                <Image
                  source={{ uri: angleViews[0].image }}
                  style={styles.frontPhoto}
                  contentFit="cover"
                  transition={300}
                />
                <View style={styles.frontPhotoActions}>
                  <Pressable
                    onPress={() => handleSaveToDevice(angleViews[0].image, 'Front View')}
                    style={styles.frontActionBtn}
                    hitSlop={8}
                    disabled={isSavingToDevice}
                    testID="save-front-device-btn"
                  >
                    <ImageDown color={Colors.black} size={14} />
                    <Text style={styles.frontActionBtnText}>Save</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => handleShareImage(angleViews[0].image, 'Front View')}
                    style={[styles.frontActionBtn, styles.shareBtn]}
                    hitSlop={8}
                    testID="share-front-btn"
                  >
                    <Share2 color={Colors.white} size={14} />
                    <Text style={[styles.frontActionBtnText, styles.shareBtnText]}>Share</Text>
                  </Pressable>
                </View>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.rotationSection}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionDot, { backgroundColor: Colors.teal }]} />
                <Text style={styles.sectionHeaderText}>360° WALKTHROUGH</Text>
              </View>
              <MultiAngleViewer
                views={angleViews}
                onSavePhoto={handleSaveAnglePhoto}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.resultActions}>
              <Pressable
                onPress={handleSaveAll}
                style={({ pressed }) => [
                  styles.saveAllBtn,
                  pressed && styles.saveAllBtnPressed,
                ]}
                testID="save-all-btn"
              >
                <Save color={Colors.black} size={18} />
                <Text style={styles.saveAllBtnText}>Save to My Looks</Text>
              </Pressable>

              <Pressable
                onPress={handleSaveAllToDevice}
                style={styles.saveDeviceBtn}
                disabled={isSavingToDevice}
                testID="save-all-device-btn"
              >
                {isSavingToDevice ? (
                  <ActivityIndicator size="small" color={Colors.accent} />
                ) : (
                  <ImageDown color={Colors.accent} size={18} />
                )}
                <Text style={styles.saveDeviceBtnText}>
                  {isSavingToDevice ? 'Saving...' : 'Save All to Device'}
                </Text>
              </Pressable>

              <Pressable
                onPress={handleReset}
                style={styles.retryBtn}
                testID="retry-btn"
              >
                <RotateCcw color={Colors.textSecondary} size={18} />
                <Text style={styles.retryBtnText}>Start Over</Text>
              </Pressable>
            </View>

            <View style={styles.divider} />

            <Pressable
              onPress={async () => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                try {
                  const imageData = {
                    frontImage: angleViews[0]?.image ?? '',
                    angleImages: angleViews.map((v) => v.image),
                  };
                  await AsyncStorage.setItem('pending_appointment_images', JSON.stringify(imageData));
                  console.log('[TryOn] Saved appointment images to AsyncStorage');
                } catch (err) {
                  console.error('[TryOn] Failed to save appointment images:', err);
                }
                router.push({
                  pathname: '/find-barber' as any,
                  params: { haircutName: haircut.name },
                });
              }}
              style={({ pressed }) => [
                styles.findBarberBtn,
                pressed && styles.findBarberBtnPressed,
              ]}
              testID="find-barber-btn"
            >
              <Navigation color={Colors.black} size={18} />
              <Text style={styles.findBarberBtnText}>Find a Barber Near You</Text>
            </Pressable>

            <View style={styles.divider} />

            <View style={styles.chatSection}>
              <View style={styles.chatHeader}>
                <MessageCircle color={Colors.accent} size={16} />
                <Text style={styles.chatHeaderText}>Edit Your Haircut</Text>
              </View>
              <Text style={styles.chatSubtext}>
                Describe changes and we'll regenerate all angles
              </Text>

              <View style={styles.chatMessages}>
                {chatMessages.map((msg) => (
                  <View
                    key={msg.id}
                    style={[
                      styles.chatBubble,
                      msg.role === 'user' ? styles.chatBubbleUser : styles.chatBubbleAssistant,
                    ]}
                  >
                    {msg.isLoading ? (
                      <View style={styles.loadingRow}>
                        <ActivityIndicator size="small" color={Colors.accent} />
                        <Text style={styles.loadingText}>Regenerating your haircut...</Text>
                      </View>
                    ) : (
                      <Text
                        style={[
                          styles.chatBubbleText,
                          msg.role === 'user' && styles.chatBubbleTextUser,
                        ]}
                      >
                        {msg.text}
                      </Text>
                    )}
                  </View>
                ))}
              </View>

              <View style={styles.chatInputRow}>
                <TextInput
                  style={styles.chatInput}
                  value={chatInput}
                  onChangeText={setChatInput}
                  placeholder="e.g. Make the top shorter..."
                  placeholderTextColor={Colors.textMuted}
                  multiline
                  editable={!isRegenerating}
                  testID="chat-input"
                />
                <Pressable
                  onPress={handleSendEdit}
                  style={[
                    styles.sendBtn,
                    (!chatInput.trim() || isRegenerating) && styles.sendBtnDisabled,
                  ]}
                  disabled={!chatInput.trim() || isRegenerating}
                  testID="send-edit-btn"
                >
                  {isRegenerating ? (
                    <RefreshCw color={Colors.black} size={16} />
                  ) : (
                    <Send color={Colors.black} size={16} />
                  )}
                </Pressable>
              </View>
            </View>
          </Animated.View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
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
    borderRadius: 18,
    overflow: 'hidden',
    height: 260,
    borderWidth: 1,
    borderColor: Colors.border,
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
    paddingTop: 40,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  previewCategoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.accentMuted,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 6,
  },
  haircutPreviewCategory: {
    color: Colors.accent,
    fontSize: 9,
    fontWeight: '700' as const,
    letterSpacing: 1,
    textTransform: 'uppercase' as const,
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
    backgroundColor: Colors.accentMuted,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.accentBorder,
  },
  featureBadgeText: {
    color: Colors.accent,
    fontSize: 11,
    fontWeight: '600' as const,
  },
  photoSection: {
    paddingHorizontal: 16,
    marginTop: 8,
  },
  sectionLabel: {
    color: Colors.accent,
    fontSize: 10,
    fontWeight: '700' as const,
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  photoHint: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginBottom: 16,
    lineHeight: 18,
  },
  photoButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  photoOptionBtn: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  photoOptionBtnPressed: {
    backgroundColor: Colors.card,
  },
  photoOptionIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  photoOptionTitle: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 2,
  },
  photoOptionSub: {
    color: Colors.textMuted,
    fontSize: 11,
  },
  userPhotoContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  userPhotoImage: {
    width: '100%',
    height: 340,
    borderRadius: 16,
  },
  removePhotoBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  generateBtn: {
    backgroundColor: Colors.accent,
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  generateBtnPressed: {
    opacity: 0.85,
  },
  generateBtnText: {
    color: Colors.black,
    fontSize: 16,
    fontWeight: '700' as const,
  },
  generateHint: {
    color: Colors.textMuted,
    fontSize: 11,
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
    width: 130,
    height: 170,
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 28,
    borderWidth: 1,
    borderColor: Colors.accentBorder,
  },
  processingImage: {
    width: '100%',
    height: '100%',
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(201,165,92,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  processingTitle: {
    color: Colors.text,
    fontSize: 19,
    fontWeight: '700' as const,
    marginBottom: 6,
    textAlign: 'center',
  },
  processingSubtitle: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginBottom: 24,
    textAlign: 'center',
  },
  progressContainer: {
    width: '100%',
    marginBottom: 20,
  },
  progressTrack: {
    height: 3,
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
    fontSize: 11,
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
    width: 8,
    height: 8,
    borderRadius: 4,
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
    fontSize: 9,
    fontWeight: '600' as const,
  },
  angleDotLabelDone: {
    color: Colors.success,
  },
  processingNote: {
    color: Colors.textDim,
    fontSize: 11,
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
    letterSpacing: -0.3,
  },
  resultSubtitle: {
    color: Colors.accent,
    fontSize: 13,
    fontWeight: '600' as const,
    textAlign: 'center',
    marginBottom: 20,
    marginTop: 4,
  },
  frontPhotoSection: {
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.accent,
  },
  sectionHeaderText: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '700' as const,
    letterSpacing: 1.5,
  },
  frontPhotoCard: {
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  frontPhoto: {
    width: '100%',
    height: 400,
  },
  frontPhotoActions: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    gap: 8,
  },
  frontActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.accent,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  shareBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  frontActionBtnText: {
    color: Colors.black,
    fontSize: 12,
    fontWeight: '700' as const,
  },
  shareBtnText: {
    color: Colors.white,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 20,
  },
  rotationSection: {
    marginBottom: 8,
  },
  resultActions: {
    gap: 10,
  },
  saveAllBtn: {
    backgroundColor: Colors.accent,
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveAllBtnPressed: {
    opacity: 0.85,
  },
  saveAllBtnText: {
    color: Colors.black,
    fontSize: 16,
    fontWeight: '700' as const,
  },
  saveDeviceBtn: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.accentBorder,
  },
  saveDeviceBtnText: {
    color: Colors.accent,
    fontSize: 16,
    fontWeight: '600' as const,
  },
  retryBtn: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  retryBtnText: {
    color: Colors.textSecondary,
    fontSize: 16,
    fontWeight: '600' as const,
  },
  chatSection: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  chatHeaderText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '700' as const,
  },
  chatSubtext: {
    color: Colors.textMuted,
    fontSize: 11,
    marginBottom: 14,
    marginLeft: 24,
  },
  chatMessages: {
    gap: 8,
    marginBottom: 12,
  },
  chatBubble: {
    borderRadius: 14,
    padding: 12,
    maxWidth: '88%',
  },
  chatBubbleUser: {
    backgroundColor: Colors.accent,
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  chatBubbleAssistant: {
    backgroundColor: Colors.card,
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chatBubbleText: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  chatBubbleTextUser: {
    color: Colors.black,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontStyle: 'italic' as const,
  },
  chatInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  chatInput: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    color: Colors.text,
    fontSize: 14,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.3,
  },
  findBarberBtn: {
    backgroundColor: Colors.teal,
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
  },
  findBarberBtnPressed: {
    opacity: 0.85,
  },
  findBarberBtnText: {
    color: Colors.black,
    fontSize: 16,
    fontWeight: '700' as const,
  },
  customHeroSection: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 24,
    paddingHorizontal: 32,
  },
  customIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  customHeroTitle: {
    color: Colors.text,
    fontSize: 24,
    fontWeight: '800' as const,
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  customHeroSubtitle: {
    color: Colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  customChatSection: {
    marginHorizontal: 16,
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  customChatMessages: {
    gap: 8,
    marginBottom: 14,
  },
  customPreviewBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.accentBorder,
  },
  customPreviewIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customPreviewContent: {
    flex: 1,
  },
  customPreviewLabel: {
    color: Colors.accent,
    fontSize: 9,
    fontWeight: '700' as const,
    letterSpacing: 1.5,
    marginBottom: 3,
  },
  customPreviewText: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '600' as const,
    lineHeight: 19,
  },
});
