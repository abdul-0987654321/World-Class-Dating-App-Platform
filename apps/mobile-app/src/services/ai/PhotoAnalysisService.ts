/**
 * Photo Analysis Service Client
 * Connects to the backend photo-analysis-service for image analysis and moderation
 */

import { API_CONFIG } from '../api/config';
import { httpClient, ApiResponse } from '../api/httpClient';

// Types matching the backend service
export interface PhotoAnalysisRequest {
  photo_url?: string;
  photo_base64?: string;
  user_id: string;
  analysis_types?: ('face' | 'quality' | 'moderation' | 'verification' | 'all')[];
}

export interface PhotoAnalysisResult {
  photo_id: string;
  analysis_timestamp: string;
  face_analysis?: FaceAnalysisResult;
  quality_analysis?: QualityAnalysisResult;
  moderation_result?: ModerationResult;
  verification_result?: VerificationResult;
  overall_score: number; // 0-100
  recommendations: string[];
}

export interface FaceAnalysisResult {
  faces_detected: number;
  primary_face?: {
    confidence: number;
    bounding_box: { x: number; y: number; width: number; height: number };
    landmarks?: FaceLandmark[];
    attributes: FaceAttributes;
  };
  multiple_faces_warning: boolean;
  no_face_detected: boolean;
}

export interface FaceLandmark {
  type: string;
  x: number;
  y: number;
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
  quality_score: number; // 0-100
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
  type: 'low_resolution' | 'too_dark' | 'too_bright' | 'blurry' | 'grainy' | 'face_obscured' | 'bad_crop';
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
  match_score?: number; // For selfie match
  liveness_score?: number; // For liveness detection
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
  suggestions: {
    type: string;
    description: string;
    examples: string[];
  }[];
}

class PhotoAnalysisService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_CONFIG.AI_SERVICES.PHOTO_ANALYSIS;
  }

  /**
   * Comprehensive photo analysis
   */
  async analyzePhoto(request: PhotoAnalysisRequest): Promise<ApiResponse<PhotoAnalysisResult>> {
    return httpClient.post<PhotoAnalysisResult>(
      `${this.baseUrl}/analyze`,
      request,
      { timeout: API_CONFIG.TIMEOUTS.AI_ANALYSIS }
    );
  }

  /**
   * Upload and analyze a photo file
   */
  async uploadAndAnalyze(
    userId: string,
    file: { uri: string; type: string; name: string },
    analysisTypes?: PhotoAnalysisRequest['analysis_types']
  ): Promise<ApiResponse<PhotoAnalysisResult>> {
    return httpClient.uploadFile<PhotoAnalysisResult>(
      `${this.baseUrl}/upload-analyze`,
      file,
      { user_id: userId, analysis_types: analysisTypes },
      { timeout: API_CONFIG.TIMEOUTS.UPLOAD }
    );
  }

  /**
   * Moderate a photo for content policy compliance
   */
  async moderatePhoto(photoUrl: string): Promise<ApiResponse<ModerationResult>> {
    return httpClient.post<ModerationResult>(
      `${this.baseUrl}/moderate`,
      { photo_url: photoUrl }
    );
  }

  /**
   * Verify user identity with selfie
   */
  async verifySelfie(
    userId: string,
    selfieFile: { uri: string; type: string; name: string },
    referencePhotoUrl: string
  ): Promise<ApiResponse<VerificationResult>> {
    return httpClient.uploadFile<VerificationResult>(
      `${this.baseUrl}/verify/selfie`,
      selfieFile,
      { user_id: userId, reference_photo_url: referencePhotoUrl },
      { timeout: API_CONFIG.TIMEOUTS.UPLOAD }
    );
  }

  /**
   * Perform liveness detection
   */
  async checkLiveness(
    userId: string,
    videoFile: { uri: string; type: string; name: string }
  ): Promise<ApiResponse<{
    is_live: boolean;
    confidence: number;
    checks_passed: string[];
    checks_failed: string[];
  }>> {
    return httpClient.uploadFile(
      `${this.baseUrl}/verify/liveness`,
      videoFile,
      { user_id: userId },
      { timeout: API_CONFIG.TIMEOUTS.UPLOAD }
    );
  }

  /**
   * Rank user's photos by quality and appeal
   */
  async rankPhotos(
    userId: string,
    photoUrls: string[]
  ): Promise<ApiResponse<PhotoRankingResult>> {
    return httpClient.post<PhotoRankingResult>(
      `${this.baseUrl}/rank`,
      { user_id: userId, photo_urls: photoUrls }
    );
  }

  /**
   * Compare two photos to check if same person
   */
  async comparePhotos(
    photo1Url: string,
    photo2Url: string
  ): Promise<ApiResponse<PhotoComparisonResult>> {
    return httpClient.post<PhotoComparisonResult>(
      `${this.baseUrl}/compare`,
      { photo1_url: photo1Url, photo2_url: photo2Url }
    );
  }

  /**
   * Get suggestions for improving profile photos
   */
  async getPhotoSuggestions(
    userId: string,
    currentPhotoUrls: string[]
  ): Promise<ApiResponse<ProfilePhotoSuggestions>> {
    return httpClient.post<ProfilePhotoSuggestions>(
      `${this.baseUrl}/suggestions`,
      { user_id: userId, photo_urls: currentPhotoUrls }
    );
  }

  /**
   * Detect if photo is AI-generated or fake
   */
  async detectFakePhoto(photoUrl: string): Promise<ApiResponse<{
    is_fake: boolean;
    confidence: number;
    detection_type: 'ai_generated' | 'manipulated' | 'stock_photo' | 'genuine';
    indicators: string[];
  }>> {
    return httpClient.post(
      `${this.baseUrl}/detect-fake`,
      { photo_url: photoUrl }
    );
  }

  /**
   * Extract face embedding for matching
   */
  async extractFaceEmbedding(
    photoUrl: string
  ): Promise<ApiResponse<{
    embedding: number[];
    face_detected: boolean;
    quality_sufficient: boolean;
  }>> {
    return httpClient.post(
      `${this.baseUrl}/embedding`,
      { photo_url: photoUrl }
    );
  }

  /**
   * Check photo against blocklist (revenge porn, stolen images)
   */
  async checkBlocklist(photoUrl: string): Promise<ApiResponse<{
    is_blocked: boolean;
    reason?: string;
    action: 'allow' | 'block' | 'review';
  }>> {
    return httpClient.post(
      `${this.baseUrl}/blocklist/check`,
      { photo_url: photoUrl }
    );
  }

  /**
   * Auto-crop and enhance photo
   */
  async enhancePhoto(
    photoUrl: string,
    options?: {
      auto_crop?: boolean;
      brightness_adjust?: boolean;
      face_center?: boolean;
    }
  ): Promise<ApiResponse<{
    enhanced_url: string;
    changes_made: string[];
  }>> {
    return httpClient.post(
      `${this.baseUrl}/enhance`,
      { photo_url: photoUrl, options }
    );
  }
}

export const photoAnalysisService = new PhotoAnalysisService();
export default PhotoAnalysisService;
