import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';

const STORAGE_KEY = 'favorite_haircuts';

export const [FavoritesProvider, useFavorites] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);

  const favoritesQuery = useQuery({
    queryKey: ['favorites'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      return stored ? (JSON.parse(stored) as string[]) : [];
    },
  });

  useEffect(() => {
    if (favoritesQuery.data) {
      setFavoriteIds(favoritesQuery.data);
    }
  }, [favoritesQuery.data]);

  const toggleMutation = useMutation({
    mutationFn: async (haircutId: string) => {
      const exists = favoriteIds.includes(haircutId);
      const updated = exists
        ? favoriteIds.filter((id) => id !== haircutId)
        : [...favoriteIds, haircutId];
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    },
    onSuccess: (updated) => {
      setFavoriteIds(updated);
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
  });

  const toggleFavorite = useCallback(
    (haircutId: string) => {
      toggleMutation.mutate(haircutId);
    },
    [toggleMutation]
  );

  const isFavorite = useCallback(
    (haircutId: string) => favoriteIds.includes(haircutId),
    [favoriteIds]
  );

  return {
    favoriteIds,
    toggleFavorite,
    isFavorite,
    isLoading: favoritesQuery.isLoading,
  };
});
