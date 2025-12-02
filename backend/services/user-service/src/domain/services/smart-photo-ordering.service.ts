import logger from '../../utils/logger';

export interface Photo {
  id: string;
  userId: string;
  url: string;
  position: number;
  uploadedAt: Date;
  metrics?: PhotoMetrics;
  aiScore?: number;
  faceDetected?: boolean;
  quality?: number;
}

export interface PhotoMetrics {
  views: number;
  likes: number;
  swipeRights: number;
  swipeLefts: number;
  engagementRate: number;
  conversionRate: number;
}

export interface PhotoScore {
  photoId: string;
  score: number;
  factors: {
    engagement: number;
    quality: number;
    recency: number;
    aiScore: number;
    faceScore: number;
  };
}

class SmartPhotoOrderingService {
  /**
   * Order photos intelligently based on performance
   */
  async orderPhotos(photos: Photo[]): Promise<Photo[]> {
    if (photos.length <= 1) {
      return photos;
    }

    // Calculate scores for each photo
    const photoScores = photos.map(photo => this.calculatePhotoScore(photo));

    // Sort by score (descending)
    photoScores.sort((a, b) => b.score - a.score);

    // Update positions
    const orderedPhotos = photoScores.map((scoreData, index) => {
      const photo = photos.find(p => p.id === scoreData.photoId)!;
      return {
        ...photo,
        position: index,
      };
    });

    logger.info('Photos reordered', {
      userId: photos[0].userId,
      photoCount: photos.length,
      topPhotoId: orderedPhotos[0].id,
    });

    return orderedPhotos;
  }

  /**
   * Calculate score for a single photo
   */
  private calculatePhotoScore(photo: Photo): PhotoScore {
    const factors = {
      engagement: this.calculateEngagementScore(photo),
      quality: this.calculateQualityScore(photo),
      recency: this.calculateRecencyScore(photo),
      aiScore: photo.aiScore || 50,
      faceScore: photo.faceDetected ? 100 : 50,
    };

    // Weighted average
    const weights = {
      engagement: 0.35,
      quality: 0.20,
      recency: 0.15,
      aiScore: 0.20,
      faceScore: 0.10,
    };

    const score =
      factors.engagement * weights.engagement +
      factors.quality * weights.quality +
      factors.recency * weights.recency +
      factors.aiScore * weights.aiScore +
      factors.faceScore * weights.faceScore;

    return {
      photoId: photo.id,
      score: Math.round(score),
      factors,
    };
  }

  /**
   * Calculate engagement score based on user interactions
   */
  private calculateEngagementScore(photo: Photo): number {
    if (!photo.metrics) {
      return 50; // Default score for new photos
    }

    const { views, likes, swipeRights, swipeLefts } = photo.metrics;

    if (views === 0) {
      return 50;
    }

    // Calculate engagement metrics
    const likeRate = (likes / views) * 100;
    const swipeRightRate = swipeRights / (swipeRights + swipeLefts) * 100;
    const engagementRate = photo.metrics.engagementRate || 0;
    const conversionRate = photo.metrics.conversionRate || 0;

    // Weighted score
    const score =
      likeRate * 0.25 +
      swipeRightRate * 0.35 +
      engagementRate * 0.25 +
      conversionRate * 0.15;

    return Math.min(Math.round(score), 100);
  }

  /**
   * Calculate quality score
   */
  private calculateQualityScore(photo: Photo): number {
    if (!photo.quality) {
      return 70; // Default quality
    }

    return photo.quality;
  }

  /**
   * Calculate recency score
   */
  private calculateRecencyScore(photo: Photo): number {
    const now = new Date();
    const uploadedAt = new Date(photo.uploadedAt);
    const daysSinceUpload = (now.getTime() - uploadedAt.getTime()) / (1000 * 60 * 60 * 24);

    // Fresh photos get higher score
    if (daysSinceUpload <= 7) return 100;
    if (daysSinceUpload <= 30) return 80;
    if (daysSinceUpload <= 90) return 60;
    if (daysSinceUpload <= 180) return 40;
    return 20;
  }

  /**
   * A/B test photo ordering
   */
  async runPhotoTest(userId: string, photos: Photo[], testDuration: number = 7): Promise<void> {
    // Store original order
    const originalOrder = [...photos];

    // Create test variant (random shuffle for comparison)
    const testOrder = this.shufflePhotos([...photos]);

    logger.info('Photo A/B test started', {
      userId,
      testDuration,
      photoCount: photos.length,
    });

    // In production, implement actual A/B testing logic
    // This would involve:
    // 1. Randomly showing original or test order to users
    // 2. Tracking metrics for each variant
    // 3. Analyzing results after test duration
    // 4. Selecting winning variant
  }

  /**
   * Get photo performance insights
   */
  getPhotoInsights(photo: Photo): string[] {
    const insights: string[] = [];

    if (!photo.metrics) {
      insights.push('Not enough data yet. Keep this photo active to gather insights.');
      return insights;
    }

    const { views, likes, swipeRights, swipeLefts } = photo.metrics;

    // Calculate rates
    const likeRate = views > 0 ? (likes / views) * 100 : 0;
    const swipeRightRate = (swipeRights + swipeLefts) > 0
      ? (swipeRights / (swipeRights + swipeLefts)) * 100
      : 0;

    // Generate insights
    if (likeRate > 70) {
      insights.push('This photo is performing excellently! Keep it prominent.');
    } else if (likeRate > 40) {
      insights.push('This photo has good engagement.');
    } else if (likeRate < 20 && views > 100) {
      insights.push('Consider replacing this photo with a higher quality one.');
    }

    if (swipeRightRate > 60) {
      insights.push('This photo generates positive interest.');
    } else if (swipeRightRate < 30 && (swipeRights + swipeLefts) > 50) {
      insights.push('This photo may be decreasing your match rate.');
    }

    if (!photo.faceDetected) {
      insights.push('Photos with clear face visibility typically perform better.');
    }

    const daysSinceUpload = (Date.now() - new Date(photo.uploadedAt).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceUpload > 180) {
      insights.push('Consider adding newer photos to keep your profile fresh.');
    }

    return insights;
  }

  /**
   * Optimize photo distribution (ensure variety)
   */
  optimizePhotoVariety(photos: Photo[]): Photo[] {
    // In production, use AI to detect photo types:
    // - Selfie
    // - Full body
    // - Activity/hobby
    // - Group photo
    // - Travel
    // Ensure good mix of different types

    // For now, just return smart ordering
    return photos;
  }

  /**
   * Get recommended primary photo
   */
  getRecommendedPrimaryPhoto(photos: Photo[]): Photo | null {
    if (photos.length === 0) {
      return null;
    }

    // Calculate scores
    const scores = photos.map(photo => ({
      photo,
      score: this.calculatePhotoScore(photo).score,
    }));

    // Sort by score
    scores.sort((a, b) => b.score - a.score);

    // Prefer photos with faces as primary
    const topPhotosWithFaces = scores.filter(s => s.photo.faceDetected);

    if (topPhotosWithFaces.length > 0) {
      return topPhotosWithFaces[0].photo;
    }

    return scores[0].photo;
  }

  /**
   * Update photo metrics after user interaction
   */
  async updatePhotoMetrics(
    photoId: string,
    interaction: 'view' | 'like' | 'swipe_right' | 'swipe_left' | 'match'
  ): Promise<void> {
    // In production, this would update metrics in database
    logger.debug('Photo metric updated', { photoId, interaction });
  }

  /**
   * Shuffle photos randomly (for testing)
   */
  private shufflePhotos(photos: Photo[]): Photo[] {
    const shuffled = [...photos];

    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled.map((photo, index) => ({
      ...photo,
      position: index,
    }));
  }

  /**
   * Generate photo performance report
   */
  generatePhotoReport(photos: Photo[]): any {
    const totalViews = photos.reduce((sum, p) => sum + (p.metrics?.views || 0), 0);
    const totalLikes = photos.reduce((sum, p) => sum + (p.metrics?.likes || 0), 0);
    const totalSwipeRights = photos.reduce((sum, p) => sum + (p.metrics?.swipeRights || 0), 0);
    const totalSwipeLefts = photos.reduce((sum, p) => sum + (p.metrics?.swipeLefts || 0), 0);

    const avgLikeRate = totalViews > 0 ? (totalLikes / totalViews) * 100 : 0;
    const avgSwipeRightRate = (totalSwipeRights + totalSwipeLefts) > 0
      ? (totalSwipeRights / (totalSwipeRights + totalSwipeLefts)) * 100
      : 0;

    const topPerformer = photos.reduce((best, photo) => {
      const bestScore = this.calculatePhotoScore(best).score;
      const photoScore = this.calculatePhotoScore(photo).score;
      return photoScore > bestScore ? photo : best;
    }, photos[0]);

    return {
      summary: {
        totalPhotos: photos.length,
        totalViews,
        totalLikes,
        avgLikeRate: avgLikeRate.toFixed(2) + '%',
        avgSwipeRightRate: avgSwipeRightRate.toFixed(2) + '%',
      },
      topPerformer: {
        id: topPerformer?.id,
        score: topPerformer ? this.calculatePhotoScore(topPerformer).score : 0,
      },
      recommendations: this.generatePhotoRecommendations(photos),
    };
  }

  /**
   * Generate photo recommendations
   */
  private generatePhotoRecommendations(photos: Photo[]): string[] {
    const recommendations: string[] = [];

    if (photos.length < 3) {
      recommendations.push('Add more photos (aim for 5-6) to showcase different aspects of your life');
    }

    const photosWithFaces = photos.filter(p => p.faceDetected).length;
    if (photosWithFaces === 0) {
      recommendations.push('Include at least one clear photo of your face');
    }

    const recentPhotos = photos.filter(p => {
      const days = (Date.now() - new Date(p.uploadedAt).getTime()) / (1000 * 60 * 60 * 24);
      return days <= 90;
    }).length;

    if (recentPhotos < photos.length * 0.5) {
      recommendations.push('Update your photos - more than half are over 3 months old');
    }

    return recommendations;
  }
}

export const smartPhotoOrderingService = new SmartPhotoOrderingService();
export default smartPhotoOrderingService;
