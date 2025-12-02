/**
 * Streak Tracker Component
 * Displays user's login streak with visual progress
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/Feather';

interface StreakTrackerProps {
  currentStreak: number;
  longestStreak: number;
  totalLogins: number;
  animated?: boolean;
}

export const StreakTracker: React.FC<StreakTrackerProps> = ({
  currentStreak,
  longestStreak,
  totalLogins,
  animated = true,
}) => {
  const [fireAnimation] = useState(new Animated.Value(0));
  const [scaleAnimation] = useState(new Animated.Value(1));

  useEffect(() => {
    if (animated && currentStreak > 0) {
      // Animate fire icon
      Animated.loop(
        Animated.sequence([
          Animated.timing(fireAnimation, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(fireAnimation, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Pulse animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnimation, {
            toValue: 1.1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnimation, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [currentStreak, animated]);

  const fireScale = fireAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.2],
  });

  const fireOpacity = fireAnimation.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 0.7, 1],
  });

  const getStreakLevel = () => {
    if (currentStreak >= 365) return { level: 'Legendary', color: '#9B59B6' };
    if (currentStreak >= 100) return { level: 'Master', color: '#E74C3C' };
    if (currentStreak >= 30) return { level: 'Champion', color: '#F39C12' };
    if (currentStreak >= 7) return { level: 'Active', color: '#3498DB' };
    return { level: 'Beginner', color: '#95A5A6' };
  };

  const streakLevel = getStreakLevel();

  return (
    <LinearGradient colors={[streakLevel.color, `${streakLevel.color}CC`]} style={styles.container}>
      <View style={styles.content}>
        {/* Main Streak Display */}
        <View style={styles.mainSection}>
          <Animated.View
            style={[
              styles.fireIconContainer,
              {
                transform: [{ scale: currentStreak > 0 ? scaleAnimation : 1 }],
              },
            ]}
          >
            <Animated.View
              style={{
                transform: [{ scale: fireScale }],
                opacity: fireOpacity,
              }}
            >
              <Icon name="zap" size={48} color="#FFD700" />
            </Animated.View>
          </Animated.View>

          <View style={styles.streakInfo}>
            <Text style={styles.streakNumber}>{currentStreak}</Text>
            <Text style={styles.streakLabel}>Day Streak</Text>
            <Text style={styles.streakLevel}>{streakLevel.level}</Text>
          </View>
        </View>

        {/* Stats Section */}
        <View style={styles.statsSection}>
          <View style={styles.statItem}>
            <Icon name="award" size={20} color="white" />
            <Text style={styles.statValue}>{longestStreak}</Text>
            <Text style={styles.statLabel}>Longest</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.statItem}>
            <Icon name="calendar" size={20} color="white" />
            <Text style={styles.statValue}>{totalLogins}</Text>
            <Text style={styles.statLabel}>Total Logins</Text>
          </View>
        </View>

        {/* Progress to Next Milestone */}
        {currentStreak < 365 && (
          <View style={styles.milestoneSection}>
            <Text style={styles.milestoneText}>
              {getNextMilestone(currentStreak)} days until next level!
            </Text>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${getProgressPercentage(currentStreak)}%` },
                ]}
              />
            </View>
          </View>
        )}
      </View>
    </LinearGradient>
  );
};

const getNextMilestone = (currentStreak: number): number => {
  if (currentStreak < 7) return 7 - currentStreak;
  if (currentStreak < 30) return 30 - currentStreak;
  if (currentStreak < 100) return 100 - currentStreak;
  return 365 - currentStreak;
};

const getProgressPercentage = (currentStreak: number): number => {
  if (currentStreak < 7) return (currentStreak / 7) * 100;
  if (currentStreak < 30) return (currentStreak / 30) * 100;
  if (currentStreak < 100) return (currentStreak / 100) * 100;
  return (currentStreak / 365) * 100;
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    padding: 20,
    margin: 15,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  content: {
    alignItems: 'center',
  },
  mainSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  fireIconContainer: {
    marginRight: 20,
  },
  streakInfo: {
    alignItems: 'center',
  },
  streakNumber: {
    fontSize: 48,
    fontWeight: 'bold',
    color: 'white',
  },
  streakLabel: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 5,
  },
  streakLevel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFD700',
    marginTop: 5,
    textTransform: 'uppercase',
  },
  statsSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.3)',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  divider: {
    width: 1,
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  milestoneSection: {
    width: '100%',
    marginTop: 20,
  },
  milestoneText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: 10,
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFD700',
    borderRadius: 4,
  },
});
