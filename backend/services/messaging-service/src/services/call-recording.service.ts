/**
 * Call Recording Service
 * Handles call recording with Agora Cloud Recording API
 */

import axios from 'axios';

import { callRecordingRepository } from '../domain/repositories/call-recording.repository';
import { createLogger } from '../utils/logger';

const logger = createLogger('call-recording-service');
import { VideoCallService } from './video-call.service';

export interface RecordingConfig {
  agoraAppId: string;
  agoraCustomerId: string;
  agoraCustomerCertificate: string;
  storageVendor: number; // 1 for Agora, 2 for AWS S3, 3 for Azure Blob
  storageRegion: number;
  storageBucket: string;
  storageAccessKey?: string;
  storageSecretKey?: string;
}

export interface RecordingSession {
  recordingId: string;
  callId: string;
  channelName: string;
  resourceId: string;
  sid: string;
  startTime: number;
  endTime?: number;
  fileList?: string[];
  status: 'started' | 'stopped' | 'failed';
}

export class CallRecordingService {
  private config: RecordingConfig;
  private videoCallService: VideoCallService;
  private readonly AGORA_CLOUD_RECORDING_API = 'https://api.agora.io/v1/apps';
  private recordings: Map<string, RecordingSession> = new Map();

  constructor(config: RecordingConfig, videoCallService: VideoCallService) {
    this.config = config;
    this.videoCallService = videoCallService;
  }

  /**
   * Start cloud recording
   */
  async startRecording(
    callId: string,
    channelName: string,
    uid: string
  ): Promise<RecordingSession> {
    try {
      // Check if both parties have consented
      const callSession = await this.videoCallService.getCallSession(callId);
      if (!callSession || !callSession.recordingEnabled) {
        throw new Error('Recording consent not granted by all parties');
      }

      // Step 1: Acquire resource
      const resourceId = await this.acquireResource(channelName, uid);

      // Step 2: Start recording
      const sid = await this.startCloudRecording(resourceId, channelName, uid);

      const recordingSession: RecordingSession = {
        recordingId: `${callId}_${Date.now()}`,
        callId,
        channelName,
        resourceId,
        sid,
        startTime: Date.now(),
        status: 'started',
      };

      this.recordings.set(recordingSession.recordingId, recordingSession);

      logger.info('Recording started', {
        recordingId: recordingSession.recordingId,
        callId,
        channelName,
      });

      return recordingSession;
    } catch (error) {
      logger.error('Failed to start recording', { error, callId });
      throw error;
    }
  }

  /**
   * Stop cloud recording
   */
  async stopRecording(recordingId: string, userId?: string): Promise<RecordingSession> {
    try {
      const recording = this.recordings.get(recordingId);
      if (!recording) {
        throw new Error('Recording session not found');
      }

      // Stop recording
      const fileList = await this.stopCloudRecording(
        recording.resourceId,
        recording.sid,
        recording.channelName
      );

      recording.endTime = Date.now();
      recording.fileList = fileList;
      recording.status = 'stopped';

      const duration = (recording.endTime - recording.startTime) / 1000;

      logger.info('Recording stopped', {
        recordingId,
        callId: recording.callId,
        duration,
        fileCount: fileList.length,
      });

      // Save recording metadata to database
      await this.saveRecordingToDatabase(recording, userId);

      return recording;
    } catch (error) {
      logger.error('Failed to stop recording', { error, recordingId });
      throw error;
    }
  }

  /**
   * Save recording metadata to database
   */
  private async saveRecordingToDatabase(
    recording: RecordingSession,
    userId?: string
  ): Promise<void> {
    try {
      // Get user ID from call session if not provided
      let recordingUserId = userId;
      if (!recordingUserId) {
        const callSession = await this.videoCallService.getCallSession(recording.callId);
        if (callSession) {
          // Use the caller ID as the primary user for the recording
          recordingUserId = callSession.callerId;
        }
      }

      if (!recordingUserId) {
        logger.warn('No user ID available for recording metadata', {
          recordingId: recording.recordingId,
        });
        recordingUserId = 'unknown';
      }

      // Construct storage URL from file list
      const storageUrl =
        recording.fileList && recording.fileList.length > 0 ? recording.fileList[0] : undefined;

      await callRecordingRepository.save(recording, recordingUserId, storageUrl);

      logger.info('Recording metadata saved to database', {
        recordingId: recording.recordingId,
        callId: recording.callId,
        userId: recordingUserId,
      });
    } catch (error) {
      // Log error but don't throw - we don't want to fail the recording stop
      // if database save fails
      logger.error('Failed to save recording metadata to database', {
        error,
        recordingId: recording.recordingId,
      });
    }
  }

  /**
   * Acquire cloud recording resource
   */
  private async acquireResource(channelName: string, uid: string): Promise<string> {
    try {
      const url = `${this.AGORA_CLOUD_RECORDING_API}/${this.config.agoraAppId}/cloud_recording/acquire`;

      const auth = Buffer.from(
        `${this.config.agoraCustomerId}:${this.config.agoraCustomerCertificate}`
      ).toString('base64');

      const response = await axios.post(
        url,
        {
          cname: channelName,
          uid,
          clientRequest: {
            resourceExpiredHour: 24,
          },
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Basic ${auth}`,
          },
        }
      );

      return response.data.resourceId;
    } catch (error) {
      logger.error('Failed to acquire recording resource', { error });
      throw error;
    }
  }

  /**
   * Start cloud recording
   */
  private async startCloudRecording(
    resourceId: string,
    channelName: string,
    uid: string
  ): Promise<string> {
    try {
      const url = `${this.AGORA_CLOUD_RECORDING_API}/${this.config.agoraAppId}/cloud_recording/resourceid/${resourceId}/mode/mix/start`;

      const auth = Buffer.from(
        `${this.config.agoraCustomerId}:${this.config.agoraCustomerCertificate}`
      ).toString('base64');

      const response = await axios.post(
        url,
        {
          cname: channelName,
          uid,
          clientRequest: {
            recordingConfig: {
              maxIdleTime: 30,
              streamTypes: 2, // Audio and video
              channelType: 0, // Communication
              videoStreamType: 0, // High stream
              subscribeVideoUids: ['#allstream#'],
              subscribeAudioUids: ['#allstream#'],
            },
            recordingFileConfig: {
              avFileType: ['hls', 'mp4'],
            },
            storageConfig: {
              vendor: this.config.storageVendor,
              region: this.config.storageRegion,
              bucket: this.config.storageBucket,
              accessKey: this.config.storageAccessKey,
              secretKey: this.config.storageSecretKey,
              fileNamePrefix: ['recordings', channelName],
            },
          },
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Basic ${auth}`,
          },
        }
      );

      return response.data.sid;
    } catch (error) {
      logger.error('Failed to start cloud recording', { error });
      throw error;
    }
  }

  /**
   * Stop cloud recording
   */
  private async stopCloudRecording(
    resourceId: string,
    sid: string,
    channelName: string
  ): Promise<string[]> {
    try {
      const url = `${this.AGORA_CLOUD_RECORDING_API}/${this.config.agoraAppId}/cloud_recording/resourceid/${resourceId}/sid/${sid}/mode/mix/stop`;

      const auth = Buffer.from(
        `${this.config.agoraCustomerId}:${this.config.agoraCustomerCertificate}`
      ).toString('base64');

      const response = await axios.post(
        url,
        {
          cname: channelName,
          uid: '0',
          clientRequest: {},
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Basic ${auth}`,
          },
        }
      );

      const fileList =
        response.data.serverResponse?.fileList?.map((file: any) => file.fileName) || [];

      return fileList;
    } catch (error) {
      logger.error('Failed to stop cloud recording', { error });
      throw error;
    }
  }

  /**
   * Query recording status
   */
  async queryRecording(resourceId: string, sid: string): Promise<any> {
    try {
      const url = `${this.AGORA_CLOUD_RECORDING_API}/${this.config.agoraAppId}/cloud_recording/resourceid/${resourceId}/sid/${sid}/mode/mix/query`;

      const auth = Buffer.from(
        `${this.config.agoraCustomerId}:${this.config.agoraCustomerCertificate}`
      ).toString('base64');

      const response = await axios.get(url, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${auth}`,
        },
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to query recording', { error });
      throw error;
    }
  }

  /**
   * Get recording by call ID
   */
  getRecordingByCallId(callId: string): RecordingSession | null {
    for (const [, recording] of this.recordings) {
      if (recording.callId === callId && recording.status === 'started') {
        return recording;
      }
    }
    return null;
  }

  /**
   * Delete recording
   */
  async deleteRecording(recordingId: string, callId?: string): Promise<void> {
    // TODO: Implement deletion from cloud storage
    // This depends on your storage provider (S3, Azure Blob, etc.)

    // Delete from in-memory cache
    this.recordings.delete(recordingId);

    // Delete from database if callId is provided
    if (callId) {
      try {
        await callRecordingRepository.delete(recordingId, callId);
      } catch (error) {
        logger.error('Failed to delete recording from database', {
          error,
          recordingId,
        });
      }
    }

    logger.info('Recording deleted', { recordingId });
  }

  /**
   * Get recordings from database for a user
   */
  async getRecordingsForUser(userId: string, limit: number = 50, offset: number = 0) {
    return callRecordingRepository.getRecordingsByUserId(userId, limit, offset);
  }

  /**
   * Get recordings from database for a call
   */
  async getRecordingsForCall(callId: string) {
    return callRecordingRepository.getRecordingsByCallId(callId);
  }

  /**
   * Get recording metadata from database
   */
  async getRecordingMetadata(recordingId: string, callId: string) {
    return callRecordingRepository.findById(recordingId, callId);
  }

  /**
   * Get total recording duration for a user
   */
  async getTotalRecordingDuration(userId: string): Promise<number> {
    return callRecordingRepository.getTotalDurationForUser(userId);
  }

  /**
   * Get recording count for a user
   */
  async getRecordingCount(userId: string): Promise<number> {
    return callRecordingRepository.getRecordingCountForUser(userId);
  }
}

export default CallRecordingService;
