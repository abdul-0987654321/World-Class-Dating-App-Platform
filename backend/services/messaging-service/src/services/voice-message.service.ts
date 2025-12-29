import { createLogger } from '../utils/logger';
import axios from 'axios';
import ffmpeg from 'fluent-ffmpeg';
import * as sdk from 'microsoft-cognitiveservices-speech-sdk';
import { Readable, PassThrough } from 'stream';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { VoiceMessageMetadata } from '../types/enhanced-types';
import config from '../config';

const logger = createLogger('voice-message-service');

export class VoiceMessageService {
  private readonly MAX_DURATION: number;
  private readonly MAX_FILE_SIZE: number;
  private readonly SUPPORTED_FORMATS = ['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/webm', 'audio/ogg'];
  private readonly TARGET_BITRATE: number;
  private speechConfig: sdk.SpeechConfig | null = null;

  constructor() {
    const voiceConfig = config.mediaProcessing.voice;
    this.MAX_DURATION = voiceConfig.maxDuration;
    this.MAX_FILE_SIZE = voiceConfig.maxFileSize;
    this.TARGET_BITRATE = voiceConfig.targetBitrate;

    // Initialize Azure Speech SDK if configured
    this.initializeSpeechConfig();
  }

  /**
   * Initialize Azure Speech Service configuration
   */
  private initializeSpeechConfig(): void {
    try {
      const speechConfig = config.azureSpeech;
      if (speechConfig?.subscriptionKey && speechConfig?.region) {
        this.speechConfig = sdk.SpeechConfig.fromSubscription(
          speechConfig.subscriptionKey,
          speechConfig.region
        );
        // Set default language
        this.speechConfig.speechRecognitionLanguage = speechConfig.language || 'en-US';
        logger.info('Azure Speech Service initialized', { region: speechConfig.region });
      } else {
        logger.warn('Azure Speech Service not configured - transcription will be disabled');
      }
    } catch (error: any) {
      logger.error('Failed to initialize Azure Speech Service:', error);
    }
  }

  /**
   * Validate voice message file
   */
  validateVoiceMessage(file: {
    size: number;
    mimeType: string;
    duration?: number;
  }): { valid: boolean; error?: string } {
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

  /**
   * Transcribe voice message to text using Azure Speech Service
   */
  async transcribeVoiceMessage(audioBuffer: Buffer, mimeType: string = 'audio/wav'): Promise<string | null> {
    if (!this.speechConfig) {
      logger.debug('Azure Speech Service not configured - skipping transcription');
      return null;
    }

    const extension = this.getExtensionFromMimeType(mimeType);
    const tempPath = path.join(os.tmpdir(), `transcribe_${Date.now()}${extension}`);
    const wavPath = path.join(os.tmpdir(), `transcribe_${Date.now()}.wav`);

    try {
      // Write buffer to temp file
      await fs.promises.writeFile(tempPath, audioBuffer);

      // Convert to WAV format for Azure Speech SDK (required format)
      await this.convertToWav(tempPath, wavPath);

      // Create audio config from WAV file
      const audioConfig = sdk.AudioConfig.fromWavFileInput(
        fs.readFileSync(wavPath)
      );

      // Create speech recognizer
      const recognizer = new sdk.SpeechRecognizer(this.speechConfig, audioConfig);

      return new Promise<string | null>((resolve, reject) => {
        let transcription = '';

        recognizer.recognized = (_sender: sdk.Recognizer, event: sdk.SpeechRecognitionEventArgs) => {
          if (event.result.reason === sdk.ResultReason.RecognizedSpeech) {
            transcription += event.result.text + ' ';
          }
        };

        recognizer.recognizeOnceAsync(
          (result: sdk.SpeechRecognitionResult) => {
            recognizer.close();

            if (result.reason === sdk.ResultReason.RecognizedSpeech) {
              logger.debug('Voice message transcribed successfully', {
                textLength: result.text.length,
              });
              resolve(result.text.trim() || null);
            } else if (result.reason === sdk.ResultReason.NoMatch) {
              logger.debug('No speech could be recognized');
              resolve(null);
            } else {
              logger.warn('Speech recognition cancelled or failed', {
                reason: result.reason,
              });
              resolve(null);
            }
          },
          (error: string) => {
            recognizer.close();
            logger.error('Speech recognition error:', error);
            resolve(null);
          }
        );
      });
    } catch (error: any) {
      logger.error('Failed to transcribe voice message:', error);
      return null;
    } finally {
      // Cleanup temp files
      try {
        await fs.promises.unlink(tempPath);
        await fs.promises.unlink(wavPath);
      } catch {
        // Ignore cleanup errors
      }
    }
  }

  /**
   * Convert audio file to WAV format for Azure Speech SDK
   */
  private async convertToWav(inputPath: string, outputPath: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      ffmpeg(inputPath)
        .audioCodec('pcm_s16le')
        .audioFrequency(16000)
        .audioChannels(1)
        .format('wav')
        .on('end', () => {
          resolve();
        })
        .on('error', (err: Error) => {
          reject(err);
        })
        .save(outputPath);
    });
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
  async getAudioMetadata(audioBuffer: Buffer, mimeType: string): Promise<{
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
