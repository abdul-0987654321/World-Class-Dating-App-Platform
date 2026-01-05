import { promises as fs } from 'fs';
import path from 'path';

import { createLogger } from '@flamoral/backend-shared';
import ffmpeg from 'fluent-ffmpeg';
import { v4 as uuidv4 } from 'uuid';

import config from '../../config';

const logger = createLogger('audio-processing-service');

export interface AudioMetadata {
  duration: number;
  bitrate?: number;
  sampleRate?: number;
  channels?: number;
  codec?: string;
  size: number;
}

export interface AudioValidationResult {
  valid: boolean;
  error?: string;
  metadata?: AudioMetadata;
}

export interface AudioCompressionOptions {
  codec?: string;
  bitrate?: string;
  sampleRate?: number;
  channels?: number;
  format?: string;
}

export interface WaveformData {
  samples: number[];
  duration: number;
  sampleRate: number;
  peaks: number[];
}

export class AudioProcessingService {
  private readonly MAX_AUDIO_DURATION = 60; // 60 seconds for voice notes
  private readonly MAX_AUDIO_SIZE = 10 * 1024 * 1024; // 10MB
  private readonly ALLOWED_AUDIO_FORMATS = [
    'audio/mp3',
    'audio/mpeg',
    'audio/wav',
    'audio/ogg',
    'audio/m4a',
    'audio/aac',
  ];
  private readonly TEMP_DIR = path.join(__dirname, '../../../temp/audio');

  constructor() {
    this.ensureTempDirectory();
  }

  private async ensureTempDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.TEMP_DIR, { recursive: true });
    } catch (error) {
      logger.error('Failed to create temp directory', error);
    }
  }

  /**
   * Validate audio file
   */
  async validateAudio(
    buffer: Buffer,
    mimeType: string,
    originalName: string
  ): Promise<AudioValidationResult> {
    try {
      logger.info(`Validating audio: ${originalName}`);

      // Check MIME type
      if (!this.ALLOWED_AUDIO_FORMATS.includes(mimeType)) {
        return {
          valid: false,
          error: `Invalid audio format. Allowed formats: ${this.ALLOWED_AUDIO_FORMATS.join(', ')}`,
        };
      }

      // Check file size
      if (buffer.length > this.MAX_AUDIO_SIZE) {
        return {
          valid: false,
          error: `Audio file size exceeds maximum allowed size of ${this.MAX_AUDIO_SIZE / 1024 / 1024}MB`,
        };
      }

      // Get audio metadata
      const metadata = await this.getAudioMetadata(buffer);

      // Check duration
      if (metadata.duration > this.MAX_AUDIO_DURATION) {
        return {
          valid: false,
          error: `Audio duration exceeds maximum allowed duration of ${this.MAX_AUDIO_DURATION} seconds`,
        };
      }

      // Minimum duration check (at least 0.5 seconds)
      if (metadata.duration < 0.5) {
        return {
          valid: false,
          error: 'Audio duration is too short. Minimum duration is 0.5 seconds',
        };
      }

      logger.info('Audio validation passed');
      return {
        valid: true,
        metadata,
      };
    } catch (error: any) {
      logger.error('Audio validation failed', error);
      return {
        valid: false,
        error: error.message || 'Failed to validate audio',
      };
    }
  }

  /**
   * Get audio metadata using ffprobe
   */
  async getAudioMetadata(buffer: Buffer): Promise<AudioMetadata> {
    let tempFilePath: string | null = null;

    try {
      logger.info('Extracting audio metadata using ffprobe');

      // Write buffer to temporary file
      tempFilePath = path.join(this.TEMP_DIR, `audio-${uuidv4()}.tmp`);
      await fs.writeFile(tempFilePath, buffer);

      const metadata = await this.probeAudioFile(tempFilePath);

      logger.info(`Audio metadata: duration=${metadata.duration}s, bitrate=${metadata.bitrate}`);
      return {
        ...metadata,
        size: buffer.length,
      };
    } catch (error: any) {
      logger.error('Failed to extract audio metadata', error);
      throw new Error(`Failed to extract audio metadata: ${error.message}`);
    } finally {
      if (tempFilePath) {
        try {
          await fs.unlink(tempFilePath);
        } catch (err) {
          logger.warn(`Failed to delete temp file: ${tempFilePath}`);
        }
      }
    }
  }

  /**
   * Probe audio file for metadata
   */
  private probeAudioFile(filePath: string): Promise<AudioMetadata> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) {
          reject(err);
          return;
        }

        const audioStream = metadata.streams.find((s) => s.codec_type === 'audio');

        if (!audioStream) {
          reject(new Error('No audio stream found'));
          return;
        }

        resolve({
          duration: metadata.format.duration || 0,
          bitrate: metadata.format.bit_rate
            ? parseInt(metadata.format.bit_rate.toString())
            : undefined,
          sampleRate: audioStream.sample_rate
            ? parseInt(audioStream.sample_rate.toString())
            : undefined,
          channels: audioStream.channels,
          codec: audioStream.codec_name,
          size: 0, // Will be set by caller
        });
      });
    });
  }

  /**
   * Compress audio for optimal streaming and storage
   */
  async compressAudio(buffer: Buffer, options?: AudioCompressionOptions): Promise<Buffer> {
    let tempInputPath: string | null = null;
    let tempOutputPath: string | null = null;

    try {
      const defaultOptions: AudioCompressionOptions = {
        codec: 'libmp3lame',
        bitrate: '96k',
        sampleRate: 44100,
        channels: 1, // Mono for voice notes
        format: 'mp3',
        ...options,
      };

      logger.info('Compressing audio with settings:', defaultOptions);

      const tempId = uuidv4();
      tempInputPath = path.join(this.TEMP_DIR, `audio-input-${tempId}.tmp`);
      tempOutputPath = path.join(this.TEMP_DIR, `audio-output-${tempId}.${defaultOptions.format}`);

      // Write input buffer
      await fs.writeFile(tempInputPath, buffer);

      // Compress using ffmpeg
      await this.compressAudioFile(tempInputPath, tempOutputPath, defaultOptions);

      // Read compressed audio
      const compressedBuffer = await fs.readFile(tempOutputPath);

      const originalSize = buffer.length;
      const compressedSize = compressedBuffer.length;
      const compressionRatio = ((originalSize - compressedSize) / originalSize) * 100;

      logger.info(
        `Audio compression complete. Original: ${(originalSize / 1024).toFixed(2)}KB, ` +
          `Compressed: ${(compressedSize / 1024).toFixed(2)}KB, ` +
          `Ratio: ${compressionRatio.toFixed(2)}%`
      );

      return compressedBuffer;
    } catch (error: any) {
      logger.error('Audio compression failed', error);
      throw new Error(`Audio compression failed: ${error.message}`);
    } finally {
      if (tempInputPath) {
        try {
          await fs.unlink(tempInputPath);
        } catch (err) {
          logger.warn(`Failed to delete temp input: ${tempInputPath}`);
        }
      }
      if (tempOutputPath) {
        try {
          await fs.unlink(tempOutputPath);
        } catch (err) {
          logger.warn(`Failed to delete temp output: ${tempOutputPath}`);
        }
      }
    }
  }

  /**
   * Compress audio file using ffmpeg
   */
  private compressAudioFile(
    inputPath: string,
    outputPath: string,
    options: AudioCompressionOptions
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      let command = ffmpeg(inputPath);

      if (options.codec) {
        command = command.audioCodec(options.codec);
      }

      if (options.bitrate) {
        command = command.audioBitrate(options.bitrate);
      }

      if (options.sampleRate) {
        command = command.audioFrequency(options.sampleRate);
      }

      if (options.channels) {
        command = command.audioChannels(options.channels);
      }

      command
        .format(options.format || 'mp3')
        .output(outputPath)
        .on('start', (commandLine) => {
          logger.debug(`FFmpeg command: ${commandLine}`);
        })
        .on('progress', (progress) => {
          if (progress.percent) {
            logger.debug(`Compression progress: ${progress.percent.toFixed(2)}%`);
          }
        })
        .on('end', () => {
          logger.debug('Audio compression completed');
          resolve();
        })
        .on('error', (err) => {
          logger.error('FFmpeg error:', err);
          reject(err);
        })
        .run();
    });
  }

  /**
   * Generate waveform data for visualization
   */
  async generateWaveform(buffer: Buffer, samples: number = 100): Promise<WaveformData> {
    let tempInputPath: string | null = null;
    let tempOutputPath: string | null = null;

    try {
      logger.info(`Generating waveform with ${samples} samples`);

      const tempId = uuidv4();
      tempInputPath = path.join(this.TEMP_DIR, `waveform-input-${tempId}.tmp`);
      tempOutputPath = path.join(this.TEMP_DIR, `waveform-${tempId}.json`);

      // Write input buffer
      await fs.writeFile(tempInputPath, buffer);

      // Get audio metadata first
      const metadata = await this.probeAudioFile(tempInputPath);

      // Extract raw audio data and generate waveform
      const waveformData = await this.extractWaveformData(
        tempInputPath,
        samples,
        metadata.duration
      );

      logger.info('Waveform generated successfully');
      return waveformData;
    } catch (error: any) {
      logger.error('Failed to generate waveform', error);
      throw new Error(`Waveform generation failed: ${error.message}`);
    } finally {
      if (tempInputPath) {
        try {
          await fs.unlink(tempInputPath);
        } catch (err) {
          logger.warn(`Failed to delete temp input: ${tempInputPath}`);
        }
      }
      if (tempOutputPath) {
        try {
          await fs.unlink(tempOutputPath);
        } catch (err) {
          logger.warn(`Failed to delete temp output: ${tempOutputPath}`);
        }
      }
    }
  }

  /**
   * Extract waveform data from audio file
   */
  private async extractWaveformData(
    filePath: string,
    sampleCount: number,
    duration: number
  ): Promise<WaveformData> {
    const pcmPath = path.join(this.TEMP_DIR, `pcm-${uuidv4()}.raw`);

    try {
      // Convert to PCM format
      await new Promise<void>((resolve, reject) => {
        ffmpeg(filePath)
          .format('s16le') // 16-bit signed little-endian PCM
          .audioChannels(1) // Mono
          .audioFrequency(44100)
          .output(pcmPath)
          .on('end', () => resolve())
          .on('error', (err) => reject(err))
          .run();
      });

      // Read PCM data
      const pcmData = await fs.readFile(pcmPath);
      const samples = new Int16Array(pcmData.buffer, pcmData.byteOffset, pcmData.length / 2);

      // Calculate waveform points
      const waveformSamples = this.calculateWaveformSamples(samples, sampleCount);
      const peaks = this.findPeaks(waveformSamples);

      return {
        samples: waveformSamples,
        duration,
        sampleRate: 44100,
        peaks,
      };
    } finally {
      try {
        await fs.unlink(pcmPath);
      } catch (err) {
        logger.warn(`Failed to delete PCM file: ${pcmPath}`);
      }
    }
  }

  /**
   * Calculate waveform samples by downsampling
   */
  private calculateWaveformSamples(pcmSamples: Int16Array, targetSampleCount: number): number[] {
    const result: number[] = [];
    const blockSize = Math.floor(pcmSamples.length / targetSampleCount);

    for (let i = 0; i < targetSampleCount; i++) {
      const start = i * blockSize;
      const end = Math.min(start + blockSize, pcmSamples.length);

      // Calculate RMS (Root Mean Square) for this block
      let sum = 0;
      for (let j = start; j < end; j++) {
        const normalized = pcmSamples[j] / 32768; // Normalize to -1 to 1
        sum += normalized * normalized;
      }

      const rms = Math.sqrt(sum / (end - start));
      result.push(rms);
    }

    return result;
  }

  /**
   * Find peak positions in waveform
   */
  private findPeaks(samples: number[], threshold: number = 0.7): number[] {
    const peaks: number[] = [];
    const maxValue = Math.max(...samples);
    const peakThreshold = maxValue * threshold;

    for (let i = 1; i < samples.length - 1; i++) {
      if (
        samples[i] > peakThreshold &&
        samples[i] > samples[i - 1] &&
        samples[i] > samples[i + 1]
      ) {
        peaks.push(i);
      }
    }

    return peaks;
  }

  /**
   * Normalize audio levels
   */
  async normalizeAudio(buffer: Buffer, targetLevel: number = -16): Promise<Buffer> {
    let tempInputPath: string | null = null;
    let tempOutputPath: string | null = null;

    try {
      logger.info(`Normalizing audio to ${targetLevel}dB`);

      const tempId = uuidv4();
      tempInputPath = path.join(this.TEMP_DIR, `normalize-input-${tempId}.tmp`);
      tempOutputPath = path.join(this.TEMP_DIR, `normalize-output-${tempId}.mp3`);

      await fs.writeFile(tempInputPath, buffer);

      await new Promise<void>((resolve, reject) => {
        ffmpeg(tempInputPath)
          .audioFilters(`loudnorm=I=${targetLevel}:TP=-1.5:LRA=11`)
          .audioCodec('libmp3lame')
          .audioBitrate('128k')
          .output(tempOutputPath)
          .on('end', () => resolve())
          .on('error', (err) => reject(err))
          .run();
      });

      const normalizedBuffer = await fs.readFile(tempOutputPath);
      logger.info('Audio normalized successfully');
      return normalizedBuffer;
    } catch (error: any) {
      logger.error('Audio normalization failed', error);
      throw new Error(`Audio normalization failed: ${error.message}`);
    } finally {
      if (tempInputPath) await fs.unlink(tempInputPath).catch(() => {});
      if (tempOutputPath) await fs.unlink(tempOutputPath).catch(() => {});
    }
  }

  /**
   * Remove silence from beginning and end of audio
   */
  async trimSilence(
    buffer: Buffer,
    threshold: string = '-50dB',
    duration: number = 0.5
  ): Promise<Buffer> {
    let tempInputPath: string | null = null;
    let tempOutputPath: string | null = null;

    try {
      logger.info('Trimming silence from audio');

      const tempId = uuidv4();
      tempInputPath = path.join(this.TEMP_DIR, `trim-input-${tempId}.tmp`);
      tempOutputPath = path.join(this.TEMP_DIR, `trim-output-${tempId}.mp3`);

      await fs.writeFile(tempInputPath, buffer);

      await new Promise<void>((resolve, reject) => {
        ffmpeg(tempInputPath)
          .audioFilters([
            `silenceremove=start_periods=1:start_threshold=${threshold}:start_duration=${duration}`,
            `areverse`,
            `silenceremove=start_periods=1:start_threshold=${threshold}:start_duration=${duration}`,
            `areverse`,
          ])
          .audioCodec('libmp3lame')
          .audioBitrate('128k')
          .output(tempOutputPath)
          .on('end', () => resolve())
          .on('error', (err) => reject(err))
          .run();
      });

      const trimmedBuffer = await fs.readFile(tempOutputPath);
      logger.info('Silence trimmed successfully');
      return trimmedBuffer;
    } catch (error: any) {
      logger.error('Silence trimming failed', error);
      throw new Error(`Silence trimming failed: ${error.message}`);
    } finally {
      if (tempInputPath) await fs.unlink(tempInputPath).catch(() => {});
      if (tempOutputPath) await fs.unlink(tempOutputPath).catch(() => {});
    }
  }

  /**
   * Apply noise reduction to audio
   */
  async reduceNoise(buffer: Buffer): Promise<Buffer> {
    let tempInputPath: string | null = null;
    let tempOutputPath: string | null = null;

    try {
      logger.info('Applying noise reduction');

      const tempId = uuidv4();
      tempInputPath = path.join(this.TEMP_DIR, `noise-input-${tempId}.tmp`);
      tempOutputPath = path.join(this.TEMP_DIR, `noise-output-${tempId}.mp3`);

      await fs.writeFile(tempInputPath, buffer);

      await new Promise<void>((resolve, reject) => {
        ffmpeg(tempInputPath)
          .audioFilters([
            'highpass=f=200', // Remove low-frequency rumble
            'lowpass=f=3000', // Remove high-frequency hiss (suitable for voice)
          ])
          .audioCodec('libmp3lame')
          .audioBitrate('128k')
          .output(tempOutputPath)
          .on('end', () => resolve())
          .on('error', (err) => reject(err))
          .run();
      });

      const processedBuffer = await fs.readFile(tempOutputPath);
      logger.info('Noise reduction completed');
      return processedBuffer;
    } catch (error: any) {
      logger.error('Noise reduction failed', error);
      throw new Error(`Noise reduction failed: ${error.message}`);
    } finally {
      if (tempInputPath) await fs.unlink(tempInputPath).catch(() => {});
      if (tempOutputPath) await fs.unlink(tempOutputPath).catch(() => {});
    }
  }

  /**
   * Process voice note (compress, normalize, trim silence)
   */
  async processVoiceNote(buffer: Buffer): Promise<{
    compressed: Buffer;
    waveform: WaveformData;
    metadata: AudioMetadata;
  }> {
    try {
      logger.info('Processing voice note');

      // Step 1: Trim silence
      const trimmed = await this.trimSilence(buffer);

      // Step 2: Normalize audio levels
      const normalized = await this.normalizeAudio(trimmed);

      // Step 3: Apply noise reduction (optional, can be enabled if needed)
      // const cleaned = await this.reduceNoise(normalized);

      // Step 4: Compress audio
      const compressed = await this.compressAudio(normalized, {
        codec: 'libmp3lame',
        bitrate: '64k', // Lower bitrate for voice
        sampleRate: 22050, // Lower sample rate for voice
        channels: 1, // Mono
        format: 'mp3',
      });

      // Step 5: Generate waveform
      const waveform = await this.generateWaveform(compressed);

      // Step 6: Get final metadata
      const metadata = await this.getAudioMetadata(compressed);

      logger.info('Voice note processing completed');
      return {
        compressed,
        waveform,
        metadata,
      };
    } catch (error: any) {
      logger.error('Voice note processing failed', error);
      throw new Error(`Voice note processing failed: ${error.message}`);
    }
  }

  /**
   * Convert audio to different format
   */
  async convertFormat(
    buffer: Buffer,
    targetFormat: 'mp3' | 'ogg' | 'wav' | 'm4a'
  ): Promise<Buffer> {
    let tempInputPath: string | null = null;
    let tempOutputPath: string | null = null;

    try {
      logger.info(`Converting audio to ${targetFormat}`);

      const tempId = uuidv4();
      tempInputPath = path.join(this.TEMP_DIR, `convert-input-${tempId}.tmp`);
      tempOutputPath = path.join(this.TEMP_DIR, `convert-output-${tempId}.${targetFormat}`);

      await fs.writeFile(tempInputPath, buffer);

      const codecMap: { [key: string]: string } = {
        mp3: 'libmp3lame',
        ogg: 'libvorbis',
        wav: 'pcm_s16le',
        m4a: 'aac',
      };

      await new Promise<void>((resolve, reject) => {
        ffmpeg(tempInputPath)
          .audioCodec(codecMap[targetFormat])
          .format(targetFormat)
          .output(tempOutputPath)
          .on('end', () => resolve())
          .on('error', (err) => reject(err))
          .run();
      });

      const convertedBuffer = await fs.readFile(tempOutputPath);
      logger.info('Audio format conversion completed');
      return convertedBuffer;
    } catch (error: any) {
      logger.error('Audio format conversion failed', error);
      throw new Error(`Audio format conversion failed: ${error.message}`);
    } finally {
      if (tempInputPath) await fs.unlink(tempInputPath).catch(() => {});
      if (tempOutputPath) await fs.unlink(tempOutputPath).catch(() => {});
    }
  }

  /**
   * Get audio duration
   */
  async getAudioDuration(buffer: Buffer): Promise<number> {
    const metadata = await this.getAudioMetadata(buffer);
    return metadata.duration;
  }

  /**
   * Cleanup temporary files
   */
  async cleanupTempFiles(filePaths: string[]): Promise<void> {
    for (const filePath of filePaths) {
      try {
        await fs.unlink(filePath);
      } catch (error) {
        logger.warn(`Failed to delete temp file: ${filePath}`, error);
      }
    }
  }
}

export default new AudioProcessingService();
