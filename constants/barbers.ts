export interface BarberService {
  haircutId: string;
  haircutName: string;
  rate: number;
}

export interface BarberLocation {
  address: string;
  latitude: number;
  longitude: number;
}

export interface BarberProfile {
  id: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  bio: string;
  location: BarberLocation;
  services: BarberService[];
  createdAt: string;
}

export interface Appointment {
  id: string;
visibleToBarber: boolean;
  visibleToCustomer: boolean;
  barberId: string;
  barberName: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  haircutName: string;
  rate: number;
  date: string;
  time: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  createdAt: string;
}

export const TEST_BARBER: BarberProfile = {
  id: 'barber_edgar_test',
  fullName: 'Edgar',
  email: 'edgar@cutgpt.com',
  avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face',
  bio: 'Professional barber with 8+ years of experience specializing in fades, modern cuts, and classic styles. Walk-ins welcome anytime!',
  location: {
    address: '10 Momrow Terrace, Menands, NY 12204',
    latitude: 42.6856,
    longitude: -73.7254,
  },
  services: [
    { haircutId: 'high-fade', haircutName: 'High Fade', rate: 35 },
    { haircutId: 'mid-fade', haircutName: 'Mid Fade', rate: 30 },
    { haircutId: 'skin-fade', haircutName: 'Skin Fade', rate: 40 },
    { haircutId: 'buzz-cut', haircutName: 'Buzz Cut', rate: 20 },
    { haircutId: 'taper-fade', haircutName: 'Taper Fade', rate: 30 },
    { haircutId: 'edgar-cut', haircutName: 'Edgar Cut', rate: 35 },
    { haircutId: 'crew-cut', haircutName: 'Crew Cut', rate: 25 },
  ],
  createdAt: '2024-01-15T00:00:00.000Z',
};

export function getDistanceMiles(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3959;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
