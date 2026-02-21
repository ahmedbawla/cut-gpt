import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  FlatList,
  TextInput,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Scissors, Search, X, Heart } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { HAIRCUTS, HAIRCUT_CATEGORIES, HaircutStyle, HaircutCategory } from '@/constants/haircuts';
import HaircutCard from '@/components/HaircutCard';
import { useFavorites } from '@/hooks/useFavorites';

type FilterMode = HaircutCategory | 'Favorites';

export default function HomeScreen() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<FilterMode>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const searchAnim = useRef(new Animated.Value(0)).current;
  const { favoriteIds } = useFavorites();

  const filteredHaircuts = useMemo(() => {
    let results = HAIRCUTS;

    if (selectedCategory === 'Favorites') {
      results = results.filter((h) => favoriteIds.includes(h.id));
    } else if (selectedCategory !== 'All') {
      results = results.filter((h) => h.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      results = results.filter(
        (h) =>
          h.name.toLowerCase().includes(query) ||
          h.description.toLowerCase().includes(query) ||
          h.category.toLowerCase().includes(query)
      );
    }

    return results;
  }, [selectedCategory, searchQuery, favoriteIds]);

  const handleCategoryPress = useCallback((category: FilterMode) => {
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

  const handleSearchFocus = useCallback(() => {
    setSearchFocused(true);
    Animated.timing(searchAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [searchAnim]);

  const handleSearchBlur = useCallback(() => {
    setSearchFocused(false);
    if (!searchQuery) {
      Animated.timing(searchAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }).start();
    }
  }, [searchAnim, searchQuery]);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const allFilters: FilterMode[] = ['Favorites', ...HAIRCUT_CATEGORIES];

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

        <View style={styles.searchContainer}>
          <View style={[styles.searchBar, searchFocused && styles.searchBarFocused]}>
            <Search color={searchFocused ? Colors.accent : Colors.textMuted} size={18} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search haircuts..."
              placeholderTextColor={Colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onFocus={handleSearchFocus}
              onBlur={handleSearchBlur}
              returnKeyType="search"
              testID="search-input"
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={clearSearch} hitSlop={8} testID="clear-search">
                <X color={Colors.textMuted} size={16} />
              </Pressable>
            )}
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContainer}
        >
          {allFilters.map((category) => {
            const isActive = selectedCategory === category;
            const isFavFilter = category === 'Favorites';
            return (
              <Pressable
                key={category}
                onPress={() => handleCategoryPress(category)}
                style={[
                  styles.categoryPill,
                  isActive && styles.categoryPillActive,
                  isFavFilter && !isActive && styles.categoryPillFavorites,
                ]}
                testID={`category-${category}`}
              >
                {isFavFilter && (
                  <Heart
                    color={isActive ? Colors.white : '#E05555'}
                    size={13}
                    fill={isActive ? Colors.white : '#E05555'}
                  />
                )}
                <Text
                  style={[
                    styles.categoryText,
                    isActive && styles.categoryTextActive,
                    isFavFilter && !isActive && styles.categoryTextFavorites,
                  ]}
                >
                  {category}
                  {isFavFilter && favoriteIds.length > 0 ? ` (${favoriteIds.length})` : ''}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <Text style={styles.sectionTitle}>
          {selectedCategory === 'All'
            ? 'All Styles'
            : selectedCategory === 'Favorites'
            ? 'Favorites'
            : selectedCategory}
          <Text style={styles.countText}> ({filteredHaircuts.length})</Text>
        </Text>
      </View>
    ),
    [selectedCategory, filteredHaircuts.length, handleCategoryPress, searchQuery, searchFocused, handleSearchFocus, handleSearchBlur, clearSearch, favoriteIds.length, allFilters]
  );

  const renderItem = useCallback(
    ({ item, index }: { item: HaircutStyle; index: number }) => (
      <HaircutCard haircut={item} onPress={handleHaircutPress} index={index} />
    ),
    [handleHaircutPress]
  );

  const renderEmpty = useCallback(
    () => (
      <View style={styles.emptyState}>
        {selectedCategory === 'Favorites' ? (
          <>
            <Heart color={Colors.textMuted} size={36} />
            <Text style={styles.emptyTitle}>No Favorites Yet</Text>
            <Text style={styles.emptySubtitle}>
              Tap the heart icon on any haircut to save it here
            </Text>
          </>
        ) : (
          <>
            <Search color={Colors.textMuted} size={36} />
            <Text style={styles.emptyTitle}>No Results</Text>
            <Text style={styles.emptySubtitle}>
              Try a different search or category
            </Text>
          </>
        )}
      </View>
    ),
    [selectedCategory]
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredHaircuts}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        numColumns={2}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
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
  searchContainer: {
    marginBottom: 4,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchBarFocused: {
    borderColor: Colors.accent,
    backgroundColor: 'rgba(200,149,108,0.06)',
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    paddingVertical: 2,
  },
  categoriesContainer: {
    paddingVertical: 12,
    gap: 8,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
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
  categoryPillFavorites: {
    borderColor: 'rgba(224,85,85,0.3)',
    backgroundColor: 'rgba(224,85,85,0.08)',
  },
  categoryText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600' as const,
  },
  categoryTextActive: {
    color: Colors.white,
  },
  categoryTextFavorites: {
    color: '#E05555',
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
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
    marginTop: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
});
