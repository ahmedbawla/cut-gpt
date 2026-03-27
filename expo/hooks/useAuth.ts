import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  createdAt: string;
}

interface AuthState {
  isAuthenticated: boolean;
  user: UserProfile | null;
}

const AUTH_STORAGE_KEY = 'auth_state';
const USERS_STORAGE_KEY = 'registered_users';

interface StoredUser extends UserProfile {
  password: string;
}

export const [AuthProvider, useAuth] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
  });

  const authQuery = useQuery({
    queryKey: ['auth-state'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as AuthState;
        console.log('[Auth] Restored session for:', parsed.user?.email);
        return parsed;
      }
      return { isAuthenticated: false, user: null } as AuthState;
    },
  });

  useEffect(() => {
    if (authQuery.data) {
      setAuthState(authQuery.data);
    }
  }, [authQuery.data]);

  const loginMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const usersRaw = await AsyncStorage.getItem(USERS_STORAGE_KEY);
      const users: StoredUser[] = usersRaw ? JSON.parse(usersRaw) : [];

      const found = users.find(
        (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
      );

      if (!found) {
        throw new Error('Invalid email or password');
      }

      const { password: _, ...userProfile } = found;
      const newState: AuthState = { isAuthenticated: true, user: userProfile };
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(newState));
      console.log('[Auth] Login success:', email);
      return newState;
    },
    onSuccess: (state) => {
      setAuthState(state);
      queryClient.invalidateQueries({ queryKey: ['auth-state'] });
    },
  });

  const signupMutation = useMutation({
    mutationFn: async ({
      fullName,
      email,
      password,
    }: {
      fullName: string;
      email: string;
      password: string;
    }) => {
      const usersRaw = await AsyncStorage.getItem(USERS_STORAGE_KEY);
      const users: StoredUser[] = usersRaw ? JSON.parse(usersRaw) : [];

      const exists = users.find(
        (u) => u.email.toLowerCase() === email.toLowerCase()
      );
      if (exists) {
        throw new Error('An account with this email already exists');
      }

      const newUser: StoredUser = {
        id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        fullName,
        email: email.toLowerCase(),
        password,
        avatarUrl: null,
        createdAt: new Date().toISOString(),
      };

      const updatedUsers = [...users, newUser];
      await AsyncStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(updatedUsers));

      const { password: _, ...userProfile } = newUser;
      const newState: AuthState = { isAuthenticated: true, user: userProfile };
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(newState));
      console.log('[Auth] Signup success:', email);
      return newState;
    },
    onSuccess: (state) => {
      setAuthState(state);
      queryClient.invalidateQueries({ queryKey: ['auth-state'] });
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (updates: Partial<Pick<UserProfile, 'fullName' | 'avatarUrl'>>) => {
      if (!authState.user) throw new Error('Not authenticated');

      const updatedUser: UserProfile = { ...authState.user, ...updates };
      const newState: AuthState = { isAuthenticated: true, user: updatedUser };
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(newState));

      const usersRaw = await AsyncStorage.getItem(USERS_STORAGE_KEY);
      const users: StoredUser[] = usersRaw ? JSON.parse(usersRaw) : [];
      const idx = users.findIndex((u) => u.id === updatedUser.id);
      if (idx >= 0) {
        users[idx] = { ...users[idx], ...updates };
        await AsyncStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
      }

      console.log('[Auth] Profile updated');
      return newState;
    },
    onSuccess: (state) => {
      setAuthState(state);
      queryClient.invalidateQueries({ queryKey: ['auth-state'] });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
      console.log('[Auth] Logged out');
      return { isAuthenticated: false, user: null } as AuthState;
    },
    onSuccess: (state) => {
      setAuthState(state);
      queryClient.invalidateQueries({ queryKey: ['auth-state'] });
    },
  });

  const login = useCallback(
    (email: string, password: string) => loginMutation.mutateAsync({ email, password }),
    [loginMutation]
  );

  const signup = useCallback(
    (fullName: string, email: string, password: string) =>
      signupMutation.mutateAsync({ fullName, email, password }),
    [signupMutation]
  );

  const updateProfile = useCallback(
    (updates: Partial<Pick<UserProfile, 'fullName' | 'avatarUrl'>>) =>
      updateProfileMutation.mutateAsync(updates),
    [updateProfileMutation]
  );

  const logout = useCallback(() => logoutMutation.mutate(), [logoutMutation]);

  return {
    isAuthenticated: authState.isAuthenticated,
    user: authState.user,
    isLoading: authQuery.isLoading,
    login,
    signup,
    updateProfile,
    logout,
    loginError: loginMutation.error?.message ?? null,
    signupError: signupMutation.error?.message ?? null,
    isLoggingIn: loginMutation.isPending,
    isSigningUp: signupMutation.isPending,
  };
});
