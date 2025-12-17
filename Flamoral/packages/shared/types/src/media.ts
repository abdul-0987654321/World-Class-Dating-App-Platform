export interface MediaUpload {
  id: string;
  userId: string;
  type: 'profile' | 'message' | 'verification';
  url: string;
  thumbnailUrl?: string;
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
  moderationStatus: 'pending' | 'approved' | 'rejected';
  moderationReason?: string;
  uploadedAt: Date;
}

export interface MediaModerationResult {
  isAdult: boolean;
  isRacy: boolean;
  isGory: boolean;
  confidence: number;
  tags: string[];
}
