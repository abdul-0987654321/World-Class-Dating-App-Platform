// Partnership Service Types

// ==================== Partner Types ====================

export type PartnerType = 'restaurant' | 'events' | 'gifts' | 'experiences';
export type PartnerStatus = 'active' | 'inactive' | 'pending' | 'suspended';
export type IntegrationType =
  | 'opentable'
  | 'resy'
  | 'ticketmaster'
  | 'eventbrite'
  | 'flowers'
  | 'custom';

export interface Partner {
  id: string;
  name: string;
  type: PartnerType;
  integrationType: IntegrationType;
  status: PartnerStatus;
  apiKey?: string;
  apiSecret?: string;
  webhookSecret?: string;
  baseUrl?: string;
  affiliateId?: string;
  commissionRate: number; // Percentage (0-100)
  metadata: Record<string, any>;
  contactEmail: string;
  contactPhone?: string;
  logoUrl?: string;
  description?: string;
  termsUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ==================== Restaurant Types ====================

export type ReservationStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';

export interface Restaurant {
  id: string;
  partnerId: string;
  externalId: string; // OpenTable/Resy restaurant ID
  name: string;
  description?: string;
  cuisine: string[];
  priceRange: 1 | 2 | 3 | 4; // $ to $$$$
  rating?: number;
  reviewCount?: number;
  address: Address;
  phone?: string;
  website?: string;
  imageUrls: string[];
  amenities: string[];
  dressCode?: string;
  isDateNight: boolean; // Good for dates
  romanticScore?: number; // 1-10 rating for romantic atmosphere
  operatingHours: OperatingHours[];
  createdAt: Date;
  updatedAt: Date;
}

export interface RestaurantSearchParams {
  latitude: number;
  longitude: number;
  radiusMiles?: number;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  partySize: number;
  cuisine?: string[];
  priceRange?: number[];
  dateNightOnly?: boolean;
  minRating?: number;
}

export interface RestaurantAvailability {
  restaurantId: string;
  date: string;
  times: AvailableSlot[];
}

export interface AvailableSlot {
  time: string;
  type: 'standard' | 'outdoor' | 'bar' | 'private';
  partySize: number;
}

export interface Reservation {
  id: string;
  userId: string;
  matchId?: string; // Associated match/date
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

// ==================== Event Types ====================

export type EventCategory =
  | 'concerts'
  | 'sports'
  | 'theater'
  | 'comedy'
  | 'festivals'
  | 'experiences'
  | 'classes'
  | 'food_drink';

export type TicketStatus = 'pending' | 'confirmed' | 'cancelled' | 'refunded' | 'attended';

export interface Event {
  id: string;
  partnerId: string;
  externalId: string; // Ticketmaster/Eventbrite ID
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

export interface Venue {
  id?: string;
  name: string;
  address: Address;
  capacity?: number;
  imageUrl?: string;
}

export interface EventSearchParams {
  latitude: number;
  longitude: number;
  radiusMiles?: number;
  startDate: string;
  endDate?: string;
  category?: EventCategory[];
  priceMin?: number;
  priceMax?: number;
  dateFriendlyOnly?: boolean;
  keyword?: string;
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

export interface Ticket {
  section?: string;
  row?: string;
  seat?: string;
  price: number;
  type: string;
  barcode?: string;
}

// ==================== Gift Types ====================

export type GiftCategory = 'flowers' | 'chocolates' | 'wine' | 'jewelry' | 'experiences' | 'custom';

export type GiftOrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

export interface GiftProduct {
  id: string;
  partnerId: string;
  externalId: string;
  name: string;
  description?: string;
  category: GiftCategory;
  price: number;
  currency: string;
  imageUrls: string[];
  options?: GiftOption[];
  isAvailable: boolean;
  deliveryOptions: DeliveryOption[];
  isRomantic: boolean;
  occasionTags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface GiftOption {
  id: string;
  name: string;
  priceModifier: number;
  type: 'size' | 'color' | 'add_on' | 'custom';
}

export interface DeliveryOption {
  id: string;
  name: string;
  price: number;
  estimatedDays: number;
  description?: string;
}

export interface GiftOrder {
  id: string;
  userId: string;
  recipientMatchId?: string; // The match they're sending to
  partnerId: string;
  externalOrderId?: string;
  status: GiftOrderStatus;
  items: GiftOrderItem[];
  shippingAddress: Address;
  billingAddress?: Address;
  deliveryOption: DeliveryOption;
  giftMessage?: string;
  isAnonymous: boolean;
  subtotal: number;
  shippingCost: number;
  tax: number;
  totalAmount: number;
  currency: string;
  paymentIntentId?: string;
  affiliateTrackingId: string;
  commission?: number;
  trackingNumber?: string;
  estimatedDeliveryDate?: Date;
  actualDeliveryDate?: Date;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface GiftOrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  selectedOptions?: GiftOption[];
  totalPrice: number;
}

// ==================== Common Types ====================

export interface Address {
  street1: string;
  street2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  latitude?: number;
  longitude?: number;
}

export interface OperatingHours {
  dayOfWeek: number; // 0 = Sunday, 6 = Saturday
  openTime: string; // HH:mm
  closeTime: string;
  isClosed: boolean;
}

// ==================== Affiliate Tracking ====================

export interface AffiliateClick {
  id: string;
  userId: string;
  partnerId: string;
  trackingId: string;
  resourceType: 'restaurant' | 'event' | 'gift';
  resourceId: string;
  referrerUrl?: string;
  userAgent?: string;
  ipAddress?: string;
  convertedAt?: Date;
  conversionOrderId?: string;
  createdAt: Date;
}

export interface AffiliateCommission {
  id: string;
  partnerId: string;
  orderId: string;
  orderType: 'reservation' | 'ticket' | 'gift';
  orderAmount: number;
  commissionRate: number;
  commissionAmount: number;
  currency: string;
  status: 'pending' | 'approved' | 'paid' | 'rejected';
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ==================== Date Planning ====================

export interface DatePlanSuggestion {
  id: string;
  userId: string;
  matchId?: string;
  title: string;
  description: string;
  budget: {
    min: number;
    max: number;
    currency: string;
  };
  duration: string; // e.g., "2-3 hours"
  activities: DateActivity[];
  totalEstimatedCost: number;
  romanticScore: number;
  adventureScore: number;
  createdAt: Date;
}

export interface DateActivity {
  order: number;
  type: 'restaurant' | 'event' | 'activity' | 'gift';
  name: string;
  description?: string;
  resourceId?: string;
  estimatedDuration: string;
  estimatedCost: number;
  bookingRequired: boolean;
  bookingUrl?: string;
}

// ==================== API Response Types ====================

export interface PartnershipApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
