import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SavedLooksProvider } from "@/hooks/useSavedLooks";
import { FavoritesProvider } from "@/hooks/useFavorites";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { BarbersProvider } from "@/hooks/useBarbers";
import Colors from "@/constants/colors";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function AuthGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthRoute = segments[0] === ("login" as string) || segments[0] === ("barber-login" as string);

    if (!isAuthenticated && !inAuthRoute) {
      console.log("[Auth] Not authenticated, redirecting to login");
      router.replace("/login" as any);
    } else if (isAuthenticated && inAuthRoute) {
      console.log("[Auth] Authenticated, redirecting to home");
      router.replace("/" as any);
    }
  }, [isAuthenticated, isLoading, segments]);

  return <>{children}</>;
}

function RootLayoutNav() {
  return (
    <AuthGate>
      <Stack
        screenOptions={{
          headerBackTitle: "Back",
          headerStyle: { backgroundColor: Colors.background },
          headerTintColor: Colors.text,
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="login"
          options={{
            headerShown: false,
            gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="barber-login"
          options={{
            headerShown: false,
            presentation: "modal",
          }}
        />
        <Stack.Screen
          name="barber-dashboard"
          options={{
            headerShown: true,
            title: "Barber Dashboard",
          }}
        />
        <Stack.Screen
          name="try-on"
          options={{
            presentation: "modal",
            headerShown: true,
            title: "Try On",
          }}
        />
        <Stack.Screen
          name="find-barber"
          options={{
            headerShown: true,
            title: "Find a Barber",
          }}
        />
        <Stack.Screen
          name="book-appointment"
          options={{
            headerShown: true,
            title: "Book Appointment",
          }}
        />
      </Stack>
    </AuthGate>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView>
        <AuthProvider>
          <BarbersProvider>
            <FavoritesProvider>
              <SavedLooksProvider>
                <RootLayoutNav />
              </SavedLooksProvider>
            </FavoritesProvider>
          </BarbersProvider>
        </AuthProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
