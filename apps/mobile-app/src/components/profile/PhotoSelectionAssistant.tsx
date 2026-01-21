import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';

// Types
export interface PhotoAnalysis {
  photoId: string;
  uri: string;
  scores: {
    overall: number; // 0-100
    quality: number;
    lighting: number;
    composition: number;
    facial_visibility: number;
    authenticity: number;
    appeal: number;
  };
  detected_features: {
    faces_count: number;
    is_selfie: boolean;
    is_group_photo: boolean;
    has_filters: boolean;
    photo_type: 'portrait' | 'full_body' | 'activity' | 'group' | 'pet' | 'landscape';
    dominant_colors: string[];
    brightness_level: 'dark' | 'normal' | 'bright' | 'overexposed';
  };
  recommendations: PhotoRecommendation[];
  ranking: number; // 1-6 suggested order
  should_use: boolean;
}

export interface PhotoRecommendation {
  type: 'improvement' | 'positive' | 'warning';
  message: string;
  priority: 'high' | 'medium' | 'low';
}

export interface ProfilePhotoAdvice {
  current_count: number;
  optimal_count: number;
  missing_types: string[];
  diversity_score: number; // 0-100
  overall_quality: number; // 0-100
  suggestions: string[];
}

interface PhotoSelectionAssistantProps {
  photos: { id: string; uri: string }[];
  onPhotoOrderUpdate: (orderedPhotoIds: string[]) => void;
  onPhotoRemove?: (photoId: string) => void;
}

const { width } = Dimensions.get('window');
const PHOTO_SIZE = (width - 48) / 2;

const PhotoSelectionAssistant: React.FC<PhotoSelectionAssistantProps> = ({
  photos,
  onPhotoOrderUpdate,
  onPhotoRemove,
}) => {
  const [analyses, setAnalyses] = useState<PhotoAnalysis[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoAnalysis | null>(null);
  const [profileAdvice, setProfileAdvice] = useState<ProfilePhotoAdvice | null>(null);

  useEffect(() => {
    if (photos.length > 0) {
      analyzePhotos();
    }
  }, [photos]);

  const analyzePhotos = async () => {
    setLoading(true);
    try {
      const photoAnalyses: PhotoAnalysis[] = [];

      for (const photo of photos) {
        const analysis = await analyzeIndividualPhoto(photo);
        photoAnalyses.push(analysis);
      }

      // Rank photos by overall score
      photoAnalyses.sort((a, b) => b.scores.overall - a.scores.overall);
      photoAnalyses.forEach((analysis, index) => {
        analysis.ranking = index + 1;
      });

      setAnalyses(photoAnalyses);

      // Generate profile-level advice
      const advice = generateProfileAdvice(photoAnalyses);
      setProfileAdvice(advice);

      // Update photo order based on AI recommendations
      const orderedIds = photoAnalyses.map((a) => a.photoId);
      onPhotoOrderUpdate(orderedIds);
    } catch (error) {
      console.error('Photo analysis failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const analyzeIndividualPhoto = async (photo: {
    id: string;
    uri: string;
  }): Promise<PhotoAnalysis> => {
    // Simulate AI photo analysis
    // In production, this would call your ML model API

    // Simulate feature detection
    const detected_features = {
      faces_count: Math.random() > 0.5 ? 1 : Math.floor(Math.random() * 4),
      is_selfie: Math.random() > 0.6,
      is_group_photo: Math.random() > 0.7,
      has_filters: Math.random() > 0.5,
      photo_type: ['portrait', 'full_body', 'activity', 'group', 'pet', 'landscape'][
        Math.floor(Math.random() * 6)
      ] as any,
      dominant_colors: ['#3b82f6', '#ec4899', '#10b981'],
      brightness_level: ['dark', 'normal', 'bright', 'overexposed'][
        Math.floor(Math.random() * 4)
      ] as any,
    };

    // Calculate quality scores
    const quality = calculateQualityScore(detected_features);
    const lighting = calculateLightingScore(detected_features.brightness_level);
    const composition = calculateCompositionScore(detected_features);
    const facial_visibility = calculateFacialVisibilityScore(detected_features);
    const authenticity = calculateAuthenticityScore(detected_features);
    const appeal = calculateAppealScore(detected_features);

    const overall = Math.round(
      quality * 0.25 +
        lighting * 0.15 +
        composition * 0.15 +
        facial_visibility * 0.2 +
        authenticity * 0.15 +
        appeal * 0.1
    );

    // Generate recommendations
    const recommendations = generatePhotoRecommendations(detected_features, {
      quality,
      lighting,
      composition,
      facial_visibility,
      authenticity,
      appeal,
    });

    return {
      photoId: photo.id,
      uri: photo.uri,
      scores: {
        overall,
        quality,
        lighting,
        composition,
        facial_visibility,
        authenticity,
        appeal,
      },
      detected_features,
      recommendations,
      ranking: 0, // Will be set after sorting
      should_use: overall >= 60,
    };
  };

  const calculateQualityScore = (features: any): number => {
    let score = 70;
    if (features.brightness_level === 'normal') score += 15;
    if (features.brightness_level === 'bright') score += 10;
    if (features.brightness_level === 'overexposed') score -= 20;
    if (features.brightness_level === 'dark') score -= 15;
    return Math.max(0, Math.min(100, score));
  };

  const calculateLightingScore = (brightness: string): number => {
    const scores = {
      dark: 40,
      normal: 85,
      bright: 90,
      overexposed: 50,
    };
    return scores[brightness as keyof typeof scores];
  };

  const calculateCompositionScore = (features: any): number => {
    let score = 70;
    if (features.photo_type === 'portrait') score += 20;
    if (features.photo_type === 'full_body') score += 15;
    if (features.photo_type === 'activity') score += 10;
    if (features.photo_type === 'landscape') score -= 30;
    if (features.is_selfie) score -= 5;
    return Math.max(0, Math.min(100, score));
  };

  const calculateFacialVisibilityScore = (features: any): number => {
    let score = 60;
    if (features.faces_count === 1) score += 30;
    if (features.faces_count === 0) score -= 40;
    if (features.faces_count > 3) score -= 20;
    if (features.is_group_photo) score -= 15;
    return Math.max(0, Math.min(100, score));
  };

  const calculateAuthenticityScore = (features: any): number => {
    let score = 80;
    if (features.has_filters) score -= 20;
    if (features.is_selfie) score -= 5;
    return Math.max(0, Math.min(100, score));
  };

  const calculateAppealScore = (features: any): number => {
    let score = 70;
    if (features.photo_type === 'activity') score += 15;
    if (features.photo_type === 'portrait') score += 10;
    if (features.faces_count === 1) score += 10;
    return Math.max(0, Math.min(100, score));
  };

  const generatePhotoRecommendations = (features: any, scores: any): PhotoRecommendation[] => {
    const recommendations: PhotoRecommendation[] = [];

    // Lighting recommendations
    if (features.brightness_level === 'dark') {
      recommendations.push({
        type: 'improvement',
        message: 'Try retaking in better lighting - natural daylight works best',
        priority: 'high',
      });
    } else if (features.brightness_level === 'overexposed') {
      recommendations.push({
        type: 'improvement',
        message: 'Photo is overexposed - avoid direct harsh sunlight',
        priority: 'medium',
      });
    }

    // Face visibility
    if (features.faces_count === 0) {
      recommendations.push({
        type: 'warning',
        message: 'No face detected - make sure your face is clearly visible',
        priority: 'high',
      });
    } else if (features.faces_count > 1) {
      recommendations.push({
        type: 'warning',
        message: 'Multiple people detected - use solo photos for better results',
        priority: 'high',
      });
    }

    // Filter usage
    if (features.has_filters) {
      recommendations.push({
        type: 'improvement',
        message: 'Heavy filters detected - natural photos perform better',
        priority: 'medium',
      });
    }

    // Photo type
    if (features.photo_type === 'landscape') {
      recommendations.push({
        type: 'warning',
        message: 'Landscape photo without people - not recommended for profile',
        priority: 'high',
      });
    }

    // Selfies
    if (features.is_selfie) {
      recommendations.push({
        type: 'improvement',
        message: 'Selfie detected - mix in photos taken by others',
        priority: 'low',
      });
    }

    // Positive feedback
    if (scores.overall >= 80) {
      recommendations.push({
        type: 'positive',
        message: 'Great photo! This should be near the top of your profile',
        priority: 'high',
      });
    }

    return recommendations;
  };

  const generateProfileAdvice = (photoAnalyses: PhotoAnalysis[]): ProfilePhotoAdvice => {
    const photo_types = photoAnalyses.map((a) => a.detected_features.photo_type);
    const unique_types = new Set(photo_types);

    const missing_types: string[] = [];
    if (!unique_types.has('portrait')) missing_types.push('Close-up portrait');
    if (!unique_types.has('full_body')) missing_types.push('Full body shot');
    if (!unique_types.has('activity')) missing_types.push('Activity/hobby photo');

    const diversity_score = Math.min(100, (unique_types.size / 5) * 100);
    const overall_quality = Math.round(
      photoAnalyses.reduce((sum, a) => sum + a.scores.overall, 0) / photoAnalyses.length
    );

    const suggestions: string[] = [];

    if (photoAnalyses.length < 4) {
      suggestions.push('Add more photos - 4-6 photos is ideal');
    }

    if (diversity_score < 60) {
      suggestions.push('Vary your photo types to show different aspects of your life');
    }

    if (photoAnalyses.filter((a) => a.detected_features.is_selfie).length > 2) {
      suggestions.push('Too many selfies - add photos taken by others');
    }

    if (overall_quality < 70) {
      suggestions.push('Consider replacing lower quality photos with better lit, clearer images');
    }

    const group_photos = photoAnalyses.filter((a) => a.detected_features.is_group_photo).length;
    if (group_photos > photoAnalyses.length / 2) {
      suggestions.push('Reduce group photos - people should easily identify you');
    }

    return {
      current_count: photoAnalyses.length,
      optimal_count: 5,
      missing_types,
      diversity_score,
      overall_quality,
      suggestions,
    };
  };

  const getScoreColor = (score: number): string => {
    if (score >= 80) return '#10b981';
    if (score >= 60) return '#3b82f6';
    if (score >= 40) return '#f59e0b';
    return '#ef4444';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ec4899" />
        <Text style={styles.loadingText}>Analyzing your photos with AI...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>📸 Photo Selection Assistant</Text>
        <Text style={styles.subtitle}>AI-powered photo analysis and ranking</Text>
      </View>

      {profileAdvice && (
        <View style={styles.adviceCard}>
          <View style={styles.adviceHeader}>
            <Text style={styles.adviceTitle}>Profile Overview</Text>
            <Text
              style={[styles.qualityScore, { color: getScoreColor(profileAdvice.overall_quality) }]}
            >
              {profileAdvice.overall_quality}/100
            </Text>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profileAdvice.current_count}</Text>
              <Text style={styles.statLabel}>Photos</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profileAdvice.diversity_score}</Text>
              <Text style={styles.statLabel}>Diversity</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profileAdvice.optimal_count}</Text>
              <Text style={styles.statLabel}>Optimal</Text>
            </View>
          </View>

          {profileAdvice.suggestions.length > 0 && (
            <View style={styles.suggestionsContainer}>
              <Text style={styles.suggestionsTitle}>💡 Suggestions:</Text>
              {profileAdvice.suggestions.map((suggestion, index) => (
                <Text key={index} style={styles.suggestionText}>
                  • {suggestion}
                </Text>
              ))}
            </View>
          )}

          {profileAdvice.missing_types.length > 0 && (
            <View style={styles.missingTypes}>
              <Text style={styles.missingTitle}>Missing photo types:</Text>
              <Text style={styles.missingText}>{profileAdvice.missing_types.join(', ')}</Text>
            </View>
          )}
        </View>
      )}

      <View style={styles.photosSection}>
        <Text style={styles.sectionTitle}>Your Photos (Ranked by AI)</Text>

        <View style={styles.photosGrid}>
          {analyses.map((analysis) => (
            <TouchableOpacity
              key={analysis.photoId}
              style={styles.photoCard}
              onPress={() => setSelectedPhoto(analysis)}
            >
              <Image source={{ uri: analysis.uri }} style={styles.photoImage} />

              <View style={styles.photoOverlay}>
                <View style={styles.rankBadge}>
                  <Text style={styles.rankText}>#{analysis.ranking}</Text>
                </View>

                <View
                  style={[
                    styles.scoreBadge,
                    { backgroundColor: getScoreColor(analysis.scores.overall) },
                  ]}
                >
                  <Text style={styles.scoreText}>{analysis.scores.overall}</Text>
                </View>
              </View>

              {!analysis.should_use && (
                <View style={styles.warningBadge}>
                  <Text style={styles.warningText}>⚠️ Consider replacing</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {selectedPhoto && (
        <View style={styles.detailsModal}>
          <TouchableOpacity style={styles.closeButton} onPress={() => setSelectedPhoto(null)}>
            <Text style={styles.closeButtonText}>✕ Close</Text>
          </TouchableOpacity>

          <Image source={{ uri: selectedPhoto.uri }} style={styles.detailImage} />

          <View style={styles.detailsContent}>
            <View style={styles.detailHeader}>
              <Text style={styles.detailTitle}>Photo #{selectedPhoto.ranking}</Text>
              <Text
                style={[styles.detailScore, { color: getScoreColor(selectedPhoto.scores.overall) }]}
              >
                {selectedPhoto.scores.overall}/100
              </Text>
            </View>

            <View style={styles.scoresBreakdown}>
              <Text style={styles.breakdownTitle}>Score Breakdown:</Text>

              {Object.entries(selectedPhoto.scores).map(([key, value]) => {
                if (key === 'overall') return null;
                return (
                  <View key={key} style={styles.scoreRow}>
                    <Text style={styles.scoreLabel}>
                      {key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                    </Text>
                    <View style={styles.scoreBarContainer}>
                      <View
                        style={[
                          styles.scoreBar,
                          { width: `${value}%`, backgroundColor: getScoreColor(value as number) },
                        ]}
                      />
                    </View>
                    <Text style={styles.scoreValue}>{value}</Text>
                  </View>
                );
              })}
            </View>

            {selectedPhoto.recommendations.length > 0 && (
              <View style={styles.recommendationsContainer}>
                <Text style={styles.recommendationsTitle}>Recommendations:</Text>
                {selectedPhoto.recommendations.map((rec, index) => (
                  <View
                    key={index}
                    style={[
                      styles.recommendationCard,
                      {
                        backgroundColor:
                          rec.type === 'positive'
                            ? '#ecfdf5'
                            : rec.type === 'warning'
                              ? '#fef2f2'
                              : '#f0f9ff',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.recommendationText,
                        {
                          color:
                            rec.type === 'positive'
                              ? '#059669'
                              : rec.type === 'warning'
                                ? '#dc2626'
                                : '#2563eb',
                        },
                      ]}
                    >
                      {rec.type === 'positive' ? '✅' : rec.type === 'warning' ? '⚠️' : '💡'}{' '}
                      {rec.message}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {onPhotoRemove && !selectedPhoto.should_use && (
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => {
                  onPhotoRemove(selectedPhoto.photoId);
                  setSelectedPhoto(null);
                }}
              >
                <Text style={styles.removeButtonText}>🗑️ Remove This Photo</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  header: {
    padding: 20,
    backgroundColor: '#f9fafb',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  adviceCard: {
    margin: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  adviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  adviceTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  qualityScore: {
    fontSize: 24,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    paddingVertical: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  suggestionsContainer: {
    marginBottom: 12,
  },
  suggestionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  suggestionText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 6,
    lineHeight: 20,
  },
  missingTypes: {
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    padding: 12,
  },
  missingTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#92400e',
    marginBottom: 4,
  },
  missingText: {
    fontSize: 13,
    color: '#78350f',
  },
  photosSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  photoCard: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  photoOverlay: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rankBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  rankText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  scoreBadge: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  scoreText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  warningBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    padding: 6,
  },
  warningText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  detailsModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#fff',
    zIndex: 1000,
  },
  closeButton: {
    position: 'absolute',
    top: 40,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    zIndex: 1001,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  detailImage: {
    width: '100%',
    height: 300,
  },
  detailsContent: {
    padding: 20,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  detailTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  detailScore: {
    fontSize: 32,
    fontWeight: '700',
  },
  scoresBreakdown: {
    marginBottom: 20,
  },
  breakdownTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  scoreLabel: {
    width: 120,
    fontSize: 13,
    color: '#6b7280',
  },
  scoreBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    marginHorizontal: 12,
    overflow: 'hidden',
  },
  scoreBar: {
    height: '100%',
    borderRadius: 4,
  },
  scoreValue: {
    width: 30,
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'right',
  },
  recommendationsContainer: {
    marginBottom: 20,
  },
  recommendationsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  recommendationCard: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  recommendationText: {
    fontSize: 14,
    lineHeight: 20,
  },
  removeButton: {
    backgroundColor: '#ef4444',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  removeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default PhotoSelectionAssistant;
