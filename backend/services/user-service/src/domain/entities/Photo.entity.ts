export interface PhotoEntity {
  id: string;
  user_id: string;
  url: string;
  thumbnail_url?: string;
  position: number;
  is_primary: boolean;
  is_verified: boolean;
  storage_key?: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreatePhotoDto {
  user_id: string;
  url: string;
  thumbnail_url?: string;
  position: number;
  is_primary?: boolean;
  storage_key?: string;
}

export interface UpdatePhotoDto {
  position?: number;
  is_primary?: boolean;
}

export interface PhotoResponse {
  id: string;
  url: string;
  thumbnail_url?: string;
  position: number;
  is_primary: boolean;
  is_verified: boolean;
  created_at: Date;
}
