export type SwipeAction = 'like' | 'pass' | 'super_like';

export interface SwipeEntity {
  id: string;
  swiper_id: string;
  swiped_id: string;
  action: SwipeAction;
  swiped_at: Date;
  created_at: Date;
  updated_at: Date;
}

export interface CreateSwipeDto {
  swiper_id: string;
  swiped_id: string;
  action: SwipeAction;
}

export interface SwipeResponse {
  id: string;
  swiped_id: string;
  action: SwipeAction;
  is_match: boolean;
  swiped_at: Date;
}
