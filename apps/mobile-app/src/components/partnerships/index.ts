// Partnership Components
// Components for restaurant reservations, event tickets, gift delivery, and date planning

// Card Components
export { default as RestaurantCard, RestaurantCard as RestaurantCardComponent } from './RestaurantCard';
export { default as EventCard, EventCard as EventCardComponent } from './EventCard';
export { default as GiftCard, GiftCard as GiftCardComponent } from './GiftCard';
export { default as DatePlanCard } from './DatePlanCard';

// Order History
export { default as OrderHistoryList } from './OrderHistoryList';

// Confirmation Components
export { default as ReservationConfirmation } from './ReservationConfirmation';
export { default as TicketConfirmation } from './TicketConfirmation';
export { default as GiftOrderConfirmation } from './GiftOrderConfirmation';

// Types
export type OrderType = 'reservation' | 'ticket' | 'gift';
export type OrderStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

export interface UnifiedOrder {
  id: string;
  orderType: OrderType;
  status: OrderStatus;
  partnerName: string;
  itemName: string;
  totalAmount: number;
  currency: string;
  createdAt: string;
  scheduledDate?: string;
  imageUrl?: string;
  confirmationNumber?: string;
}
