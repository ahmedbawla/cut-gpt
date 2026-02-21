import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';

export interface SavedLook {
  id: string;
  haircutId: string;
  haircutName: string;
  originalPhoto: string;
  resultPhoto: string;
  createdAt: string;
}

const STORAGE_KEY = 'saved_looks';

export const [SavedLooksProvider, useSavedLooks] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [looks, setLooks] = useState<SavedLook[]>([]);

  const looksQuery = useQuery({
    queryKey: ['saved-looks'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      return stored ? (JSON.parse(stored) as SavedLook[]) : [];
    },
  });

  useEffect(() => {
    if (looksQuery.data) {
      setLooks(looksQuery.data);
    }
  }, [looksQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async (newLook: SavedLook) => {
      const updated = [newLook, ...looks];
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    },
    onSuccess: (updated) => {
      setLooks(updated);
      queryClient.invalidateQueries({ queryKey: ['saved-looks'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (lookId: string) => {
      const updated = looks.filter((l) => l.id !== lookId);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    },
    onSuccess: (updated) => {
      setLooks(updated);
      queryClient.invalidateQueries({ queryKey: ['saved-looks'] });
    },
  });

  const saveLook = useCallback(
    (look: SavedLook) => {
      saveMutation.mutate(look);
    },
    [saveMutation]
  );

  const deleteLook = useCallback(
    (lookId: string) => {
      deleteMutation.mutate(lookId);
    },
    [deleteMutation]
  );

  return {
    looks,
    saveLook,
    deleteLook,
    isLoading: looksQuery.isLoading,
  };
});
