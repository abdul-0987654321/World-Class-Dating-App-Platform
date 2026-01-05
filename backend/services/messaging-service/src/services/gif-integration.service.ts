import axios from 'axios';

import { GifMetadata } from '../types/enhanced-types';
import { createLogger } from '../utils/logger';

const logger = createLogger('gif-integration-service');

interface TenorGif {
  id: string;
  url: string;
  media: {
    tinygif: { url: string; dims: number[]; size: number };
    gif: { url: string; dims: number[]; size: number };
    mediumgif: { url: string; dims: number[]; size: number };
  }[];
}

interface GiphyGif {
  id: string;
  images: {
    original: { url: string; width: string; height: string };
    preview_gif: { url: string; width: string; height: string };
    fixed_height: { url: string; width: string; height: string };
  };
}

export class GifIntegrationService {
  private tenorApiKey: string;
  private giphyApiKey: string;
  private tenorBaseUrl = 'https://tenor.googleapis.com/v2';
  private giphyBaseUrl = 'https://api.giphy.com/v1/gifs';

  constructor() {
    this.tenorApiKey = process.env.TENOR_API_KEY || '';
    this.giphyApiKey = process.env.GIPHY_API_KEY || '';

    if (!this.tenorApiKey) {
      logger.warn('TENOR_API_KEY not configured. Tenor GIF search will not work.');
    }
    if (!this.giphyApiKey) {
      logger.warn('GIPHY_API_KEY not configured. Giphy GIF search will not work.');
    }
  }

  /**
   * Search GIFs using Tenor
   */
  async searchTenorGifs(query: string, limit: number = 20): Promise<GifMetadata[]> {
    try {
      if (!this.tenorApiKey) {
        throw new Error('Tenor API key not configured');
      }

      const response = await axios.get(`${this.tenorBaseUrl}/search`, {
        params: {
          q: query,
          key: this.tenorApiKey,
          limit,
          media_filter: 'gif,tinygif',
          contentfilter: 'medium', // Filter out NSFW content
        },
      });

      const gifs: GifMetadata[] = response.data.results.map((gif: any) => ({
        gifUrl: gif.media_formats.gif?.url || gif.media_formats.mediumgif?.url,
        gifPreviewUrl: gif.media_formats.tinygif?.url || gif.media_formats.nanogif?.url,
        tenorId: gif.id,
        width: gif.media_formats.gif?.dims?.[0] || 0,
        height: gif.media_formats.gif?.dims?.[1] || 0,
      }));

      logger.info('Tenor GIF search completed', { query, resultsCount: gifs.length });
      return gifs;
    } catch (error: any) {
      logger.error('Tenor GIF search failed:', error);
      throw new Error('Failed to search Tenor GIFs');
    }
  }

  /**
   * Get trending GIFs from Tenor
   */
  async getTenorTrending(limit: number = 20): Promise<GifMetadata[]> {
    try {
      if (!this.tenorApiKey) {
        throw new Error('Tenor API key not configured');
      }

      const response = await axios.get(`${this.tenorBaseUrl}/featured`, {
        params: {
          key: this.tenorApiKey,
          limit,
          media_filter: 'gif,tinygif',
          contentfilter: 'medium',
        },
      });

      const gifs: GifMetadata[] = response.data.results.map((gif: any) => ({
        gifUrl: gif.media_formats.gif?.url || gif.media_formats.mediumgif?.url,
        gifPreviewUrl: gif.media_formats.tinygif?.url || gif.media_formats.nanogif?.url,
        tenorId: gif.id,
        width: gif.media_formats.gif?.dims?.[0] || 0,
        height: gif.media_formats.gif?.dims?.[1] || 0,
      }));

      logger.info('Tenor trending GIFs retrieved', { resultsCount: gifs.length });
      return gifs;
    } catch (error: any) {
      logger.error('Tenor trending GIFs failed:', error);
      throw new Error('Failed to get Tenor trending GIFs');
    }
  }

  /**
   * Search GIFs using Giphy
   */
  async searchGiphyGifs(query: string, limit: number = 20): Promise<GifMetadata[]> {
    try {
      if (!this.giphyApiKey) {
        throw new Error('Giphy API key not configured');
      }

      const response = await axios.get(`${this.giphyBaseUrl}/search`, {
        params: {
          q: query,
          api_key: this.giphyApiKey,
          limit,
          rating: 'pg-13', // Filter out NSFW content
          lang: 'en',
        },
      });

      const gifs: GifMetadata[] = response.data.data.map((gif: GiphyGif) => ({
        gifUrl: gif.images.original.url,
        gifPreviewUrl: gif.images.preview_gif?.url || gif.images.fixed_height.url,
        giphyId: gif.id,
        width: parseInt(gif.images.original.width, 10),
        height: parseInt(gif.images.original.height, 10),
      }));

      logger.info('Giphy GIF search completed', { query, resultsCount: gifs.length });
      return gifs;
    } catch (error: any) {
      logger.error('Giphy GIF search failed:', error);
      throw new Error('Failed to search Giphy GIFs');
    }
  }

  /**
   * Get trending GIFs from Giphy
   */
  async getGiphyTrending(limit: number = 20): Promise<GifMetadata[]> {
    try {
      if (!this.giphyApiKey) {
        throw new Error('Giphy API key not configured');
      }

      const response = await axios.get(`${this.giphyBaseUrl}/trending`, {
        params: {
          api_key: this.giphyApiKey,
          limit,
          rating: 'pg-13',
        },
      });

      const gifs: GifMetadata[] = response.data.data.map((gif: GiphyGif) => ({
        gifUrl: gif.images.original.url,
        gifPreviewUrl: gif.images.preview_gif?.url || gif.images.fixed_height.url,
        giphyId: gif.id,
        width: parseInt(gif.images.original.width, 10),
        height: parseInt(gif.images.original.height, 10),
      }));

      logger.info('Giphy trending GIFs retrieved', { resultsCount: gifs.length });
      return gifs;
    } catch (error: any) {
      logger.error('Giphy trending GIFs failed:', error);
      throw new Error('Failed to get Giphy trending GIFs');
    }
  }

  /**
   * Search GIFs from both Tenor and Giphy combined
   */
  async searchGifs(query: string, limit: number = 20): Promise<GifMetadata[]> {
    try {
      const results: GifMetadata[] = [];

      // Try Tenor first
      if (this.tenorApiKey) {
        try {
          const tenorGifs = await this.searchTenorGifs(query, Math.ceil(limit / 2));
          results.push(...tenorGifs);
        } catch (error) {
          logger.warn('Tenor search failed, continuing with Giphy only');
        }
      }

      // Try Giphy
      if (this.giphyApiKey && results.length < limit) {
        try {
          const giphyGifs = await this.searchGiphyGifs(query, limit - results.length);
          results.push(...giphyGifs);
        } catch (error) {
          logger.warn('Giphy search failed');
        }
      }

      return results.slice(0, limit);
    } catch (error: any) {
      logger.error('Combined GIF search failed:', error);
      throw new Error('Failed to search GIFs');
    }
  }

  /**
   * Get trending GIFs from both services
   */
  async getTrendingGifs(limit: number = 20): Promise<GifMetadata[]> {
    try {
      const results: GifMetadata[] = [];

      // Try Tenor first
      if (this.tenorApiKey) {
        try {
          const tenorGifs = await this.getTenorTrending(Math.ceil(limit / 2));
          results.push(...tenorGifs);
        } catch (error) {
          logger.warn('Tenor trending failed, continuing with Giphy only');
        }
      }

      // Try Giphy
      if (this.giphyApiKey && results.length < limit) {
        try {
          const giphyGifs = await this.getGiphyTrending(limit - results.length);
          results.push(...giphyGifs);
        } catch (error) {
          logger.warn('Giphy trending failed');
        }
      }

      return results.slice(0, limit);
    } catch (error: any) {
      logger.error('Combined trending GIFs failed:', error);
      throw new Error('Failed to get trending GIFs');
    }
  }

  /**
   * Get GIF categories for browsing
   */
  getGifCategories(): string[] {
    return [
      'Happy',
      'Love',
      'Excited',
      'Funny',
      'Sad',
      'Agree',
      'Disagree',
      'Thank You',
      'Good Morning',
      'Good Night',
      'Dance',
      'Celebration',
      'Hearts',
      'Thinking',
      'Wow',
    ];
  }

  /**
   * Validate GIF metadata
   */
  validateGifMetadata(metadata: Partial<GifMetadata>): boolean {
    return !!(metadata.gifUrl && metadata.gifPreviewUrl && (metadata.tenorId || metadata.giphyId));
  }
}

export const gifIntegrationService = new GifIntegrationService();
export default gifIntegrationService;
