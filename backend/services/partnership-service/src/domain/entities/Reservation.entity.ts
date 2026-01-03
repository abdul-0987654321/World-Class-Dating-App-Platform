import { ReservationStatus, Address, OperatingHours } from '../../types';

export interface Restaurant {
  id: string;
  partnerId: string;
  externalId: string;
  name: string;
  description?: string;
  cuisine: string[];
  priceRange: 1 | 2 | 3 | 4;
  rating?: number;
  reviewCount?: number;
  address: Address;
  phone?: string;
  website?: string;
  imageUrls: string[];
  amenities: string[];
  dressCode?: string;
  isDateNight: boolean;
  romanticScore?: number;
  operatingHours: OperatingHours[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Reservation {
  id: string;
  userId: string;
  matchId?: string;
  partnerId: string;
  restaurantId: string;
  externalReservationId?: string;
  status: ReservationStatus;
  date: string;
  time: string;
  partySize: number;
  specialRequests?: string;
  confirmationCode?: string;
  reminderSent: boolean;
  affiliateTrackingId: string;
  commission?: number;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReservationCreateInput {
  userId: string;
  matchId?: string;
  partnerId: string;
  restaurantId: string;
  date: string;
  time: string;
  partySize: number;
  specialRequests?: string;
}

export interface ReservationUpdateInput {
  status?: ReservationStatus;
  externalReservationId?: string;
  confirmationCode?: string;
  reminderSent?: boolean;
  commission?: number;
  metadata?: Record<string, any>;
}

export const RESERVATION_STATUS = {
  PENDING: 'pending' as ReservationStatus,
  CONFIRMED: 'confirmed' as ReservationStatus,
  CANCELLED: 'cancelled' as ReservationStatus,
  COMPLETED: 'completed' as ReservationStatus,
  NO_SHOW: 'no_show' as ReservationStatus,
} as const;

// Price range labels
export const PRICE_RANGE_LABELS: Record<number, string> = {
  1: '$',
  2: '$$',
  3: '$$$',
  4: '$$$$',
};

// Cuisine types commonly good for dates
export const DATE_NIGHT_CUISINES = [
  'Italian',
  'French',
  'Japanese',
  'Mediterranean',
  'Steakhouse',
  'Seafood',
  'Wine Bar',
  'Rooftop',
  'Farm-to-Table',
  'Fine Dining',
];

// Amenities that make a restaurant good for dates
export const DATE_NIGHT_AMENITIES = [
  'Romantic Ambiance',
  'Private Dining',
  'Outdoor Seating',
  'Wine Selection',
  'Tasting Menu',
  'Live Music',
  'Waterfront',
  'City Views',
  'Fireplace',
  'Intimate Setting',
];
