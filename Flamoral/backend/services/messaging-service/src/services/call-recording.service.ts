/**
 * Call Recording Service
 * Handles call recording with Agora Cloud Recording API
 */

import axios from 'axios';
import { createLogger } from '../utils/logger';
import { callRecordingRepository } from '../domain/repositories/call-recording.repository';

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
  async stopRecording(recordingId: string): Promise<RecordingSession> {
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

      logger.info('Recording stopped', {
        recordingId,
        callId: recording.callId,
        duration: (recording.endTime - recording.startTime) / 1000,
        fileCount: fileList.length,
      });

      // Save recording metadata to database
      await this.saveRecordingToDatabase(recording);

      return recording;
    } catch (error) {
      logger.error('Failed to stop recording', { error, recordingId });
      throw error;
    }
  }

  /**
   * Save recording metadata to database
   */
  private async saveRecordingToDatabase(recording: RecordingSession): Promise<void> {
    try {
      logger.info('Saving recording metadata to database', { recordingId: recording.recordingId });

      // Determine storage provider from config
      let storageProvider: 'agora' | 's3' | 'azure' | 'gcp' = 'agora';
      if (this.config.storageVendor === 2) {
        storageProvider = 's3';
      } else if (this.config.storageVendor === 3) {
        storageProvider = 'azure';
      } else if (this.config.storageVendor === 5) {
        storageProvider = 'gcp';
      }

      // Calculate total file size if available
      let totalFileSize = 0;
      if (recording.fileList && recording.fileList.length > 0) {
        // File size would need to be fetched from storage provider
        // For now, we'll leave it undefined and update it later if needed
      }

      const duration = recording.endTime && recording.startTime
        ? (recording.endTime - recording.startTime) / 1000
        : undefined;

      await callRecordingRepository.create({
        recordingId: recording.recordingId,
        callId: recording.callId,
        channelName: recording.channelName,
        resourceId: recording.resourceId,
        sid: recording.sid,
        startTime: new Date(recording.startTime),
        endTime: recording.endTime ? new Date(recording.endTime) : undefined,
        duration,
        fileList: recording.fileList,
        status: recording.status,
        storageProvider,
        storageBucket: this.config.storageBucket,
        storageRegion: this.config.storageRegion.toString(),
        fileSize: totalFileSize || undefined,
      });

      logger.info('Recording metadata saved to database successfully', {
        recordingId: recording.recordingId,
      });
    } catch (error) {
      logger.error('Failed to save recording metadata to database', {
        error,
        recordingId: recording.recordingId,
      });
      // Don't throw error to prevent recording stop from failing
      // This is a non-critical operation
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
   * Delete recording from cloud storage and database
   */
  async deleteRecording(recordingId: string): Promise<void> {
    try {
      const recording = this.recordings.get(recordingId);

      if (!recording && !recording) {
        // Try to fetch from database if not in memory
        const dbRecording = await callRecordingRepository.findByRecordingId(recordingId);
        if (!dbRecording) {
          throw new Error(`Recording ${recordingId} not found`);
        }

        // Delete from cloud storage
        await this.deleteFromCloudStorage(dbRecording);

        // Delete from database
        await callRecordingRepository.deleteByRecordingId(recordingId);

        logger.info('Recording deleted from cloud storage and database', { recordingId });
        return;
      }

      // Delete from cloud storage
      if (recording) {
        await this.deleteFromCloudStorage(recording);

        // Delete from in-memory map
        this.recordings.delete(recordingId);
      }

      // Delete from database
      await callRecordingRepository.deleteByRecordingId(recordingId);

      logger.info('Recording deleted', { recordingId });
    } catch (error) {
      logger.error('Failed to delete recording', { error, recordingId });
      throw error;
    }
  }

  /**
   * Delete recording files from cloud storage
   */
  private async deleteFromCloudStorage(
    recording: RecordingSession | { fileList?: string[]; storageProvider: string; storageBucket?: string; storageRegion?: string }
  ): Promise<void> {
    try {
      if (!recording.fileList || recording.fileList.length === 0) {
        logger.warn('No files to delete from cloud storage');
        return;
      }

      const storageProvider = 'storageProvider' in recording ? recording.storageProvider :
        this.getStorageProviderFromConfig();

      logger.info('Deleting files from cloud storage', {
        provider: storageProvider,
        fileCount: recording.fileList.length,
      });

      switch (storageProvider) {
        case 's3':
          await this.deleteFromS3(recording.fileList, recording.storageBucket);
          break;
        case 'azure':
          await this.deleteFromAzureBlob(recording.fileList, recording.storageBucket);
          break;
        case 'gcp':
          await this.deleteFromGCS(recording.fileList, recording.storageBucket);
          break;
        case 'agora':
          logger.warn('Agora storage deletion not implemented - files stored on Agora servers');
          break;
        default:
          logger.warn(`Unknown storage provider: ${storageProvider}`);
      }

      logger.info('Successfully deleted files from cloud storage');
    } catch (error) {
      logger.error('Failed to delete from cloud storage', { error });
      throw error;
    }
  }

  /**
   * Get storage provider from config
   */
  private getStorageProviderFromConfig(): 'agora' | 's3' | 'azure' | 'gcp' {
    if (this.config.storageVendor === 2) return 's3';
    if (this.config.storageVendor === 3) return 'azure';
    if (this.config.storageVendor === 5) return 'gcp';
    return 'agora';
  }

  /**
   * Delete files from AWS S3
   */
  private async deleteFromS3(fileList: string[], bucket?: string): Promise<void> {
    try {
      const AWS = require('aws-sdk');
      const s3 = new AWS.S3({
        accessKeyId: this.config.storageAccessKey,
        secretAccessKey: this.config.storageSecretKey,
      });

      const bucketName = bucket || this.config.storageBucket;

      const deleteParams = {
        Bucket: bucketName,
        Delete: {
          Objects: fileList.map(file => ({ Key: file })),
          Quiet: false,
        },
      };

      const result = await s3.deleteObjects(deleteParams).promise();
      logger.info('Deleted files from S3', {
        bucket: bucketName,
        deletedCount: result.Deleted?.length || 0,
      });
    } catch (error) {
      logger.error('Failed to delete from S3', { error });
      throw error;
    }
  }

  /**
   * Delete files from Azure Blob Storage
   */
  private async deleteFromAzureBlob(fileList: string[], container?: string): Promise<void> {
    try {
      const { BlobServiceClient } = require('@azure/storage-blob');

      const connectionString = `DefaultEndpointsProtocol=https;AccountName=${this.config.storageAccessKey};AccountKey=${this.config.storageSecretKey};EndpointSuffix=core.windows.net`;
      const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);

      const containerName = container || this.config.storageBucket;
      const containerClient = blobServiceClient.getContainerClient(containerName);

      const deletePromises = fileList.map(async (file) => {
        const blobClient = containerClient.getBlobClient(file);
        await blobClient.delete();
        logger.debug('Deleted blob from Azure', { file });
      });

      await Promise.all(deletePromises);
      logger.info('Deleted files from Azure Blob Storage', {
        container: containerName,
        deletedCount: fileList.length,
      });
    } catch (error) {
      logger.error('Failed to delete from Azure Blob Storage', { error });
      throw error;
    }
  }

  /**
   * Delete files from Google Cloud Storage
   */
  private async deleteFromGCS(fileList: string[], bucket?: string): Promise<void> {
    try {
      const { Storage } = require('@google-cloud/storage');
      const storage = new Storage();

      const bucketName = bucket || this.config.storageBucket;
      const bucketObj = storage.bucket(bucketName);

      const deletePromises = fileList.map(async (file) => {
        await bucketObj.file(file).delete();
        logger.debug('Deleted file from GCS', { file });
      });

      await Promise.all(deletePromises);
      logger.info('Deleted files from Google Cloud Storage', {
        bucket: bucketName,
        deletedCount: fileList.length,
      });
    } catch (error) {
      logger.error('Failed to delete from Google Cloud Storage', { error });
      throw error;
    }
  }
}

export default CallRecordingService;
