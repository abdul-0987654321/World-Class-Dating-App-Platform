/**
 * DatePlan Entity
 * Represents a luxury date plan created by a user for their match
 */

import { Venue } from './Venue.entity';

export interface DatePlan {
  id: string;
  userId: string;
  matchId: string;
  title: string;
  description?: string;
  date: Date;
  venues: DatePlanVenue[];
  estimatedBudget?: number;
  status: DatePlanStatus;
  sharedWithMatch: boolean;
  sharedAt?: Date;
  completedAt?: Date;
  feedback?: DateFeedback;
  createdAt: Date;
  updatedAt: Date;
}

export type DatePlanStatus = 'draft' | 'confirmed' | 'completed' | 'cancelled';

export interface DatePlanVenue {
  venueId: string;
  venue?: Venue;
  order: number;
  timeSlot?: string; // e.g., "7:00 PM", "8:30 PM"
  notes?: string;
  reservationConfirmed?: boolean;
}

export interface DateFeedback {
  rating: number; // 1-5
  notes?: string;
  wouldRecommend?: boolean;
  submittedAt: Date;
}

export interface DateIdea {
  id: string;
  title: string;
  description: string;
  suggestedVenues: Venue[];
  estimatedBudget: number;
  duration: string; // e.g., "2-3 hours"
  mood: DateMood;
  activities: string[];
  bestFor: string[]; // e.g., "first date", "anniversary", "casual"
}

export type DateMood = 'romantic' | 'adventurous' | 'casual' | 'luxurious' | 'cultural' | 'fun';

export interface DatePreferences {
  budget?: PricePreference;
  mood?: DateMood;
  venueTypes?: string[];
  cuisinePreferences?: string[];
  activityPreferences?: string[];
  timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night';
  duration?: 'short' | 'medium' | 'long'; // 1-2h, 2-4h, 4h+
  location?: string;
  specialOccasion?: string;
}

export type PricePreference = 'budget' | 'moderate' | 'upscale' | 'luxury' | 'any';

export interface DatePlanCreateInput {
  matchId: string;
  title: string;
  description?: string;
  date: Date;
  venues: DatePlanVenueInput[];
  estimatedBudget?: number;
}

export interface DatePlanVenueInput {
  venueId: string;
  order: number;
  timeSlot?: string;
  notes?: string;
}

export interface DatePlanUpdateInput {
  title?: string;
  description?: string;
  date?: Date;
  venues?: DatePlanVenueInput[];
  estimatedBudget?: number;
  status?: DatePlanStatus;
}

export const DATE_PLAN_STATUS = {
  DRAFT: 'draft' as DatePlanStatus,
  CONFIRMED: 'confirmed' as DatePlanStatus,
  COMPLETED: 'completed' as DatePlanStatus,
  CANCELLED: 'cancelled' as DatePlanStatus,
} as const;

export const DATE_MOODS = {
  ROMANTIC: 'romantic' as DateMood,
  ADVENTUROUS: 'adventurous' as DateMood,
  CASUAL: 'casual' as DateMood,
  LUXURIOUS: 'luxurious' as DateMood,
  CULTURAL: 'cultural' as DateMood,
  FUN: 'fun' as DateMood,
} as const;

/**
 * Check if date plan can be shared
 */
export function canShareDatePlan(datePlan: DatePlan): boolean {
  return (
    datePlan.status !== DATE_PLAN_STATUS.CANCELLED &&
    datePlan.venues.length > 0 &&
    !datePlan.sharedWithMatch
  );
}

/**
 * Check if date plan can be completed
 */
export function canCompleteDatePlan(datePlan: DatePlan): boolean {
  return (
    datePlan.status === DATE_PLAN_STATUS.CONFIRMED &&
    new Date(datePlan.date) <= new Date()
  );
}

/**
 * Calculate estimated budget from venues
 */
export function calculateEstimatedBudget(venues: Venue[]): number {
  let total = 0;
  for (const venue of venues) {
    const costs: Record<string, number> = {
      budget: 30,
      moderate: 60,
      upscale: 120,
      luxury: 200,
    };
    total += costs[venue.priceRange] || 60;
  }
  return total * 2; // For two people
}

/**
 * Get date plan duration estimate
 */
export function getDatePlanDuration(venues: DatePlanVenue[]): string {
  const hours = venues.length * 1.5; // Estimate 1.5 hours per venue
  if (hours <= 2) return '1-2 hours';
  if (hours <= 4) return '2-4 hours';
  if (hours <= 6) return '4-6 hours';
  return '6+ hours';
}
