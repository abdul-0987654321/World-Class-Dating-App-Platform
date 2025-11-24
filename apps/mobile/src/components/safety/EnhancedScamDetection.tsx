import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';

export interface ScamRiskAssessment {
  risk_level: 'safe' | 'low' | 'moderate' | 'high' | 'critical';
  confidence: number;
  risk_score: number; // 0-100
  detected_patterns: ScamPattern[];
  recommendations: string[];
  should_block: boolean;
}

export interface ScamPattern {
  type: 'profile' | 'message' | 'behavior' | 'request';
  pattern: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
}

export const detectScamRisk = (profile: any, messages: any[], behavior: any): ScamRiskAssessment => {
  const patterns: ScamPattern[] = [];
  let risk_score = 0;

  // Profile analysis
  if (profile.photos?.length === 1) {
    patterns.push({
      type: 'profile',
      pattern: 'single_photo',
      severity: 'low',
      description: 'Only one photo uploaded',
    });
    risk_score += 10;
  }

  if (profile.bio?.length < 20) {
    patterns.push({
      type: 'profile',
      pattern: 'minimal_bio',
      severity: 'low',
      description: 'Very short or missing bio',
    });
    risk_score += 8;
  }

  if (!profile.verified) {
    risk_score += 5;
  }

  // Message analysis - scam keywords
  const scam_keywords = [
    'investment', 'crypto', 'bitcoin', 'trading', 'money', 'send', 'gift card',
    'itunes', 'steam', 'paypal', 'venmo', 'cashapp', 'western union',
    'my phone is broken', 'can\'t access my account', 'emergency', 'hospital',
    'stranded', 'need help', 'wire transfer', 'bank account'
  ];

  messages.forEach(msg => {
    const lowerText = msg.text.toLowerCase();
    scam_keywords.forEach(keyword => {
      if (lowerText.includes(keyword)) {
        patterns.push({
          type: 'message',
          pattern: 'financial_request',
          severity: 'critical',
          description: `Message contains financial keyword: "${keyword}"`,
        });
        risk_score += 25;
      }
    });
  });

  // Behavior patterns
  if (behavior.quick_to_leave_platform) {
    patterns.push({
      type: 'behavior',
      pattern: 'platform_evasion',
      severity: 'high',
      description: 'Tries to move conversation off-platform quickly',
    });
    risk_score += 20;
  }

  if (behavior.asks_personal_info_quickly) {
    patterns.push({
      type: 'behavior',
      pattern: 'information_harvesting',
      severity: 'medium',
      description: 'Requests personal information too soon',
    });
    risk_score += 15;
  }

  if (behavior.love_bombing) {
    patterns.push({
      type: 'behavior',
      pattern: 'love_bombing',
      severity: 'high',
      description: 'Expressing intense feelings very quickly',
    });
    risk_score += 18;
  }

  if (behavior.inconsistent_details) {
    patterns.push({
      type: 'behavior',
      pattern: 'inconsistent_story',
      severity: 'medium',
      description: 'Story or details don\'t add up',
    });
    risk_score += 15;
  }

  // Professional photos check
  if (profile.photos_appear_professional) {
    patterns.push({
      type: 'profile',
      pattern: 'professional_photos',
      severity: 'medium',
      description: 'Photos may be stock images or stolen',
    });
    risk_score += 12;
  }

  // Determine risk level
  let risk_level: 'safe' | 'low' | 'moderate' | 'high' | 'critical' = 'safe';
  if (risk_score >= 75) risk_level = 'critical';
  else if (risk_score >= 50) risk_level = 'high';
  else if (risk_score >= 30) risk_level = 'moderate';
  else if (risk_score >= 15) risk_level = 'low';

  // Generate recommendations
  const recommendations: string[] = [];

  if (risk_score > 0) {
    recommendations.push('Never send money or gift cards to someone you haven\'t met in person');
    recommendations.push('Don\'t share financial information or account details');
  }

  if (risk_level === 'high' || risk_level === 'critical') {
    recommendations.push('Report this profile immediately');
    recommendations.push('Stop all communication');
    recommendations.push('Block this user');
  } else if (risk_level === 'moderate') {
    recommendations.push('Be extremely cautious with this match');
    recommendations.push('Video chat before meeting in person');
    recommendations.push('Watch for requests for money or personal information');
  }

  return {
    risk_level,
    confidence: 0.87,
    risk_score: Math.min(100, risk_score),
    detected_patterns: patterns,
    recommendations,
    should_block: risk_level === 'critical',
  };
};

const EnhancedScamDetection: React.FC<{
  assessment: ScamRiskAssessment;
  onReport?: () => void;
  onBlock?: () => void;
}> = ({ assessment, onReport, onBlock }) => {
  const getColor = () => {
    switch (assessment.risk_level) {
      case 'critical': return '#991b1b';
      case 'high': return '#dc2626';
      case 'moderate': return '#ea580c';
      case 'low': return '#f59e0b';
      default: return '#10b981';
    }
  };

  const handleCriticalRisk = () => {
    if (assessment.should_block) {
      Alert.alert(
        '🚨 CRITICAL SCAM RISK',
        'This user exhibits multiple scam indicators. We strongly recommend blocking and reporting them immediately.',
        [
          { text: 'Report & Block', onPress: () => { onReport?.(); onBlock?.(); }, style: 'destructive' },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    }
  };

  React.useEffect(() => {
    if (assessment.should_block) {
      handleCriticalRisk();
    }
  }, [assessment.should_block]);

  return (
    <View style={styles.container}>
      <View style={[styles.alertBanner, { backgroundColor: getColor() }]}>
        <Text style={styles.alertTitle}>🛡️ SCAM DETECTION</Text>
        <Text style={styles.riskLevel}>{assessment.risk_level.toUpperCase()} RISK</Text>
        <Text style={styles.riskScore}>{assessment.risk_score}/100</Text>
      </View>

      {assessment.detected_patterns.length > 0 && (
        <View style={styles.patternsSection}>
          <Text style={styles.sectionTitle}>⚠️ Detected Red Flags:</Text>
          {assessment.detected_patterns.map((pattern, i) => (
            <View key={i} style={[styles.patternCard, { borderLeftColor: getColor() }]}>
              <Text style={styles.patternType}>{pattern.type.toUpperCase()}</Text>
              <Text style={styles.patternDesc}>{pattern.description}</Text>
            </View>
          ))}
        </View>
      )}

      {assessment.recommendations.length > 0 && (
        <View style={styles.recommendationsSection}>
          <Text style={styles.sectionTitle}>🔒 Safety Recommendations:</Text>
          {assessment.recommendations.map((rec, i) => (
            <Text key={i} style={styles.recommendation}>• {rec}</Text>
          ))}
        </View>
      )}

      {(assessment.risk_level === 'high' || assessment.risk_level === 'critical') && (
        <View style={styles.actionsContainer}>
          {onReport && (
            <TouchableOpacity style={styles.reportButton} onPress={onReport}>
              <Text style={styles.reportButtonText}>⚠️ Report User</Text>
            </TouchableOpacity>
          )}
          {onBlock && (
            <TouchableOpacity style={styles.blockButton} onPress={onBlock}>
              <Text style={styles.blockButtonText}>🚫 Block User</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <Text style={styles.disclaimer}>
        Trust your instincts. If something feels off, it probably is.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: '#fff' },
  alertBanner: { padding: 20, borderRadius: 12, alignItems: 'center', marginBottom: 20 },
  alertTitle: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 4 },
  riskLevel: { color: '#fff', fontSize: 20, fontWeight: '700', marginBottom: 8 },
  riskScore: { color: '#fff', fontSize: 28, fontWeight: '700' },
  patternsSection: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  patternCard: { backgroundColor: '#fef2f2', padding: 12, borderRadius: 8, marginBottom: 8, borderLeftWidth: 4 },
  patternType: { fontSize: 11, fontWeight: '600', color: '#991b1b', marginBottom: 4 },
  patternDesc: { fontSize: 14, color: '#7f1d1d' },
  recommendationsSection: { backgroundColor: '#fffbeb', padding: 16, borderRadius: 12, marginBottom: 16 },
  recommendation: { fontSize: 14, color: '#78350f', marginBottom: 6, lineHeight: 20 },
  actionsContainer: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  reportButton: { flex: 1, backgroundColor: '#f59e0b', padding: 14, borderRadius: 8, alignItems: 'center' },
  reportButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  blockButton: { flex: 1, backgroundColor: '#dc2626', padding: 14, borderRadius: 8, alignItems: 'center' },
  blockButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  disclaimer: { fontSize: 12, color: '#6b7280', fontStyle: 'italic', textAlign: 'center' },
});

export default EnhancedScamDetection;
