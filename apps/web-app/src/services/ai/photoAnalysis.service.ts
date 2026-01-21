/**
 * Photo Analysis Service
 * Web client for photo analysis AI service
 */

import { authTokenService } from '../auth-token.service';
import { apiClient } from '../api.client';
import { AI_CONFIG } from './config';

// Types
export interface PhotoAnalysisResult {
  photo_id: string;
  analysis_timestamp: string;
  face_analysis?: FaceAnalysisResult;
  quality_analysis?: QualityAnalysisResult;
  moderation_result?: ModerationResult;
  verification_result?: VerificationResult;
  overall_score: number;
  recommendations: string[];
}

export interface FaceAnalysisResult {
  faces_detected: number;
  primary_face?: {
    confidence: number;
    bounding_box: { x: number; y: number; width: number; height: number };
    attributes: FaceAttributes;
  };
  multiple_faces_warning: boolean;
  no_face_detected: boolean;
}

export interface FaceAttributes {
  age_range?: { low: number; high: number };
  gender?: { value: string; confidence: number };
  smile?: { value: boolean; confidence: number };
  eyeglasses?: boolean;
  sunglasses?: boolean;
  beard?: boolean;
  emotions?: { emotion: string; confidence: number }[];
  pose?: { pitch: number; roll: number; yaw: number };
  quality?: { brightness: number; sharpness: number };
}

export interface QualityAnalysisResult {
  overall_quality: 'poor' | 'fair' | 'good' | 'excellent';
  quality_score: number;
  issues: QualityIssue[];
  metrics: {
    resolution: { width: number; height: number; is_sufficient: boolean };
    brightness: number;
    contrast: number;
    sharpness: number;
    noise_level: number;
    face_visibility: number;
  };
}

export interface QualityIssue {
  type:
    | 'low_resolution'
    | 'too_dark'
    | 'too_bright'
    | 'blurry'
    | 'grainy'
    | 'face_obscured'
    | 'bad_crop';
  severity: 'low' | 'medium' | 'high';
  description: string;
  suggestion: string;
}

export interface ModerationResult {
  is_safe: boolean;
  action: 'approve' | 'review' | 'reject';
  categories: ModerationCategory[];
  reasons: string[];
  confidence: number;
}

export interface ModerationCategory {
  category: 'explicit' | 'suggestive' | 'violence' | 'hate_symbols' | 'drugs' | 'spam' | 'fake';
  detected: boolean;
  confidence: number;
  severity?: 'low' | 'medium' | 'high';
}

export interface VerificationResult {
  is_verified: boolean;
  verification_type: 'selfie_match' | 'liveness' | 'document';
  confidence: number;
  match_score?: number;
  liveness_score?: number;
  issues?: string[];
}

export interface PhotoRankingResult {
  photos: {
    photo_id: string;
    rank: number;
    score: number;
    strengths: string[];
    weaknesses: string[];
  }[];
  recommended_primary: string;
  improvement_tips: string[];
}

export interface PhotoComparisonResult {
  are_same_person: boolean;
  confidence: number;
  similarity_score: number;
  differences_detected: string[];
}

export interface ProfilePhotoSuggestions {
  missing_types: string[];
  improvement_areas: string[];
  photo_variety_score: number;
  suggestions: { type: string; description: string; examples: string[] }[];
}

export interface FakePhotoDetectionResult {
  is_fake: boolean;
  confidence: number;
  detection_type: 'ai_generated' | 'manipulated' | 'stock_photo' | 'genuine';
  indicators: string[];
}

class PhotoAnalysisService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = AI_CONFIG.PHOTO_ANALYSIS_URL;
  }

  async analyzePhoto(request: {
    photo_url?: string;
    photo_base64?: string;
    user_id: string;
    analysis_types?: ('face' | 'quality' | 'moderation' | 'verification' | 'all')[];
  }): Promise<PhotoAnalysisResult> {
    return apiClient.post<PhotoAnalysisResult>(`${this.baseUrl}/analyze`, request);
  }

  async uploadAndAnalyze(
    userId: string,
    file: File,
    analysisTypes?: ('face' | 'quality' | 'moderation' | 'verification' | 'all')[]
  ): Promise<PhotoAnalysisResult> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('user_id', userId);
    if (analysisTypes) {
      formData.append('analysis_types', JSON.stringify(analysisTypes));
    }

    const token = authTokenService.getToken();
    const response = await fetch(`${this.baseUrl}/upload-analyze`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    return response.json();
  }

  async moderatePhoto(photoUrl: string): Promise<ModerationResult> {
    return apiClient.post<ModerationResult>(`${this.baseUrl}/moderate`, { photo_url: photoUrl });
  }

  async verifySelfie(
    userId: string,
    selfieFile: File,
    referencePhotoUrl: string
  ): Promise<VerificationResult> {
    const formData = new FormData();
    formData.append('file', selfieFile);
    formData.append('user_id', userId);
    formData.append('reference_photo_url', referencePhotoUrl);

    const token = authTokenService.getToken();
    const response = await fetch(`${this.baseUrl}/verify/selfie`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Verification failed: ${response.statusText}`);
    }

    return response.json();
  }

  async checkLiveness(
    userId: string,
    videoFile: File
  ): Promise<{
    is_live: boolean;
    confidence: number;
    checks_passed: string[];
    checks_failed: string[];
  }> {
    const formData = new FormData();
    formData.append('file', videoFile);
    formData.append('user_id', userId);

    const token = authTokenService.getToken();
    const response = await fetch(`${this.baseUrl}/verify/liveness`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Liveness check failed: ${response.statusText}`);
    }

    return response.json();
  }

  async rankPhotos(userId: string, photoUrls: string[]): Promise<PhotoRankingResult> {
    return apiClient.post<PhotoRankingResult>(`${this.baseUrl}/rank`, {
      user_id: userId,
      photo_urls: photoUrls,
    });
  }

  async comparePhotos(photo1Url: string, photo2Url: string): Promise<PhotoComparisonResult> {
    return apiClient.post<PhotoComparisonResult>(`${this.baseUrl}/compare`, {
      photo1_url: photo1Url,
      photo2_url: photo2Url,
    });
  }

  async getPhotoSuggestions(
    userId: string,
    currentPhotoUrls: string[]
  ): Promise<ProfilePhotoSuggestions> {
    return apiClient.post<ProfilePhotoSuggestions>(`${this.baseUrl}/suggestions`, {
      user_id: userId,
      photo_urls: currentPhotoUrls,
    });
  }

  async detectFakePhoto(photoUrl: string): Promise<FakePhotoDetectionResult> {
    return apiClient.post<FakePhotoDetectionResult>(`${this.baseUrl}/detect-fake`, {
      photo_url: photoUrl,
    });
  }

  async extractFaceEmbedding(photoUrl: string): Promise<{
    embedding: number[];
    face_detected: boolean;
    quality_sufficient: boolean;
  }> {
    return apiClient.post(`${this.baseUrl}/embedding`, { photo_url: photoUrl });
  }

  async checkBlocklist(photoUrl: string): Promise<{
    is_blocked: boolean;
    reason?: string;
    action: 'allow' | 'block' | 'review';
  }> {
    return apiClient.post(`${this.baseUrl}/blocklist/check`, { photo_url: photoUrl });
  }

  async enhancePhoto(
    photoUrl: string,
    options?: {
      auto_crop?: boolean;
      brightness_adjust?: boolean;
      face_center?: boolean;
    }
  ): Promise<{
    enhanced_url: string;
    changes_made: string[];
  }> {
    return apiClient.post(`${this.baseUrl}/enhance`, { photo_url: photoUrl, options });
  }
}

export const photoAnalysisService = new PhotoAnalysisService();
export default photoAnalysisService;
