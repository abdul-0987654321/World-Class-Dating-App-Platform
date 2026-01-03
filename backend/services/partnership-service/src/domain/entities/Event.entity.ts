import { EventCategory, TicketStatus, Venue, Ticket } from '../../types';

export interface Event {
  id: string;
  partnerId: string;
  externalId: string;
  name: string;
  description?: string;
  category: EventCategory;
  subcategory?: string;
  venue: Venue;
  startDateTime: Date;
  endDateTime?: Date;
  imageUrls: string[];
  priceRange: {
    min: number;
    max: number;
    currency: string;
  };
  isDateFriendly: boolean;
  ageRestriction?: number;
  ticketsRemaining?: number;
  isSoldOut: boolean;
  url?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TicketPurchase {
  id: string;
  userId: string;
  matchId?: string;
  partnerId: string;
  eventId: string;
  externalOrderId?: string;
  status: TicketStatus;
  tickets: Ticket[];
  totalAmount: number;
  currency: string;
  paymentIntentId?: string;
  affiliateTrackingId: string;
  commission?: number;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface TicketPurchaseCreateInput {
  userId: string;
  matchId?: string;
  partnerId: string;
  eventId: string;
  tickets: Ticket[];
  totalAmount: number;
  currency: string;
}

export interface TicketPurchaseUpdateInput {
  status?: TicketStatus;
  externalOrderId?: string;
  paymentIntentId?: string;
  commission?: number;
  metadata?: Record<string, any>;
}

export const TICKET_STATUS = {
  PENDING: 'pending' as TicketStatus,
  CONFIRMED: 'confirmed' as TicketStatus,
  CANCELLED: 'cancelled' as TicketStatus,
  REFUNDED: 'refunded' as TicketStatus,
  ATTENDED: 'attended' as TicketStatus,
} as const;

export const EVENT_CATEGORIES = {
  CONCERTS: 'concerts' as EventCategory,
  SPORTS: 'sports' as EventCategory,
  THEATER: 'theater' as EventCategory,
  COMEDY: 'comedy' as EventCategory,
  FESTIVALS: 'festivals' as EventCategory,
  EXPERIENCES: 'experiences' as EventCategory,
  CLASSES: 'classes' as EventCategory,
  FOOD_DRINK: 'food_drink' as EventCategory,
} as const;

// Categories that are typically good for dates
export const DATE_FRIENDLY_CATEGORIES: EventCategory[] = [
  'concerts',
  'theater',
  'comedy',
  'experiences',
  'classes',
  'food_drink',
];

// Keywords that suggest an event is date-friendly
export const DATE_FRIENDLY_KEYWORDS = [
  'romantic',
  'couples',
  'wine',
  'jazz',
  'dinner',
  'rooftop',
  'sunset',
  'stargazing',
  'cooking class',
  'art',
  'music',
  'intimate',
  'acoustic',
  'brunch',
  'tasting',
];
