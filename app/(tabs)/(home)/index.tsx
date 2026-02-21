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
import { Search, X, Heart, Sparkles } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { HAIRCUTS, HAIRCUT_CATEGORIES, HaircutStyle, HaircutCategory } from '@/constants/haircuts';
import HaircutCard from '@/components/HaircutCard';
import { useFavorites } from '@/hooks/useFavorites';

type FilterMode = HaircutCategory | 'Favorites';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
        <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
          <View>
            <View style={styles.brandRow}>
              <Sparkles color={Colors.accent} size={16} />
              <Text style={styles.brandLabel}>CUT-GPT</Text>
            </View>
            <Text style={styles.heroTitle}>Discover{'\n'}Your Style</Text>
          </View>
        </View>

        <View style={styles.searchContainer}>
          <View style={[styles.searchBar, searchFocused && styles.searchBarFocused]}>
            <Search color={searchFocused ? Colors.accent : Colors.textMuted} size={16} />
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
                <X color={Colors.textMuted} size={14} />
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
                    color={isActive ? Colors.black : Colors.error}
                    size={11}
                    fill={isActive ? Colors.black : Colors.error}
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
                  {isFavFilter && favoriteIds.length > 0 ? ` ${favoriteIds.length}` : ''}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>
            {selectedCategory === 'All'
              ? 'All Styles'
              : selectedCategory === 'Favorites'
              ? 'Favorites'
              : selectedCategory}
          </Text>
          <Text style={styles.countText}>{filteredHaircuts.length}</Text>
        </View>
      </View>
    ),
    [selectedCategory, filteredHaircuts.length, handleCategoryPress, searchQuery, searchFocused, handleSearchFocus, handleSearchBlur, clearSearch, favoriteIds.length, allFilters, insets.top]
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
            <Heart color={Colors.textMuted} size={32} />
            <Text style={styles.emptyTitle}>No Favorites Yet</Text>
            <Text style={styles.emptySubtitle}>
              Tap the heart on any haircut to save it
            </Text>
          </>
        ) : (
          <>
            <Search color={Colors.textMuted} size={32} />
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
    paddingHorizontal: 14,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 4,
  },
  topBar: {
    paddingBottom: 20,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  brandLabel: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.accent,
    letterSpacing: 2,
  },
  heroTitle: {
    fontSize: 30,
    fontWeight: '800' as const,
    color: Colors.text,
    lineHeight: 36,
    letterSpacing: -0.5,
  },
  searchContainer: {
    marginBottom: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchBarFocused: {
    borderColor: Colors.accentBorder,
    backgroundColor: Colors.card,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    paddingVertical: 0,
  },
  categoriesContainer: {
    paddingVertical: 4,
    gap: 6,
    paddingBottom: 12,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoryPillActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  categoryPillFavorites: {
    borderColor: Colors.errorBorder,
    backgroundColor: Colors.errorMuted,
  },
  categoryText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600' as const,
  },
  categoryTextActive: {
    color: Colors.black,
    fontWeight: '700' as const,
  },
  categoryTextFavorites: {
    color: Colors.error,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  countText: {
    color: Colors.textMuted,
    fontWeight: '500' as const,
    fontSize: 13,
    backgroundColor: Colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    overflow: 'hidden',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 17,
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
