import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';

export interface UserProfile {
  id: string;
  name: string;
  bio?: string;
  interests?: string[];
  occupation?: string;
  education?: string;
  relationshipGoal?: string;
  values?: string[];
  lifestyle?: {
    smoking?: string;
    drinking?: string;
    exercise?: string;
  };
}

export type MatchDimension =
  | 'interests'
  | 'values'
  | 'lifestyle'
  | 'communication'
  | 'goals'
  | 'personality';

export interface DimensionScore {
  dimension: MatchDimension;
  score: number; // 0-100
  weight: number; // importance weight 0-1
  reasoning: string;
  highlights: string[];
}

export interface MatchScore {
  overall: number; // 0-100
  dimensions: DimensionScore[];
  strengths: string[];
  potentialChallenges: string[];
  recommendations: string[];
  compatibilityLevel: 'excellent' | 'great' | 'good' | 'moderate' | 'low';
}

interface SemanticMatchScoringProps {
  currentUserProfile: UserProfile;
  matchProfile: UserProfile;
  onCalculateMatch?: (user1: UserProfile, user2: UserProfile) => Promise<MatchScore>;
  showDetails?: boolean;
}

export const SemanticMatchScoring: React.FC<SemanticMatchScoringProps> = ({
  currentUserProfile,
  matchProfile,
  onCalculateMatch,
  showDetails = true,
}) => {
  const [matchScore, setMatchScore] = useState<MatchScore | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [expandedDimensions, setExpandedDimensions] = useState<Set<MatchDimension>>(new Set());

  useEffect(() => {
    calculateMatch();
  }, [currentUserProfile.id, matchProfile.id]);

  const calculateMatch = async () => {
    setIsCalculating(true);

    try {
      let score: MatchScore;

      if (onCalculateMatch) {
        score = await onCalculateMatch(currentUserProfile, matchProfile);
      } else {
        score = await performDefaultMatching(currentUserProfile, matchProfile);
      }

      setMatchScore(score);
    } catch (error) {
      console.error('Match scoring error:', error);
    } finally {
      setIsCalculating(false);
    }
  };

  const performDefaultMatching = async (
    user1: UserProfile,
    user2: UserProfile
  ): Promise<MatchScore> => {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const dimensions: DimensionScore[] = [];

    // Interests matching
    const commonInterests = user1.interests?.filter((i) => user2.interests?.includes(i)) || [];
    const totalInterests = new Set([...(user1.interests || []), ...(user2.interests || [])]).size;
    const interestsScore =
      totalInterests > 0 ? (commonInterests.length / totalInterests) * 100 : 50;

    dimensions.push({
      dimension: 'interests',
      score: interestsScore,
      weight: 0.25,
      reasoning: `${commonInterests.length} shared interests found`,
      highlights: commonInterests.slice(0, 3),
    });

    // Values matching (simulated)
    const valuesSimilarity = Math.random() * 30 + 60; // 60-90
    dimensions.push({
      dimension: 'values',
      score: valuesSimilarity,
      weight: 0.3,
      reasoning: 'Based on profile analysis and stated values',
      highlights: ['Similar life goals', 'Compatible worldviews'],
    });

    // Lifestyle matching
    let lifestyleScore = 70;
    const lifestyleHighlights: string[] = [];

    if (user1.lifestyle?.smoking === user2.lifestyle?.smoking && user1.lifestyle?.smoking) {
      lifestyleScore += 10;
      lifestyleHighlights.push('Same smoking preferences');
    }
    if (user1.lifestyle?.drinking === user2.lifestyle?.drinking && user1.lifestyle?.drinking) {
      lifestyleScore += 10;
      lifestyleHighlights.push('Compatible drinking habits');
    }
    if (user1.lifestyle?.exercise === user2.lifestyle?.exercise && user1.lifestyle?.exercise) {
      lifestyleScore += 10;
      lifestyleHighlights.push('Similar activity levels');
    }

    dimensions.push({
      dimension: 'lifestyle',
      score: Math.min(lifestyleScore, 95),
      weight: 0.2,
      reasoning: 'Lifestyle compatibility analysis',
      highlights: lifestyleHighlights,
    });

    // Communication style (simulated based on bio length)
    const bio1Length = user1.bio?.length || 0;
    const bio2Length = user2.bio?.length || 0;
    const commScore =
      100 - (Math.abs(bio1Length - bio2Length) / Math.max(bio1Length, bio2Length, 1)) * 50;

    dimensions.push({
      dimension: 'communication',
      score: Math.max(commScore, 60),
      weight: 0.15,
      reasoning: 'Communication style analysis',
      highlights: ['Compatible communication depth'],
    });

    // Goals matching
    const goalsMatch = user1.relationshipGoal === user2.relationshipGoal ? 90 : 65;
    dimensions.push({
      dimension: 'goals',
      score: goalsMatch,
      weight: 0.1,
      reasoning:
        user1.relationshipGoal === user2.relationshipGoal
          ? 'Aligned relationship goals'
          : 'Different but compatible goals',
      highlights:
        user1.relationshipGoal === user2.relationshipGoal ? ['Same relationship goals'] : [],
    });

    // Calculate weighted overall score
    const overall = dimensions.reduce((sum, dim) => sum + dim.score * dim.weight, 0);

    const strengths: string[] = [];
    const potentialChallenges: string[] = [];

    dimensions.forEach((dim) => {
      if (dim.score >= 75) {
        strengths.push(`Strong ${dim.dimension} compatibility (${Math.round(dim.score)}%)`);
      } else if (dim.score < 60) {
        potentialChallenges.push(`Different ${dim.dimension} preferences may require discussion`);
      }
    });

    const compatibilityLevel: MatchScore['compatibilityLevel'] =
      overall >= 80
        ? 'excellent'
        : overall >= 70
          ? 'great'
          : overall >= 60
            ? 'good'
            : overall >= 50
              ? 'moderate'
              : 'low';

    const recommendations: string[] = [];
    if (commonInterests.length > 0) {
      recommendations.push(`Start conversations about ${commonInterests[0]}`);
    }
    if (overall >= 70) {
      recommendations.push('High compatibility - great match potential!');
    } else {
      recommendations.push('Focus on discovering more shared interests');
    }

    return {
      overall: Math.round(overall),
      dimensions,
      strengths,
      potentialChallenges,
      recommendations,
      compatibilityLevel,
    };
  };

  const getDimensionLabel = (dimension: MatchDimension): string => {
    const labels: Record<MatchDimension, string> = {
      interests: 'Shared Interests',
      values: 'Core Values',
      lifestyle: 'Lifestyle',
      communication: 'Communication',
      goals: 'Relationship Goals',
      personality: 'Personality',
    };
    return labels[dimension];
  };

  const getScoreColor = (score: number): string => {
    if (score >= 80) return '#4CAF50';
    if (score >= 65) return '#8BC34A';
    if (score >= 50) return '#FF9800';
    return '#F44336';
  };

  const getCompatibilityColor = (level: MatchScore['compatibilityLevel']): string => {
    const colors = {
      excellent: '#4CAF50',
      great: '#8BC34A',
      good: '#FFC107',
      moderate: '#FF9800',
      low: '#F44336',
    };
    return colors[level];
  };

  const getCompatibilityEmoji = (level: MatchScore['compatibilityLevel']): string => {
    const emojis = {
      excellent: '🎉',
      great: '💚',
      good: '👍',
      moderate: '🤝',
      low: '💭',
    };
    return emojis[level];
  };

  const toggleDimension = (dimension: MatchDimension) => {
    const newExpanded = new Set(expandedDimensions);
    if (newExpanded.has(dimension)) {
      newExpanded.delete(dimension);
    } else {
      newExpanded.add(dimension);
    }
    setExpandedDimensions(newExpanded);
  };

  if (isCalculating) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#E91E63" />
          <Text style={styles.loadingTitle}>Calculating Compatibility</Text>
          <Text style={styles.loadingText}>Analyzing your profiles using AI...</Text>
        </View>
      </View>
    );
  }

  if (!matchScore) {
    return null;
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Overall Score */}
      <View style={styles.overallCard}>
        <Text style={styles.overallTitle}>Match Compatibility</Text>
        <View style={styles.scoreCircle}>
          <Text style={styles.scoreValue}>{matchScore.overall}%</Text>
          <Text
            style={[
              styles.scoreLabel,
              { color: getCompatibilityColor(matchScore.compatibilityLevel) },
            ]}
          >
            {matchScore.compatibilityLevel.toUpperCase()}
          </Text>
        </View>
        <View style={styles.compatibilityBadge}>
          <Text style={styles.compatibilityEmoji}>
            {getCompatibilityEmoji(matchScore.compatibilityLevel)}
          </Text>
          <Text style={styles.compatibilityText}>
            {matchScore.compatibilityLevel === 'excellent' && 'Highly Compatible!'}
            {matchScore.compatibilityLevel === 'great' && 'Great Match!'}
            {matchScore.compatibilityLevel === 'good' && 'Good Compatibility'}
            {matchScore.compatibilityLevel === 'moderate' && 'Moderate Compatibility'}
            {matchScore.compatibilityLevel === 'low' && 'Low Compatibility'}
          </Text>
        </View>
      </View>

      {/* Dimension Scores */}
      {showDetails && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Compatibility Breakdown</Text>
          {matchScore.dimensions.map((dim) => {
            const isExpanded = expandedDimensions.has(dim.dimension);

            return (
              <TouchableOpacity
                key={dim.dimension}
                style={styles.dimensionCard}
                onPress={() => toggleDimension(dim.dimension)}
              >
                <View style={styles.dimensionHeader}>
                  <View style={styles.dimensionLeft}>
                    <Text style={styles.dimensionLabel}>{getDimensionLabel(dim.dimension)}</Text>
                    <View style={styles.dimensionBar}>
                      <View
                        style={[
                          styles.dimensionBarFill,
                          {
                            width: `${dim.score}%`,
                            backgroundColor: getScoreColor(dim.score),
                          },
                        ]}
                      />
                    </View>
                  </View>
                  <Text style={[styles.dimensionScore, { color: getScoreColor(dim.score) }]}>
                    {Math.round(dim.score)}%
                  </Text>
                </View>

                {isExpanded && (
                  <View style={styles.dimensionDetails}>
                    <Text style={styles.dimensionReasoning}>{dim.reasoning}</Text>
                    {dim.highlights.length > 0 && (
                      <View style={styles.highlightsContainer}>
                        {dim.highlights.map((highlight, index) => (
                          <View key={index} style={styles.highlightTag}>
                            <Text style={styles.highlightText}>{highlight}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Strengths */}
      {matchScore.strengths.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Strengths</Text>
          <View style={styles.listContainer}>
            {matchScore.strengths.map((strength, index) => (
              <View key={index} style={styles.listItem}>
                <Text style={styles.listIcon}>✓</Text>
                <Text style={styles.listText}>{strength}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Challenges */}
      {matchScore.potentialChallenges.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Things to Discuss</Text>
          <View style={styles.listContainer}>
            {matchScore.potentialChallenges.map((challenge, index) => (
              <View key={index} style={styles.listItem}>
                <Text style={styles.listIcon}>💭</Text>
                <Text style={styles.listText}>{challenge}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Recommendations */}
      {matchScore.recommendations.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recommendations</Text>
          <View style={styles.recommendationsContainer}>
            {matchScore.recommendations.map((rec, index) => (
              <View key={index} style={styles.recommendationCard}>
                <Text style={styles.recommendationIcon}>💡</Text>
                <Text style={styles.recommendationText}>{rec}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Disclaimer */}
      <View style={styles.disclaimerCard}>
        <Text style={styles.disclaimerIcon}>ℹ️</Text>
        <Text style={styles.disclaimerText}>
          Compatibility scores are calculated using AI and should be used as a guide. Real
          compatibility develops through genuine connection and communication.
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  // Loading
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  loadingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 20,
    marginBottom: 8,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  // Overall Score
  overallCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    marginBottom: 24,
  },
  overallTitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
  },
  scoreCircle: {
    alignItems: 'center',
    marginBottom: 24,
  },
  scoreValue: {
    fontSize: 64,
    fontWeight: 'bold',
    color: '#E91E63',
    marginBottom: 8,
  },
  scoreLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  compatibilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
  },
  compatibilityEmoji: {
    fontSize: 24,
    marginRight: 12,
  },
  compatibilityText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  // Sections
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  // Dimensions
  dimensionCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  dimensionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dimensionLeft: {
    flex: 1,
    marginRight: 16,
  },
  dimensionLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  dimensionBar: {
    height: 6,
    backgroundColor: '#F0F0F0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  dimensionBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  dimensionScore: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  dimensionDetails: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  dimensionReasoning: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  highlightsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  highlightTag: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  highlightText: {
    fontSize: 12,
    color: '#1976D2',
    fontWeight: '500',
  },
  // Lists
  listContainer: {
    gap: 12,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
  },
  listIcon: {
    fontSize: 20,
    marginRight: 12,
    marginTop: 2,
  },
  listText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  // Recommendations
  recommendationsContainer: {
    gap: 12,
  },
  recommendationCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 16,
  },
  recommendationIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  recommendationText: {
    flex: 1,
    fontSize: 14,
    color: '#1565C0',
    lineHeight: 20,
  },
  // Disclaimer
  disclaimerCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
    padding: 16,
  },
  disclaimerIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 12,
    color: '#E65100',
    lineHeight: 18,
  },
});
