/**
 * Premium Feature Paywall Component
 * Shows when users try to access premium features
 */

import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

const { width } = Dimensions.get('window');

interface PremiumPaywallProps {
  visible: boolean;
  feature: string;
  featureDescription: string;
  requiredTier?: 'gold' | 'platinum' | 'diamond';
  onClose: () => void;
  onUpgrade: () => void;
}

const TIER_INFO = {
  gold: {
    name: 'Gold',
    gradient: ['#FFD700', '#FFA500'],
    icon: 'star',
  },
  platinum: {
    name: 'Platinum',
    gradient: ['#9333EA', '#6366F1'],
    icon: 'ribbon',
  },
  diamond: {
    name: 'Diamond',
    gradient: ['#06B6D4', '#3B82F6'],
    icon: 'diamond',
  },
};

export const PremiumPaywall: React.FC<PremiumPaywallProps> = ({
  visible,
  feature,
  featureDescription,
  requiredTier = 'gold',
  onClose,
  onUpgrade,
}) => {
  const tierInfo = TIER_INFO[requiredTier];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        {/* @ts-expect-error BlurView has JSX element type incompatibility with React 18 types */}
        <BlurView intensity={20} style={styles.blurView}>
          <View style={styles.container}>
            {/* Close Button */}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={28} color="#1F2937" />
            </TouchableOpacity>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
              {/* Header */}
              <LinearGradient
                colors={tierInfo.gradient}
                style={styles.header}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.iconContainer}>
                  <Ionicons name="lock-closed" size={48} color="#FFF" />
                </View>
                <Text style={styles.headerTitle}>Premium Feature</Text>
                <Text style={styles.headerSubtitle}>Upgrade to unlock {feature}</Text>
              </LinearGradient>

              {/* Feature Info */}
              <View style={styles.featureSection}>
                <Text style={styles.featureTitle}>{feature}</Text>
                <Text style={styles.featureDescription}>{featureDescription}</Text>
              </View>

              {/* Required Tier */}
              <View style={styles.tierSection}>
                <Text style={styles.tierLabel}>Required Tier</Text>
                <LinearGradient
                  colors={tierInfo.gradient}
                  style={styles.tierBadge}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Ionicons name={tierInfo.icon as any} size={24} color="#FFF" />
                  <Text style={styles.tierName}>{tierInfo.name}</Text>
                </LinearGradient>
              </View>

              {/* Benefits */}
              <View style={styles.benefitsSection}>
                <Text style={styles.benefitsTitle}>What you get with {tierInfo.name}</Text>
                <View style={styles.benefitsList}>
                  {getBenefitsForTier(requiredTier).map((benefit, index) => (
                    <View key={index} style={styles.benefitItem}>
                      <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                      <Text style={styles.benefitText}>{benefit}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* CTA Buttons */}
              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.upgradeButton}
                  onPress={onUpgrade}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={tierInfo.gradient}
                    style={styles.upgradeButtonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Text style={styles.upgradeButtonText}>Upgrade to {tierInfo.name}</Text>
                    <Ionicons name="arrow-forward" size={20} color="#FFF" />
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                  <Text style={styles.cancelButtonText}>Maybe Later</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </BlurView>
      </View>
    </Modal>
  );
};

const getBenefitsForTier = (tier: 'gold' | 'platinum' | 'diamond'): string[] => {
  const benefits = {
    gold: [
      'Unlimited likes',
      'See who likes you',
      'Advanced filters',
      '5 Super Likes per day',
      '1 Boost per week',
      'Rewind last swipe',
      'Priority support',
    ],
    platinum: [
      'Everything in Gold',
      'Message before matching',
      'Priority in Discovery',
      '10 Super Likes per day',
      '3 Boosts per week',
      'See read receipts',
      'Hide ads',
      'Incognito mode',
    ],
    diamond: [
      'Everything in Platinum',
      'Exclusive events access',
      'Verified badge',
      'Unlimited Super Likes',
      'Unlimited Boosts',
      'Profile highlights',
      'AI matchmaking insights',
      'Personal concierge',
    ],
  };

  return benefits[tier];
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  blurView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: width - 32,
    maxWidth: 500,
    backgroundColor: '#FFF',
    borderRadius: 24,
    overflow: 'hidden',
    maxHeight: '85%',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    backgroundColor: '#FFF',
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  content: {
    paddingBottom: 24,
  },
  header: {
    padding: 32,
    alignItems: 'center',
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#FFF',
    opacity: 0.9,
  },
  featureSection: {
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  featureTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  featureDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  tierSection: {
    padding: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tierLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  tierName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
  },
  benefitsSection: {
    padding: 24,
  },
  benefitsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  benefitsList: {
    gap: 12,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  benefitText: {
    fontSize: 14,
    color: '#4B5563',
    flex: 1,
  },
  actions: {
    padding: 24,
    paddingTop: 8,
  },
  upgradeButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  upgradeButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  upgradeButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
  },
  cancelButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
});

export default PremiumPaywall;
