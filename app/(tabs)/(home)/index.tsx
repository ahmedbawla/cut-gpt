import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Scissors } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { HAIRCUTS, HAIRCUT_CATEGORIES, HaircutStyle, HaircutCategory } from '@/constants/haircuts';
import HaircutCard from '@/components/HaircutCard';

export default function HomeScreen() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<HaircutCategory>('All');

  const filteredHaircuts = useMemo(() => {
    if (selectedCategory === 'All') return HAIRCUTS;
    return HAIRCUTS.filter((h) => h.category === selectedCategory);
  }, [selectedCategory]);

  const handleCategoryPress = useCallback((category: HaircutCategory) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedCategory(category);
  }, []);

  const handleHaircutPress = useCallback(
    (haircut: HaircutStyle) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      router.push({
        pathname: '/try-on' as any,
        params: { haircutId: haircut.id },
      });
    },
    [router]
  );

  const renderHeader = useCallback(
    () => (
      <View style={styles.header}>
        <View style={styles.heroSection}>
          <View style={styles.heroIconWrap}>
            <Scissors color={Colors.accent} size={24} />
          </View>
          <Text style={styles.heroTitle}>Find Your Style</Text>
          <Text style={styles.heroSubtitle}>
            Choose a haircut and see how it looks on you with AI
          </Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContainer}
        >
          {HAIRCUT_CATEGORIES.map((category) => {
            const isActive = selectedCategory === category;
            return (
              <Pressable
                key={category}
                onPress={() => handleCategoryPress(category)}
                style={[
                  styles.categoryPill,
                  isActive && styles.categoryPillActive,
                ]}
                testID={`category-${category}`}
              >
                <Text
                  style={[
                    styles.categoryText,
                    isActive && styles.categoryTextActive,
                  ]}
                >
                  {category}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <Text style={styles.sectionTitle}>
          {selectedCategory === 'All' ? 'All Styles' : selectedCategory}
          <Text style={styles.countText}> ({filteredHaircuts.length})</Text>
        </Text>
      </View>
    ),
    [selectedCategory, filteredHaircuts.length, handleCategoryPress]
  );

  const renderItem = useCallback(
    ({ item, index }: { item: HaircutStyle; index: number }) => (
      <HaircutCard haircut={item} onPress={handleHaircutPress} index={index} />
    ),
    [handleHaircutPress]
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredHaircuts}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        numColumns={2}
        ListHeaderComponent={renderHeader}
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
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 8,
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  heroIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(200,149,108,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '800' as const,
    color: Colors.text,
    marginBottom: 6,
  },
  heroSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 260,
  },
  categoriesContainer: {
    paddingVertical: 12,
    gap: 8,
  },
  categoryPill: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: Colors.cardBackground,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoryPillActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  categoryText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600' as const,
  },
  categoryTextActive: {
    color: Colors.white,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
    marginTop: 16,
    marginBottom: 12,
  },
  countText: {
    color: Colors.textMuted,
    fontWeight: '400' as const,
    fontSize: 14,
  },
});
