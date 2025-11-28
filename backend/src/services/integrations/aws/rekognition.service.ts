/**
 * AWS Rekognition Service
 * AI-powered image content moderation and analysis
 */

import { logger } from '../../../utils/logger';

// Types matching AWS Rekognition API
export interface ModerationLabel {
  name: string;
  confidence: number;
  parentName?: string;
}

export interface FaceDetail {
  boundingBox: {
    width: number;
    height: number;
    left: number;
    top: number;
  };
  confidence: number;
  ageRange?: { low: number; high: number };
  smile?: { value: boolean; confidence: number };
  eyeglasses?: { value: boolean; confidence: number };
  sunglasses?: { value: boolean; confidence: number };
  gender?: { value: 'Male' | 'Female'; confidence: number };
  beard?: { value: boolean; confidence: number };
  mustache?: { value: boolean; confidence: number };
  emotions?: Array<{ type: string; confidence: number }>;
  quality?: { brightness: number; sharpness: number };
}

export interface ImageModerationResult {
  isAppropriate: boolean;
  confidence: number;
  moderationLabels: ModerationLabel[];
  suggestedAction: 'approve' | 'review' | 'reject';
  categories: {
    explicitNudity: number;
    suggestive: number;
    violence: number;
    visually_disturbing: number;
    hate_symbols: number;
    drugs: number;
    tobacco: number;
    alcohol: number;
    gambling: number;
    rude_gestures: number;
  };
}

export interface FaceAnalysisResult {
  faceCount: number;
  faces: FaceDetail[];
  primaryFace?: FaceDetail;
  isProfilePhotoSuitable: boolean;
  qualityScore: number;
  issues: string[];
}

export interface FaceComparisonResult {
  similarity: number;
  isMatch: boolean;
  confidence: number;
  sourceFace: FaceDetail;
  targetFace: FaceDetail;
}

// Moderation thresholds
const MODERATION_THRESHOLDS = {
  autoReject: 80,    // Auto-reject if confidence >= 80%
  manualReview: 50,  // Queue for manual review if confidence >= 50%
  autoApprove: 30,   // Auto-approve if confidence < 30%
};

// Categories that trigger immediate rejection
const HIGH_SEVERITY_CATEGORIES = [
  'Explicit Nudity',
  'Graphic Violence',
  'Child Exploitation',
  'Hate Symbols',
];

class RekognitionService {
  private client: any = null;
  private isInitialized = false;

  /**
   * Initialize with AWS credentials
   */
  async initialize(config?: {
    accessKeyId?: string;
    secretAccessKey?: string;
    region?: string;
  }): Promise<void> {
    try {
      // In production, use AWS SDK
      // const { RekognitionClient } = require('@aws-sdk/client-rekognition');
      // this.client = new RekognitionClient({
      //   region: config?.region || process.env.AWS_REGION || 'us-east-1',
      //   credentials: {
      //     accessKeyId: config?.accessKeyId || process.env.AWS_ACCESS_KEY_ID!,
      //     secretAccessKey: config?.secretAccessKey || process.env.AWS_SECRET_ACCESS_KEY!,
      //   },
      // });

      this.isInitialized = true;
      logger.info('AWS Rekognition service initialized');
    } catch (error) {
      logger.error('Failed to initialize Rekognition service:', error);
      throw error;
    }
  }

  /**
   * Moderate image content for inappropriate material
   */
  async moderateImage(
    imageData: Buffer | { bucket: string; key: string }
  ): Promise<ImageModerationResult> {
    try {
      // In production, use AWS Rekognition DetectModerationLabels
      // const command = new DetectModerationLabelsCommand({
      //   Image: Buffer.isBuffer(imageData)
      //     ? { Bytes: imageData }
      //     : { S3Object: { Bucket: imageData.bucket, Name: imageData.key } },
      //   MinConfidence: 50,
      // });
      // const response = await this.client.send(command);

      // Simulated response for development
      const simulatedLabels = this.simulateModerationLabels();

      // Process labels and categorize
      const categories = this.categorizeLabels(simulatedLabels);
      const maxConfidence = Math.max(...Object.values(categories), 0);

      // Determine action based on thresholds
      let suggestedAction: 'approve' | 'review' | 'reject' = 'approve';
      let isAppropriate = true;

      // Check for high-severity content
      const highSeverityLabels = simulatedLabels.filter(
        label => HIGH_SEVERITY_CATEGORIES.includes(label.name) && label.confidence >= 70
      );

      if (highSeverityLabels.length > 0 || maxConfidence >= MODERATION_THRESHOLDS.autoReject) {
        suggestedAction = 'reject';
        isAppropriate = false;
      } else if (maxConfidence >= MODERATION_THRESHOLDS.manualReview) {
        suggestedAction = 'review';
        isAppropriate = true; // May be appropriate, needs review
      }

      return {
        isAppropriate,
        confidence: 100 - maxConfidence,
        moderationLabels: simulatedLabels,
        suggestedAction,
        categories,
      };
    } catch (error) {
      logger.error('Error moderating image:', error);
      // Default to manual review on error
      return {
        isAppropriate: true,
        confidence: 0,
        moderationLabels: [],
        suggestedAction: 'review',
        categories: this.getEmptyCategories(),
      };
    }
  }

  /**
   * Analyze faces in an image
   */
  async analyzeFaces(
    imageData: Buffer | { bucket: string; key: string }
  ): Promise<FaceAnalysisResult> {
    try {
      // In production, use AWS Rekognition DetectFaces
      // const command = new DetectFacesCommand({
      //   Image: Buffer.isBuffer(imageData)
      //     ? { Bytes: imageData }
      //     : { S3Object: { Bucket: imageData.bucket, Name: imageData.key } },
      //   Attributes: ['ALL'],
      // });
      // const response = await this.client.send(command);

      // Simulated response
      const simulatedFaces = this.simulateFaceDetection();
      const issues: string[] = [];

      // Analyze suitability for profile photo
      let isProfilePhotoSuitable = true;
      let qualityScore = 100;

      if (simulatedFaces.length === 0) {
        isProfilePhotoSuitable = false;
        issues.push('No face detected in the image');
        qualityScore = 0;
      } else if (simulatedFaces.length > 1) {
        issues.push('Multiple faces detected - consider using a solo photo');
        qualityScore -= 20;
      }

      const primaryFace = simulatedFaces[0];

      if (primaryFace) {
        // Check face size (should be at least 10% of image)
        if (primaryFace.boundingBox.width < 0.1 || primaryFace.boundingBox.height < 0.1) {
          issues.push('Face is too small in the image');
          qualityScore -= 30;
          isProfilePhotoSuitable = false;
        }

        // Check face position (should be relatively centered)
        const centerX = primaryFace.boundingBox.left + primaryFace.boundingBox.width / 2;
        if (centerX < 0.2 || centerX > 0.8) {
          issues.push('Face is not well-centered');
          qualityScore -= 10;
        }

        // Check image quality
        if (primaryFace.quality) {
          if (primaryFace.quality.brightness < 40) {
            issues.push('Image is too dark');
            qualityScore -= 15;
          }
          if (primaryFace.quality.sharpness < 50) {
            issues.push('Image is blurry');
            qualityScore -= 15;
          }
        }

        // Check for sunglasses (not ideal for profile)
        if (primaryFace.sunglasses?.value && primaryFace.sunglasses.confidence > 70) {
          issues.push('Sunglasses detected - showing your eyes is better');
          qualityScore -= 10;
        }
      }

      return {
        faceCount: simulatedFaces.length,
        faces: simulatedFaces,
        primaryFace,
        isProfilePhotoSuitable: isProfilePhotoSuitable && qualityScore > 50,
        qualityScore: Math.max(0, qualityScore),
        issues,
      };
    } catch (error) {
      logger.error('Error analyzing faces:', error);
      return {
        faceCount: 0,
        faces: [],
        isProfilePhotoSuitable: false,
        qualityScore: 0,
        issues: ['Error analyzing image'],
      };
    }
  }

  /**
   * Compare two faces for similarity (used for verification)
   */
  async compareFaces(
    sourceImage: Buffer | { bucket: string; key: string },
    targetImage: Buffer | { bucket: string; key: string },
    similarityThreshold: number = 80
  ): Promise<FaceComparisonResult> {
    try {
      // In production, use AWS Rekognition CompareFaces
      // const command = new CompareFacesCommand({
      //   SourceImage: Buffer.isBuffer(sourceImage)
      //     ? { Bytes: sourceImage }
      //     : { S3Object: { Bucket: sourceImage.bucket, Name: sourceImage.key } },
      //   TargetImage: Buffer.isBuffer(targetImage)
      //     ? { Bytes: targetImage }
      //     : { S3Object: { Bucket: targetImage.bucket, Name: targetImage.key } },
      //   SimilarityThreshold: similarityThreshold,
      // });
      // const response = await this.client.send(command);

      // Simulated response
      const similarity = 85 + Math.random() * 15; // 85-100% for demo
      const confidence = 90 + Math.random() * 10;

      return {
        similarity,
        isMatch: similarity >= similarityThreshold,
        confidence,
        sourceFace: this.simulateFaceDetection()[0],
        targetFace: this.simulateFaceDetection()[0],
      };
    } catch (error) {
      logger.error('Error comparing faces:', error);
      throw error;
    }
  }

  /**
   * Detect text in image (for extracting ID information)
   */
  async detectText(
    imageData: Buffer | { bucket: string; key: string }
  ): Promise<Array<{ text: string; confidence: number; type: 'LINE' | 'WORD' }>> {
    try {
      // In production, use AWS Rekognition DetectText
      // Simulated response
      return [];
    } catch (error) {
      logger.error('Error detecting text:', error);
      return [];
    }
  }

  /**
   * Batch moderate multiple images
   */
  async moderateImages(
    images: Array<Buffer | { bucket: string; key: string }>
  ): Promise<ImageModerationResult[]> {
    const results = await Promise.all(
      images.map(image => this.moderateImage(image))
    );
    return results;
  }

  /**
   * Categorize moderation labels into groups
   */
  private categorizeLabels(labels: ModerationLabel[]): ImageModerationResult['categories'] {
    const categories = this.getEmptyCategories();

    for (const label of labels) {
      const name = label.name.toLowerCase();
      const parentName = label.parentName?.toLowerCase() || '';

      if (name.includes('nudity') || parentName.includes('nudity')) {
        categories.explicitNudity = Math.max(categories.explicitNudity, label.confidence);
      }
      if (name.includes('suggestive') || parentName.includes('suggestive')) {
        categories.suggestive = Math.max(categories.suggestive, label.confidence);
      }
      if (name.includes('violence') || parentName.includes('violence')) {
        categories.violence = Math.max(categories.violence, label.confidence);
      }
      if (name.includes('disturbing') || parentName.includes('disturbing')) {
        categories.visually_disturbing = Math.max(categories.visually_disturbing, label.confidence);
      }
      if (name.includes('hate') || parentName.includes('hate')) {
        categories.hate_symbols = Math.max(categories.hate_symbols, label.confidence);
      }
      if (name.includes('drug') || parentName.includes('drug')) {
        categories.drugs = Math.max(categories.drugs, label.confidence);
      }
      if (name.includes('tobacco') || parentName.includes('tobacco')) {
        categories.tobacco = Math.max(categories.tobacco, label.confidence);
      }
      if (name.includes('alcohol') || parentName.includes('alcohol')) {
        categories.alcohol = Math.max(categories.alcohol, label.confidence);
      }
      if (name.includes('gambling') || parentName.includes('gambling')) {
        categories.gambling = Math.max(categories.gambling, label.confidence);
      }
      if (name.includes('gesture') || parentName.includes('gesture')) {
        categories.rude_gestures = Math.max(categories.rude_gestures, label.confidence);
      }
    }

    return categories;
  }

  /**
   * Get empty categories object
   */
  private getEmptyCategories(): ImageModerationResult['categories'] {
    return {
      explicitNudity: 0,
      suggestive: 0,
      violence: 0,
      visually_disturbing: 0,
      hate_symbols: 0,
      drugs: 0,
      tobacco: 0,
      alcohol: 0,
      gambling: 0,
      rude_gestures: 0,
    };
  }

  /**
   * Simulate moderation labels for development
   */
  private simulateModerationLabels(): ModerationLabel[] {
    // In most cases, return clean image
    if (Math.random() > 0.1) {
      return [];
    }

    // Occasionally return some low-confidence labels
    return [
      {
        name: 'Suggestive',
        confidence: Math.random() * 40, // Low confidence
        parentName: 'Suggestive',
      },
    ];
  }

  /**
   * Simulate face detection for development
   */
  private simulateFaceDetection(): FaceDetail[] {
    return [
      {
        boundingBox: {
          width: 0.3,
          height: 0.4,
          left: 0.35,
          top: 0.2,
        },
        confidence: 99.5,
        ageRange: { low: 25, high: 35 },
        smile: { value: true, confidence: 85 },
        eyeglasses: { value: false, confidence: 95 },
        sunglasses: { value: false, confidence: 98 },
        gender: { value: 'Female', confidence: 95 },
        beard: { value: false, confidence: 99 },
        mustache: { value: false, confidence: 99 },
        emotions: [
          { type: 'HAPPY', confidence: 75 },
          { type: 'CALM', confidence: 20 },
        ],
        quality: {
          brightness: 75,
          sharpness: 85,
        },
      },
    ];
  }
}

export const rekognitionService = new RekognitionService();
