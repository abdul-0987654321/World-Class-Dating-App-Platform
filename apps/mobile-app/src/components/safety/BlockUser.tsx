import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
} from 'react-native';
import { Button } from '../common/Button';

export interface BlockReason {
  id: string;
  label: string;
  icon: string;
}

interface BlockUserProps {
  visible: boolean;
  userName: string;
  isMatch?: boolean;
  onClose: () => void;
  onBlock: (reason?: string, alsoReport?: boolean) => Promise<void>;
  onReport?: () => void;
}

const BLOCK_REASONS: BlockReason[] = [
  { id: 'inappropriate', label: 'Inappropriate messages', icon: '💬' },
  { id: 'harassment', label: 'Harassment or bullying', icon: '⚠️' },
  { id: 'fake', label: 'Fake or spam account', icon: '🚫' },
  { id: 'underage', label: 'Appears to be underage', icon: '🔞' },
  { id: 'offline', label: 'Offline behavior', icon: '👤' },
  { id: 'not_interested', label: 'Just not interested', icon: '👋' },
  { id: 'other', label: 'Other reason', icon: '•••' },
];

export const BlockUser: React.FC<BlockUserProps> = ({
  visible,
  userName,
  isMatch = false,
  onClose,
  onBlock,
  onReport,
}) => {
  const [selectedReason, setSelectedReason] = useState<string | undefined>();
  const [alsoReport, setAlsoReport] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleBlock = async () => {
    // Show final confirmation
    Alert.alert(
      'Block User?',
      `Are you sure you want to block ${userName}?${
        isMatch ? '\n\nYou will be unmatched and cannot see each other anymore.' : ''
      }`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            try {
              await onBlock(selectedReason, alsoReport);
              Alert.alert(
                'User Blocked',
                `${userName} has been blocked. ${
                  alsoReport
                    ? 'We will review your report.'
                    : 'You will no longer see each other.'
                }`
              );
              onClose();
            } catch (error: any) {
              Alert.alert(
                'Error',
                error.message || 'Failed to block user. Please try again.'
              );
              console.error('Block user error:', error);
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleReportInstead = () => {
    onClose();
    if (onReport) {
      onReport();
    }
  };

  const renderReason = (reason: BlockReason) => {
    const isSelected = selectedReason === reason.id;

    return (
      <TouchableOpacity
        key={reason.id}
        style={[styles.reasonCard, isSelected && styles.reasonCardSelected]}
        onPress={() => setSelectedReason(reason.id)}
      >
        <View style={styles.reasonIcon}>
          <Text style={styles.reasonIconText}>{reason.icon}</Text>
        </View>
        <Text style={[styles.reasonLabel, isSelected && styles.reasonLabelSelected]}>
          {reason.label}
        </Text>
        {isSelected && (
          <View style={styles.checkmark}>
            <Text style={styles.checkmarkText}>✓</Text>
          </View>
        )}
      </TouchableOpacity>
    );
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
          <Text style={styles.headerTitle}>Block User</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.warningContainer}>
            <View style={styles.warningIcon}>
              <Text style={styles.warningIconText}>🛡️</Text>
            </View>
            <Text style={styles.warningTitle}>Block {userName}?</Text>
            <Text style={styles.warningMessage}>
              {isMatch
                ? 'You will be unmatched and will no longer be able to see each other or send messages.'
                : 'You will no longer see each other in discovery.'}
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Why are you blocking this person?</Text>
            <Text style={styles.sectionSubtitle}>
              Optional - This helps us keep Flamoral safe
            </Text>

            <View style={styles.reasonsList}>
              {BLOCK_REASONS.map((reason) => renderReason(reason))}
            </View>
          </View>

          {selectedReason && selectedReason !== 'not_interested' && (
            <TouchableOpacity
              style={styles.reportToggle}
              onPress={() => setAlsoReport(!alsoReport)}
            >
              <View style={[styles.checkbox, alsoReport && styles.checkboxChecked]}>
                {alsoReport && <Text style={styles.checkboxCheck}>✓</Text>}
              </View>
              <View style={styles.reportToggleContent}>
                <Text style={styles.reportToggleTitle}>
                  Also report this user
                </Text>
                <Text style={styles.reportToggleDescription}>
                  Our team will review this account for violations
                </Text>
              </View>
            </TouchableOpacity>
          )}

          <View style={styles.infoContainer}>
            <Text style={styles.infoTitle}>What happens when you block someone?</Text>
            <View style={styles.infoItem}>
              <Text style={styles.infoBullet}>•</Text>
              <Text style={styles.infoText}>
                They won't be able to see your profile or contact you
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoBullet}>•</Text>
              <Text style={styles.infoText}>
                You won't see them in discovery or recommendations
              </Text>
            </View>
            {isMatch && (
              <View style={styles.infoItem}>
                <Text style={styles.infoBullet}>•</Text>
                <Text style={styles.infoText}>
                  Your conversation will be deleted from both sides
                </Text>
              </View>
            )}
            <View style={styles.infoItem}>
              <Text style={styles.infoBullet}>•</Text>
              <Text style={styles.infoText}>
                You can unblock them later in Settings
              </Text>
            </View>
          </View>

          {onReport && (
            <TouchableOpacity
              style={styles.reportButton}
              onPress={handleReportInstead}
            >
              <Text style={styles.reportButtonText}>
                Report instead of blocking
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <Button
            title="Block User"
            onPress={handleBlock}
            variant="danger"
            fullWidth
            loading={isLoading}
            disabled={isLoading}
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
  reasonsList: {
    marginTop: 8,
  },
  reasonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  reasonCardSelected: {
    backgroundColor: '#FFF5F8',
    borderColor: '#E91E63',
  },
  reasonIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  reasonIconText: {
    fontSize: 20,
  },
  reasonLabel: {
    flex: 1,
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  reasonLabelSelected: {
    color: '#E91E63',
    fontWeight: '600',
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E91E63',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  reportToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9E6',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#FF9800',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxChecked: {
    backgroundColor: '#FF9800',
    borderColor: '#FF9800',
  },
  checkboxCheck: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  reportToggleContent: {
    flex: 1,
  },
  reportToggleTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  reportToggleDescription: {
    fontSize: 13,
    color: '#666',
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
    marginBottom: 8,
  },
  infoBullet: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
    fontWeight: 'bold',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  reportButton: {
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  reportButtonText: {
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
