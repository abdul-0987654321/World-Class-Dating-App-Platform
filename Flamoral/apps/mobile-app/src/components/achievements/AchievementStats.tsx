/**
 * Achievement Stats Component
 * Displays user's overall achievement statistics
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CircularProgress } from 'react-native-circular-progress';
import Icon from 'react-native-vector-icons/Feather';

interface AchievementStats {
  totalAchievements: number;
  unlockedAchievements: number;
  completionPercentage: number;
  totalRewardsEarned: {
    coins: number;
    superLikes: number;
    boosts: number;
  };
}

export const AchievementStats: React.FC = () => {
  const [stats, setStats] = useState<AchievementStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/achievements/user/me/stats', {
        headers: {
          Authorization: `Bearer ${await getAuthToken()}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Error loading achievement stats:', error);
    } finally {
      setLoading(false);
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

  if (!stats) {
    return null;
  }

  return (
    <LinearGradient colors={['#667EEA', '#764BA2']} style={styles.container}>
      <View style={styles.content}>
        {/* Progress Circle */}
        <View style={styles.progressSection}>
          <CircularProgress
            size={120}
            width={12}
            fill={stats.completionPercentage}
            tintColor="#FFD700"
            backgroundColor="rgba(255, 255, 255, 0.3)"
            rotation={0}
          >
            {() => (
              <View style={styles.progressContent}>
                <Text style={styles.progressPercentage}>{stats.completionPercentage}%</Text>
                <Text style={styles.progressLabel}>Complete</Text>
              </View>
            )}
          </CircularProgress>

          <View style={styles.progressInfo}>
            <Text style={styles.unlockedText}>
              {stats.unlockedAchievements} / {stats.totalAchievements}
            </Text>
            <Text style={styles.unlockedLabel}>Achievements Unlocked</Text>
          </View>
        </View>

        {/* Rewards Section */}
        <View style={styles.rewardsSection}>
          <Text style={styles.rewardsTitle}>Total Rewards Earned</Text>

          <View style={styles.rewardsList}>
            {stats.totalRewardsEarned.coins > 0 && (
              <View style={styles.rewardItem}>
                <View style={styles.rewardIconContainer}>
                  <Icon name="dollar-sign" size={20} color="#FFD700" />
                </View>
                <Text style={styles.rewardValue}>{stats.totalRewardsEarned.coins}</Text>
                <Text style={styles.rewardLabel}>Coins</Text>
              </View>
            )}

            {stats.totalRewardsEarned.superLikes > 0 && (
              <View style={styles.rewardItem}>
                <View style={styles.rewardIconContainer}>
                  <Icon name="star" size={20} color="#4A90E2" />
                </View>
                <Text style={styles.rewardValue}>{stats.totalRewardsEarned.superLikes}</Text>
                <Text style={styles.rewardLabel}>Super Likes</Text>
              </View>
            )}

            {stats.totalRewardsEarned.boosts > 0 && (
              <View style={styles.rewardItem}>
                <View style={styles.rewardIconContainer}>
                  <Icon name="zap" size={20} color="#FF6B6B" />
                </View>
                <Text style={styles.rewardValue}>{stats.totalRewardsEarned.boosts}</Text>
                <Text style={styles.rewardLabel}>Boosts</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    margin: 15,
    borderRadius: 20,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
  },
  progressSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  progressContent: {
    alignItems: 'center',
  },
  progressPercentage: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
  },
  progressLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  progressInfo: {
    marginTop: 15,
    alignItems: 'center',
  },
  unlockedText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  unlockedLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 5,
  },
  rewardsSection: {
    width: '100%',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.3)',
  },
  rewardsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    textAlign: 'center',
    marginBottom: 15,
  },
  rewardsList: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  rewardItem: {
    alignItems: 'center',
  },
  rewardIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  rewardValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  rewardLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 4,
  },
});
