/**
 * Media Enhancements Service
 * Video profiles, voice notes, and AI photo verification
 */

import { logger } from '../../utils/logger';
import { db } from '../../config/database.config';
import { v4 as uuidv4 } from 'uuid';
import { rekognitionService } from '../integrations/aws/rekognition.service';

// Types
export interface VideoProfile {
  id: string;
  userId: string;
  videoUrl: string;
  thumbnailUrl: string;
  duration: number; // in seconds
  status: MediaStatus;
  moderationResult?: ModerationResult;
  viewCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface VoiceNote {
  id: string;
  conversationId: string;
  senderId: string;
  audioUrl: string;
  duration: number; // in seconds
  waveformData?: number[];
  transcription?: string;
  status: MediaStatus;
  isPlayed: boolean;
  createdAt: Date;
}

export interface PhotoVerification {
  id: string;
  userId: string;
  selfieUrl: string;
  referencePhotoUrl: string;
  status: VerificationStatus;
  similarityScore: number;
  aiConfidence: number;
  manualReviewRequired: boolean;
  reviewedBy?: string;
  reviewedAt?: Date;
  createdAt: Date;
}

export type MediaStatus = 'processing' | 'approved' | 'rejected' | 'pending_review';
export type VerificationStatus = 'pending' | 'verified' | 'rejected' | 'expired';

export interface ModerationResult {
  isAppropriate: boolean;
  confidence: number;
  flags: string[];
  suggestedAction: 'approve' | 'review' | 'reject';
}

export interface VideoPrompt {
  id: string;
  question: string;
  category: string;
  maxDuration: number;
}

// Video prompts for profile videos
const VIDEO_PROMPTS: VideoPrompt[] = [
  { id: '1', question: 'Describe yourself in 30 seconds', category: 'introduction', maxDuration: 30 },
  { id: '2', question: 'What makes you laugh?', category: 'personality', maxDuration: 20 },
  { id: '3', question: 'What\'s your ideal weekend?', category: 'lifestyle', maxDuration: 25 },
  { id: '4', question: 'What are you passionate about?', category: 'interests', maxDuration: 30 },
  { id: '5', question: 'What\'s your go-to fun fact about yourself?', category: 'fun', maxDuration: 20 },
  { id: '6', question: 'What\'s the best trip you\'ve ever taken?', category: 'travel', maxDuration: 30 },
  { id: '7', question: 'What song is your anthem right now?', category: 'music', maxDuration: 20 },
  { id: '8', question: 'What\'s your love language?', category: 'dating', maxDuration: 25 },
];

// Configuration
const CONFIG = {
  maxVideoDuration: 60,     // seconds
  maxVoiceNoteDuration: 120, // seconds
  maxVideoSize: 100 * 1024 * 1024, // 100MB
  maxVoiceNoteSize: 10 * 1024 * 1024, // 10MB
  supportedVideoFormats: ['mp4', 'mov', 'webm'],
  supportedAudioFormats: ['mp3', 'wav', 'ogg', 'm4a', 'webm'],
  verificationSimilarityThreshold: 80,
};

class MediaEnhancementsService {
  /**
   * Upload and process video profile
   */
  async uploadVideoProfile(
    userId: string,
    videoData: {
      url: string;
      duration: number;
      thumbnailUrl?: string;
      promptId?: string;
    }
  ): Promise<{
    success: boolean;
    videoProfile?: VideoProfile;
    error?: string;
  }> {
    try {
      // Validate duration
      if (videoData.duration > CONFIG.maxVideoDuration) {
        return {
          success: false,
          error: `Video must be under ${CONFIG.maxVideoDuration} seconds`,
        };
      }

      // Check existing video count (limit 3)
      const existingCount = await db('video_profiles')
        .where('user_id', userId)
        .whereNot('status', 'rejected')
        .count('id as count')
        .first();

      if (Number(existingCount?.count || 0) >= 3) {
        return {
          success: false,
          error: 'Maximum 3 video profiles allowed',
        };
      }

      const videoProfile: VideoProfile = {
        id: uuidv4(),
        userId,
        videoUrl: videoData.url,
        thumbnailUrl: videoData.thumbnailUrl || '',
        duration: videoData.duration,
        status: 'processing',
        viewCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db('video_profiles').insert({
        id: videoProfile.id,
        user_id: videoProfile.userId,
        video_url: videoProfile.videoUrl,
        thumbnail_url: videoProfile.thumbnailUrl,
        duration: videoProfile.duration,
        status: videoProfile.status,
        prompt_id: videoData.promptId,
        view_count: 0,
        created_at: videoProfile.createdAt,
        updated_at: videoProfile.updatedAt,
      });

      // Queue for moderation (async)
      this.moderateVideoProfile(videoProfile.id).catch(err =>
        logger.error('Video moderation error:', err)
      );

      logger.info(`Video profile uploaded: ${videoProfile.id} by user ${userId}`);

      return { success: true, videoProfile };
    } catch (error) {
      logger.error('Error uploading video profile:', error);
      return { success: false, error: 'Failed to upload video' };
    }
  }

  /**
   * Get user's video profiles
   */
  async getVideoProfiles(userId: string): Promise<VideoProfile[]> {
    const videos = await db('video_profiles')
      .where('user_id', userId)
      .whereIn('status', ['approved', 'processing', 'pending_review'])
      .orderBy('created_at', 'desc');

    return videos.map(this.mapDbToVideoProfile);
  }

  /**
   * Delete video profile
   */
  async deleteVideoProfile(userId: string, videoId: string): Promise<boolean> {
    const result = await db('video_profiles')
      .where('id', videoId)
      .where('user_id', userId)
      .delete();

    return result > 0;
  }

  /**
   * Record video view
   */
  async recordVideoView(videoId: string, viewerId: string): Promise<void> {
    await db('video_profiles')
      .where('id', videoId)
      .increment('view_count', 1);

    await db('video_views').insert({
      id: uuidv4(),
      video_id: videoId,
      viewer_id: viewerId,
      created_at: new Date(),
    });
  }

  /**
   * Send voice note in conversation
   */
  async sendVoiceNote(
    conversationId: string,
    senderId: string,
    audioData: {
      url: string;
      duration: number;
      waveformData?: number[];
    }
  ): Promise<{
    success: boolean;
    voiceNote?: VoiceNote;
    error?: string;
  }> {
    try {
      // Validate duration
      if (audioData.duration > CONFIG.maxVoiceNoteDuration) {
        return {
          success: false,
          error: `Voice note must be under ${CONFIG.maxVoiceNoteDuration} seconds`,
        };
      }

      // Verify user is part of conversation
      const conversation = await db('conversations')
        .where('id', conversationId)
        .where(function() {
          this.where('user_id_1', senderId).orWhere('user_id_2', senderId);
        })
        .first();

      if (!conversation) {
        return { success: false, error: 'Conversation not found' };
      }

      const voiceNote: VoiceNote = {
        id: uuidv4(),
        conversationId,
        senderId,
        audioUrl: audioData.url,
        duration: audioData.duration,
        waveformData: audioData.waveformData,
        status: 'approved', // Voice notes auto-approve (can add moderation)
        isPlayed: false,
        createdAt: new Date(),
      };

      await db('voice_notes').insert({
        id: voiceNote.id,
        conversation_id: voiceNote.conversationId,
        sender_id: voiceNote.senderId,
        audio_url: voiceNote.audioUrl,
        duration: voiceNote.duration,
        waveform_data: JSON.stringify(voiceNote.waveformData || []),
        status: voiceNote.status,
        is_played: false,
        created_at: voiceNote.createdAt,
      });

      // Also create a message record for the voice note
      await db('messages').insert({
        id: uuidv4(),
        conversation_id: conversationId,
        sender_id: senderId,
        content: '[Voice Note]',
        message_type: 'voice_note',
        voice_note_id: voiceNote.id,
        created_at: new Date(),
      });

      logger.info(`Voice note sent: ${voiceNote.id} in conversation ${conversationId}`);

      return { success: true, voiceNote };
    } catch (error) {
      logger.error('Error sending voice note:', error);
      return { success: false, error: 'Failed to send voice note' };
    }
  }

  /**
   * Mark voice note as played
   */
  async markVoiceNotePlayed(voiceNoteId: string, listenerId: string): Promise<boolean> {
    const voiceNote = await db('voice_notes')
      .where('id', voiceNoteId)
      .first();

    if (!voiceNote || voiceNote.sender_id === listenerId) {
      return false;
    }

    await db('voice_notes')
      .where('id', voiceNoteId)
      .update({ is_played: true, played_at: new Date() });

    return true;
  }

  /**
   * Get voice notes in conversation
   */
  async getVoiceNotes(
    conversationId: string,
    limit: number = 50
  ): Promise<VoiceNote[]> {
    const notes = await db('voice_notes')
      .where('conversation_id', conversationId)
      .orderBy('created_at', 'desc')
      .limit(limit);

    return notes.map(this.mapDbToVoiceNote);
  }

  /**
   * Initiate photo verification
   */
  async initiatePhotoVerification(
    userId: string,
    selfieUrl: string
  ): Promise<{
    success: boolean;
    verification?: PhotoVerification;
    error?: string;
  }> {
    try {
      // Get user's primary profile photo
      const primaryPhoto = await db('profile_photos')
        .where('user_id', userId)
        .where('moderation_status', 'approved')
        .orderBy('order_index', 'asc')
        .first();

      if (!primaryPhoto) {
        return {
          success: false,
          error: 'Please upload a profile photo first',
        };
      }

      // Create verification record
      const verification: PhotoVerification = {
        id: uuidv4(),
        userId,
        selfieUrl,
        referencePhotoUrl: primaryPhoto.url,
        status: 'pending',
        similarityScore: 0,
        aiConfidence: 0,
        manualReviewRequired: false,
        createdAt: new Date(),
      };

      await db('photo_verifications').insert({
        id: verification.id,
        user_id: verification.userId,
        selfie_url: verification.selfieUrl,
        reference_photo_url: verification.referencePhotoUrl,
        status: verification.status,
        similarity_score: 0,
        ai_confidence: 0,
        manual_review_required: false,
        created_at: verification.createdAt,
      });

      // Process verification asynchronously
      this.processPhotoVerification(verification.id).catch(err =>
        logger.error('Photo verification error:', err)
      );

      logger.info(`Photo verification initiated: ${verification.id}`);

      return { success: true, verification };
    } catch (error) {
      logger.error('Error initiating photo verification:', error);
      return { success: false, error: 'Failed to initiate verification' };
    }
  }

  /**
   * Get photo verification status
   */
  async getPhotoVerificationStatus(userId: string): Promise<{
    isVerified: boolean;
    verification?: PhotoVerification;
    lastAttempt?: Date;
  }> {
    // Check for successful verification
    const verified = await db('photo_verifications')
      .where('user_id', userId)
      .where('status', 'verified')
      .orderBy('created_at', 'desc')
      .first();

    if (verified) {
      return {
        isVerified: true,
        verification: this.mapDbToPhotoVerification(verified),
      };
    }

    // Get most recent attempt
    const lastAttempt = await db('photo_verifications')
      .where('user_id', userId)
      .orderBy('created_at', 'desc')
      .first();

    return {
      isVerified: false,
      verification: lastAttempt ? this.mapDbToPhotoVerification(lastAttempt) : undefined,
      lastAttempt: lastAttempt?.created_at,
    };
  }

  /**
   * Get video prompts
   */
  getVideoPrompts(): VideoPrompt[] {
    return VIDEO_PROMPTS;
  }

  /**
   * Transcribe voice note (async)
   */
  async transcribeVoiceNote(voiceNoteId: string): Promise<string | null> {
    try {
      // In production, use speech-to-text service (AWS Transcribe, Google Speech-to-Text)
      // const transcription = await speechToTextService.transcribe(audioUrl);

      // Simulated transcription for development
      const transcription = '[Transcription would appear here]';

      await db('voice_notes')
        .where('id', voiceNoteId)
        .update({ transcription });

      return transcription;
    } catch (error) {
      logger.error('Error transcribing voice note:', error);
      return null;
    }
  }

  // Private methods

  /**
   * Moderate video profile
   */
  private async moderateVideoProfile(videoId: string): Promise<void> {
    try {
      // In production, use video moderation service
      // Extract frames and check each for inappropriate content

      // Simulated moderation
      const moderationResult: ModerationResult = {
        isAppropriate: true,
        confidence: 0.95,
        flags: [],
        suggestedAction: 'approve',
      };

      const status: MediaStatus = moderationResult.suggestedAction === 'approve'
        ? 'approved'
        : moderationResult.suggestedAction === 'reject'
          ? 'rejected'
          : 'pending_review';

      await db('video_profiles')
        .where('id', videoId)
        .update({
          status,
          moderation_result: JSON.stringify(moderationResult),
          updated_at: new Date(),
        });

      logger.info(`Video ${videoId} moderation complete: ${status}`);
    } catch (error) {
      logger.error('Video moderation error:', error);
      await db('video_profiles')
        .where('id', videoId)
        .update({
          status: 'pending_review',
          updated_at: new Date(),
        });
    }
  }

  /**
   * Process photo verification
   */
  private async processPhotoVerification(verificationId: string): Promise<void> {
    try {
      const verification = await db('photo_verifications')
        .where('id', verificationId)
        .first();

      if (!verification) return;

      // Use Rekognition to compare faces
      const comparisonResult = await rekognitionService.compareFaces(
        { bucket: 'flamoral-media', key: verification.selfie_url },
        { bucket: 'flamoral-media', key: verification.reference_photo_url },
        CONFIG.verificationSimilarityThreshold
      );

      const isVerified = comparisonResult.isMatch;
      const manualReviewRequired = comparisonResult.similarity >= 70 &&
        comparisonResult.similarity < CONFIG.verificationSimilarityThreshold;

      const status: VerificationStatus = isVerified
        ? 'verified'
        : manualReviewRequired
          ? 'pending'
          : 'rejected';

      await db('photo_verifications')
        .where('id', verificationId)
        .update({
          status,
          similarity_score: comparisonResult.similarity,
          ai_confidence: comparisonResult.confidence,
          manual_review_required: manualReviewRequired,
          updated_at: new Date(),
        });

      // Update user verification status if verified
      if (isVerified) {
        await db('users')
          .where('id', verification.user_id)
          .update({
            is_verified: true,
            verified_at: new Date(),
            updated_at: new Date(),
          });
      }

      logger.info(`Photo verification ${verificationId}: ${status} (${comparisonResult.similarity}%)`);
    } catch (error) {
      logger.error('Photo verification error:', error);
      await db('photo_verifications')
        .where('id', verificationId)
        .update({
          status: 'pending',
          manual_review_required: true,
          updated_at: new Date(),
        });
    }
  }

  /**
   * Map database record to VideoProfile
   */
  private mapDbToVideoProfile(db: any): VideoProfile {
    return {
      id: db.id,
      userId: db.user_id,
      videoUrl: db.video_url,
      thumbnailUrl: db.thumbnail_url,
      duration: db.duration,
      status: db.status,
      moderationResult: db.moderation_result ? JSON.parse(db.moderation_result) : undefined,
      viewCount: db.view_count,
      createdAt: db.created_at,
      updatedAt: db.updated_at,
    };
  }

  /**
   * Map database record to VoiceNote
   */
  private mapDbToVoiceNote(db: any): VoiceNote {
    return {
      id: db.id,
      conversationId: db.conversation_id,
      senderId: db.sender_id,
      audioUrl: db.audio_url,
      duration: db.duration,
      waveformData: db.waveform_data ? JSON.parse(db.waveform_data) : undefined,
      transcription: db.transcription,
      status: db.status,
      isPlayed: db.is_played,
      createdAt: db.created_at,
    };
  }

  /**
   * Map database record to PhotoVerification
   */
  private mapDbToPhotoVerification(db: any): PhotoVerification {
    return {
      id: db.id,
      userId: db.user_id,
      selfieUrl: db.selfie_url,
      referencePhotoUrl: db.reference_photo_url,
      status: db.status,
      similarityScore: db.similarity_score,
      aiConfidence: db.ai_confidence,
      manualReviewRequired: db.manual_review_required,
      reviewedBy: db.reviewed_by,
      reviewedAt: db.reviewed_at,
      createdAt: db.created_at,
    };
  }
}

export const mediaEnhancementsService = new MediaEnhancementsService();
