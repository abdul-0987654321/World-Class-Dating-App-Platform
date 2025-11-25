import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { Button } from '../common/Button';

export interface ReportCategory {
  id: string;
  label: string;
  description: string;
  icon: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export type ReportType = 'profile' | 'message' | 'photo' | 'behavior';

interface ReportUserProps {
  visible: boolean;
  userName: string;
  reportType?: ReportType;
  onClose: () => void;
  onSubmit: (category: string, details: string, evidence?: any[]) => Promise<void>;
  onBlockInstead?: () => void;
}

const REPORT_CATEGORIES: ReportCategory[] = [
  {
    id: 'inappropriate_photos',
    label: 'Inappropriate Photos',
    description: 'Nudity, sexual content, or offensive images',
    icon: '📷',
    severity: 'high',
  },
  {
    id: 'harassment',
    label: 'Harassment or Bullying',
    description: 'Abusive messages, threats, or intimidation',
    icon: '⚠️',
    severity: 'critical',
  },
  {
    id: 'hate_speech',
    label: 'Hate Speech',
    description: 'Discrimination based on race, religion, gender, etc.',
    icon: '🚫',
    severity: 'critical',
  },
  {
    id: 'scam',
    label: 'Scam or Fraud',
    description: 'Requesting money, promoting services, or fake profiles',
    icon: '💰',
    severity: 'high',
  },
  {
    id: 'underage',
    label: 'Underage User',
    description: 'Appears to be under 18 years old',
    icon: '🔞',
    severity: 'critical',
  },
  {
    id: 'spam',
    label: 'Spam or Advertising',
    description: 'Promoting products, services, or external links',
    icon: '📧',
    severity: 'medium',
  },
  {
    id: 'fake_profile',
    label: 'Fake Profile',
    description: 'Using someone else\'s photos or false information',
    icon: '👤',
    severity: 'high',
  },
  {
    id: 'offline_behavior',
    label: 'Offline Behavior',
    description: 'Inappropriate behavior during in-person meeting',
    icon: '🚨',
    severity: 'critical',
  },
  {
    id: 'other',
    label: 'Other Violation',
    description: 'Something else that violates our guidelines',
    icon: '•••',
    severity: 'medium',
  },
];

export const ReportUser: React.FC<ReportUserProps> = ({
  visible,
  userName,
  reportType = 'profile',
  onClose,
  onSubmit,
  onBlockInstead,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const [details, setDetails] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!selectedCategory) {
      Alert.alert('Select Category', 'Please select a reason for reporting.');
      return;
    }

    const category = REPORT_CATEGORIES.find((c) => c.id === selectedCategory);
    if (!category) return;

    // Require details for critical/high severity reports
    if (
      (category.severity === 'critical' || category.severity === 'high') &&
      details.trim().length < 10
    ) {
      Alert.alert(
        'More Details Needed',
        'Please provide more details about this serious violation (at least 10 characters).'
      );
      return;
    }

    setIsLoading(true);
    try {
      await onSubmit(selectedCategory, details.trim());

      Alert.alert(
        'Report Submitted',
        `Thank you for reporting. Our team will review this ${reportType} and take appropriate action.`,
        [
          {
            text: 'OK',
            onPress: () => {
              setSelectedCategory(undefined);
              setDetails('');
              onClose();
            },
          },
        ]
      );
    } catch (error: any) {
      Alert.alert(
        'Submission Failed',
        error.message || 'Failed to submit report. Please try again.'
      );
      console.error('Report submission error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBlockInstead = () => {
    onClose();
    if (onBlockInstead) {
      onBlockInstead();
    }
  };

  const getSeverityColor = (severity: ReportCategory['severity']): string => {
    switch (severity) {
      case 'critical':
        return '#F44336';
      case 'high':
        return '#FF9800';
      case 'medium':
        return '#FFC107';
      case 'low':
        return '#4CAF50';
    }
  };

  const renderCategory = (category: ReportCategory) => {
    const isSelected = selectedCategory === category.id;
    const severityColor = getSeverityColor(category.severity);

    return (
      <TouchableOpacity
        key={category.id}
        style={[styles.categoryCard, isSelected && styles.categoryCardSelected]}
        onPress={() => setSelectedCategory(category.id)}
      >
        <View style={styles.categoryHeader}>
          <View style={styles.categoryIcon}>
            <Text style={styles.categoryIconText}>{category.icon}</Text>
          </View>
          <View style={styles.categoryInfo}>
            <Text
              style={[styles.categoryLabel, isSelected && styles.categoryLabelSelected]}
            >
              {category.label}
            </Text>
            <Text style={styles.categoryDescription}>{category.description}</Text>
          </View>
          {isSelected && (
            <View style={styles.checkmark}>
              <Text style={styles.checkmarkText}>✓</Text>
            </View>
          )}
        </View>
        <View style={[styles.severityIndicator, { backgroundColor: severityColor }]} />
      </TouchableOpacity>
    );
  };

  const getReportTypeLabel = (): string => {
    switch (reportType) {
      case 'profile':
        return 'profile';
      case 'message':
        return 'message';
      case 'photo':
        return 'photo';
      case 'behavior':
        return 'behavior';
      default:
        return 'user';
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Report User</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.warningContainer}>
            <View style={styles.warningIcon}>
              <Text style={styles.warningIconText}>🚨</Text>
            </View>
            <Text style={styles.warningTitle}>Report {userName}</Text>
            <Text style={styles.warningMessage}>
              Help us keep ConnectSphere safe. Your report is anonymous and will be
              reviewed by our moderation team.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              What's wrong with this {getReportTypeLabel()}?
            </Text>
            <Text style={styles.sectionSubtitle}>
              Select the most relevant violation
            </Text>

            <View style={styles.categoriesList}>
              {REPORT_CATEGORIES.map((category) => renderCategory(category))}
            </View>
          </View>

          {selectedCategory && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Additional Details</Text>
              <Text style={styles.sectionSubtitle}>
                {REPORT_CATEGORIES.find((c) => c.id === selectedCategory)?.severity ===
                  'critical' ||
                REPORT_CATEGORIES.find((c) => c.id === selectedCategory)?.severity ===
                  'high'
                  ? 'Required - Please provide specific details'
                  : 'Optional - Helps us review faster'}
              </Text>

              <TextInput
                style={styles.detailsInput}
                placeholder="Describe what happened..."
                placeholderTextColor="#999"
                value={details}
                onChangeText={setDetails}
                multiline
                numberOfLines={4}
                maxLength={500}
                textAlignVertical="top"
              />
              <Text style={styles.characterCount}>
                {details.length}/500 characters
              </Text>
            </View>
          )}

          <View style={styles.infoContainer}>
            <Text style={styles.infoTitle}>What happens after you report?</Text>
            <View style={styles.infoItem}>
              <Text style={styles.infoBullet}>1.</Text>
              <Text style={styles.infoText}>
                Your report is sent to our moderation team for review
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoBullet}>2.</Text>
              <Text style={styles.infoText}>
                We investigate within 24-48 hours
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoBullet}>3.</Text>
              <Text style={styles.infoText}>
                Violators may be warned, suspended, or permanently banned
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoBullet}>4.</Text>
              <Text style={styles.infoText}>
                Your identity remains anonymous to the reported user
              </Text>
            </View>
          </View>

          <View style={styles.privacyNote}>
            <Text style={styles.privacyNoteIcon}>🔒</Text>
            <Text style={styles.privacyNoteText}>
              Reports are confidential. The user won't know who reported them.
            </Text>
          </View>

          {onBlockInstead && (
            <TouchableOpacity
              style={styles.blockButton}
              onPress={handleBlockInstead}
            >
              <Text style={styles.blockButtonText}>Block this user instead</Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <Button
            title="Submit Report"
            onPress={handleSubmit}
            variant="danger"
            fullWidth
            loading={isLoading}
            disabled={!selectedCategory || isLoading}
          />
          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    color: '#666',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  headerSpacer: {
    width: 32,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  warningContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  warningIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFEBEE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  warningIconText: {
    fontSize: 40,
  },
  warningTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  warningMessage: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#999',
    marginBottom: 16,
  },
  categoriesList: {
    marginTop: 8,
  },
  categoryCard: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
    overflow: 'hidden',
  },
  categoryCardSelected: {
    backgroundColor: '#FFF5F8',
    borderColor: '#E91E63',
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  categoryIconText: {
    fontSize: 20,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryLabel: {
    fontSize: 15,
    color: '#333',
    fontWeight: '600',
    marginBottom: 4,
  },
  categoryLabelSelected: {
    color: '#E91E63',
  },
  categoryDescription: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E91E63',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  checkmarkText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  severityIndicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  detailsInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: '#333',
    minHeight: 120,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  characterCount: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
    marginTop: 8,
  },
  infoContainer: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  infoItem: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  infoBullet: {
    fontSize: 14,
    color: '#E91E63',
    marginRight: 8,
    fontWeight: 'bold',
    width: 20,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  privacyNoteIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  privacyNoteText: {
    flex: 1,
    fontSize: 14,
    color: '#2E7D32',
    lineHeight: 20,
  },
  blockButton: {
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  blockButtonText: {
    fontSize: 15,
    color: '#E91E63',
    fontWeight: '600',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  cancelButton: {
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
});
