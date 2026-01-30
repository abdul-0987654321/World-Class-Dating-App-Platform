import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import {
  TranscribeClient,
  StartTranscriptionJobCommand,
  GetTranscriptionJobCommand,
  TranscriptionJobStatus,
  LanguageCode,
  MediaFormat,
} from '@aws-sdk/client-transcribe';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import ffmpeg from 'fluent-ffmpeg';
import { v4 as uuidv4 } from 'uuid';

import config from '../config';
import { VoiceMessageMetadata } from '../types/enhanced-types';
import { createLogger } from '../utils/logger';

const logger = createLogger('voice-message-service');

const TRANSCRIBE_MAX_POLL_ATTEMPTS = 60;
const TRANSCRIBE_POLL_INTERVAL_MS = 2000;
const TRANSCRIBE_S3_FOLDER = 'voice-transcriptions';

export class VoiceMessageService {
  private readonly MAX_DURATION: number;
  private readonly MAX_FILE_SIZE: number;
  private readonly SUPPORTED_FORMATS = [
    'audio/mpeg',
    'audio/mp4',
    'audio/wav',
    'audio/webm',
    'audio/ogg',
  ];
  private readonly TARGET_BITRATE: number;

  private transcribeClient: TranscribeClient | null = null;
  private s3Client: S3Client | null = null;
  private readonly transcriptionEnabled: boolean;
  private readonly awsRegion: string;
  private readonly transcribeLanguage: string;
  private readonly s3Bucket: string;

  constructor() {
    const voiceConfig = config.mediaProcessing.voice;
    this.MAX_DURATION = voiceConfig.maxDuration;
    this.MAX_FILE_SIZE = voiceConfig.maxFileSize;
    this.TARGET_BITRATE = voiceConfig.targetBitrate;

    this.transcriptionEnabled =
      process.env.VOICE_TRANSCRIPTION_ENABLED === 'true' ||
      (process.env.VOICE_TRANSCRIPTION_ENABLED === undefined && voiceConfig.enableTranscription);

    this.awsRegion = config.awsTranscribe?.region || 'us-east-1';
    this.transcribeLanguage = config.awsTranscribe?.language || 'en-US';
    this.s3Bucket = process.env.AWS_S3_BUCKET || process.env.AWS_S3_BUCKET_MEDIA || 'flamoral-media';

    this.initializeAWSClients();
  }

  private initializeAWSClients(): void {
    if (!this.transcriptionEnabled) {
      logger.info('VoiceMessageService initialized (transcription disabled)');
      return;
    }

    try {
      const isLocalDevelopment =
        config.nodeEnv === 'development' && !process.env.AWS_ACCESS_KEY_ID;

      if (isLocalDevelopment) {
        logger.info('Initializing AWS Transcribe client with LocalStack endpoint');
        const localStackConfig = {
          region: this.awsRegion,
          endpoint: 'http://localhost:4566',
          credentials: { accessKeyId: 'test', secretAccessKey: 'test' },
        };
        this.transcribeClient = new TranscribeClient(localStackConfig);
        this.s3Client = new S3Client({ ...localStackConfig, forcePathStyle: true });
      } else {
        logger.info('Initializing AWS Transcribe client with production credentials');
        this.transcribeClient = new TranscribeClient({ region: this.awsRegion });
        this.s3Client = new S3Client({ region: this.awsRegion });
      }

      logger.info('VoiceMessageService initialized (transcription enabled)', {
        region: this.awsRegion,
        language: this.transcribeLanguage,
        bucket: this.s3Bucket,
      });
    } catch (error: any) {
      logger.error('Failed to initialize AWS Transcribe client:', error);
      this.transcribeClient = null;
      this.s3Client = null;
      logger.warn('VoiceMessageService initialized (transcription unavailable due to init error)');
    }
  }

  /**
   * Validate voice message file
   */
  validateVoiceMessage(file: { size: number; mimeType: string; duration?: number }): {
    valid: boolean;
    error?: string;
  } {
    // Check file size
    if (file.size > this.MAX_FILE_SIZE) {
      return {
        valid: false,
        error: `Voice message is too large. Maximum size is ${this.MAX_FILE_SIZE / (1024 * 1024)}MB.`,
      };
    }

    // Check mime type
    if (!this.SUPPORTED_FORMATS.includes(file.mimeType)) {
      return {
        valid: false,
        error: `Unsupported audio format. Supported formats: ${this.SUPPORTED_FORMATS.join(', ')}`,
      };
    }

    // Check duration
    if (file.duration && file.duration > this.MAX_DURATION) {
      return {
        valid: false,
        error: `Voice message is too long. Maximum duration is ${this.MAX_DURATION} seconds.`,
      };
    }

    return { valid: true };
  }

  /**
   * Generate waveform data for audio visualization using ffmpeg
   * Extracts audio amplitude data at regular intervals
   */
  async generateWaveform(audioBuffer: Buffer, samples: number = 50): Promise<number[]> {
    const tempInputPath = path.join(os.tmpdir(), `waveform_input_${Date.now()}.wav`);

    try {
      // Write buffer to temp file
      await fs.promises.writeFile(tempInputPath, audioBuffer);

      return new Promise<number[]>((resolve, reject) => {
        const waveformData: number[] = [];

        // Use ffmpeg to extract audio data for waveform
        ffmpeg(tempInputPath)
          .audioFilters(`volumedetect`)
          .format('null')
          .on('stderr', (stderrLine: string) => {
            // Parse volume data from stderr
            const meanMatch = stderrLine.match(/mean_volume:\s*(-?\d+\.?\d*)/);
            if (meanMatch) {
              // Normalize the dB value to 0-1 range
              const dB = parseFloat(meanMatch[1]);
              const normalized = Math.min(1, Math.max(0, (dB + 60) / 60));
              waveformData.push(normalized);
            }
          })
          .on('end', () => {
            // If we couldn't extract proper waveform data, generate approximation
            if (waveformData.length < samples) {
              const result = this.generateApproximateWaveform(audioBuffer, samples);
              resolve(result);
            } else {
              // Resample to desired number of samples
              const resampled = this.resampleArray(waveformData, samples);
              resolve(resampled);
            }
          })
          .on('error', (err: Error) => {
            logger.warn('FFmpeg waveform extraction failed, using approximation:', err.message);
            const result = this.generateApproximateWaveform(audioBuffer, samples);
            resolve(result);
          })
          .output('/dev/null')
          .run();
      });
    } catch (error: any) {
      logger.error('Failed to generate waveform:', error);
      // Fallback to approximate waveform
      return this.generateApproximateWaveform(audioBuffer, samples);
    } finally {
      // Cleanup temp file
      try {
        await fs.promises.unlink(tempInputPath);
      } catch {
        // Ignore cleanup errors
      }
    }
  }

  /**
   * Generate approximate waveform from buffer data
   */
  private generateApproximateWaveform(buffer: Buffer, samples: number): number[] {
    const waveform: number[] = [];
    const chunkSize = Math.floor(buffer.length / samples);

    for (let i = 0; i < samples; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, buffer.length);
      let sum = 0;

      for (let j = start; j < end; j++) {
        sum += Math.abs(buffer[j] - 128);
      }

      // Normalize to 0-1 range
      const avg = sum / (end - start);
      waveform.push(Math.min(1, avg / 128));
    }

    return waveform;
  }

  /**
   * Resample array to desired length
   */
  private resampleArray(arr: number[], targetLength: number): number[] {
    if (arr.length === targetLength) return arr;

    const result: number[] = [];
    const step = arr.length / targetLength;

    for (let i = 0; i < targetLength; i++) {
      const index = Math.floor(i * step);
      result.push(arr[index]);
    }

    return result;
  }

  /**
   * Get audio duration from file using ffmpeg/ffprobe
   */
  async getAudioDuration(audioBuffer: Buffer, mimeType: string): Promise<number> {
    const extension = this.getExtensionFromMimeType(mimeType);
    const tempPath = path.join(os.tmpdir(), `duration_${Date.now()}${extension}`);

    try {
      // Write buffer to temp file
      await fs.promises.writeFile(tempPath, audioBuffer);

      return new Promise<number>((resolve, reject) => {
        ffmpeg.ffprobe(tempPath, (err: Error | null, metadata: any) => {
          if (err) {
            logger.error('FFprobe error:', err);
            reject(new Error('Failed to get audio duration'));
            return;
          }

          const duration = metadata?.format?.duration;
          if (typeof duration === 'number') {
            resolve(Math.round(duration));
          } else {
            reject(new Error('Could not extract duration from audio'));
          }
        });
      });
    } catch (error: any) {
      logger.error('Failed to get audio duration:', error);
      throw new Error('Failed to get audio duration');
    } finally {
      // Cleanup temp file
      try {
        await fs.promises.unlink(tempPath);
      } catch {
        // Ignore cleanup errors
      }
    }
  }

  /**
   * Get file extension from mime type
   */
  private getExtensionFromMimeType(mimeType: string): string {
    const mimeToExt: Record<string, string> = {
      'audio/mpeg': '.mp3',
      'audio/mp4': '.m4a',
      'audio/wav': '.wav',
      'audio/webm': '.webm',
      'audio/ogg': '.ogg',
    };
    return mimeToExt[mimeType] || '.audio';
  }

  /**
   * Process voice message file
   */
  async processVoiceMessage(
    file: Buffer,
    mimeType: string,
    uploadUrl: string
  ): Promise<VoiceMessageMetadata> {
    try {
      // Validate file
      const validation = this.validateVoiceMessage({
        size: file.length,
        mimeType,
      });

      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // Get duration
      const duration = await this.getAudioDuration(file, mimeType);

      // Validate duration
      const durationValidation = this.validateVoiceMessage({
        size: file.length,
        mimeType,
        duration,
      });

      if (!durationValidation.valid) {
        throw new Error(durationValidation.error);
      }

      // Generate waveform
      const waveform = await this.generateWaveform(file);

      const metadata: VoiceMessageMetadata = {
        duration,
        waveform,
        url: uploadUrl,
        fileSize: file.length,
        mimeType,
      };

      logger.info('Voice message processed', {
        duration,
        fileSize: file.length,
        mimeType,
      });

      return metadata;
    } catch (error: any) {
      logger.error('Failed to process voice message:', error);
      throw error;
    }
  }

  private getMediaFormatFromMimeType(mimeType: string): MediaFormat {
    const mimeToFormat: Record<string, MediaFormat> = {
      'audio/mpeg': 'mp3' as MediaFormat,
      'audio/mp4': 'mp4' as MediaFormat,
      'audio/wav': 'wav' as MediaFormat,
      'audio/webm': 'webm' as MediaFormat,
      'audio/ogg': 'ogg' as MediaFormat,
    };
    return mimeToFormat[mimeType] || ('wav' as MediaFormat);
  }

  /**
   * Transcribe voice message to text using AWS Transcribe.
   *
   * Flow:
   * 1. Upload audio buffer to S3 (temporary storage for Transcribe input)
   * 2. Start an AWS Transcribe transcription job
   * 3. Poll for job completion
   * 4. Fetch the transcript JSON from S3 output
   * 5. Return the transcription text
   */
  async transcribeVoiceMessage(
    audioBuffer: Buffer,
    mimeType: string = 'audio/wav'
  ): Promise<string | null> {
    if (!this.transcriptionEnabled) {
      logger.debug('Voice transcription is disabled');
      return null;
    }

    if (!this.transcribeClient || !this.s3Client) {
      logger.warn('AWS Transcribe client not initialized; skipping transcription');
      return null;
    }

    const jobId = uuidv4();
    const jobName = `flamoral-voice-${jobId}`;
    const mediaFormat = this.getMediaFormatFromMimeType(mimeType);
    const extension = this.getExtensionFromMimeType(mimeType);
    const s3Key = `${TRANSCRIBE_S3_FOLDER}/${jobId}${extension}`;
    const s3Uri = `s3://${this.s3Bucket}/${s3Key}`;
    const outputKey = `${TRANSCRIBE_S3_FOLDER}/output/${jobId}.json`;

    try {
      logger.info('Uploading voice audio to S3 for transcription', {
        jobName, s3Key, mimeType, bufferSize: audioBuffer.length,
      });

      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.s3Bucket,
          Key: s3Key,
          Body: audioBuffer,
          ContentType: mimeType,
        })
      );

      logger.info('Starting AWS Transcribe job', { jobName, s3Uri, mediaFormat });

      await this.transcribeClient.send(
        new StartTranscriptionJobCommand({
          TranscriptionJobName: jobName,
          LanguageCode: this.transcribeLanguage as LanguageCode,
          MediaFormat: mediaFormat,
          Media: { MediaFileUri: s3Uri },
          OutputBucketName: this.s3Bucket,
          OutputKey: outputKey,
          Settings: { ShowSpeakerLabels: false, ChannelIdentification: false },
        })
      );

      const transcript = await this.pollTranscriptionJob(jobName);

      if (transcript) {
        logger.info('Voice transcription completed successfully', {
          jobName, transcriptLength: transcript.length,
        });
      } else {
        logger.warn('Voice transcription returned empty result', { jobName });
      }

      this.cleanupS3Object(s3Key).catch(() => {});
      this.cleanupS3Object(outputKey).catch(() => {});

      return transcript;
    } catch (error: any) {
      logger.error('Failed to transcribe voice message', {
        jobName, error: error.message, stack: error.stack,
      });
      this.cleanupS3Object(s3Key).catch(() => {});
      return null;
    }
  }

  private async pollTranscriptionJob(jobName: string): Promise<string | null> {
    if (!this.transcribeClient || !this.s3Client) return null;

    for (let attempt = 0; attempt < TRANSCRIBE_MAX_POLL_ATTEMPTS; attempt++) {
      const response = await this.transcribeClient.send(
        new GetTranscriptionJobCommand({ TranscriptionJobName: jobName })
      );
      const job = response.TranscriptionJob;

      if (!job) {
        logger.error('Transcription job not found', { jobName });
        return null;
      }

      if (job.TranscriptionJobStatus === TranscriptionJobStatus.COMPLETED) {
        const transcriptUri = job.Transcript?.TranscriptFileUri;
        if (!transcriptUri) {
          logger.error('Transcription completed but no transcript URI available', { jobName });
          return null;
        }
        return await this.fetchTranscriptFromOutput(transcriptUri);
      }

      if (job.TranscriptionJobStatus === TranscriptionJobStatus.FAILED) {
        logger.error('Transcription job failed', { jobName, reason: job.FailureReason });
        return null;
      }

      logger.debug('Transcription job in progress, polling...', {
        jobName, status: job.TranscriptionJobStatus, attempt: attempt + 1,
      });
      await new Promise((resolve) => setTimeout(resolve, TRANSCRIBE_POLL_INTERVAL_MS));
    }

    logger.error('Transcription job timed out', { jobName });
    return null;
  }

  private async fetchTranscriptFromOutput(transcriptUri: string): Promise<string | null> {
    if (!this.s3Client) return null;

    try {
      let key: string;
      if (transcriptUri.startsWith('s3://')) {
        const withoutProtocol = transcriptUri.slice(5);
        const slashIndex = withoutProtocol.indexOf('/');
        key = withoutProtocol.slice(slashIndex + 1);
      } else {
        const url = new URL(transcriptUri);
        key = url.pathname.startsWith(`/${this.s3Bucket}/`)
          ? url.pathname.slice(this.s3Bucket.length + 2)
          : url.pathname.slice(1);
      }

      const response = await this.s3Client.send(
        new GetObjectCommand({ Bucket: this.s3Bucket, Key: key })
      );

      if (!response.Body) {
        logger.error('Transcript output file is empty');
        return null;
      }

      const chunks: Uint8Array[] = [];
      for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
        chunks.push(chunk);
      }
      const bodyString = Buffer.concat(chunks).toString('utf-8');
      const transcriptJson = JSON.parse(bodyString);

      return transcriptJson?.results?.transcripts
        ?.map((t: { transcript: string }) => t.transcript)
        .join(' ')
        .trim() || null;
    } catch (error: any) {
      logger.error('Failed to fetch transcript output from S3', {
        transcriptUri, error: error.message,
      });
      return null;
    }
  }

  private async cleanupS3Object(key: string): Promise<void> {
    if (!this.s3Client) return;
    await this.s3Client.send(
      new DeleteObjectCommand({ Bucket: this.s3Bucket, Key: key })
    );
    logger.debug('Cleaned up S3 object', { key });
  }

  isTranscriptionEnabled(): boolean {
    return this.transcriptionEnabled && this.transcribeClient !== null;
  }

  /**
   * Compress voice message for storage optimization using ffmpeg
   */
  async compressVoiceMessage(
    audioBuffer: Buffer,
    mimeType: string,
    targetBitrate: number = this.TARGET_BITRATE
  ): Promise<{ buffer: Buffer; mimeType: string }> {
    const extension = this.getExtensionFromMimeType(mimeType);
    const tempInputPath = path.join(os.tmpdir(), `compress_input_${Date.now()}${extension}`);
    const tempOutputPath = path.join(os.tmpdir(), `compress_output_${Date.now()}.mp3`);

    try {
      // Write buffer to temp file
      await fs.promises.writeFile(tempInputPath, audioBuffer);

      return new Promise<{ buffer: Buffer; mimeType: string }>((resolve, reject) => {
        ffmpeg(tempInputPath)
          .audioCodec('libmp3lame')
          .audioBitrate(targetBitrate / 1000) // Convert to kbps
          .audioChannels(1) // Mono for voice messages
          .audioFrequency(22050) // Lower sample rate for voice
          .on('end', async () => {
            try {
              const compressedBuffer = await fs.promises.readFile(tempOutputPath);

              logger.debug('Voice message compressed', {
                originalSize: audioBuffer.length,
                compressedSize: compressedBuffer.length,
                reduction: `${Math.round((1 - compressedBuffer.length / audioBuffer.length) * 100)}%`,
                targetBitrate,
              });

              resolve({ buffer: compressedBuffer, mimeType: 'audio/mpeg' });
            } catch (readErr) {
              reject(readErr);
            }
          })
          .on('error', (err: Error) => {
            logger.error('FFmpeg compression error:', err);
            reject(err);
          })
          .save(tempOutputPath);
      });
    } catch (error: any) {
      logger.error('Failed to compress voice message:', error);
      throw error;
    } finally {
      // Cleanup temp files
      try {
        await fs.promises.unlink(tempInputPath);
        await fs.promises.unlink(tempOutputPath);
      } catch {
        // Ignore cleanup errors
      }
    }
  }

  /**
   * Convert audio to a different format using ffmpeg
   */
  async convertAudioFormat(
    audioBuffer: Buffer,
    inputMimeType: string,
    outputFormat: 'mp3' | 'ogg' | 'wav' | 'm4a' = 'mp3'
  ): Promise<{ buffer: Buffer; mimeType: string }> {
    const inputExtension = this.getExtensionFromMimeType(inputMimeType);
    const tempInputPath = path.join(os.tmpdir(), `convert_input_${Date.now()}${inputExtension}`);
    const tempOutputPath = path.join(os.tmpdir(), `convert_output_${Date.now()}.${outputFormat}`);

    const formatToMime: Record<string, string> = {
      mp3: 'audio/mpeg',
      ogg: 'audio/ogg',
      wav: 'audio/wav',
      m4a: 'audio/mp4',
    };

    try {
      await fs.promises.writeFile(tempInputPath, audioBuffer);

      return new Promise<{ buffer: Buffer; mimeType: string }>((resolve, reject) => {
        let command = ffmpeg(tempInputPath);

        switch (outputFormat) {
          case 'mp3':
            command = command.audioCodec('libmp3lame').audioBitrate('128k');
            break;
          case 'ogg':
            command = command.audioCodec('libvorbis').audioQuality(4);
            break;
          case 'wav':
            command = command.audioCodec('pcm_s16le');
            break;
          case 'm4a':
            command = command.audioCodec('aac').audioBitrate('128k');
            break;
        }

        command
          .on('end', async () => {
            try {
              const convertedBuffer = await fs.promises.readFile(tempOutputPath);
              resolve({ buffer: convertedBuffer, mimeType: formatToMime[outputFormat] });
            } catch (readErr) {
              reject(readErr);
            }
          })
          .on('error', (err: Error) => {
            reject(err);
          })
          .save(tempOutputPath);
      });
    } catch (error: any) {
      logger.error('Failed to convert audio format:', error);
      throw error;
    } finally {
      try {
        await fs.promises.unlink(tempInputPath);
        await fs.promises.unlink(tempOutputPath);
      } catch {
        // Ignore cleanup errors
      }
    }
  }

  /**
   * Get audio metadata using ffprobe
   */
  async getAudioMetadata(
    audioBuffer: Buffer,
    mimeType: string
  ): Promise<{
    duration: number;
    bitrate?: number;
    sampleRate?: number;
    channels?: number;
    codec?: string;
  }> {
    const extension = this.getExtensionFromMimeType(mimeType);
    const tempPath = path.join(os.tmpdir(), `metadata_${Date.now()}${extension}`);

    try {
      await fs.promises.writeFile(tempPath, audioBuffer);

      return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(tempPath, (err: Error | null, metadata: any) => {
          if (err) {
            reject(err);
            return;
          }

          const audioStream = metadata?.streams?.find((s: any) => s.codec_type === 'audio');

          resolve({
            duration: Math.round(metadata?.format?.duration || 0),
            bitrate: metadata?.format?.bit_rate ? parseInt(metadata.format.bit_rate) : undefined,
            sampleRate: audioStream?.sample_rate ? parseInt(audioStream.sample_rate) : undefined,
            channels: audioStream?.channels,
            codec: audioStream?.codec_name,
          });
        });
      });
    } catch (error: any) {
      logger.error('Failed to get audio metadata:', error);
      throw error;
    } finally {
      try {
        await fs.promises.unlink(tempPath);
      } catch {
        // Ignore cleanup errors
      }
    }
  }

  /**
   * Format duration for display (e.g., "1:23")
   */
  formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Get supported audio formats
   */
  getSupportedFormats(): string[] {
    return this.SUPPORTED_FORMATS;
  }

  /**
   * Get maximum allowed duration
   */
  getMaxDuration(): number {
    return this.MAX_DURATION;
  }

  /**
   * Get maximum allowed file size
   */
  getMaxFileSize(): number {
    return this.MAX_FILE_SIZE;
  }
}

export const voiceMessageService = new VoiceMessageService();
export default voiceMessageService;
