import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';

// Types
export interface UserBehaviorData {
  swipeHistory: SwipeAction[];
  conversationMetrics: ConversationMetric[];
  profileViewDuration: Record<string, number>;
  messageResponseRate: number;
  averageConversationLength: number;
  preferredAgeRange: { min: number; max: number };
  preferredDistance: number;
  activeTimePatterns: TimePattern[];
}

export interface SwipeAction {
  profileId: string;
  action: 'like' | 'pass' | 'super_like';
  timestamp: Date;
  profileAttributes: ProfileAttributes;
}

export interface ProfileAttributes {
  age: number;
  distance: number;
  education: string;
  occupation: string;
  interests: string[];
  height: number;
  hasPhotos: number;
  hasBio: boolean;
  photoQuality: number; // 0-1
}

export interface ConversationMetric {
  matchId: string;
  messageCount: number;
  responseTime: number; // average in seconds
  conversationDuration: number; // in days
  ledToDate: boolean;
  qualityScore: number; // 0-1
}

export interface TimePattern {
  dayOfWeek: number;
  hourOfDay: number;
  activityLevel: number; // 0-1
}

export interface MatchScore {
  profileId: string;
  overallScore: number; // 0-100
  breakdown: {
    behavioralCompatibility: number;
    attributeSimilarity: number;
    conversationPotential: number;
    successProbability: number;
  };
  reasoning: string[];
  confidence: number; // 0-1
}

export interface LearningModel {
  preferredAttributes: Record<string, number>; // attribute -> weight
  successFactors: SuccessFactor[];
  avoidancePatterns: AvoidancePattern[];
  lastUpdated: Date;
  accuracy: number; // 0-1
}

interface SuccessFactor {
  attribute: string;
  weight: number;
  confidence: number;
}

interface AvoidancePattern {
  attribute: string;
  threshold: number;
  frequency: number;
}

interface SmartMatchingAlgorithmProps {
  userId: string;
  candidateProfiles: any[];
  onMatchScoreCalculated?: (scores: MatchScore[]) => void;
}

const SmartMatchingAlgorithm: React.FC<SmartMatchingAlgorithmProps> = ({
  userId,
  candidateProfiles,
  onMatchScoreCalculated,
}) => {
  const [loading, setLoading] = useState(false);
  const [matchScores, setMatchScores] = useState<MatchScore[]>([]);
  const [learningModel, setLearningModel] = useState<LearningModel | null>(null);
  const [showDetails, setShowDetails] = useState<string | null>(null);

  useEffect(() => {
    initializeLearningModel();
  }, [userId]);

  useEffect(() => {
    if (learningModel && candidateProfiles.length > 0) {
      calculateMatchScores();
    }
  }, [learningModel, candidateProfiles]);

  const initializeLearningModel = async () => {
    setLoading(true);
    try {
      // Simulate fetching user behavior data
      const behaviorData = await fetchUserBehaviorData(userId);

      // Build learning model from behavior
      const model = buildLearningModel(behaviorData);
      setLearningModel(model);
    } catch (error) {
      console.error('Failed to initialize learning model:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserBehaviorData = async (userId: string): Promise<UserBehaviorData> => {
    // In production, this would fetch from your backend
    // Simulated data for demonstration
    return {
      swipeHistory: [],
      conversationMetrics: [],
      profileViewDuration: {},
      messageResponseRate: 0.75,
      averageConversationLength: 15,
      preferredAgeRange: { min: 25, max: 35 },
      preferredDistance: 25,
      activeTimePatterns: [],
    };
  };

  const buildLearningModel = (behaviorData: UserBehaviorData): LearningModel => {
    // Analyze swipe patterns
    const likedProfiles = behaviorData.swipeHistory.filter(
      (s) => s.action === 'like' || s.action === 'super_like'
    );
    const passedProfiles = behaviorData.swipeHistory.filter((s) => s.action === 'pass');

    // Calculate attribute preferences
    const preferredAttributes: Record<string, number> = {};

    // Age preference learning
    if (likedProfiles.length > 0) {
      const avgLikedAge =
        likedProfiles.reduce((sum, s) => sum + s.profileAttributes.age, 0) / likedProfiles.length;
      preferredAttributes['age'] = avgLikedAge;
    }

    // Distance preference learning
    const avgLikedDistance =
      likedProfiles.length > 0
        ? likedProfiles.reduce((sum, s) => sum + s.profileAttributes.distance, 0) /
          likedProfiles.length
        : 15;
    preferredAttributes['distance'] = avgLikedDistance;

    // Photo quality importance
    const photoQualityWeight =
      likedProfiles.length > 0
        ? likedProfiles.reduce((sum, s) => sum + s.profileAttributes.photoQuality, 0) /
          likedProfiles.length
        : 0.7;
    preferredAttributes['photoQuality'] = photoQualityWeight;

    // Identify success factors from conversations
    const successFactors: SuccessFactor[] = [];
    const successfulConversations = behaviorData.conversationMetrics.filter(
      (c) => c.ledToDate || c.qualityScore > 0.7
    );

    if (successfulConversations.length > 0) {
      successFactors.push({
        attribute: 'responseRate',
        weight: 0.8,
        confidence: 0.85,
      });

      successFactors.push({
        attribute: 'conversationLength',
        weight: 0.6,
        confidence: 0.75,
      });
    }

    // Identify avoidance patterns
    const avoidancePatterns: AvoidancePattern[] = [];
    if (passedProfiles.length > 10) {
      // Find common attributes in passed profiles
      const avgPassedDistance =
        passedProfiles.reduce((sum, s) => sum + s.profileAttributes.distance, 0) /
        passedProfiles.length;

      if (avgPassedDistance > 30) {
        avoidancePatterns.push({
          attribute: 'distance',
          threshold: 30,
          frequency: 0.7,
        });
      }
    }

    return {
      preferredAttributes,
      successFactors,
      avoidancePatterns,
      lastUpdated: new Date(),
      accuracy: calculateModelAccuracy(likedProfiles.length, passedProfiles.length),
    };
  };

  const calculateModelAccuracy = (likesCount: number, passesCount: number): number => {
    const totalActions = likesCount + passesCount;
    if (totalActions < 10) return 0.5; // Low confidence with little data
    if (totalActions < 50) return 0.65;
    if (totalActions < 100) return 0.75;
    if (totalActions < 500) return 0.85;
    return 0.95; // High confidence with lots of data
  };

  const calculateMatchScores = async () => {
    if (!learningModel) return;

    setLoading(true);
    try {
      const scores: MatchScore[] = [];

      for (const profile of candidateProfiles) {
        const score = calculateIndividualMatchScore(profile, learningModel);
        scores.push(score);
      }

      // Sort by overall score
      scores.sort((a, b) => b.overallScore - a.overallScore);

      setMatchScores(scores);
      onMatchScoreCalculated?.(scores);
    } catch (error) {
      console.error('Failed to calculate match scores:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateIndividualMatchScore = (profile: any, model: LearningModel): MatchScore => {
    // 1. Behavioral Compatibility (40% weight)
    const behavioralScore = calculateBehavioralCompatibility(profile, model);

    // 2. Attribute Similarity (30% weight)
    const attributeScore = calculateAttributeSimilarity(profile, model);

    // 3. Conversation Potential (20% weight)
    const conversationScore = calculateConversationPotential(profile, model);

    // 4. Success Probability (10% weight)
    const successScore = calculateSuccessProbability(profile, model);

    // Weighted overall score
    const overallScore =
      behavioralScore * 0.4 + attributeScore * 0.3 + conversationScore * 0.2 + successScore * 0.1;

    const reasoning: string[] = [];

    if (behavioralScore > 70) {
      reasoning.push('Strong behavioral compatibility based on your past preferences');
    }

    if (attributeScore > 75) {
      reasoning.push('Matches attributes you typically like');
    }

    if (conversationScore > 65) {
      reasoning.push('High potential for engaging conversations');
    }

    if (successScore > 70) {
      reasoning.push('High probability of successful match');
    }

    return {
      profileId: profile.id,
      overallScore: Math.round(overallScore),
      breakdown: {
        behavioralCompatibility: Math.round(behavioralScore),
        attributeSimilarity: Math.round(attributeScore),
        conversationPotential: Math.round(conversationScore),
        successProbability: Math.round(successScore),
      },
      reasoning,
      confidence: model.accuracy,
    };
  };

  const calculateBehavioralCompatibility = (profile: any, model: LearningModel): number => {
    let score = 70; // Base score

    // Check age preference
    const agePreference = model.preferredAttributes['age'];
    if (agePreference) {
      const ageDiff = Math.abs(profile.age - agePreference);
      score += (10 - ageDiff) * 2; // Closer age = higher score
    }

    // Check distance preference
    const distancePreference = model.preferredAttributes['distance'];
    if (distancePreference && profile.distance) {
      if (profile.distance <= distancePreference) {
        score += 10;
      } else {
        score -= (profile.distance - distancePreference) * 0.5;
      }
    }

    // Check avoidance patterns
    for (const pattern of model.avoidancePatterns) {
      if (pattern.attribute === 'distance' && profile.distance > pattern.threshold) {
        score -= 20;
      }
    }

    return Math.max(0, Math.min(100, score));
  };

  const calculateAttributeSimilarity = (profile: any, model: LearningModel): number => {
    let score = 60; // Base score

    // Photo quality check
    const photoQualityPref = model.preferredAttributes['photoQuality'];
    if (photoQualityPref && profile.photoQuality) {
      score += (profile.photoQuality / photoQualityPref) * 20;
    }

    // Has bio
    if (profile.bio && profile.bio.length > 50) {
      score += 10;
    }

    // Number of photos
    if (profile.photos && profile.photos.length >= 4) {
      score += 10;
    }

    return Math.max(0, Math.min(100, score));
  };

  const calculateConversationPotential = (profile: any, model: LearningModel): number => {
    let score = 65; // Base score

    // Shared interests boost
    if (profile.interests && profile.interests.length > 0) {
      score += Math.min(20, profile.interests.length * 3);
    }

    // Bio quality
    if (profile.bio && profile.bio.length > 100) {
      score += 10;
    }

    // Active recently
    if (
      profile.lastActive &&
      new Date(profile.lastActive) > new Date(Date.now() - 24 * 60 * 60 * 1000)
    ) {
      score += 5;
    }

    return Math.max(0, Math.min(100, score));
  };

  const calculateSuccessProbability = (profile: any, model: LearningModel): number => {
    let score = 50; // Base score

    // Apply success factors
    for (const factor of model.successFactors) {
      score += factor.weight * factor.confidence * 20;
    }

    // Verified profiles have higher success rate
    if (profile.verified) {
      score += 15;
    }

    // Premium users tend to be more serious
    if (profile.isPremium) {
      score += 10;
    }

    return Math.max(0, Math.min(100, score));
  };

  const getScoreColor = (score: number): string => {
    if (score >= 80) return '#10b981'; // green
    if (score >= 60) return '#3b82f6'; // blue
    if (score >= 40) return '#f59e0b'; // orange
    return '#ef4444'; // red
  };

  const getScoreLabel = (score: number): string => {
    if (score >= 80) return 'Excellent Match';
    if (score >= 60) return 'Good Match';
    if (score >= 40) return 'Moderate Match';
    return 'Low Match';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ec4899" />
        <Text style={styles.loadingText}>Analyzing compatibility...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {learningModel && (
        <View style={styles.modelInfo}>
          <Text style={styles.modelTitle}>Learning Model Active</Text>
          <Text style={styles.modelText}>
            Accuracy: {Math.round(learningModel.accuracy * 100)}%
          </Text>
          <Text style={styles.modelText}>
            Last Updated: {learningModel.lastUpdated.toLocaleDateString()}
          </Text>
        </View>
      )}

      {matchScores.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No profiles to analyze</Text>
        </View>
      ) : (
        <View>
          <Text style={styles.headerText}>Match Scores ({matchScores.length} profiles)</Text>

          {matchScores.map((score) => (
            <View key={score.profileId} style={styles.scoreCard}>
              <View style={styles.scoreHeader}>
                <View>
                  <Text style={styles.scoreValue}>{score.overallScore}%</Text>
                  <Text style={[styles.scoreLabel, { color: getScoreColor(score.overallScore) }]}>
                    {getScoreLabel(score.overallScore)}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.detailsButton}
                  onPress={() =>
                    setShowDetails(showDetails === score.profileId ? null : score.profileId)
                  }
                >
                  <Text style={styles.detailsButtonText}>
                    {showDetails === score.profileId ? 'Hide' : 'Show'} Details
                  </Text>
                </TouchableOpacity>
              </View>

              {showDetails === score.profileId && (
                <View style={styles.detailsContainer}>
                  <Text style={styles.detailsTitle}>Score Breakdown:</Text>

                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Behavioral Compatibility:</Text>
                    <Text style={styles.breakdownValue}>
                      {score.breakdown.behavioralCompatibility}%
                    </Text>
                  </View>

                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Attribute Similarity:</Text>
                    <Text style={styles.breakdownValue}>
                      {score.breakdown.attributeSimilarity}%
                    </Text>
                  </View>

                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Conversation Potential:</Text>
                    <Text style={styles.breakdownValue}>
                      {score.breakdown.conversationPotential}%
                    </Text>
                  </View>

                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Success Probability:</Text>
                    <Text style={styles.breakdownValue}>{score.breakdown.successProbability}%</Text>
                  </View>

                  {score.reasoning.length > 0 && (
                    <View style={styles.reasoningContainer}>
                      <Text style={styles.reasoningTitle}>Why this match?</Text>
                      {score.reasoning.map((reason, index) => (
                        <Text key={index} style={styles.reasoningText}>
                          • {reason}
                        </Text>
                      ))}
                    </View>
                  )}

                  <Text style={styles.confidenceText}>
                    Confidence: {Math.round(score.confidence * 100)}%
                  </Text>
                </View>
              )}
            </View>
          ))}
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
  modelInfo: {
    backgroundColor: '#f3f4f6',
    padding: 16,
    margin: 16,
    borderRadius: 8,
  },
  modelTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  modelText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#9ca3af',
  },
  headerText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
  },
  scoreCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  scoreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scoreValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111827',
  },
  scoreLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  detailsButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#ec4899',
    borderRadius: 8,
  },
  detailsButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  detailsContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  detailsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  breakdownLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  reasoningContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
  },
  reasoningTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  reasoningText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
    lineHeight: 20,
  },
  confidenceText: {
    marginTop: 12,
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'right',
  },
});

export default SmartMatchingAlgorithm;
