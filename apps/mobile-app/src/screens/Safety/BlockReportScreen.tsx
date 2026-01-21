import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { safetyService } from '../../services/safety.service';

interface RouteParams {
  userId: string;
  userName: string;
  userPhoto?: string;
}

interface ReportCategory {
  id: string;
  label: string;
  description: string;
  icon: string;
  severity: 'low' | 'medium' | 'high';
}

const REPORT_CATEGORIES: ReportCategory[] = [
  {
    id: 'inappropriate_messages',
    label: 'Inappropriate Messages',
    description: 'Offensive, sexual, or harassing messages',
    icon: 'message-alert',
    severity: 'high',
  },
  {
    id: 'fake_profile',
    label: 'Fake Profile',
    description: 'Suspicious or impersonating someone',
    icon: 'account-alert',
    severity: 'medium',
  },
  {
    id: 'spam',
    label: 'Spam or Scam',
    description: 'Promoting services, asking for money',
    icon: 'cash-remove',
    severity: 'high',
  },
  {
    id: 'inappropriate_photos',
    label: 'Inappropriate Photos',
    description: 'Nudity or explicit content',
    icon: 'image-remove',
    severity: 'high',
  },
  {
    id: 'underage',
    label: 'Underage User',
    description: 'User appears to be under 18',
    icon: 'alert-circle',
    severity: 'high',
  },
  {
    id: 'hate_speech',
    label: 'Hate Speech',
    description: 'Discriminatory or hateful language',
    icon: 'hand-back-left',
    severity: 'high',
  },
  {
    id: 'violence_threat',
    label: 'Violence or Threats',
    description: 'Threatening behavior',
    icon: 'shield-alert',
    severity: 'high',
  },
  {
    id: 'stolen_photos',
    label: 'Stolen Photos',
    description: "Using someone else's photos",
    icon: 'camera-off',
    severity: 'medium',
  },
  {
    id: 'other',
    label: 'Other',
    description: 'Something else that concerns me',
    icon: 'dots-horizontal',
    severity: 'medium',
  },
];

export const BlockReportScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const params = route.params as RouteParams;

  const [activeTab, setActiveTab] = useState<'report' | 'block'>('report');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [description, setDescription] = useState('');
  const [blockReason, setBlockReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleReport = async () => {
    if (!selectedCategory) {
      Alert.alert('Error', 'Please select a report category');
      return;
    }

    const category = REPORT_CATEGORIES.find((c) => c.id === selectedCategory);
    if (!category) return;

    setIsSubmitting(true);
    try {
      await safetyService.reportUser({
        userId: params.userId,
        reportType: selectedCategory,
        description: description || category.description,
        severity: category.severity,
      });

      Alert.alert(
        'Report Submitted',
        'Thank you for helping keep Flamoral safe. Our team will review this report.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Failed to submit report:', error);
      Alert.alert('Error', 'Failed to submit report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBlock = async () => {
    Alert.alert(
      'Block User',
      `Are you sure you want to block ${params.userName}? They won't be able to see your profile or contact you.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            setIsSubmitting(true);
            try {
              await safetyService.blockUser(params.userId, blockReason || 'User blocked');

              Alert.alert(
                'User Blocked',
                `You have blocked ${params.userName}. You can unblock them from Settings.`,
                [{ text: 'OK', onPress: () => navigation.goBack() }]
              );
            } catch (error) {
              console.error('Failed to block user:', error);
              Alert.alert('Error', 'Failed to block user. Please try again.');
            } finally {
              setIsSubmitting(false);
            }
          },
        },
      ]
    );
  };

  const handleBlockAndReport = async () => {
    Alert.alert(
      'Block and Report',
      `This will block ${params.userName} and submit a report to our safety team.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: async () => {
            await handleReport();
            await handleBlock();
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Safety Actions</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* User Info */}
      <View style={styles.userInfo}>
        {params.userPhoto && <Image source={{ uri: params.userPhoto }} style={styles.userPhoto} />}
        <View style={styles.userDetails}>
          <Text style={styles.userName}>{params.userName}</Text>
          <Text style={styles.userId}>ID: {params.userId.slice(0, 8)}...</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'report' && styles.activeTab]}
          onPress={() => setActiveTab('report')}
        >
          <Icon name="flag" size={20} color={activeTab === 'report' ? '#FF4458' : '#666'} />
          <Text style={[styles.tabText, activeTab === 'report' && styles.activeTabText]}>
            Report
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'block' && styles.activeTab]}
          onPress={() => setActiveTab('block')}
        >
          <Icon name="block-helper" size={20} color={activeTab === 'block' ? '#FF4458' : '#666'} />
          <Text style={[styles.tabText, activeTab === 'block' && styles.activeTabText]}>Block</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView style={styles.content}>
        {activeTab === 'report' ? (
          <View>
            <Text style={styles.sectionTitle}>Report This User</Text>
            <Text style={styles.sectionDescription}>
              Help us keep Flamoral safe. All reports are confidential.
            </Text>

            <View style={styles.categories}>
              <Text style={styles.categoriesLabel}>Select a reason:</Text>
              {REPORT_CATEGORIES.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.categoryCard,
                    selectedCategory === category.id && styles.selectedCategory,
                  ]}
                  onPress={() => setSelectedCategory(category.id)}
                >
                  <View style={styles.categoryIcon}>
                    <Icon
                      name={category.icon}
                      size={24}
                      color={selectedCategory === category.id ? '#FF4458' : '#666'}
                    />
                  </View>
                  <View style={styles.categoryContent}>
                    <Text style={styles.categoryLabel}>{category.label}</Text>
                    <Text style={styles.categoryDescription}>{category.description}</Text>
                  </View>
                  {category.severity === 'high' && (
                    <View style={styles.highPriorityBadge}>
                      <Text style={styles.badgeText}>High</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Additional Details (Optional)</Text>
              <TextInput
                style={styles.textArea}
                value={description}
                onChangeText={setDescription}
                placeholder="Provide any additional information..."
                placeholderTextColor="#999"
                multiline
                numberOfLines={4}
                maxLength={500}
              />
              <Text style={styles.charCount}>{description.length}/500</Text>
            </View>

            <View style={styles.safetyNotice}>
              <Icon name="lock" size={20} color="#4CAF50" />
              <Text style={styles.noticeText}>
                Your report is confidential. The user won't be notified.
              </Text>
            </View>

            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => navigation.goBack()}
                disabled={isSubmitting}
              >
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  (!selectedCategory || isSubmitting) && styles.disabledButton,
                ]}
                onPress={handleReport}
                disabled={!selectedCategory || isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryButtonText}>Submit Report</Text>
                )}
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[
                styles.dangerButton,
                (!selectedCategory || isSubmitting) && styles.disabledButton,
              ]}
              onPress={handleBlockAndReport}
              disabled={!selectedCategory || isSubmitting}
            >
              <Text style={styles.dangerButtonText}>Report & Block</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            <Text style={styles.sectionTitle}>Block This User</Text>
            <Text style={styles.sectionDescription}>Blocking will prevent this user from:</Text>

            <View style={styles.blockEffects}>
              <View style={styles.effectItem}>
                <Icon name="check" size={20} color="#4CAF50" />
                <Text style={styles.effectText}>Seeing your profile</Text>
              </View>
              <View style={styles.effectItem}>
                <Icon name="check" size={20} color="#4CAF50" />
                <Text style={styles.effectText}>Sending you messages</Text>
              </View>
              <View style={styles.effectItem}>
                <Icon name="check" size={20} color="#4CAF50" />
                <Text style={styles.effectText}>Appearing in your discovery feed</Text>
              </View>
              <View style={styles.effectItem}>
                <Icon name="check" size={20} color="#4CAF50" />
                <Text style={styles.effectText}>Matching with you</Text>
              </View>
            </View>

            <View style={styles.warningBox}>
              <Icon name="information" size={20} color="#FF9800" />
              <Text style={styles.warningText}>
                The user won't be notified. You can unblock them later from Settings.
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Reason for blocking (Optional)</Text>
              <TextInput
                style={styles.textArea}
                value={blockReason}
                onChangeText={setBlockReason}
                placeholder="Let us know why you're blocking..."
                placeholderTextColor="#999"
                multiline
                numberOfLines={3}
                maxLength={200}
              />
            </View>

            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => navigation.goBack()}
                disabled={isSubmitting}
              >
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dangerButton, isSubmitting && styles.disabledButton]}
                onPress={handleBlock}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.dangerButtonText}>Block User</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  userPhoto: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 12,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  userId: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#FF4458',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
  },
  activeTabText: {
    color: '#FF4458',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
    lineHeight: 20,
  },
  categories: {
    marginBottom: 24,
  },
  categoriesLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  selectedCategory: {
    borderColor: '#FF4458',
    backgroundColor: '#FFF5F7',
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8F8F8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryContent: {
    flex: 1,
  },
  categoryLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  categoryDescription: {
    fontSize: 14,
    color: '#666',
  },
  highPriorityBadge: {
    backgroundColor: '#FF4458',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  textArea: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#1A1A1A',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
    marginTop: 4,
  },
  safetyNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    gap: 12,
  },
  noticeText: {
    flex: 1,
    fontSize: 14,
    color: '#2E7D32',
    lineHeight: 20,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    gap: 12,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: '#E65100',
    lineHeight: 20,
  },
  blockEffects: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  effectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12,
  },
  effectText: {
    fontSize: 14,
    color: '#1A1A1A',
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#FF4458',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  dangerButton: {
    backgroundColor: '#D32F2F',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 32,
  },
  dangerButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  disabledButton: {
    opacity: 0.5,
  },
});

export default BlockReportScreen;
