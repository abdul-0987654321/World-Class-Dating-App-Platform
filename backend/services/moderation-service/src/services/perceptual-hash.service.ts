/**
 * Perceptual Hash (pHash) Service
 *
 * Implements perceptual image hashing for duplicate and near-duplicate detection.
 * This is critical for CSAM detection as it can identify modified versions of known content.
 *
 * Features:
 * - Difference Hash (dHash) implementation
 * - Resistant to minor image modifications (resize, crop, color adjustment)
 * - Fast comparison using Hamming distance
 * - Handles common evasion techniques (filters, borders, rotation)
 */

import crypto from 'crypto';

import sharp from 'sharp';

import { createLogger } from '../utils/logger';

const logger = createLogger('perceptual-hash-service');

export class PerceptualHashService {
  private readonly HASH_SIZE = 8; // 8x8 grid = 64-bit hash
  private readonly RESIZE_WIDTH = this.HASH_SIZE + 1;
  private readonly RESIZE_HEIGHT = this.HASH_SIZE;

  /**
   * Generate perceptual hash (dHash) from image buffer
   *
   * Algorithm:
   * 1. Resize image to (HASH_SIZE+1) x HASH_SIZE
   * 2. Convert to grayscale
   * 3. Compare adjacent pixels
   * 4. Generate binary hash based on comparisons
   */
  async generateHash(imageBuffer: Buffer): Promise<string> {
    try {
      // Resize and convert to grayscale
      const processed = await sharp(imageBuffer)
        .resize(this.RESIZE_WIDTH, this.RESIZE_HEIGHT, {
          fit: 'fill',
          kernel: sharp.kernel.lanczos3,
        })
        .grayscale()
        .raw()
        .toBuffer();

      // Calculate dHash
      const hash = this.calculateDHash(processed, this.RESIZE_WIDTH, this.RESIZE_HEIGHT);

      logger.debug('Perceptual hash generated', {
        hashLength: hash.length,
        hashPreview: hash.substring(0, 16) + '...',
      });

      return hash;
    } catch (error: any) {
      logger.error('Failed to generate perceptual hash', error);
      throw new Error(`Perceptual hash generation failed: ${error.message}`);
    }
  }

  /**
   * Calculate difference hash (dHash)
   */
  private calculateDHash(pixels: Buffer, width: number, height: number): string {
    const bits: number[] = [];

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width - 1; x++) {
        const leftIndex = y * width + x;
        const rightIndex = leftIndex + 1;

        const leftPixel = pixels[leftIndex];
        const rightPixel = pixels[rightIndex];

        // Compare adjacent pixels
        bits.push(leftPixel < rightPixel ? 1 : 0);
      }
    }

    // Convert bits to hexadecimal string
    return this.bitsToHex(bits);
  }

  /**
   * Convert bit array to hexadecimal string
   */
  private bitsToHex(bits: number[]): string {
    let hex = '';

    for (let i = 0; i < bits.length; i += 4) {
      const nibble = (bits[i] << 3) | (bits[i + 1] << 2) | (bits[i + 2] << 1) | bits[i + 3];

      hex += nibble.toString(16);
    }

    return hex;
  }

  /**
   * Calculate Hamming distance between two hashes
   * Returns the number of differing bits
   */
  calculateHammingDistance(hash1: string, hash2: string): number {
    if (hash1.length !== hash2.length) {
      throw new Error('Hashes must be the same length');
    }

    let distance = 0;

    for (let i = 0; i < hash1.length; i++) {
      const int1 = parseInt(hash1[i], 16);
      const int2 = parseInt(hash2[i], 16);

      // XOR and count set bits
      let xor = int1 ^ int2;

      while (xor) {
        distance += xor & 1;
        xor >>= 1;
      }
    }

    return distance;
  }

  /**
   * Check if two hashes are similar within a threshold
   * Default threshold: 10 bits difference (out of 64)
   */
  areSimilar(hash1: string, hash2: string, threshold: number = 10): boolean {
    try {
      const distance = this.calculateHammingDistance(hash1, hash2);
      return distance <= threshold;
    } catch (error: any) {
      logger.error('Failed to compare hashes', error);
      return false;
    }
  }

  /**
   * Calculate similarity score (0-100)
   */
  calculateSimilarityScore(hash1: string, hash2: string): number {
    try {
      const distance = this.calculateHammingDistance(hash1, hash2);
      const maxDistance = hash1.length * 4; // 4 bits per hex character
      const similarity = ((maxDistance - distance) / maxDistance) * 100;
      return Math.round(similarity);
    } catch (error: any) {
      logger.error('Failed to calculate similarity score', error);
      return 0;
    }
  }

  /**
   * Generate multiple hash variants to detect common evasion techniques
   */
  async generateHashVariants(imageBuffer: Buffer): Promise<{
    original: string;
    rotated90: string;
    rotated180: string;
    rotated270: string;
    flipped: string;
    flippedVertical: string;
  }> {
    try {
      const [original, rotated90, rotated180, rotated270, flipped, flippedVertical] =
        await Promise.all([
          this.generateHash(imageBuffer),
          this.generateHashFromTransform(imageBuffer, 'rotate90'),
          this.generateHashFromTransform(imageBuffer, 'rotate180'),
          this.generateHashFromTransform(imageBuffer, 'rotate270'),
          this.generateHashFromTransform(imageBuffer, 'flip'),
          this.generateHashFromTransform(imageBuffer, 'flipVertical'),
        ]);

      return {
        original,
        rotated90,
        rotated180,
        rotated270,
        flipped,
        flippedVertical,
      };
    } catch (error: any) {
      logger.error('Failed to generate hash variants', error);
      throw error;
    }
  }

  /**
   * Generate hash from transformed image
   */
  private async generateHashFromTransform(imageBuffer: Buffer, transform: string): Promise<string> {
    let sharpInstance = sharp(imageBuffer);

    switch (transform) {
      case 'rotate90':
        sharpInstance = sharpInstance.rotate(90);
        break;
      case 'rotate180':
        sharpInstance = sharpInstance.rotate(180);
        break;
      case 'rotate270':
        sharpInstance = sharpInstance.rotate(270);
        break;
      case 'flip':
        sharpInstance = sharpInstance.flip();
        break;
      case 'flipVertical':
        sharpInstance = sharpInstance.flop();
        break;
    }

    const transformedBuffer = await sharpInstance.toBuffer();
    return this.generateHash(transformedBuffer);
  }

  /**
   * Find similar hashes in a list
   */
  findSimilarHashes(
    targetHash: string,
    hashList: Array<{ hash: string; id: string }>,
    threshold: number = 10
  ): Array<{ id: string; distance: number; similarity: number }> {
    const results: Array<{ id: string; distance: number; similarity: number }> = [];

    for (const item of hashList) {
      const distance = this.calculateHammingDistance(targetHash, item.hash);

      if (distance <= threshold) {
        const similarity = this.calculateSimilarityScore(targetHash, item.hash);
        results.push({
          id: item.id,
          distance,
          similarity,
        });
      }
    }

    // Sort by distance (most similar first)
    results.sort((a, b) => a.distance - b.distance);

    return results;
  }

  /**
   * Generate a cryptographic hash (SHA-256) for exact matching
   */
  generateCryptographicHash(imageBuffer: Buffer): string {
    return crypto.createHash('sha256').update(imageBuffer).digest('hex');
  }

  /**
   * Generate combined hash object with multiple hash types
   */
  async generateCombinedHash(imageBuffer: Buffer): Promise<{
    perceptual: string;
    cryptographic: string;
    variants: {
      original: string;
      rotated90: string;
      rotated180: string;
      rotated270: string;
      flipped: string;
      flippedVertical: string;
    };
  }> {
    const [perceptual, variants] = await Promise.all([
      this.generateHash(imageBuffer),
      this.generateHashVariants(imageBuffer),
    ]);

    const cryptographic = this.generateCryptographicHash(imageBuffer);

    return {
      perceptual,
      cryptographic,
      variants,
    };
  }

  /**
   * Validate hash format
   */
  isValidHash(hash: string): boolean {
    // dHash should be 16 hex characters (64 bits)
    const expectedLength = (this.HASH_SIZE * this.HASH_SIZE) / 4;
    return /^[0-9a-f]+$/i.test(hash) && hash.length === expectedLength;
  }

  /**
   * Normalize hash to lowercase
   */
  normalizeHash(hash: string): string {
    return hash.toLowerCase();
  }

  /**
   * Batch compare hash against multiple hashes
   * Returns all matches within threshold
   */
  batchCompare(
    targetHash: string,
    hashes: string[],
    threshold: number = 10
  ): Array<{ index: number; distance: number }> {
    const matches: Array<{ index: number; distance: number }> = [];

    for (let i = 0; i < hashes.length; i++) {
      try {
        const distance = this.calculateHammingDistance(targetHash, hashes[i]);
        if (distance <= threshold) {
          matches.push({ index: i, distance });
        }
      } catch (error) {
        // Skip invalid hashes
        continue;
      }
    }

    return matches;
  }

  /**
   * Get hash statistics
   */
  getHashStatistics(hash: string): {
    length: number;
    setBits: number;
    density: number;
  } {
    let setBits = 0;

    for (const char of hash) {
      const value = parseInt(char, 16);
      let bits = value;

      while (bits) {
        setBits += bits & 1;
        bits >>= 1;
      }
    }

    const totalBits = hash.length * 4;
    const density = (setBits / totalBits) * 100;

    return {
      length: hash.length,
      setBits,
      density: Math.round(density * 100) / 100,
    };
  }
}

export default new PerceptualHashService();
