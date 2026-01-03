import { PartnerType, PartnerStatus, IntegrationType } from '../../types';

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
  commissionRate: number;
  metadata: Record<string, any>;
  contactEmail: string;
  contactPhone?: string;
  logoUrl?: string;
  description?: string;
  termsUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PartnerCreateInput {
  name: string;
  type: PartnerType;
  integrationType: IntegrationType;
  apiKey?: string;
  apiSecret?: string;
  webhookSecret?: string;
  baseUrl?: string;
  affiliateId?: string;
  commissionRate: number;
  contactEmail: string;
  contactPhone?: string;
  logoUrl?: string;
  description?: string;
  termsUrl?: string;
  metadata?: Record<string, any>;
}

export interface PartnerUpdateInput {
  name?: string;
  status?: PartnerStatus;
  apiKey?: string;
  apiSecret?: string;
  webhookSecret?: string;
  baseUrl?: string;
  affiliateId?: string;
  commissionRate?: number;
  contactEmail?: string;
  contactPhone?: string;
  logoUrl?: string;
  description?: string;
  termsUrl?: string;
  metadata?: Record<string, any>;
}

export const PARTNER_TYPES = {
  RESTAURANT: 'restaurant' as PartnerType,
  EVENTS: 'events' as PartnerType,
  GIFTS: 'gifts' as PartnerType,
  EXPERIENCES: 'experiences' as PartnerType,
} as const;

export const PARTNER_STATUS = {
  ACTIVE: 'active' as PartnerStatus,
  INACTIVE: 'inactive' as PartnerStatus,
  PENDING: 'pending' as PartnerStatus,
  SUSPENDED: 'suspended' as PartnerStatus,
} as const;

export const INTEGRATION_TYPES = {
  OPENTABLE: 'opentable' as IntegrationType,
  RESY: 'resy' as IntegrationType,
  TICKETMASTER: 'ticketmaster' as IntegrationType,
  EVENTBRITE: 'eventbrite' as IntegrationType,
  FLOWERS: 'flowers' as IntegrationType,
  CUSTOM: 'custom' as IntegrationType,
} as const;

// Default commission rates by partner type
export const DEFAULT_COMMISSION_RATES: Record<PartnerType, number> = {
  restaurant: 10, // 10% commission on reservation value
  events: 8, // 8% commission on ticket sales
  gifts: 15, // 15% commission on gift purchases
  experiences: 12, // 12% commission on experiences
};
