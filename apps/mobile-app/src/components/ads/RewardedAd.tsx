/**
 * Rewarded Video Ad Component
 * Allows users to watch video ads for coins, boosts, and other rewards
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  ActivityIndicator,
  Alert,
  Animated,
} from 'react-native';
import {
  UseRewardedAdReturn,
  AvailableReward,
  RewardEarned,
  RewardType,
  DEFAULT_REWARDS,
} from '../../services/ads/types';
import AdManager from '../../services/ads/AdManager';
import AdService from '../../services/ads/AdService';

// Icons mapping (using text emojis as placeholders)
const REWARD_ICONS: Record<string, string> = {
  coin: '',
  star: '',
  rocket: '',
  undo: '',
  crown: '',
};

/**
 * Hook for managing rewarded ads
 */
export function useRewardedAd(): UseRewardedAdReturn {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [availableRewards, setAvailableRewards] = useState<AvailableReward[]>([]);
  const [error, setError] = useState<Error | null>(null);

  // Initialize and check status
  useEffect(() => {
    const initialize = async () => {
      await AdManager.initialize();
      await AdService.initialize();
      updateStatus();
    };

    initialize();

    // Poll for status updates
    const interval = setInterval(updateStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const updateStatus = useCallback(async () => {
    const loaded = AdService.isRewardedLoaded();
    setIsLoaded(loaded);

    try {
      const rewards = await AdService.getAvailableRewards();
      setAvailableRewards(rewards);
    } catch (err) {
      console.error('[useRewardedAd] Failed to get rewards:', err);
    }

    setError(AdService.getLastError());
  }, []);

  const preload = useCallback(async () => {
    if (isLoading || isLoaded) return;

    setIsLoading(true);
    try {
      await AdService.loadRewardedAd();
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
      updateStatus();
    }
  }, [isLoading, isLoaded, updateStatus]);

  const show = useCallback(async (rewardId: string): Promise<RewardEarned | null> => {
    try {
      setIsLoading(true);
      const reward = await AdService.showRewardedAd(rewardId);

      if (reward) {
        // Claim the reward on backend
        await AdService.claimReward(rewardId, reward.transactionId);
      }

      await updateStatus();
      return reward;
    } catch (err) {
      setError(err as Error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [updateStatus]);

  return {
    isLoaded,
    isLoading,
    show,
    preload,
    availableRewards,
    error,
  };
}

/**
 * Watch Video for Coins button
 */
interface WatchForCoinsButtonProps {
  onRewardEarned?: (reward: RewardEarned) => void;
  onError?: (error: Error) => void;
  style?: object;
}

export const WatchForCoinsButton: React.FC<WatchForCoinsButtonProps> = ({
  onRewardEarned,
  onError,
  style,
}) => {
  const { show, isLoaded, isLoading, preload, availableRewards } = useRewardedAd();
  const [cooldownText, setCooldownText] = useState<string | null>(null);

  // Find coins reward
  const coinsReward = availableRewards.find(r => r.config.type === 'coins');
  const isAvailable = coinsReward?.available ?? false;

  // Update cooldown text
  useEffect(() => {
    if (coinsReward && !coinsReward.available && coinsReward.nextAvailableAt) {
      const updateCooldown = () => {
        const remaining = Math.max(0, Math.floor((coinsReward.nextAvailableAt! - Date.now()) / 1000));
        if (remaining > 0) {
          const minutes = Math.floor(remaining / 60);
          const seconds = remaining % 60;
          setCooldownText(`${minutes}:${seconds.toString().padStart(2, '0')}`);
        } else {
          setCooldownText(null);
        }
      };

      updateCooldown();
      const interval = setInterval(updateCooldown, 1000);
      return () => clearInterval(interval);
    } else {
      setCooldownText(null);
    }
  }, [coinsReward]);

  // Preload on mount
  useEffect(() => {
    if (!isLoaded) {
      preload();
    }
  }, [isLoaded, preload]);

  const handlePress = async () => {
    if (!isAvailable) {
      if (cooldownText) {
        Alert.alert('Please Wait', `You can watch another ad in ${cooldownText}`);
      } else if (coinsReward?.viewsRemainingToday === 0) {
        Alert.alert('Daily Limit Reached', 'Come back tomorrow for more rewards!');
      }
      return;
    }

    const reward = await show('coins');
    if (reward) {
      onRewardEarned?.(reward);
      Alert.alert(
        'Reward Earned!',
        `You received ${reward.amount} coins!`,
        [{ text: 'Awesome!' }]
      );
    } else {
      onError?.(new Error('Failed to earn reward'));
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.watchButton,
        !isAvailable && styles.watchButtonDisabled,
        style,
      ]}
      onPress={handlePress}
      disabled={isLoading}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color="#FFF" />
      ) : (
        <>
          <Text style={styles.watchButtonIcon}>+10</Text>
          <View style={styles.watchButtonContent}>
            <Text style={styles.watchButtonTitle}>
              {cooldownText ? `Wait ${cooldownText}` : 'Watch Video'}
            </Text>
            <Text style={styles.watchButtonSubtitle}>
              {coinsReward?.viewsRemainingToday ?? 0} remaining today
            </Text>
          </View>
          <Text style={styles.playIcon}>Play</Text>
        </>
      )}
    </TouchableOpacity>
  );
};

/**
 * Reward selection modal
 */
interface RewardSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  onRewardSelected: (reward: RewardEarned) => void;
}

export const RewardSelectionModal: React.FC<RewardSelectionModalProps> = ({
  visible,
  onClose,
  onRewardSelected,
}) => {
  const { show, isLoaded, isLoading, availableRewards, preload } = useRewardedAd();
  const [selectedReward, setSelectedReward] = useState<string | null>(null);

  // Preload when modal opens
  useEffect(() => {
    if (visible && !isLoaded) {
      preload();
    }
  }, [visible, isLoaded, preload]);

  const handleSelectReward = async (rewardId: string) => {
    setSelectedReward(rewardId);
    const reward = await show(rewardId);

    if (reward) {
      onRewardSelected(reward);
      onClose();
    }

    setSelectedReward(null);
  };

  const renderRewardItem = ({ item }: { item: AvailableReward }) => {
    const isSelected = selectedReward === item.id;
    const canWatch = item.available && isLoaded;

    return (
      <TouchableOpacity
        style={[
          styles.rewardItem,
          !canWatch && styles.rewardItemDisabled,
          isSelected && styles.rewardItemSelected,
        ]}
        onPress={() => handleSelectReward(item.id)}
        disabled={!canWatch || isLoading}
      >
        <View style={styles.rewardIcon}>
          <Text style={styles.rewardIconText}>{REWARD_ICONS[item.config.icon] || ''}</Text>
        </View>

        <View style={styles.rewardInfo}>
          <Text style={styles.rewardTitle}>{item.config.displayName}</Text>
          <Text style={styles.rewardDescription}>{item.config.description}</Text>
          <Text style={styles.rewardRemaining}>
            {item.viewsRemainingToday} / {item.config.maxPerDay || 10} remaining today
          </Text>
        </View>

        {isSelected ? (
          <ActivityIndicator size="small" color="#E91E63" />
        ) : (
          <View style={[styles.watchBadge, !canWatch && styles.watchBadgeDisabled]}>
            <Text style={styles.watchBadgeText}>
              {canWatch ? 'Watch' : 'Wait'}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Earn Free Rewards</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>X</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.modalSubtitle}>
            Watch a short video to earn rewards
          </Text>

          <FlatList
            data={availableRewards}
            renderItem={renderRewardItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.rewardList}
            showsVerticalScrollIndicator={false}
          />

          <Text style={styles.disclaimer}>
            Videos typically last 15-30 seconds. Rewards are credited immediately after watching.
          </Text>
        </View>
      </View>
    </Modal>
  );
};

/**
 * Reward earned animation/celebration
 */
interface RewardCelebrationProps {
  reward: RewardEarned | null;
  onComplete: () => void;
}

export const RewardCelebration: React.FC<RewardCelebrationProps> = ({
  reward,
  onComplete,
}) => {
  const scaleAnim = React.useRef(new Animated.Value(0)).current;
  const opacityAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reward) {
      Animated.sequence([
        Animated.parallel([
          Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 4,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
        ]),
        Animated.delay(2000),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        scaleAnim.setValue(0);
        onComplete();
      });
    }
  }, [reward, scaleAnim, opacityAnim, onComplete]);

  if (!reward) return null;

  const rewardConfig = DEFAULT_REWARDS.find(r => r.type === reward.type);

  return (
    <Animated.View
      style={[
        styles.celebrationOverlay,
        {
          opacity: opacityAnim,
        },
      ]}
      pointerEvents="none"
    >
      <Animated.View
        style={[
          styles.celebrationCard,
          {
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <Text style={styles.celebrationIcon}>
          {REWARD_ICONS[rewardConfig?.icon || 'coin']}
        </Text>
        <Text style={styles.celebrationTitle}>Reward Earned!</Text>
        <Text style={styles.celebrationAmount}>
          +{reward.amount} {rewardConfig?.displayName || reward.type}
        </Text>
      </Animated.View>
    </Animated.View>
  );
};

/**
 * Quick reward button (floating action button style)
 */
interface QuickRewardButtonProps {
  onRewardEarned?: (reward: RewardEarned) => void;
  position?: 'bottom-left' | 'bottom-right';
}

export const QuickRewardButton: React.FC<QuickRewardButtonProps> = ({
  onRewardEarned,
  position = 'bottom-right',
}) => {
  const [showModal, setShowModal] = useState(false);
  const [earnedReward, setEarnedReward] = useState<RewardEarned | null>(null);
  const { availableRewards } = useRewardedAd();

  const hasAvailableRewards = availableRewards.some(r => r.available);

  const handleRewardEarned = (reward: RewardEarned) => {
    setEarnedReward(reward);
    onRewardEarned?.(reward);
  };

  if (!hasAvailableRewards) return null;

  return (
    <>
      <TouchableOpacity
        style={[
          styles.quickButton,
          position === 'bottom-left' ? styles.quickButtonLeft : styles.quickButtonRight,
        ]}
        onPress={() => setShowModal(true)}
      >
        <Text style={styles.quickButtonIcon}>Gift</Text>
        <Text style={styles.quickButtonText}>Free</Text>
      </TouchableOpacity>

      <RewardSelectionModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        onRewardSelected={handleRewardEarned}
      />

      <RewardCelebration
        reward={earnedReward}
        onComplete={() => setEarnedReward(null)}
      />
    </>
  );
};

const styles = StyleSheet.create({
  // Watch for Coins button
  watchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  watchButtonDisabled: {
    backgroundColor: '#CCC',
  },
  watchButtonIcon: {
    fontSize: 24,
    color: '#FFF',
    fontWeight: 'bold',
    marginRight: 12,
  },
  watchButtonContent: {
    flex: 1,
  },
  watchButtonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  watchButtonSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  playIcon: {
    fontSize: 16,
    color: '#FFF',
    fontWeight: 'bold',
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 18,
    color: '#666',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
  },
  rewardList: {
    paddingBottom: 16,
  },

  // Reward item
  rewardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  rewardItemDisabled: {
    opacity: 0.5,
  },
  rewardItemSelected: {
    borderColor: '#E91E63',
  },
  rewardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFF3E0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rewardIconText: {
    fontSize: 24,
  },
  rewardInfo: {
    flex: 1,
  },
  rewardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  rewardDescription: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  rewardRemaining: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
  },
  watchBadge: {
    backgroundColor: '#E91E63',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  watchBadgeDisabled: {
    backgroundColor: '#CCC',
  },
  watchBadgeText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 14,
  },
  disclaimer: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 16,
  },

  // Celebration
  celebrationOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  celebrationCard: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
  },
  celebrationIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  celebrationTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  celebrationAmount: {
    fontSize: 20,
    color: '#4CAF50',
    fontWeight: '600',
  },

  // Quick button
  quickButton: {
    position: 'absolute',
    bottom: 100,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E91E63',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  quickButtonLeft: {
    left: 20,
  },
  quickButtonRight: {
    right: 20,
  },
  quickButtonIcon: {
    fontSize: 12,
    color: '#FFF',
    fontWeight: 'bold',
  },
  quickButtonText: {
    fontSize: 10,
    color: '#FFF',
    marginTop: 2,
  },
});

export default useRewardedAd;
