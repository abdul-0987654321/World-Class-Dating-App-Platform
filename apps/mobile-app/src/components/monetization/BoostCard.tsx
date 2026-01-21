import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Animated,
  ScrollView,
} from 'react-native';
import { Button } from '../common/Button';

export interface Boost {
  id: string;
  userId: string;
  activatedAt: Date;
  expiresAt: Date;
  viewsGained: number;
  likesGained: number;
  matchesGained: number;
}

export interface BoostHistory {
  id: string;
  activatedAt: Date;
  duration: number;
  viewsGained: number;
  likesGained: number;
  matchesGained: number;
}

interface BoostCardProps {
  activeBoost?: Boost;
  boostHistory: BoostHistory[];
  coinBalance: number;
  onPurchaseWithCoins: () => Promise<void>;
  onPurchaseWithMoney: () => Promise<void>;
  onViewHistory: () => void;
  onNavigateToCoinShop?: () => void;
}

const BOOST_COST_COINS = 5;
const BOOST_COST_MONEY = 2.99;
const BOOST_DURATION_MINUTES = 30;

export const BoostCard: React.FC<BoostCardProps> = ({
  activeBoost,
  boostHistory,
  coinBalance,
  onPurchaseWithCoins,
  onPurchaseWithMoney,
  onViewHistory,
  onNavigateToCoinShop,
}) => {
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const pulseAnimation = useRef(new Animated.Value(1)).current;

  // Calculate time remaining for active boost
  useEffect(() => {
    if (activeBoost) {
      const updateTimer = () => {
        const now = new Date();
        const remaining = Math.max(
          0,
          Math.floor((activeBoost.expiresAt.getTime() - now.getTime()) / 1000)
        );
        setTimeRemaining(remaining);

        if (remaining === 0) {
          // Boost expired
          Alert.alert(
            'Boost Ended',
            `Your boost has ended!\n\nResults:\n• ${activeBoost.viewsGained} profile views\n• ${activeBoost.likesGained} likes\n• ${activeBoost.matchesGained} new matches`
          );
        }
      };

      updateTimer();
      const interval = setInterval(updateTimer, 1000);
      return () => clearInterval(interval);
    }
  }, [activeBoost]);

  // Pulse animation for active boost
  useEffect(() => {
    if (activeBoost) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnimation, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnimation, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnimation.setValue(1);
    }
  }, [activeBoost, pulseAnimation]);

  const handlePurchaseWithCoins = async () => {
    if (coinBalance < BOOST_COST_COINS) {
      Alert.alert(
        'Not Enough Coins',
        `You need ${BOOST_COST_COINS} coins to activate a boost. You currently have ${coinBalance} coins.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Buy Coins', onPress: () => onNavigateToCoinShop?.() },
        ]
      );
      return;
    }

    Alert.alert(
      'Activate Boost?',
      `Use ${BOOST_COST_COINS} coins to boost your profile for ${BOOST_DURATION_MINUTES} minutes?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Boost',
          onPress: async () => {
            setIsLoading(true);
            try {
              await onPurchaseWithCoins();
              Alert.alert(
                'Boost Activated!',
                `Your profile is now boosted for ${BOOST_DURATION_MINUTES} minutes!`
              );
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to activate boost');
              console.error('Boost purchase error:', error);
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  const handlePurchaseWithMoney = async () => {
    Alert.alert(
      'Purchase Boost?',
      `Buy a boost for $${BOOST_COST_MONEY.toFixed(2)} to increase your visibility for ${BOOST_DURATION_MINUTES} minutes?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Purchase',
          onPress: async () => {
            setIsLoading(true);
            try {
              await onPurchaseWithMoney();
              Alert.alert(
                'Boost Activated!',
                `Your profile is now boosted for ${BOOST_DURATION_MINUTES} minutes!`
              );
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to activate boost');
              console.error('Boost purchase error:', error);
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const renderActiveBoost = () => {
    if (!activeBoost) return null;

    return (
      <View style={styles.activeBoostContainer}>
        <View style={styles.activeBoostHeader}>
          <Animated.View
            style={[
              styles.boostIconContainer,
              styles.boostIconActive,
              { transform: [{ scale: pulseAnimation }] },
            ]}
          >
            <Text style={styles.boostIcon}>🔥</Text>
          </Animated.View>
          <View style={styles.activeBoostInfo}>
            <Text style={styles.activeBoostTitle}>Boost Active!</Text>
            <Text style={styles.activeBoostSubtitle}>
              Your profile is being shown to more people
            </Text>
          </View>
        </View>

        <View style={styles.timerContainer}>
          <Text style={styles.timerLabel}>Time Remaining</Text>
          <Text style={styles.timerValue}>{formatTime(timeRemaining)}</Text>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{activeBoost.viewsGained}</Text>
            <Text style={styles.statLabel}>Views</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{activeBoost.likesGained}</Text>
            <Text style={styles.statLabel}>Likes</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{activeBoost.matchesGained}</Text>
            <Text style={styles.statLabel}>Matches</Text>
          </View>
        </View>

        <View style={styles.progressBarContainer}>
          <View
            style={[
              styles.progressBar,
              {
                width: `${(timeRemaining / (BOOST_DURATION_MINUTES * 60)) * 100}%`,
              },
            ]}
          />
        </View>
      </View>
    );
  };

  const renderPurchaseOptions = () => {
    if (activeBoost) return null;

    return (
      <View style={styles.purchaseContainer}>
        <View style={styles.boostIconContainer}>
          <Text style={styles.boostIcon}>🔥</Text>
        </View>

        <Text style={styles.purchaseTitle}>Boost Your Profile</Text>
        <Text style={styles.purchaseDescription}>
          Be the top profile in your area for {BOOST_DURATION_MINUTES} minutes and get up to 10x
          more views
        </Text>

        <View style={styles.benefitsContainer}>
          <View style={styles.benefitItem}>
            <Text style={styles.benefitIcon}>👀</Text>
            <Text style={styles.benefitText}>10x more profile views</Text>
          </View>
          <View style={styles.benefitItem}>
            <Text style={styles.benefitIcon}>⭐</Text>
            <Text style={styles.benefitText}>Priority positioning</Text>
          </View>
          <View style={styles.benefitItem}>
            <Text style={styles.benefitIcon}>💬</Text>
            <Text style={styles.benefitText}>More matches & conversations</Text>
          </View>
        </View>

        <View style={styles.purchaseButtons}>
          <TouchableOpacity
            style={styles.purchaseOption}
            onPress={handlePurchaseWithCoins}
            disabled={isLoading}
          >
            <View style={styles.purchaseOptionHeader}>
              <Text style={styles.purchaseOptionIcon}>💰</Text>
              <Text style={styles.purchaseOptionTitle}>Use Coins</Text>
            </View>
            <Text style={styles.purchaseOptionPrice}>{BOOST_COST_COINS} coins</Text>
            {coinBalance < BOOST_COST_COINS && (
              <Text style={styles.insufficientFunds}>Not enough coins</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.purchaseOption}
            onPress={handlePurchaseWithMoney}
            disabled={isLoading}
          >
            <View style={styles.purchaseOptionHeader}>
              <Text style={styles.purchaseOptionIcon}>💳</Text>
              <Text style={styles.purchaseOptionTitle}>Buy Now</Text>
            </View>
            <Text style={styles.purchaseOptionPrice}>${BOOST_COST_MONEY.toFixed(2)}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderHistory = () => {
    if (boostHistory.length === 0) return null;

    return (
      <View style={styles.historyContainer}>
        <View style={styles.historyHeader}>
          <Text style={styles.historyTitle}>Recent Boosts</Text>
          <TouchableOpacity onPress={onViewHistory}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>

        {boostHistory.slice(0, 3).map((boost) => (
          <View key={boost.id} style={styles.historyItem}>
            <View style={styles.historyItemIcon}>
              <Text style={styles.historyItemIconText}>🔥</Text>
            </View>
            <View style={styles.historyItemInfo}>
              <Text style={styles.historyItemDate}>{formatDate(boost.activatedAt)}</Text>
              <Text style={styles.historyItemStats}>
                {boost.viewsGained} views • {boost.likesGained} likes • {boost.matchesGained}{' '}
                matches
              </Text>
            </View>
            <View style={styles.historyItemDuration}>
              <Text style={styles.historyItemDurationText}>{boost.duration}m</Text>
            </View>
          </View>
        ))}
      </View>
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {renderActiveBoost()}
      {renderPurchaseOptions()}
      {renderHistory()}

      <View style={styles.infoContainer}>
        <Text style={styles.infoTitle}>How Boost Works</Text>
        <View style={styles.infoItem}>
          <Text style={styles.infoNumber}>1</Text>
          <Text style={styles.infoText}>
            Your profile becomes one of the top profiles in your area
          </Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoNumber}>2</Text>
          <Text style={styles.infoText}>
            Get up to 10x more profile views for {BOOST_DURATION_MINUTES} minutes
          </Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoNumber}>3</Text>
          <Text style={styles.infoText}>
            Increase your chances of matching with someone special
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollContent: {
    padding: 20,
  },
  activeBoostContainer: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#FF6B35',
  },
  activeBoostHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  boostIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFF3E0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  boostIconActive: {
    backgroundColor: '#FFE5D9',
    borderWidth: 3,
    borderColor: '#FF6B35',
  },
  boostIcon: {
    fontSize: 32,
  },
  activeBoostInfo: {
    flex: 1,
  },
  activeBoostTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF6B35',
    marginBottom: 4,
  },
  activeBoostSubtitle: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
  },
  timerContainer: {
    alignItems: 'center',
    paddingVertical: 16,
    backgroundColor: '#FFF9F5',
    borderRadius: 12,
    marginBottom: 16,
  },
  timerLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  timerValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FF6B35',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 28,
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
    height: 6,
    backgroundColor: '#FFE5D9',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#FF6B35',
    borderRadius: 3,
  },
  purchaseContainer: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    alignItems: 'center',
  },
  purchaseTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  purchaseDescription: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  benefitsContainer: {
    width: '100%',
    marginBottom: 24,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  benefitIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  benefitText: {
    fontSize: 15,
    color: '#333',
    flex: 1,
  },
  purchaseButtons: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  purchaseOption: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  purchaseOptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  purchaseOptionIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  purchaseOptionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  purchaseOptionPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#E91E63',
  },
  insufficientFunds: {
    fontSize: 11,
    color: '#F44336',
    marginTop: 4,
  },
  historyContainer: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  viewAllText: {
    fontSize: 14,
    color: '#E91E63',
    fontWeight: '600',
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  historyItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  historyItemIconText: {
    fontSize: 20,
  },
  historyItemInfo: {
    flex: 1,
  },
  historyItemDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  historyItemStats: {
    fontSize: 12,
    color: '#999',
  },
  historyItemDuration: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  historyItemDurationText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  infoContainer: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  infoNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E91E63',
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 28,
    marginRight: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    paddingTop: 4,
  },
});
