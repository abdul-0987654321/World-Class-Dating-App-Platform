/**
 * Mock Verification Provider
 * Simulates AI-powered verification services for testing
 */

import { v4 as uuidv4 } from 'uuid';

// Types
interface FaceDetectionResult {
  faceDetected: boolean;
  confidence: number;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  landmarks?: {
    leftEye: { x: number; y: number };
    rightEye: { x: number; y: number };
    nose: { x: number; y: number };
    leftMouth: { x: number; y: number };
    rightMouth: { x: number; y: number };
  };
  quality?: {
    brightness: number;
    sharpness: number;
    contrast: number;
  };
  attributes?: {
    age: number;
    gender: string;
    smile: number;
    glasses: boolean;
  };
}

interface PoseDetectionResult {
  poseDetected: boolean;
  poseType: string;
  confidence: number;
  handPosition?: {
    x: number;
    y: number;
  };
}

interface FaceComparisonResult {
  match: boolean;
  similarity: number;
  confidence: number;
}

interface LivenessCheckResult {
  isLive: boolean;
  livenessScore: number;
  spoofingDetected: boolean;
  spoofingType?: 'photo' | 'video' | 'mask' | 'none';
}

interface IdVerificationResult {
  valid: boolean;
  documentType: string;
  confidence: number;
  extractedData?: {
    firstName?: string;
    lastName?: string;
    dateOfBirth?: string;
    documentNumber?: string;
    expirationDate?: string;
    issuingCountry?: string;
  };
  checks: {
    documentAuthenticity: boolean;
    facesMatch: boolean;
    notExpired: boolean;
    mrzValid?: boolean;
  };
}

// Test constants
export const TEST_IMAGES = {
  VALID_FACE: 'valid_face_image',
  NO_FACE: 'no_face_image',
  MULTIPLE_FACES: 'multiple_faces_image',
  LOW_QUALITY: 'low_quality_image',
  SCREENSHOT: 'screenshot_image',
  EDITED: 'edited_image',
};

export const TEST_POSES = {
  THUMBS_UP: 'thumbs_up',
  PEACE_SIGN: 'peace_sign',
  HAND_WAVE: 'hand_wave',
  POINT_UP: 'point_up',
};

// Mock verification results storage
const mockVerificationResults: Map<string, any> = new Map();

/**
 * Mock Verification Provider
 */
export const mockVerificationProvider = {
  /**
   * Detect faces in an image
   */
  detectFaces: jest.fn(async (imageData: Buffer | string): Promise<FaceDetectionResult> => {
    const imageId = typeof imageData === 'string' ? imageData : 'buffer_image';

    // Simulate different scenarios based on test image
    if (imageId === TEST_IMAGES.NO_FACE) {
      return {
        faceDetected: false,
        confidence: 0,
      };
    }

    if (imageId === TEST_IMAGES.MULTIPLE_FACES) {
      return {
        faceDetected: true,
        confidence: 0.95,
        // In real scenario, would return multiple faces
        boundingBox: { x: 100, y: 100, width: 200, height: 200 },
      };
    }

    if (imageId === TEST_IMAGES.LOW_QUALITY) {
      return {
        faceDetected: true,
        confidence: 0.45,
        quality: {
          brightness: 0.3,
          sharpness: 0.2,
          contrast: 0.4,
        },
      };
    }

    // Default: valid face detection
    return {
      faceDetected: true,
      confidence: 0.98,
      boundingBox: {
        x: 150,
        y: 100,
        width: 250,
        height: 300,
      },
      landmarks: {
        leftEye: { x: 200, y: 180 },
        rightEye: { x: 300, y: 180 },
        nose: { x: 250, y: 250 },
        leftMouth: { x: 210, y: 320 },
        rightMouth: { x: 290, y: 320 },
      },
      quality: {
        brightness: 0.8,
        sharpness: 0.9,
        contrast: 0.85,
      },
      attributes: {
        age: 28,
        gender: 'male',
        smile: 0.7,
        glasses: false,
      },
    };
  }),

  /**
   * Detect pose in verification selfie
   */
  detectPose: jest.fn(async (imageData: Buffer | string, expectedPose: string): Promise<PoseDetectionResult> => {
    const imageId = typeof imageData === 'string' ? imageData : 'buffer_image';

    // Check if pose matches expected
    const detectedPose = mockVerificationResults.get(`pose_${imageId}`) || expectedPose;

    if (detectedPose !== expectedPose) {
      return {
        poseDetected: true,
        poseType: detectedPose,
        confidence: 0.85,
      };
    }

    return {
      poseDetected: true,
      poseType: expectedPose,
      confidence: 0.92,
      handPosition: {
        x: 400,
        y: 300,
      },
    };
  }),

  /**
   * Compare two faces for similarity
   */
  compareFaces: jest.fn(async (
    sourceImage: Buffer | string,
    targetImage: Buffer | string
  ): Promise<FaceComparisonResult> => {
    const sourceId = typeof sourceImage === 'string' ? sourceImage : 'source_buffer';
    const targetId = typeof targetImage === 'string' ? targetImage : 'target_buffer';

    // Check for pre-set comparison results
    const resultKey = `compare_${sourceId}_${targetId}`;
    const presetResult = mockVerificationResults.get(resultKey);

    if (presetResult) {
      return presetResult;
    }

    // Default: successful match
    return {
      match: true,
      similarity: 0.94,
      confidence: 0.97,
    };
  }),

  /**
   * Perform liveness detection
   */
  checkLiveness: jest.fn(async (imageData: Buffer | string): Promise<LivenessCheckResult> => {
    const imageId = typeof imageData === 'string' ? imageData : 'buffer_image';

    if (imageId === TEST_IMAGES.SCREENSHOT) {
      return {
        isLive: false,
        livenessScore: 0.15,
        spoofingDetected: true,
        spoofingType: 'photo',
      };
    }

    if (imageId === TEST_IMAGES.EDITED) {
      return {
        isLive: false,
        livenessScore: 0.25,
        spoofingDetected: true,
        spoofingType: 'photo',
      };
    }

    return {
      isLive: true,
      livenessScore: 0.95,
      spoofingDetected: false,
      spoofingType: 'none',
    };
  }),

  /**
   * Verify government-issued ID
   */
  verifyId: jest.fn(async (
    idImage: Buffer | string,
    selfieImage: Buffer | string,
    idType: string = 'passport'
  ): Promise<IdVerificationResult> => {
    // Default: successful verification
    return {
      valid: true,
      documentType: idType,
      confidence: 0.95,
      extractedData: {
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '1995-01-15',
        documentNumber: 'AB1234567',
        expirationDate: '2030-01-15',
        issuingCountry: 'USA',
      },
      checks: {
        documentAuthenticity: true,
        facesMatch: true,
        notExpired: true,
        mrzValid: true,
      },
    };
  }),

  /**
   * Extract text from ID document
   */
  extractIdData: jest.fn(async (idImage: Buffer | string): Promise<Record<string, string>> => {
    return {
      firstName: 'John',
      lastName: 'Doe',
      dateOfBirth: '1995-01-15',
      documentNumber: 'AB1234567',
      expirationDate: '2030-01-15',
      address: '123 Main St, New York, NY 10001',
      issuingAuthority: 'Department of Motor Vehicles',
    };
  }),

  /**
   * Check image for manipulation/editing
   */
  detectImageManipulation: jest.fn(async (imageData: Buffer | string): Promise<{
    manipulated: boolean;
    manipulationScore: number;
    detectedModifications: string[];
  }> => {
    const imageId = typeof imageData === 'string' ? imageData : 'buffer_image';

    if (imageId === TEST_IMAGES.EDITED) {
      return {
        manipulated: true,
        manipulationScore: 0.85,
        detectedModifications: ['face_morphing', 'color_adjustment', 'blur_applied'],
      };
    }

    return {
      manipulated: false,
      manipulationScore: 0.05,
      detectedModifications: [],
    };
  }),

  /**
   * Perform background check (mock)
   */
  performBackgroundCheck: jest.fn(async (userData: {
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    ssn?: string;
  }): Promise<{
    status: 'clear' | 'review' | 'flagged';
    checks: {
      criminalRecord: boolean;
      sexOffenderRegistry: boolean;
      identityVerified: boolean;
    };
    reportId: string;
  }> => {
    return {
      status: 'clear',
      checks: {
        criminalRecord: false,
        sexOffenderRegistry: false,
        identityVerified: true,
      },
      reportId: `BGC_${uuidv4()}`,
    };
  }),
};

// Utility functions
export function resetMockVerificationProvider() {
  mockVerificationResults.clear();
  jest.clearAllMocks();
}

export function setFaceDetectionResult(imageId: string, result: Partial<FaceDetectionResult>) {
  const fullResult: FaceDetectionResult = {
    faceDetected: true,
    confidence: 0.95,
    ...result,
  };
  mockVerificationResults.set(`face_${imageId}`, fullResult);

  mockVerificationProvider.detectFaces.mockImplementationOnce(async () => fullResult);
}

export function setPoseDetectionResult(imageId: string, pose: string) {
  mockVerificationResults.set(`pose_${imageId}`, pose);
}

export function setFaceComparisonResult(sourceId: string, targetId: string, result: Partial<FaceComparisonResult>) {
  const fullResult: FaceComparisonResult = {
    match: true,
    similarity: 0.9,
    confidence: 0.95,
    ...result,
  };
  mockVerificationResults.set(`compare_${sourceId}_${targetId}`, fullResult);
}

export function setLivenessResult(imageId: string, isLive: boolean) {
  const result: LivenessCheckResult = {
    isLive,
    livenessScore: isLive ? 0.95 : 0.15,
    spoofingDetected: !isLive,
    spoofingType: isLive ? 'none' : 'photo',
  };
  mockVerificationResults.set(`liveness_${imageId}`, result);

  mockVerificationProvider.checkLiveness.mockImplementationOnce(async () => result);
}

export function setIdVerificationResult(valid: boolean, extractedData?: Record<string, string>) {
  const result: IdVerificationResult = {
    valid,
    documentType: 'passport',
    confidence: valid ? 0.95 : 0.3,
    extractedData: extractedData || {
      firstName: 'John',
      lastName: 'Doe',
      dateOfBirth: '1995-01-15',
    },
    checks: {
      documentAuthenticity: valid,
      facesMatch: valid,
      notExpired: valid,
      mrzValid: valid,
    },
  };

  mockVerificationProvider.verifyId.mockImplementationOnce(async () => result);
}

// Export mock errors
export class VerificationError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'VerificationError';
  }
}

export const VERIFICATION_ERRORS = {
  NO_FACE: new VerificationError('No face detected in image', 'NO_FACE_DETECTED', 400),
  MULTIPLE_FACES: new VerificationError('Multiple faces detected', 'MULTIPLE_FACES', 400),
  LOW_QUALITY: new VerificationError('Image quality too low', 'LOW_QUALITY', 400),
  SPOOFING_DETECTED: new VerificationError('Potential spoofing detected', 'SPOOFING_DETECTED', 400),
  POSE_MISMATCH: new VerificationError('Pose does not match required pose', 'POSE_MISMATCH', 400),
  FACE_MISMATCH: new VerificationError('Face does not match profile photos', 'FACE_MISMATCH', 400),
  EXPIRED_DOCUMENT: new VerificationError('Document has expired', 'EXPIRED_DOCUMENT', 400),
  INVALID_DOCUMENT: new VerificationError('Document could not be verified', 'INVALID_DOCUMENT', 400),
};

export default mockVerificationProvider;
