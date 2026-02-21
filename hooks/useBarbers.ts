import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';
import {
  BarberProfile,
  BarberService,
  BarberLocation,
  Appointment,
  TEST_BARBER,
} from '@/constants/barbers';

const BARBERS_KEY = 'barber_profiles';
const BARBER_AUTH_KEY = 'barber_auth_state';
const BARBER_USERS_KEY = 'barber_registered_users';
const APPOINTMENTS_KEY = 'appointments';

interface StoredBarber extends BarberProfile {
  password: string;
}

interface BarberAuthState {
  isAuthenticated: boolean;
  barber: BarberProfile | null;
}

export const [BarbersProvider, useBarbers] = createContextHook(() => {
  const queryClient = useQueryClient();

  const [barberAuth, setBarberAuth] = useState<BarberAuthState>({
    isAuthenticated: false,
    barber: null,
  });
  const [barbers, setBarbers] = useState<BarberProfile[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  const barbersQuery = useQuery({
    queryKey: ['barbers'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(BARBERS_KEY);
      const list: BarberProfile[] = stored ? JSON.parse(stored) : [];
      const hasEdgar = list.some((b) => b.id === TEST_BARBER.id);
      if (!hasEdgar) {
        list.push(TEST_BARBER);
        await AsyncStorage.setItem(BARBERS_KEY, JSON.stringify(list));

        const usersRaw = await AsyncStorage.getItem(BARBER_USERS_KEY);
        const users: StoredBarber[] = usersRaw ? JSON.parse(usersRaw) : [];
        const hasEdgarUser = users.some((u) => u.id === TEST_BARBER.id);
        if (!hasEdgarUser) {
          users.push({ ...TEST_BARBER, password: 'edgar123' });
          await AsyncStorage.setItem(BARBER_USERS_KEY, JSON.stringify(users));
        }
      }
      console.log('[Barbers] Loaded', list.length, 'barbers');
      return list;
    },
  });

  const barberAuthQuery = useQuery({
    queryKey: ['barber-auth'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(BARBER_AUTH_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as BarberAuthState;
        console.log('[BarberAuth] Restored session for:', parsed.barber?.email);
        return parsed;
      }
      return { isAuthenticated: false, barber: null } as BarberAuthState;
    },
  });

  const appointmentsQuery = useQuery({
    queryKey: ['appointments'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(APPOINTMENTS_KEY);
      return stored ? (JSON.parse(stored) as Appointment[]) : [];
    },
  });

  useEffect(() => {
    if (barbersQuery.data) setBarbers(barbersQuery.data);
  }, [barbersQuery.data]);

  useEffect(() => {
    if (barberAuthQuery.data) setBarberAuth(barberAuthQuery.data);
  }, [barberAuthQuery.data]);

  useEffect(() => {
    if (appointmentsQuery.data) setAppointments(appointmentsQuery.data);
  }, [appointmentsQuery.data]);

  const barberLoginMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const usersRaw = await AsyncStorage.getItem(BARBER_USERS_KEY);
      const users: StoredBarber[] = usersRaw ? JSON.parse(usersRaw) : [];
      const found = users.find(
        (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
      );
      if (!found) throw new Error('Invalid email or password');

      const { password: _, ...profile } = found;
      const newState: BarberAuthState = { isAuthenticated: true, barber: profile };
      await AsyncStorage.setItem(BARBER_AUTH_KEY, JSON.stringify(newState));
      console.log('[BarberAuth] Login success:', email);
      return newState;
    },
    onSuccess: (state) => {
      setBarberAuth(state);
      queryClient.invalidateQueries({ queryKey: ['barber-auth'] });
    },
  });

  const barberSignupMutation = useMutation({
    mutationFn: async ({
      fullName,
      email,
      password,
      bio,
      location,
      services,
      avatarUrl,
    }: {
      fullName: string;
      email: string;
      password: string;
      bio: string;
      location: BarberLocation;
      services: BarberService[];
      avatarUrl: string | null;
    }) => {
      const usersRaw = await AsyncStorage.getItem(BARBER_USERS_KEY);
      const users: StoredBarber[] = usersRaw ? JSON.parse(usersRaw) : [];
      const exists = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
      if (exists) throw new Error('An account with this email already exists');

      const newBarber: StoredBarber = {
        id: `barber_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        fullName,
        email: email.toLowerCase(),
        password,
        avatarUrl,
        bio,
        location,
        services,
        createdAt: new Date().toISOString(),
      };

      const updatedUsers = [...users, newBarber];
      await AsyncStorage.setItem(BARBER_USERS_KEY, JSON.stringify(updatedUsers));

      const { password: _, ...profile } = newBarber;
      const storedBarbers = await AsyncStorage.getItem(BARBERS_KEY);
      const barberList: BarberProfile[] = storedBarbers ? JSON.parse(storedBarbers) : [];
      barberList.push(profile);
      await AsyncStorage.setItem(BARBERS_KEY, JSON.stringify(barberList));

      const newState: BarberAuthState = { isAuthenticated: true, barber: profile };
      await AsyncStorage.setItem(BARBER_AUTH_KEY, JSON.stringify(newState));
      console.log('[BarberAuth] Signup success:', email);
      return newState;
    },
    onSuccess: (state) => {
      setBarberAuth(state);
      queryClient.invalidateQueries({ queryKey: ['barber-auth', 'barbers'] });
    },
  });

  const barberLogoutMutation = useMutation({
    mutationFn: async () => {
      await AsyncStorage.removeItem(BARBER_AUTH_KEY);
      console.log('[BarberAuth] Logged out');
      return { isAuthenticated: false, barber: null } as BarberAuthState;
    },
    onSuccess: (state) => {
      setBarberAuth(state);
      queryClient.invalidateQueries({ queryKey: ['barber-auth'] });
    },
  });

  const bookAppointmentMutation = useMutation({
    mutationFn: async (appointment: Appointment) => {
      const updated = [...appointments, appointment];
      await AsyncStorage.setItem(APPOINTMENTS_KEY, JSON.stringify(updated));
      console.log('[Appointments] Booked:', appointment.id);
      return updated;
    },
    onSuccess: (updated) => {
      setAppointments(updated);
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });

  const cancelAppointmentMutation = useMutation({
    mutationFn: async (appointmentId: string) => {
      const updated = appointments.map((a) =>
        a.id === appointmentId ? { ...a, status: 'cancelled' as const } : a
      );
      await AsyncStorage.setItem(APPOINTMENTS_KEY, JSON.stringify(updated));
      return updated;
    },
    onSuccess: (updated) => {
      setAppointments(updated);
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });

  const barberLogin = useCallback(
    (email: string, password: string) => barberLoginMutation.mutateAsync({ email, password }),
    [barberLoginMutation]
  );

  const barberSignup = useCallback(
    (data: {
      fullName: string;
      email: string;
      password: string;
      bio: string;
      location: BarberLocation;
      services: BarberService[];
      avatarUrl: string | null;
    }) => barberSignupMutation.mutateAsync(data),
    [barberSignupMutation]
  );

  const barberLogout = useCallback(() => barberLogoutMutation.mutate(), [barberLogoutMutation]);

  const bookAppointment = useCallback(
    (appointment: Appointment) => bookAppointmentMutation.mutateAsync(appointment),
    [bookAppointmentMutation]
  );

  const cancelAppointment = useCallback(
    (id: string) => cancelAppointmentMutation.mutateAsync(id),
    [cancelAppointmentMutation]
  );

  const getBarberAppointments = useCallback(
    (barberId: string) => appointments.filter((a) => a.barberId === barberId && a.status !== 'cancelled'),
    [appointments]
  );

  const getCustomerAppointments = useCallback(
    (customerId: string) => appointments.filter((a) => a.customerId === customerId),
    [appointments]
  );

  return {
    barbers,
    barberAuth,
    appointments,
    barberLogin,
    barberSignup,
    barberLogout,
    bookAppointment,
    cancelAppointment,
    getBarberAppointments,
    getCustomerAppointments,
    isBarberLoggingIn: barberLoginMutation.isPending,
    isBarberSigningUp: barberSignupMutation.isPending,
    isBooking: bookAppointmentMutation.isPending,
    isLoadingBarbers: barbersQuery.isLoading,
  };
});
