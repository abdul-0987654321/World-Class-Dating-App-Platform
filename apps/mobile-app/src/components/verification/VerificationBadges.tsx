import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { Button } from '../common/Button';

export type VerificationType =
  | 'photo'
  | 'email'
  | 'phone'
  | 'social'
  | 'government_id'
  | 'background_check';

export interface VerificationStatus {
  type: VerificationType;
  verified: boolean;
  verifiedAt?: Date;
  expiresAt?: Date;
}

export interface UserVerifications {
  photo: VerificationStatus;
  email: VerificationStatus;
  phone: VerificationStatus;
  social?: VerificationStatus;
  governmentId?: VerificationStatus;
  backgroundCheck?: VerificationStatus;
}

interface VerificationBadgesProps {
  verifications: UserVerifications;
  size?: 'small' | 'medium' | 'large';
  showLabels?: boolean;
  onBadgePress?: (type: VerificationType) => void;
}

interface VerificationDetailsModalProps {
  visible: boolean;
  verification: VerificationStatus | null;
  onClose: () => void;
  onStartVerification?: (type: VerificationType) => void;
}

const getVerificationInfo = (
  type: VerificationType
): {
  icon: string;
  label: string;
  description: string;
  color: string;
  benefits: string[];
} => {
  switch (type) {
    case 'photo':
      return {
        icon: '📸',
        label: 'Photo Verified',
        description:
          'This user has verified their identity by submitting a real-time selfie that matches their profile photos.',
        color: '#2196F3',
        benefits: ['Confirms identity matches profile', 'Reduces fake profiles', 'Increases trust'],
      };
    case 'email':
      return {
        icon: '✉️',
        label: 'Email Verified',
        description: 'This user has verified their email address.',
        color: '#4CAF50',
        benefits: [
          'Valid contact method',
          'Account recovery enabled',
          'Notification delivery confirmed',
        ],
      };
    case 'phone':
      return {
        icon: '📱',
        label: 'Phone Verified',
        description: 'This user has verified their phone number.',
        color: '#FF9800',
        benefits: [
          'Valid phone number',
          'Two-factor authentication enabled',
          'Additional security layer',
        ],
      };
    case 'social':
      return {
        icon: '🔗',
        label: 'Social Connected',
        description: 'This user has connected at least one social media account.',
        color: '#9C27B0',
        benefits: [
          'Real social presence',
          'Additional identity confirmation',
          'See mutual friends',
        ],
      };
    case 'government_id':
      return {
        icon: '🆔',
        label: 'ID Verified',
        description: 'This user has verified their identity with a government-issued ID.',
        color: '#3F51B5',
        benefits: ['Highest level of verification', 'Age confirmed', 'Identity guaranteed'],
      };
    case 'background_check':
      return {
        icon: '🛡️',
        label: 'Background Checked',
        description: 'This user has passed a background check screening.',
        color: '#00BCD4',
        benefits: [
          'Criminal record screened',
          'Additional safety measure',
          'Premium safety feature',
        ],
      };
    default:
      return {
        icon: '✓',
        label: 'Verified',
        description: 'This user has been verified.',
        color: '#4CAF50',
        benefits: [],
      };
  }
};

const VerificationBadge: React.FC<{
  verification: VerificationStatus;
  size: 'small' | 'medium' | 'large';
  showLabel?: boolean;
  onPress?: () => void;
}> = ({ verification, size, showLabel = false, onPress }) => {
  const info = getVerificationInfo(verification.type);

  const sizeStyles = {
    small: {
      container: styles.badgeSmall,
      icon: styles.badgeIconSmall,
      label: styles.badgeLabelSmall,
    },
    medium: {
      container: styles.badgeMedium,
      icon: styles.badgeIconMedium,
      label: styles.badgeLabelMedium,
    },
    large: {
      container: styles.badgeLarge,
      icon: styles.badgeIconLarge,
      label: styles.badgeLabelLarge,
    },
  };

  const currentSize = sizeStyles[size];

  if (!verification.verified) {
    return null;
  }

  const badge = (
    <View style={[styles.badge, currentSize.container, { backgroundColor: info.color }]}>
      <Text style={[styles.badgeIcon, currentSize.icon]}>{info.icon}</Text>
      {showLabel && <Text style={[styles.badgeLabel, currentSize.label]}>{info.label}</Text>}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {badge}
      </TouchableOpacity>
    );
  }

  return badge;
};

const VerificationDetailsModal: React.FC<VerificationDetailsModalProps> = ({
  visible,
  verification,
  onClose,
  onStartVerification,
}) => {
  if (!verification) return null;

  const info = getVerificationInfo(verification.type);

  const renderVerified = () => (
    <ScrollView
      style={styles.modalContent}
      contentContainerStyle={styles.modalContentContainer}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.modalIcon, { backgroundColor: info.color }]}>
        <Text style={styles.modalIconText}>{info.icon}</Text>
      </View>

      <Text style={styles.modalTitle}>{info.label}</Text>
      <Text style={styles.modalDescription}>{info.description}</Text>

      {verification.verifiedAt && (
        <View style={styles.verificationInfo}>
          <View style={styles.verificationInfoRow}>
            <Text style={styles.verificationInfoLabel}>Verified on:</Text>
            <Text style={styles.verificationInfoValue}>
              {verification.verifiedAt.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </Text>
          </View>

          {verification.expiresAt && (
            <View style={styles.verificationInfoRow}>
              <Text style={styles.verificationInfoLabel}>Expires on:</Text>
              <Text style={styles.verificationInfoValue}>
                {verification.expiresAt.toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </Text>
            </View>
          )}
        </View>
      )}

      {info.benefits.length > 0 && (
        <View style={styles.benefitsContainer}>
          <Text style={styles.benefitsTitle}>Benefits:</Text>
          {info.benefits.map((benefit, index) => (
            <View key={index} style={styles.benefitRow}>
              <Text style={styles.benefitIcon}>✓</Text>
              <Text style={styles.benefitText}>{benefit}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.trustCard}>
        <Text style={styles.trustIcon}>🔒</Text>
        <Text style={styles.trustText}>
          Verified profiles help create a safer and more trustworthy community.
        </Text>
      </View>
    </ScrollView>
  );

  const renderNotVerified = () => (
    <ScrollView
      style={styles.modalContent}
      contentContainerStyle={styles.modalContentContainer}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.modalIcon, { backgroundColor: '#E0E0E0' }]}>
        <Text style={styles.modalIconText}>{info.icon}</Text>
      </View>

      <Text style={styles.modalTitle}>Not Verified</Text>
      <Text style={styles.modalDescription}>This verification has not been completed yet.</Text>

      <View style={styles.benefitsContainer}>
        <Text style={styles.benefitsTitle}>Get this verification to:</Text>
        {info.benefits.map((benefit, index) => (
          <View key={index} style={styles.benefitRow}>
            <Text style={styles.benefitIcon}>✓</Text>
            <Text style={styles.benefitText}>{benefit}</Text>
          </View>
        ))}
      </View>

      {onStartVerification && (
        <Button
          title="Start Verification"
          onPress={() => {
            onStartVerification(verification.type);
            onClose();
          }}
          fullWidth
          style={styles.startButton}
        />
      )}
    </ScrollView>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
              <Text style={styles.modalCloseButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          {verification.verified ? renderVerified() : renderNotVerified()}
        </View>
      </View>
    </Modal>
  );
};

export const VerificationBadges: React.FC<VerificationBadgesProps> = ({
  verifications,
  size = 'medium',
  showLabels = false,
  onBadgePress,
}) => {
  const [selectedVerification, setSelectedVerification] = React.useState<VerificationStatus | null>(
    null
  );
  const [showModal, setShowModal] = React.useState(false);

  const handleBadgePress = (verification: VerificationStatus) => {
    if (onBadgePress) {
      onBadgePress(verification.type);
    }
    setSelectedVerification(verification);
    setShowModal(true);
  };

  const verifiedBadges = Object.values(verifications).filter((v) => v?.verified);

  if (verifiedBadges.length === 0) {
    return null;
  }

  return (
    <>
      <View style={styles.container}>
        {verifications.photo?.verified && (
          <VerificationBadge
            verification={verifications.photo}
            size={size}
            showLabel={showLabels}
            onPress={() => handleBadgePress(verifications.photo)}
          />
        )}

        {verifications.email?.verified && (
          <VerificationBadge
            verification={verifications.email}
            size={size}
            showLabel={showLabels}
            onPress={() => handleBadgePress(verifications.email)}
          />
        )}

        {verifications.phone?.verified && (
          <VerificationBadge
            verification={verifications.phone}
            size={size}
            showLabel={showLabels}
            onPress={() => handleBadgePress(verifications.phone)}
          />
        )}

        {verifications.social?.verified && (
          <VerificationBadge
            verification={verifications.social}
            size={size}
            showLabel={showLabels}
            onPress={() => handleBadgePress(verifications.social)}
          />
        )}

        {verifications.governmentId?.verified && (
          <VerificationBadge
            verification={verifications.governmentId}
            size={size}
            showLabel={showLabels}
            onPress={() => handleBadgePress(verifications.governmentId)}
          />
        )}

        {verifications.backgroundCheck?.verified && (
          <VerificationBadge
            verification={verifications.backgroundCheck}
            size={size}
            showLabel={showLabels}
            onPress={() => handleBadgePress(verifications.backgroundCheck)}
          />
        )}
      </View>

      <VerificationDetailsModal
        visible={showModal}
        verification={selectedVerification}
        onClose={() => setShowModal(false)}
      />
    </>
  );
};

// Helper component for displaying verification checklist
export const VerificationChecklist: React.FC<{
  verifications: UserVerifications;
  onStartVerification: (type: VerificationType) => void;
}> = ({ verifications, onStartVerification }) => {
  const allVerificationTypes: VerificationType[] = [
    'photo',
    'email',
    'phone',
    'social',
    'government_id',
    'background_check',
  ];

  const verifiedCount = allVerificationTypes.filter(
    (type) => verifications[type as keyof UserVerifications]?.verified
  ).length;

  const progressPercentage = (verifiedCount / allVerificationTypes.length) * 100;

  return (
    <View style={styles.checklistContainer}>
      <View style={styles.checklistHeader}>
        <Text style={styles.checklistTitle}>Verification Status</Text>
        <Text style={styles.checklistProgress}>
          {verifiedCount} of {allVerificationTypes.length} completed
        </Text>
      </View>

      <View style={styles.progressBarContainer}>
        <View style={[styles.progressBarFill, { width: `${progressPercentage}%` }]} />
      </View>

      <View style={styles.checklistItems}>
        {allVerificationTypes.map((type) => {
          const verification = verifications[type as keyof UserVerifications];
          const info = getVerificationInfo(type);

          return (
            <TouchableOpacity
              key={type}
              style={styles.checklistItem}
              onPress={() => !verification?.verified && onStartVerification(type)}
            >
              <View
                style={[
                  styles.checklistIcon,
                  verification?.verified && {
                    backgroundColor: info.color,
                  },
                ]}
              >
                <Text style={styles.checklistIconText}>
                  {verification?.verified ? '✓' : info.icon}
                </Text>
              </View>

              <View style={styles.checklistInfo}>
                <Text style={styles.checklistLabel}>{info.label}</Text>
                <Text style={styles.checklistDescription}>
                  {verification?.verified ? 'Verified' : 'Not verified yet'}
                </Text>
              </View>

              {!verification?.verified && <Text style={styles.checklistChevron}>›</Text>}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  // Badge Styles
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeSmall: {
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  badgeMedium: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeLarge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  badgeIcon: {
    color: '#FFF',
  },
  badgeIconSmall: {
    fontSize: 12,
  },
  badgeIconMedium: {
    fontSize: 14,
  },
  badgeIconLarge: {
    fontSize: 16,
  },
  badgeLabel: {
    color: '#FFF',
    fontWeight: '600',
    marginLeft: 4,
  },
  badgeLabelSmall: {
    fontSize: 10,
  },
  badgeLabelMedium: {
    fontSize: 12,
  },
  badgeLabelLarge: {
    fontSize: 14,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseButtonText: {
    fontSize: 18,
    color: '#666',
  },
  modalContent: {
    flex: 1,
  },
  modalContentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  modalIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalIconText: {
    fontSize: 40,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 12,
  },
  modalDescription: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  verificationInfo: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  verificationInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  verificationInfoLabel: {
    fontSize: 14,
    color: '#999',
  },
  verificationInfoValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  benefitsContainer: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  benefitsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  benefitIcon: {
    fontSize: 16,
    color: '#4CAF50',
    marginRight: 8,
    fontWeight: 'bold',
  },
  benefitText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  trustCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 16,
  },
  trustIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  trustText: {
    flex: 1,
    fontSize: 13,
    color: '#2E7D32',
    lineHeight: 20,
  },
  startButton: {
    marginTop: 16,
  },
  // Checklist Styles
  checklistContainer: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
  },
  checklistHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  checklistTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  checklistProgress: {
    fontSize: 14,
    color: '#999',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#F0F0F0',
    borderRadius: 4,
    marginBottom: 24,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
  checklistItems: {
    gap: 12,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
  },
  checklistIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checklistIconText: {
    fontSize: 18,
    color: '#FFF',
  },
  checklistInfo: {
    flex: 1,
  },
  checklistLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  checklistDescription: {
    fontSize: 13,
    color: '#999',
  },
  checklistChevron: {
    fontSize: 20,
    color: '#999',
  },
});
