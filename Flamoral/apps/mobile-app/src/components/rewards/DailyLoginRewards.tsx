/**
 * Daily Login Rewards Component
 * Displays 7-day reward calendar with claim functionality
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/Feather';

interface RewardConfig {
  dayNumber: number;
  rewardType: 'coins' | 'super_likes' | 'boosts' | 'premium_trial';
  rewardAmount: number;
  rewardDurationHours?: number;
  displayTitle: string;
  displayDescription?: string;
  iconName?: string;
  isCurrent?: boolean;
  isCompleted?: boolean;
}

interface StreakStatus {
  currentStreak: number;
  longestStreak: number;
  currentDayInCycle: number;
  canClaimToday: boolean;
  hoursUntilNextClaim: number;
}

interface DailyLoginRewardsProps {
  onRewardClaimed?: (reward: any) => void;
}

export const DailyLoginRewards: React.FC<DailyLoginRewardsProps> = ({ onRewardClaimed }) => {
  const [calendar, setCalendar] = useState<RewardConfig[]>([]);
  const [streakStatus, setStreakStatus] = useState<StreakStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [claimedReward, setClaimedReward] = useState<any>(null);
  const scaleAnim = new Animated.Value(0);

  useEffect(() => {
    loadRewardData();
  }, []);

  const loadRewardData = async () => {
    try {
      setLoading(true);
      // API call to get reward calendar and streak status
      const response = await fetch('/api/rewards/calendar', {
        headers: {
          Authorization: `Bearer ${await getAuthToken()}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setCalendar(data.data.calendar);
        setStreakStatus({
          currentStreak: data.data.currentStreak,
          longestStreak: 0,
          currentDayInCycle: data.data.currentDayInCycle,
          canClaimToday: data.data.canClaimToday,
          hoursUntilNextClaim: data.data.hoursUntilNextClaim,
        });
      }
    } catch (error) {
      console.error('Error loading reward data:', error);
    } finally {
      setLoading(false);
    }
  };

  const claimReward = async () => {
    if (!streakStatus?.canClaimToday) {
      return;
    }

    try {
      setClaiming(true);

      const response = await fetch('/api/rewards/claim', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${await getAuthToken()}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success) {
        setClaimedReward(data.data.reward);
        setShowClaimModal(true);
        animateRewardClaim();

        // Reload data to update UI
        await loadRewardData();

        if (onRewardClaimed) {
          onRewardClaimed(data.data.reward);
        }
      }
    } catch (error) {
      console.error('Error claiming reward:', error);
    } finally {
      setClaiming(false);
    }
  };

  const animateRewardClaim = () => {
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 3,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0,
        duration: 300,
        delay: 2000,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowClaimModal(false);
    });
  };

  const getRewardIcon = (rewardType: string, iconName?: string) => {
    if (iconName) {
      return iconName;
    }

    switch (rewardType) {
      case 'coins':
        return 'dollar-sign';
      case 'super_likes':
        return 'star';
      case 'boosts':
        return 'zap';
      case 'premium_trial':
        return 'crown';
      default:
        return 'gift';
    }
  };

  const getRewardColor = (rewardType: string) => {
    switch (rewardType) {
      case 'coins':
        return ['#FFD700', '#FFA500'];
      case 'super_likes':
        return ['#4A90E2', '#357ABD'];
      case 'boosts':
        return ['#FF6B6B', '#EE5A52'];
      case 'premium_trial':
        return ['#9B59B6', '#8E44AD'];
      default:
        return ['#95A5A6', '#7F8C8D'];
    }
  };

  const getAuthToken = async () => {
    // Implement token retrieval logic
    return 'your-auth-token';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Daily Login Rewards</Text>
        <View style={styles.streakContainer}>
          <Icon name="award" size={20} color="#FF6B6B" />
          <Text style={styles.streakText}>{streakStatus?.currentStreak || 0} Day Streak!</Text>
        </View>
      </View>

      {/* Reward Calendar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.calendarScroll}>
        {calendar.map((reward) => (
          <TouchableOpacity
            key={reward.dayNumber}
            style={[
              styles.rewardCard,
              reward.isCompleted && styles.rewardCardCompleted,
              reward.isCurrent && styles.rewardCardCurrent,
            ]}
            disabled={!reward.isCurrent || !streakStatus?.canClaimToday}
            onPress={reward.isCurrent ? claimReward : undefined}
          >
            <LinearGradient
              colors={
                reward.isCompleted
                  ? ['#95A5A6', '#7F8C8D']
                  : reward.isCurrent
                  ? getRewardColor(reward.rewardType)
                  : ['#ECF0F1', '#BDC3C7']
              }
              style={styles.cardGradient}
            >
              <View style={styles.dayBadge}>
                <Text style={styles.dayText}>Day {reward.dayNumber}</Text>
              </View>

              <View style={styles.rewardIcon}>
                <Icon
                  name={getRewardIcon(reward.rewardType, reward.iconName)}
                  size={32}
                  color="white"
                />
              </View>

              <Text style={styles.rewardTitle} numberOfLines={2}>
                {reward.displayTitle}
              </Text>

              <View style={styles.rewardAmount}>
                <Text style={styles.amountText}>
                  {reward.rewardAmount}
                  {reward.rewardType === 'coins' && ' Coins'}
                  {reward.rewardType === 'super_likes' && ' Super Likes'}
                  {reward.rewardType === 'boosts' && 'h Boost'}
                  {reward.rewardType === 'premium_trial' && 'h Premium'}
                </Text>
              </View>

              {reward.isCompleted && (
                <View style={styles.checkmark}>
                  <Icon name="check-circle" size={24} color="white" />
                </View>
              )}

              {reward.isCurrent && streakStatus?.canClaimToday && (
                <View style={styles.claimButton}>
                  <Text style={styles.claimButtonText}>Claim Now!</Text>
                </View>
              )}
            </LinearGradient>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Info Section */}
      {streakStatus && !streakStatus.canClaimToday && (
        <View style={styles.infoSection}>
          <Icon name="clock" size={18} color="#7F8C8D" />
          <Text style={styles.infoText}>
            Next reward in {streakStatus.hoursUntilNextClaim} hours
          </Text>
        </View>
      )}

      {/* Claim Modal */}
      <Modal visible={showClaimModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <Animated.View
            style={[
              styles.modalContent,
              {
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            <LinearGradient
              colors={
                claimedReward ? getRewardColor(claimedReward.type) : ['#4A90E2', '#357ABD']
              }
              style={styles.modalGradient}
            >
              <Icon name="gift" size={64} color="white" />
              <Text style={styles.modalTitle}>Reward Claimed!</Text>
              {claimedReward && (
                <>
                  <Text style={styles.modalAmount}>
                    {claimedReward.amount}
                    {claimedReward.type === 'coins' && ' Coins'}
                    {claimedReward.type === 'super_likes' && ' Super Likes'}
                    {claimedReward.type === 'boosts' && 'h Boost'}
                    {claimedReward.type === 'premium_trial' && 'h Premium'}
                  </Text>
                  <Text style={styles.modalSubtext}>
                    Day {claimedReward.dayNumber} • {streakStatus?.currentStreak} Day Streak
                  </Text>
                </>
              )}
            </LinearGradient>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
  },
  header: {
    padding: 20,
    paddingTop: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 10,
  },
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  streakText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF6B6B',
    marginLeft: 8,
  },
  calendarScroll: {
    paddingHorizontal: 10,
  },
  rewardCard: {
    width: 160,
    height: 220,
    marginHorizontal: 10,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  rewardCardCompleted: {
    opacity: 0.7,
  },
  rewardCardCurrent: {
    transform: [{ scale: 1.05 }],
    borderWidth: 3,
    borderColor: '#FFD700',
  },
  cardGradient: {
    flex: 1,
    padding: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  dayText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: 'white',
  },
  rewardIcon: {
    marginBottom: 10,
  },
  rewardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 8,
  },
  rewardAmount: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  amountText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  checkmark: {
    position: 'absolute',
    bottom: 10,
    right: 10,
  },
  claimButton: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
    backgroundColor: 'white',
    paddingVertical: 8,
    borderRadius: 20,
  },
  claimButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4A90E2',
    textAlign: 'center',
  },
  infoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  infoText: {
    fontSize: 14,
    color: '#7F8C8D',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    borderRadius: 20,
    overflow: 'hidden',
  },
  modalGradient: {
    padding: 40,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 20,
    marginBottom: 10,
  },
  modalAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
  },
  modalSubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
});
