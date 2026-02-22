import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';
import {
  BarberProfile,
  BarberService,
  BarberLocation,
  Appointment,
  BarberNotification,
  TEST_BARBER,
} from '@/constants/barbers';

const BARBERS_KEY = 'barber_profiles';
const BARBER_AUTH_KEY = 'barber_auth_state';
const BARBER_USERS_KEY = 'barber_registered_users';
const APPOINTMENTS_KEY = 'appointments';
const NOTIFICATIONS_KEY = 'barber_notifications';

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
  const [notifications, setNotifications] = useState<BarberNotification[]>([]);

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

  const notificationsQuery = useQuery({
    queryKey: ['barber-notifications'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(NOTIFICATIONS_KEY);
      return stored ? (JSON.parse(stored) as BarberNotification[]) : [];
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

  useEffect(() => {
    if (notificationsQuery.data) setNotifications(notificationsQuery.data);
  }, [notificationsQuery.data]);

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

      const notification: BarberNotification = {
        id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        barberId: appointment.barberId,
        type: 'new_booking',
        title: 'New Appointment',
        message: `${appointment.customerName} booked a ${appointment.haircutName} for ${appointment.date} at ${appointment.time} — ${appointment.rate}`,
        appointmentId: appointment.id,
        read: false,
        createdAt: new Date().toISOString(),
      };
      const storedNotifs = await AsyncStorage.getItem(NOTIFICATIONS_KEY);
      const currentNotifs: BarberNotification[] = storedNotifs ? JSON.parse(storedNotifs) : [];
      const updatedNotifs = [notification, ...currentNotifs];
      await AsyncStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(updatedNotifs));
      setNotifications(updatedNotifs);

      console.log('[Appointments] Booked:', appointment.id);
      console.log('[Notifications] Created notification for barber:', appointment.barberId);
      return updated;
    },
    onSuccess: (updated) => {
      setAppointments(updated);
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['barber-notifications'] });
    },
  });

  const updateBarberProfileMutation = useMutation({
    mutationFn: async (updates: Partial<Pick<BarberProfile, 'fullName' | 'bio' | 'avatarUrl'>> & { location?: BarberLocation }) => {
      if (!barberAuth.barber) throw new Error('Not authenticated as barber');
      const updatedBarber: BarberProfile = { ...barberAuth.barber, ...updates };
      const newState: BarberAuthState = { isAuthenticated: true, barber: updatedBarber };
      await AsyncStorage.setItem(BARBER_AUTH_KEY, JSON.stringify(newState));

      const storedBarbers = await AsyncStorage.getItem(BARBERS_KEY);
      const barberList: BarberProfile[] = storedBarbers ? JSON.parse(storedBarbers) : [];
      const idx = barberList.findIndex((b) => b.id === updatedBarber.id);
      if (idx >= 0) {
        barberList[idx] = updatedBarber;
        await AsyncStorage.setItem(BARBERS_KEY, JSON.stringify(barberList));
      }

      const usersRaw = await AsyncStorage.getItem(BARBER_USERS_KEY);
      const users: StoredBarber[] = usersRaw ? JSON.parse(usersRaw) : [];
      const userIdx = users.findIndex((u) => u.id === updatedBarber.id);
      if (userIdx >= 0) {
        users[userIdx] = { ...users[userIdx], ...updates };
        await AsyncStorage.setItem(BARBER_USERS_KEY, JSON.stringify(users));
      }

      console.log('[BarberAuth] Profile updated');
      return newState;
    },
    onSuccess: (state) => {
      setBarberAuth(state);
      queryClient.invalidateQueries({ queryKey: ['barber-auth', 'barbers'] });
    },
  });

  const updateBarberServicesMutation = useMutation({
    mutationFn: async (services: BarberService[]) => {
      if (!barberAuth.barber) throw new Error('Not authenticated as barber');
      const updatedBarber: BarberProfile = { ...barberAuth.barber, services };
      const newState: BarberAuthState = { isAuthenticated: true, barber: updatedBarber };
      await AsyncStorage.setItem(BARBER_AUTH_KEY, JSON.stringify(newState));

      const storedBarbers = await AsyncStorage.getItem(BARBERS_KEY);
      const barberList: BarberProfile[] = storedBarbers ? JSON.parse(storedBarbers) : [];
      const idx = barberList.findIndex((b) => b.id === updatedBarber.id);
      if (idx >= 0) {
        barberList[idx] = updatedBarber;
        await AsyncStorage.setItem(BARBERS_KEY, JSON.stringify(barberList));
      }

      const usersRaw = await AsyncStorage.getItem(BARBER_USERS_KEY);
      const users: StoredBarber[] = usersRaw ? JSON.parse(usersRaw) : [];
      const userIdx = users.findIndex((u) => u.id === updatedBarber.id);
      if (userIdx >= 0) {
        users[userIdx] = { ...users[userIdx], services };
        await AsyncStorage.setItem(BARBER_USERS_KEY, JSON.stringify(users));
      }

      console.log('[BarberAuth] Services updated');
      return newState;
    },
    onSuccess: (state) => {
      setBarberAuth(state);
      queryClient.invalidateQueries({ queryKey: ['barber-auth', 'barbers'] });
    },
  });

  const cancelAppointmentMutation = useMutation({
    mutationFn: async (appointmentId: string) => {
      const updated = appointments.map((a) =>
        a.id === appointmentId ? { ...a, status: 'cancelled' as const } : a
      );
      await AsyncStorage.setItem(APPOINTMENTS_KEY, JSON.stringify(updated));

      const apt = appointments.find((a) => a.id === appointmentId);
      if (apt) {
        const notification: BarberNotification = {
          id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
          barberId: apt.barberId,
          type: 'cancellation',
          title: 'Appointment Cancelled',
          message: `${apt.customerName} cancelled their ${apt.haircutName} appointment on ${apt.date} at ${apt.time}`,
          appointmentId: apt.id,
          read: false,
          createdAt: new Date().toISOString(),
        };
        const updatedNotifs = [notification, ...notifications];
        await AsyncStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(updatedNotifs));
        setNotifications(updatedNotifs);
      }

      return updated;
    },
    onSuccess: (updated) => {
      setAppointments(updated);
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['barber-notifications'] });
    },
  });

  const declineAppointmentMutation = useMutation({
    mutationFn: async (appointmentId: string) => {
      const apt = appointments.find((a) => a.id === appointmentId);
      if (apt) {
        const bookedAt = new Date(apt.createdAt).getTime();
        const now = Date.now();
        if ((now - bookedAt) > 60 * 60 * 1000) {
          throw new Error('Can only decline within 1 hour of booking');
        }
      }
      const updated = appointments.map((a) =>
        a.id === appointmentId ? { ...a, status: 'declined' as const } : a
      );
      await AsyncStorage.setItem(APPOINTMENTS_KEY, JSON.stringify(updated));
      console.log('[Appointments] Declined:', appointmentId);
      return updated;
    },
    onSuccess: (updated) => {
      setAppointments(updated);
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });

  const deleteAppointmentMutation = useMutation({
    mutationFn: async (appointmentId: string) => {
      const updated = appointments.filter((a) => a.id !== appointmentId);
      await AsyncStorage.setItem(APPOINTMENTS_KEY, JSON.stringify(updated));
      console.log('[Appointments] Deleted:', appointmentId);
      return updated;
    },
    onSuccess: (updated) => {
      setAppointments(updated);
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });

  const updateAppointmentMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Pick<Appointment, 'date' | 'time' | 'status'>> }) => {
      const updated = appointments.map((a) =>
        a.id === id ? { ...a, ...updates } : a
      );
      await AsyncStorage.setItem(APPOINTMENTS_KEY, JSON.stringify(updated));
      console.log('[Appointments] Updated:', id, updates);
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

  const declineAppointment = useCallback(
    (id: string) => declineAppointmentMutation.mutateAsync(id),
    [declineAppointmentMutation]
  );

  const deleteAppointment = useCallback(
    (id: string) => deleteAppointmentMutation.mutateAsync(id),
    [deleteAppointmentMutation]
  );

  const updateAppointment = useCallback(
    (id: string, updates: Partial<Pick<Appointment, 'date' | 'time' | 'status'>>) =>
      updateAppointmentMutation.mutateAsync({ id, updates }),
    [updateAppointmentMutation]
  );

  const updateBarberProfile = useCallback(
    (updates: Partial<Pick<BarberProfile, 'fullName' | 'bio' | 'avatarUrl'>> & { location?: BarberLocation }) =>
      updateBarberProfileMutation.mutateAsync(updates),
    [updateBarberProfileMutation]
  );

  const updateBarberServices = useCallback(
    (services: BarberService[]) => updateBarberServicesMutation.mutateAsync(services),
    [updateBarberServicesMutation]
  );

  const getBarberAppointments = useCallback(
    (barberId: string) => appointments.filter((a) => a.barberId === barberId && a.status !== 'cancelled'),
    [appointments]
  );

  const getCustomerAppointments = useCallback(
    (customerId: string) => appointments.filter((a) => a.customerId === customerId),
    [appointments]
  );

  const getBarberNotifications = useCallback(
    (barberId: string) => notifications.filter((n) => n.barberId === barberId),
    [notifications]
  );

  const getUnreadCount = useCallback(
    (barberId: string) => notifications.filter((n) => n.barberId === barberId && !n.read).length,
    [notifications]
  );

  const markNotificationReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const updated = notifications.map((n) =>
        n.id === notificationId ? { ...n, read: true } : n
      );
      await AsyncStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(updated));
      return updated;
    },
    onSuccess: (updated) => {
      setNotifications(updated);
      queryClient.invalidateQueries({ queryKey: ['barber-notifications'] });
    },
  });

  const markAllNotificationsReadMutation = useMutation({
    mutationFn: async (barberId: string) => {
      const updated = notifications.map((n) =>
        n.barberId === barberId ? { ...n, read: true } : n
      );
      await AsyncStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(updated));
      return updated;
    },
    onSuccess: (updated) => {
      setNotifications(updated);
      queryClient.invalidateQueries({ queryKey: ['barber-notifications'] });
    },
  });

  const markNotificationRead = useCallback(
    (id: string) => markNotificationReadMutation.mutate(id),
    [markNotificationReadMutation]
  );

  const markAllNotificationsRead = useCallback(
    (barberId: string) => markAllNotificationsReadMutation.mutate(barberId),
    [markAllNotificationsReadMutation]
  );

  return {
    barbers,
    barberAuth,
    appointments,
    notifications,
    barberLogin,
    barberSignup,
    barberLogout,
    bookAppointment,
    cancelAppointment,
    declineAppointment,
    deleteAppointment,
    updateAppointment,
    getBarberAppointments,
    getCustomerAppointments,
    getBarberNotifications,
    getUnreadCount,
    markNotificationRead,
    markAllNotificationsRead,
    updateBarberProfile,
    updateBarberServices,
    isBarberLoggingIn: barberLoginMutation.isPending,
    isUpdatingProfile: updateBarberProfileMutation.isPending,
    isUpdatingServices: updateBarberServicesMutation.isPending,
    isBarberSigningUp: barberSignupMutation.isPending,
    isBooking: bookAppointmentMutation.isPending,
    isLoadingBarbers: barbersQuery.isLoading,
  };
});
