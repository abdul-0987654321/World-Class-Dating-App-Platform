import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Button } from '../common/Button';

export interface DailyLimits {
  likes: {
    used: number;
    limit: number;
    resetsAt: Date;
  };
  superLikes: {
    used: number;
    limit: number;
    resetsAt: Date;
  };
  rewinds: {
    used: number;
    limit: number;
    resetsAt: Date;
  };
  boosts: {
    used: number;
    limit: number;
    resetsAt: Date;
  };
}

interface LimitsProps {
  limits: DailyLimits;
  subscriptionTier: 'free' | 'premium' | 'premium_plus';
  onUpgrade: () => void;
  onRefresh: () => void;
}

export const Limits: React.FC<LimitsProps> = ({
  limits,
  subscriptionTier,
  onUpgrade,
  onRefresh,
}) => {
  const [timeUntilReset, setTimeUntilReset] = useState('');

  const isUnlimited = subscriptionTier === 'premium' || subscriptionTier === 'premium_plus';

  // Calculate time until reset
  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const resetTime = new Date(limits.likes.resetsAt);
      const diff = resetTime.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeUntilReset('Resetting...');
        onRefresh();
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (hours > 0) {
        setTimeUntilReset(`${hours}h ${minutes}m`);
      } else if (minutes > 0) {
        setTimeUntilReset(`${minutes}m ${seconds}s`);
      } else {
        setTimeUntilReset(`${seconds}s`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [limits.likes.resetsAt, onRefresh]);

  const getPercentage = (used: number, limit: number): number => {
    if (limit === 0) return 0;
    return Math.min((used / limit) * 100, 100);
  };

  const getProgressColor = (percentage: number): string => {
    if (percentage >= 90) return '#F44336';
    if (percentage >= 70) return '#FF9800';
    return '#4CAF50';
  };

  const renderLimitCard = (
    icon: string,
    title: string,
    used: number,
    limit: number,
    description: string
  ) => {
    const percentage = getPercentage(used, limit);
    const progressColor = getProgressColor(percentage);
    const remaining = Math.max(0, limit - used);

    return (
      <View style={styles.limitCard}>
        <View style={styles.limitHeader}>
          <View style={styles.limitIcon}>
            <Text style={styles.limitIconText}>{icon}</Text>
          </View>
          <View style={styles.limitInfo}>
            <Text style={styles.limitTitle}>{title}</Text>
            <Text style={styles.limitDescription}>{description}</Text>
          </View>
        </View>

        <View style={styles.limitStats}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: progressColor }]}>
              {remaining}
            </Text>
            <Text style={styles.statLabel}>Remaining</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{used}</Text>
            <Text style={styles.statLabel}>Used Today</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{limit}</Text>
            <Text style={styles.statLabel}>Daily Limit</Text>
          </View>
        </View>

        <View style={styles.progressBarContainer}>
          <View
            style={[
              styles.progressBar,
              { width: `${percentage}%`, backgroundColor: progressColor },
            ]}
          />
        </View>

        {remaining === 0 && (
          <View style={styles.depleted}>
            <Text style={styles.depletedIcon}>⏳</Text>
            <Text style={styles.depletedText}>
              Limit reached. Resets in {timeUntilReset}
            </Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Daily Limits</Text>
          <Text style={styles.subtitle}>
            {isUnlimited
              ? 'You have unlimited access to all features!'
              : 'Your free tier limits reset daily'}
          </Text>
        </View>

        {/* Reset Timer */}
        {!isUnlimited && (
          <View style={styles.timerCard}>
            <View style={styles.timerIcon}>
              <Text style={styles.timerIconText}>⏰</Text>
            </View>
            <View style={styles.timerInfo}>
              <Text style={styles.timerLabel}>Limits reset in</Text>
              <Text style={styles.timerValue}>{timeUntilReset}</Text>
            </View>
          </View>
        )}

        {/* Limits Display */}
        <View style={styles.section}>
          {isUnlimited ? (
            <View style={styles.unlimitedCard}>
              <Text style={styles.unlimitedIcon}>∞</Text>
              <Text style={styles.unlimitedTitle}>Unlimited Everything!</Text>
              <Text style={styles.unlimitedDescription}>
                As a {subscriptionTier === 'premium' ? 'Premium' : 'Premium+'} member,
                you have unlimited likes, super likes, rewinds, and more.
              </Text>
            </View>
          ) : (
            <>
              {renderLimitCard(
                '❤️',
                'Likes',
                limits.likes.used,
                limits.likes.limit,
                'Swipe right to like profiles'
              )}

              {renderLimitCard(
                '⭐',
                'Super Likes',
                limits.superLikes.used,
                limits.superLikes.limit,
                'Stand out with a Super Like'
              )}

              {renderLimitCard(
                '↩️',
                'Rewinds',
                limits.rewinds.used,
                limits.rewinds.limit,
                'Undo your last swipe'
              )}

              {renderLimitCard(
                '🔥',
                'Boosts',
                limits.boosts.used,
                limits.boosts.limit,
                'Increase your visibility'
              )}
            </>
          )}
        </View>

        {/* Upgrade CTA */}
        {!isUnlimited && (
          <View style={styles.upgradeSection}>
            <View style={styles.upgradeCard}>
              <Text style={styles.upgradeIcon}>💎</Text>
              <Text style={styles.upgradeTitle}>Want Unlimited?</Text>
              <Text style={styles.upgradeDescription}>
                Upgrade to Premium and get unlimited likes, super likes, rewinds, and
                1 free boost every month!
              </Text>

              <View style={styles.upgradeFeatures}>
                <View style={styles.upgradeFeature}>
                  <Text style={styles.upgradeFeatureIcon}>✓</Text>
                  <Text style={styles.upgradeFeatureText}>Unlimited likes</Text>
                </View>
                <View style={styles.upgradeFeature}>
                  <Text style={styles.upgradeFeatureIcon}>✓</Text>
                  <Text style={styles.upgradeFeatureText}>
                    5 super likes per day
                  </Text>
                </View>
                <View style={styles.upgradeFeature}>
                  <Text style={styles.upgradeFeatureIcon}>✓</Text>
                  <Text style={styles.upgradeFeatureText}>Unlimited rewinds</Text>
                </View>
                <View style={styles.upgradeFeature}>
                  <Text style={styles.upgradeFeatureIcon}>✓</Text>
                  <Text style={styles.upgradeFeatureText}>1 free boost/month</Text>
                </View>
                <View style={styles.upgradeFeature}>
                  <Text style={styles.upgradeFeatureIcon}>✓</Text>
                  <Text style={styles.upgradeFeatureText}>See who likes you</Text>
                </View>
              </View>

              <Button
                title="Upgrade to Premium"
                onPress={onUpgrade}
                fullWidth
                style={styles.upgradeButton}
              />
            </View>
          </View>
        )}

        <View style={styles.infoContainer}>
          <Text style={styles.infoText}>
            {isUnlimited
              ? 'Your Premium benefits renew automatically. Manage your subscription in Settings.'
              : 'All limits reset at midnight in your local timezone. Use coins to bypass limits anytime.'}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
  },
  timerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  timerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FF9800',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  timerIconText: {
    fontSize: 24,
  },
  timerInfo: {
    flex: 1,
  },
  timerLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  timerValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF9800',
  },
  section: {
    marginBottom: 24,
  },
  limitCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  limitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  limitIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  limitIconText: {
    fontSize: 24,
  },
  limitInfo: {
    flex: 1,
  },
  limitTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  limitDescription: {
    fontSize: 13,
    color: '#999',
  },
  limitStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E0E0E0',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#F0F0F0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  depleted: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    padding: 12,
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
  },
  depletedIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  depletedText: {
    fontSize: 13,
    color: '#D32F2F',
    fontWeight: '500',
  },
  unlimitedCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
  },
  unlimitedIcon: {
    fontSize: 64,
    color: '#E91E63',
    marginBottom: 16,
  },
  unlimitedTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  unlimitedDescription: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  upgradeSection: {
    marginBottom: 24,
  },
  upgradeCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E91E63',
  },
  upgradeIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  upgradeTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  upgradeDescription: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  upgradeFeatures: {
    width: '100%',
    marginBottom: 20,
  },
  upgradeFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  upgradeFeatureIcon: {
    fontSize: 16,
    color: '#4CAF50',
    marginRight: 12,
    fontWeight: 'bold',
  },
  upgradeFeatureText: {
    fontSize: 15,
    color: '#333',
  },
  upgradeButton: {
    marginTop: 8,
  },
  infoContainer: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
  },
  infoText: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
    lineHeight: 18,
  },
});
