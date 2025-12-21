/**
 * Unit Tests for Photo Verification Service
 */

describe('PhotoVerificationService', () => {
  let verificationService: any;
  let mockDb: any;
  let mockStorage: any;
  let mockAiService: any;
  let mockRedis: any;

  beforeEach(() => {
    // Mock database
    mockDb = {
      query: jest.fn(),
    };

    // Mock storage service
    mockStorage = {
      uploadFile: jest.fn(),
      getSignedUrl: jest.fn(),
      deleteFile: jest.fn(),
    };

    // Mock AI service for face comparison
    mockAiService = {
      compareFaces: jest.fn(),
      detectFaces: jest.fn(),
      detectPose: jest.fn(),
    };

    // Mock Redis
    mockRedis = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };

    // Create verification service instance
    verificationService = {
      initiateVerification: jest.fn(),
      submitVerificationPhoto: jest.fn(),
      processVerification: jest.fn(),
      getVerificationStatus: jest.fn(),
      approveVerification: jest.fn(),
      rejectVerification: jest.fn(),
    };
  });

  describe('initiateVerification', () => {
    it('should create a new verification request', async () => {
      const userId = 'user-123';
      const poseType = 'thumbs_up';

      mockDb.query.mockResolvedValue({
        rows: [{ id: 'verification-123', user_id: userId, pose_type: poseType, status: 'pending' }],
      });

      verificationService.initiateVerification.mockResolvedValue({
        id: 'verification-123',
        userId,
        poseType,
        status: 'pending',
        createdAt: new Date(),
      });

      const result = await verificationService.initiateVerification(userId, poseType);

      expect(result).toBeDefined();
      expect(result.id).toBe('verification-123');
      expect(result.status).toBe('pending');
    });

    it('should prevent duplicate pending verifications', async () => {
      const userId = 'user-123';

      mockDb.query.mockResolvedValue({
        rows: [{ id: 'existing-verification', status: 'pending' }],
      });

      verificationService.initiateVerification.mockRejectedValue(
        new Error('Verification already in progress')
      );

      await expect(
        verificationService.initiateVerification(userId, 'thumbs_up')
      ).rejects.toThrow('Verification already in progress');
    });

    it('should assign random pose type', async () => {
      const userId = 'user-123';

      const poseTypes = ['thumbs_up', 'peace_sign', 'hand_wave', 'point_up'];

      verificationService.initiateVerification.mockImplementation(async (uid: string) => {
        const randomPose = poseTypes[Math.floor(Math.random() * poseTypes.length)];
        return {
          id: 'verification-123',
          userId: uid,
          poseType: randomPose,
          status: 'pending',
        };
      });

      const result = await verificationService.initiateVerification(userId);

      expect(poseTypes).toContain(result.poseType);
    });
  });

  describe('submitVerificationPhoto', () => {
    it('should accept valid verification photo', async () => {
      const verificationId = 'verification-123';
      const photoBuffer = Buffer.from('fake-image-data');

      mockAiService.detectFaces.mockResolvedValue({
        faceDetected: true,
        confidence: 0.95,
        boundingBox: { x: 100, y: 100, width: 200, height: 200 },
      });

      mockAiService.detectPose.mockResolvedValue({
        poseDetected: true,
        poseType: 'thumbs_up',
        confidence: 0.88,
      });

      mockStorage.uploadFile.mockResolvedValue({
        key: 'verifications/verification-123.jpg',
        url: 'https://storage.example.com/verifications/verification-123.jpg',
      });

      verificationService.submitVerificationPhoto.mockResolvedValue({
        id: verificationId,
        photoUrl: 'https://storage.example.com/verifications/verification-123.jpg',
        status: 'processing',
        faceDetected: true,
        poseMatched: true,
      });

      const result = await verificationService.submitVerificationPhoto(verificationId, photoBuffer);

      expect(result.status).toBe('processing');
      expect(result.faceDetected).toBe(true);
      expect(result.poseMatched).toBe(true);
    });

    it('should reject photo without face', async () => {
      const verificationId = 'verification-123';
      const photoBuffer = Buffer.from('no-face-image');

      mockAiService.detectFaces.mockResolvedValue({
        faceDetected: false,
        confidence: 0,
      });

      verificationService.submitVerificationPhoto.mockRejectedValue(
        new Error('No face detected in photo')
      );

      await expect(
        verificationService.submitVerificationPhoto(verificationId, photoBuffer)
      ).rejects.toThrow('No face detected');
    });

    it('should reject photo with wrong pose', async () => {
      const verificationId = 'verification-123';
      const photoBuffer = Buffer.from('wrong-pose-image');

      mockAiService.detectFaces.mockResolvedValue({
        faceDetected: true,
        confidence: 0.95,
      });

      mockAiService.detectPose.mockResolvedValue({
        poseDetected: true,
        poseType: 'peace_sign', // Wrong pose
        confidence: 0.85,
      });

      verificationService.submitVerificationPhoto.mockRejectedValue(
        new Error('Pose does not match required pose')
      );

      await expect(
        verificationService.submitVerificationPhoto(verificationId, photoBuffer)
      ).rejects.toThrow('Pose does not match');
    });

    it('should handle low quality photos', async () => {
      const verificationId = 'verification-123';
      const photoBuffer = Buffer.from('low-quality-image');

      mockAiService.detectFaces.mockResolvedValue({
        faceDetected: true,
        confidence: 0.45, // Below threshold
        quality: 'low',
      });

      verificationService.submitVerificationPhoto.mockRejectedValue(
        new Error('Photo quality too low')
      );

      await expect(
        verificationService.submitVerificationPhoto(verificationId, photoBuffer)
      ).rejects.toThrow('quality too low');
    });
  });

  describe('processVerification', () => {
    it('should compare faces between verification and profile photos', async () => {
      const verificationId = 'verification-123';
      const userId = 'user-123';

      const profilePhotos = [
        'https://storage.example.com/profiles/user-123-1.jpg',
        'https://storage.example.com/profiles/user-123-2.jpg',
      ];

      const verificationPhoto = 'https://storage.example.com/verifications/verification-123.jpg';

      mockAiService.compareFaces.mockResolvedValue({
        match: true,
        similarity: 0.92,
        confidence: 0.95,
      });

      verificationService.processVerification.mockResolvedValue({
        id: verificationId,
        userId,
        status: 'verified',
        faceMatch: true,
        similarity: 0.92,
        verifiedAt: new Date(),
      });

      const result = await verificationService.processVerification(verificationId);

      expect(result.status).toBe('verified');
      expect(result.faceMatch).toBe(true);
      expect(result.similarity).toBeGreaterThan(0.8);
    });

    it('should fail verification for non-matching faces', async () => {
      const verificationId = 'verification-123';

      mockAiService.compareFaces.mockResolvedValue({
        match: false,
        similarity: 0.35,
        confidence: 0.9,
      });

      verificationService.processVerification.mockResolvedValue({
        id: verificationId,
        status: 'failed',
        faceMatch: false,
        similarity: 0.35,
        failureReason: 'Face does not match profile photos',
      });

      const result = await verificationService.processVerification(verificationId);

      expect(result.status).toBe('failed');
      expect(result.faceMatch).toBe(false);
      expect(result.failureReason).toContain('does not match');
    });

    it('should handle edge case: no profile photos', async () => {
      const verificationId = 'verification-123';
      const userId = 'user-123';

      mockDb.query.mockResolvedValue({ rows: [] }); // No profile photos

      verificationService.processVerification.mockRejectedValue(
        new Error('User has no profile photos for comparison')
      );

      await expect(
        verificationService.processVerification(verificationId)
      ).rejects.toThrow('no profile photos');
    });
  });

  describe('getVerificationStatus', () => {
    it('should return current verification status', async () => {
      const userId = 'user-123';

      verificationService.getVerificationStatus.mockResolvedValue({
        isVerified: true,
        verificationDate: new Date('2024-01-15'),
        badgeType: 'photo_verified',
      });

      const result = await verificationService.getVerificationStatus(userId);

      expect(result.isVerified).toBe(true);
      expect(result.badgeType).toBe('photo_verified');
    });

    it('should return unverified status', async () => {
      const userId = 'user-123';

      verificationService.getVerificationStatus.mockResolvedValue({
        isVerified: false,
        pendingVerification: null,
      });

      const result = await verificationService.getVerificationStatus(userId);

      expect(result.isVerified).toBe(false);
    });

    it('should include pending verification info', async () => {
      const userId = 'user-123';

      verificationService.getVerificationStatus.mockResolvedValue({
        isVerified: false,
        pendingVerification: {
          id: 'verification-123',
          status: 'processing',
          createdAt: new Date(),
        },
      });

      const result = await verificationService.getVerificationStatus(userId);

      expect(result.isVerified).toBe(false);
      expect(result.pendingVerification).toBeDefined();
      expect(result.pendingVerification.status).toBe('processing');
    });
  });

  describe('approveVerification', () => {
    it('should manually approve verification', async () => {
      const verificationId = 'verification-123';
      const adminId = 'admin-456';

      verificationService.approveVerification.mockResolvedValue({
        id: verificationId,
        status: 'verified',
        approvedBy: adminId,
        approvedAt: new Date(),
        isManualReview: true,
      });

      const result = await verificationService.approveVerification(verificationId, adminId);

      expect(result.status).toBe('verified');
      expect(result.approvedBy).toBe(adminId);
      expect(result.isManualReview).toBe(true);
    });

    it('should update user verification badge', async () => {
      const verificationId = 'verification-123';
      const adminId = 'admin-456';

      verificationService.approveVerification.mockResolvedValue({
        id: verificationId,
        status: 'verified',
        userUpdated: true,
      });

      const result = await verificationService.approveVerification(verificationId, adminId);

      expect(result.status).toBe('verified');
    });
  });

  describe('rejectVerification', () => {
    it('should reject verification with reason', async () => {
      const verificationId = 'verification-123';
      const adminId = 'admin-456';
      const reason = 'Photo appears to be of a different person';

      verificationService.rejectVerification.mockResolvedValue({
        id: verificationId,
        status: 'rejected',
        rejectedBy: adminId,
        rejectionReason: reason,
        rejectedAt: new Date(),
      });

      const result = await verificationService.rejectVerification(verificationId, adminId, reason);

      expect(result.status).toBe('rejected');
      expect(result.rejectionReason).toBe(reason);
    });

    it('should allow retry after rejection', async () => {
      const verificationId = 'verification-123';
      const userId = 'user-123';

      verificationService.rejectVerification.mockResolvedValue({
        id: verificationId,
        status: 'rejected',
        canRetry: true,
        retryAfter: new Date(Date.now() + 86400000), // 24 hours
      });

      const result = await verificationService.rejectVerification(verificationId, 'admin-456', 'Unclear photo');

      expect(result.canRetry).toBe(true);
      expect(result.retryAfter).toBeDefined();
    });
  });

  describe('Verification Expiry', () => {
    it('should check if verification has expired', async () => {
      const userId = 'user-123';
      const verifiedDate = new Date();
      verifiedDate.setFullYear(verifiedDate.getFullYear() - 2); // 2 years ago

      verificationService.getVerificationStatus.mockResolvedValue({
        isVerified: false,
        expired: true,
        previousVerificationDate: verifiedDate,
        expirationMessage: 'Verification expired. Please verify again.',
      });

      const result = await verificationService.getVerificationStatus(userId);

      expect(result.isVerified).toBe(false);
      expect(result.expired).toBe(true);
    });

    it('should not expire recent verifications', async () => {
      const userId = 'user-123';
      const verifiedDate = new Date();
      verifiedDate.setMonth(verifiedDate.getMonth() - 6); // 6 months ago

      verificationService.getVerificationStatus.mockResolvedValue({
        isVerified: true,
        expired: false,
        verificationDate: verifiedDate,
      });

      const result = await verificationService.getVerificationStatus(userId);

      expect(result.isVerified).toBe(true);
      expect(result.expired).toBe(false);
    });
  });

  describe('Fraud Detection', () => {
    it('should detect potential spoofing attempt', async () => {
      const verificationId = 'verification-123';
      const photoBuffer = Buffer.from('screenshot-of-photo');

      mockAiService.detectFaces.mockResolvedValue({
        faceDetected: true,
        livenessScore: 0.2, // Low liveness score
        potentialSpoofing: true,
      });

      verificationService.submitVerificationPhoto.mockRejectedValue(
        new Error('Photo appears to be a screenshot or photo of a photo')
      );

      await expect(
        verificationService.submitVerificationPhoto(verificationId, photoBuffer)
      ).rejects.toThrow('screenshot or photo of a photo');
    });

    it('should detect edited photos', async () => {
      const verificationId = 'verification-123';
      const photoBuffer = Buffer.from('heavily-edited-photo');

      mockAiService.detectFaces.mockResolvedValue({
        faceDetected: true,
        editingDetected: true,
        editingScore: 0.85,
      });

      verificationService.submitVerificationPhoto.mockRejectedValue(
        new Error('Photo appears to be digitally altered')
      );

      await expect(
        verificationService.submitVerificationPhoto(verificationId, photoBuffer)
      ).rejects.toThrow('digitally altered');
    });
  });
});
