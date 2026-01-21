import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];
import axios from 'axios';

interface DailyReward {
  dayNumber: number;
  rewardType: 'coins' | 'super_likes' | 'boosts' | 'premium_trial';
  baseAmount: number;
  description: string;
  iconName: string;
  isSpecialDay: boolean;
}

interface DailyRewardStatus {
  canClaimToday: boolean;
  streakCount: number;
  dayInCycle: number;
  lastClaimDate: string | null;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onRewardClaimed?: (reward: any) => void;
}

export const DailyRewardsModal: React.FC<Props> = ({ visible, onClose, onRewardClaimed }) => {
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [calendar, setCalendar] = useState<DailyReward[]>([]);
  const [status, setStatus] = useState<DailyRewardStatus | null>(null);

  useEffect(() => {
    if (visible) {
      fetchRewardData();
    }
  }, [visible]);

  const fetchRewardData = async () => {
    try {
      setLoading(true);
      const [calendarRes, statusRes] = await Promise.all([
        axios.get('/api/daily-rewards/calendar'),
        axios.get('/api/daily-rewards/status'),
      ]);

      setCalendar(calendarRes.data.data);
      setStatus(statusRes.data.data);
    } catch (error) {
      console.error('Error fetching reward data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClaimReward = async () => {
    try {
      setClaiming(true);
      const response = await axios.post('/api/daily-rewards/claim');

      if (onRewardClaimed) {
        onRewardClaimed(response.data.data);
      }

      // Refresh data
      await fetchRewardData();

      // Show success message or animation
      // You can add a toast notification here
    } catch (error: any) {
      console.error('Error claiming reward:', error);
      // Show error message
    } finally {
      setClaiming(false);
    }
  };

  const getRewardIcon = (type: string): IoniconsName => {
    switch (type) {
      case 'coins':
        return 'cash';
      case 'super_likes':
        return 'star';
      case 'boosts':
        return 'rocket';
      case 'premium_trial':
        return 'ribbon';
      default:
        return 'gift';
    }
  };

  const getRewardColor = (type: string): string => {
    switch (type) {
      case 'coins':
        return '#FFD700';
      case 'super_likes':
        return '#FF1493';
      case 'boosts':
        return '#FF6B6B';
      case 'premium_trial':
        return '#9C27B0';
      default:
        return '#2196F3';
    }
  };

  if (loading) {
    return (
      <Modal visible={visible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ActivityIndicator size="large" color="#FF6B6B" />
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Daily Rewards</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          {/* Streak Info */}
          {status && (
            <View style={styles.streakInfo}>
              <Ionicons name="flame" size={32} color="#FF6B6B" />
              <View style={styles.streakTextContainer}>
                <Text style={styles.streakCount}>{status.streakCount} Day Streak!</Text>
                <Text style={styles.streakSubtext}>Keep logging in to maintain your streak</Text>
              </View>
            </View>
          )}

          {/* Calendar */}
          <ScrollView style={styles.calendar} showsVerticalScrollIndicator={false}>
            {calendar.map((reward) => {
              const isCurrent = status?.dayInCycle === reward.dayNumber;
              const isCompleted = status && status.dayInCycle > reward.dayNumber;
              const isLocked = status && status.dayInCycle < reward.dayNumber;

              return (
                <View
                  key={reward.dayNumber}
                  style={[
                    styles.rewardCard,
                    isCurrent && styles.currentRewardCard,
                    isCompleted && styles.completedRewardCard,
                  ]}
                >
                  <View style={styles.dayBadge}>
                    <Text style={styles.dayText}>Day {reward.dayNumber}</Text>
                    {reward.isSpecialDay && (
                      <Ionicons name="star" size={16} color="#FFD700" style={styles.specialIcon} />
                    )}
                  </View>

                  <View style={styles.rewardInfo}>
                    <View
                      style={[
                        styles.rewardIconContainer,
                        { backgroundColor: getRewardColor(reward.rewardType) + '20' },
                      ]}
                    >
                      <Ionicons
                        name={getRewardIcon(reward.rewardType)}
                        size={32}
                        color={getRewardColor(reward.rewardType)}
                      />
                    </View>

                    <View style={styles.rewardDetails}>
                      <Text style={styles.rewardAmount}>
                        {reward.baseAmount} {reward.rewardType.replace('_', ' ')}
                      </Text>
                      <Text style={styles.rewardDescription}>{reward.description}</Text>
                    </View>

                    {isCompleted && <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />}
                    {isLocked && <Ionicons name="lock-closed" size={24} color="#999" />}
                  </View>
                </View>
              );
            })}
          </ScrollView>

          {/* Claim Button */}
          {status?.canClaimToday && (
            <TouchableOpacity
              style={[styles.claimButton, claiming && styles.claimButtonDisabled]}
              onPress={handleClaimReward}
              disabled={claiming}
            >
              {claiming ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Ionicons name="gift" size={24} color="#FFF" />
                  <Text style={styles.claimButtonText}>Claim Today's Reward</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {status && !status.canClaimToday && status.lastClaimDate && (
            <View style={styles.alreadyClaimedContainer}>
              <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
              <Text style={styles.alreadyClaimedText}>Already claimed today!</Text>
              <Text style={styles.comeBackText}>Come back tomorrow for your next reward</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#FFF',
    borderRadius: 20,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  streakInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFF3E0',
  },
  streakTextContainer: {
    marginLeft: 15,
    flex: 1,
  },
  streakCount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF6B6B',
  },
  streakSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 3,
  },
  calendar: {
    padding: 15,
  },
  rewardCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  currentRewardCard: {
    borderColor: '#FF6B6B',
    backgroundColor: '#FFF',
  },
  completedRewardCard: {
    opacity: 0.6,
  },
  dayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  dayText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  specialIcon: {
    marginLeft: 5,
  },
  rewardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rewardIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rewardDetails: {
    marginLeft: 15,
    flex: 1,
  },
  rewardAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textTransform: 'capitalize',
  },
  rewardDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 3,
  },
  claimButton: {
    flexDirection: 'row',
    backgroundColor: '#FF6B6B',
    padding: 18,
    margin: 15,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  claimButtonDisabled: {
    opacity: 0.6,
  },
  claimButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  alreadyClaimedContainer: {
    padding: 20,
    alignItems: 'center',
  },
  alreadyClaimedText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4CAF50',
    marginTop: 10,
  },
  comeBackText: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
});
