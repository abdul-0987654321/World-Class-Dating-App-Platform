import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { Button } from '../common/Button';

export type ToxicityCategory =
  | 'harassment'
  | 'hate_speech'
  | 'sexual_content'
  | 'profanity'
  | 'spam'
  | 'threat'
  | 'identity_attack';

export interface ToxicityScore {
  category: ToxicityCategory;
  score: number; // 0-1
  confidence: number; // 0-1
}

export interface ToxicityAnalysis {
  overallScore: number; // 0-1
  isToxic: boolean;
  categories: ToxicityScore[];
  flaggedPhrases: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  action: 'allow' | 'warn' | 'block';
  recommendation: string;
}

interface ToxicityDetectionProps {
  content: string;
  onAnalyze?: (content: string) => Promise<ToxicityAnalysis>;
  autoDetect?: boolean;
  onDetectionResult?: (analysis: ToxicityAnalysis) => void;
  showWarnings?: boolean;
}

export const ToxicityDetection: React.FC<ToxicityDetectionProps> = ({
  content,
  onAnalyze,
  autoDetect = true,
  onDetectionResult,
  showWarnings = true,
}) => {
  const [analysis, setAnalysis] = useState<ToxicityAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);

  useEffect(() => {
    if (autoDetect && content.length > 10) {
      analyzeContent();
    }
  }, [content]);

  const analyzeContent = async () => {
    if (!content || content.trim().length === 0) return;

    setIsAnalyzing(true);

    try {
      let result: ToxicityAnalysis;

      if (onAnalyze) {
        result = await onAnalyze(content);
      } else {
        result = await performDefaultAnalysis(content);
      }

      setAnalysis(result);

      if (onDetectionResult) {
        onDetectionResult(result);
      }

      if (showWarnings && result.action !== 'allow') {
        setShowWarningModal(true);
      }
    } catch (error) {
      console.error('Toxicity detection error:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const performDefaultAnalysis = async (
    content: string
  ): Promise<ToxicityAnalysis> => {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    const lowerContent = content.toLowerCase();

    // Simple keyword-based detection
    const toxicKeywords = {
      harassment: ['idiot', 'stupid', 'ugly', 'loser', 'pathetic'],
      hate_speech: ['hate', 'disgusting'],
      sexual_content: ['explicit', 'inappropriate'],
      profanity: ['damn', 'hell', 'crap'],
      spam: ['click here', 'buy now', 'limited offer', 'act now'],
      threat: ['kill', 'hurt', 'destroy'],
      identity_attack: ['racist', 'sexist'],
    };

    const categories: ToxicityScore[] = Object.entries(toxicKeywords).map(
      ([category, keywords]) => {
        const matches = keywords.filter((keyword) =>
          lowerContent.includes(keyword)
        );
        const score = Math.min(matches.length * 0.3, 1);

        return {
          category: category as ToxicityCategory,
          score,
          confidence: matches.length > 0 ? 0.85 : 0.5,
        };
      }
    );

    const flaggedPhrases: string[] = [];
    Object.values(toxicKeywords)
      .flat()
      .forEach((keyword) => {
        if (lowerContent.includes(keyword)) {
          flaggedPhrases.push(keyword);
        }
      });

    const overallScore = Math.max(...categories.map((c) => c.score), 0);

    let severity: ToxicityAnalysis['severity'] = 'low';
    let action: ToxicityAnalysis['action'] = 'allow';

    if (overallScore >= 0.7) {
      severity = 'critical';
      action = 'block';
    } else if (overallScore >= 0.5) {
      severity = 'high';
      action = 'warn';
    } else if (overallScore >= 0.3) {
      severity = 'medium';
      action = 'warn';
    }

    const recommendation =
      action === 'block'
        ? 'This message contains inappropriate content and should not be sent.'
        : action === 'warn'
        ? 'This message may be perceived as inappropriate. Consider rephrasing.'
        : 'Message appears appropriate.';

    return {
      overallScore,
      isToxic: overallScore > 0.3,
      categories: categories.filter((c) => c.score > 0),
      flaggedPhrases,
      severity,
      action,
      recommendation,
    };
  };

  const getSeverityColor = (severity: ToxicityAnalysis['severity']): string => {
    switch (severity) {
      case 'critical':
        return '#D32F2F';
      case 'high':
        return '#F44336';
      case 'medium':
        return '#FF9800';
      case 'low':
        return '#FFC107';
      default:
        return '#4CAF50';
    }
  };

  const getSeverityIcon = (severity: ToxicityAnalysis['severity']): string => {
    switch (severity) {
      case 'critical':
        return '🚫';
      case 'high':
        return '⚠️';
      case 'medium':
        return '⚡';
      case 'low':
        return 'ℹ️';
      default:
        return '✓';
    }
  };

  const getCategoryLabel = (category: ToxicityCategory): string => {
    return category
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const renderWarningModal = () => {
    if (!analysis || !showWarningModal) return null;

    return (
      <Modal
        visible={showWarningModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowWarningModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalIcon}>
                {getSeverityIcon(analysis.severity)}
              </Text>
              <Text style={styles.modalTitle}>
                {analysis.action === 'block'
                  ? 'Message Blocked'
                  : 'Content Warning'}
              </Text>
            </View>

            <View style={styles.modalContent}>
              <Text style={styles.modalDescription}>
                {analysis.recommendation}
              </Text>

              {analysis.flaggedPhrases.length > 0 && (
                <View style={styles.flaggedSection}>
                  <Text style={styles.flaggedTitle}>Flagged Content:</Text>
                  <View style={styles.flaggedList}>
                    {analysis.flaggedPhrases.map((phrase, index) => (
                      <View key={index} style={styles.flaggedPhrase}>
                        <Text style={styles.flaggedPhraseText}>{phrase}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {analysis.categories.length > 0 && (
                <View style={styles.categoriesSection}>
                  <Text style={styles.categoriesTitle}>Detected Issues:</Text>
                  {analysis.categories.map((category) => (
                    <View key={category.category} style={styles.categoryRow}>
                      <Text style={styles.categoryLabel}>
                        {getCategoryLabel(category.category)}
                      </Text>
                      <Text style={styles.categoryScore}>
                        {Math.round(category.score * 100)}%
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.modalActions}>
                {analysis.action === 'warn' && (
                  <>
                    <Button
                      title="Revise Message"
                      onPress={() => setShowWarningModal(false)}
                      variant="primary"
                      fullWidth
                      style={styles.modalButton}
                    />
                    <Button
                      title="Send Anyway"
                      onPress={() => {
                        setShowWarningModal(false);
                        // Handle send anyway logic
                      }}
                      variant="ghost"
                      fullWidth
                      style={styles.modalButton}
                    />
                  </>
                )}

                {analysis.action === 'block' && (
                  <Button
                    title="Edit Message"
                    onPress={() => setShowWarningModal(false)}
                    variant="primary"
                    fullWidth
                    style={styles.modalButton}
                  />
                )}
              </View>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  // Silent mode - just analyze, don't show UI
  if (!showWarnings) {
    return null;
  }

  // Loading indicator
  if (isAnalyzing) {
    return (
      <View style={styles.analyzingContainer}>
        <ActivityIndicator size="small" color="#E91E63" />
        <Text style={styles.analyzingText}>Checking content...</Text>
      </View>
    );
  }

  // Show inline warning if content is flagged but not blocking
  if (analysis && analysis.action === 'warn' && !showWarningModal) {
    return (
      <>
        <TouchableOpacity
          style={[
            styles.warningBanner,
            { backgroundColor: `${getSeverityColor(analysis.severity)}15` },
          ]}
          onPress={() => setShowWarningModal(true)}
        >
          <Text style={styles.warningIcon}>
            {getSeverityIcon(analysis.severity)}
          </Text>
          <Text style={styles.warningText}>Content may be inappropriate</Text>
          <TouchableOpacity onPress={() => setShowWarningModal(true)}>
            <Text style={styles.warningAction}>Review</Text>
          </TouchableOpacity>
        </TouchableOpacity>
        {renderWarningModal()}
      </>
    );
  }

  // Show success indicator if content is clean
  if (analysis && !analysis.isToxic) {
    return (
      <View style={styles.successBanner}>
        <Text style={styles.successIcon}>✓</Text>
        <Text style={styles.successText}>Message looks good</Text>
      </View>
    );
  }

  return <>{renderWarningModal()}</>;
};

const styles = StyleSheet.create({
  analyzingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    marginVertical: 8,
  },
  analyzingText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginVertical: 8,
  },
  warningIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: '#666',
  },
  warningAction: {
    fontSize: 13,
    color: '#E91E63',
    fontWeight: '600',
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    marginVertical: 8,
  },
  successIcon: {
    fontSize: 14,
    color: '#4CAF50',
    marginRight: 8,
  },
  successText: {
    fontSize: 12,
    color: '#2E7D32',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
  },
  modalHeader: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalContent: {
    padding: 20,
  },
  modalDescription: {
    fontSize: 15,
    color: '#666',
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 24,
  },
  flaggedSection: {
    marginBottom: 24,
  },
  flaggedTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  flaggedList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  flaggedPhrase: {
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  flaggedPhraseText: {
    fontSize: 13,
    color: '#D32F2F',
    fontWeight: '500',
  },
  categoriesSection: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  categoriesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  categoryLabel: {
    fontSize: 14,
    color: '#666',
  },
  categoryScore: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E91E63',
  },
  modalActions: {
    gap: 12,
  },
  modalButton: {
    marginBottom: 8,
  },
});
