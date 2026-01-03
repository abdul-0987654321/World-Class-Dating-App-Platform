/**
 * Venue Entity
 * Represents a venue for date planning (restaurant, bar, activity, entertainment)
 */

export interface Venue {
  id: string;
  name: string;
  type: VenueType;
  address: string;
  city: string;
  priceRange: PriceRange;
  rating?: number;
  imageUrl?: string;
  externalId?: string; // Google Places ID or Yelp Business ID
  externalSource?: ExternalSource;
  metadata?: VenueMetadata;
  createdAt: Date;
  updatedAt: Date;
}

export type VenueType = 'restaurant' | 'bar' | 'activity' | 'entertainment';
export type PriceRange = 'budget' | 'moderate' | 'upscale' | 'luxury';
export type ExternalSource = 'google' | 'yelp' | 'manual';

export interface VenueMetadata {
  phone?: string;
  website?: string;
  hours?: string[];
  cuisine?: string[];
  amenities?: string[];
  photos?: string[];
  reviews?: number;
  latitude?: number;
  longitude?: number;
  googleMapsUrl?: string;
  reservationUrl?: string;
}

export interface VenueCreateInput {
  name: string;
  type: VenueType;
  address: string;
  city: string;
  priceRange: PriceRange;
  rating?: number;
  imageUrl?: string;
  externalId?: string;
  externalSource?: ExternalSource;
  metadata?: VenueMetadata;
}

export interface VenueUpdateInput {
  name?: string;
  type?: VenueType;
  address?: string;
  city?: string;
  priceRange?: PriceRange;
  rating?: number;
  imageUrl?: string;
  metadata?: VenueMetadata;
}

export interface VenueSearchParams {
  location: string;
  type?: VenueType;
  priceRange?: PriceRange;
  radius?: number; // in meters
  keyword?: string;
  limit?: number;
}

export const VENUE_TYPES = {
  RESTAURANT: 'restaurant' as VenueType,
  BAR: 'bar' as VenueType,
  ACTIVITY: 'activity' as VenueType,
  ENTERTAINMENT: 'entertainment' as VenueType,
} as const;

export const PRICE_RANGES = {
  BUDGET: 'budget' as PriceRange,
  MODERATE: 'moderate' as PriceRange,
  UPSCALE: 'upscale' as PriceRange,
  LUXURY: 'luxury' as PriceRange,
} as const;

export const EXTERNAL_SOURCES = {
  GOOGLE: 'google' as ExternalSource,
  YELP: 'yelp' as ExternalSource,
  MANUAL: 'manual' as ExternalSource,
} as const;

/**
 * Map price range to display string
 */
export function getPriceRangeDisplay(priceRange: PriceRange): string {
  const displays: Record<PriceRange, string> = {
    budget: '$',
    moderate: '$$',
    upscale: '$$$',
    luxury: '$$$$',
  };
  return displays[priceRange];
}

/**
 * Get estimated cost per person based on price range
 */
export function getEstimatedCostPerPerson(priceRange: PriceRange): { min: number; max: number } {
  const costs: Record<PriceRange, { min: number; max: number }> = {
    budget: { min: 10, max: 25 },
    moderate: { min: 25, max: 50 },
    upscale: { min: 50, max: 100 },
    luxury: { min: 100, max: 250 },
  };
  return costs[priceRange];
}
