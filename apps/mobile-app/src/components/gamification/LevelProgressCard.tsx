import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

interface Props {
  currentLevel: number;
  currentLevelXp: number;
  xpToNextLevel: number;
  totalXp: number;
  levelProgressPercentage: number;
  onPress?: () => void;
}

export const LevelProgressCard: React.FC<Props> = ({
  currentLevel,
  currentLevelXp,
  xpToNextLevel,
  totalXp,
  levelProgressPercentage,
  onPress,
}) => {
  const getLevelIcon = (level: number): IoniconsName => {
    if (level < 10) return 'star';
    if (level < 20) return 'trending-up';
    if (level < 30) return 'ribbon';
    if (level < 40) return 'trophy';
    return 'diamond';
  };

  const getLevelColor = (level: number): string => {
    if (level < 10) return '#CD7F32'; // Bronze
    if (level < 20) return '#C0C0C0'; // Silver
    if (level < 30) return '#FFD700'; // Gold
    if (level < 40) return '#E5E4E2'; // Platinum
    return '#B9F2FF'; // Diamond
  };

  const getLevelTier = (level: number): string => {
    if (level < 10) return 'Bronze';
    if (level < 20) return 'Silver';
    if (level < 30) return 'Gold';
    if (level < 40) return 'Platinum';
    return 'Diamond';
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      <View style={styles.header}>
        <View style={[styles.levelBadge, { backgroundColor: getLevelColor(currentLevel) + '20' }]}>
          <Ionicons
            name={getLevelIcon(currentLevel)}
            size={32}
            color={getLevelColor(currentLevel)}
          />
        </View>
        <View style={styles.levelInfo}>
          <Text style={styles.levelText}>Level {currentLevel}</Text>
          <Text style={styles.tierText}>{getLevelTier(currentLevel)} Tier</Text>
        </View>
        {onPress && (
          <Ionicons name="chevron-forward" size={24} color="#999" />
        )}
      </View>

      <View style={styles.xpSection}>
        <View style={styles.xpHeader}>
          <Text style={styles.xpLabel}>Experience Points</Text>
          <Text style={styles.xpText}>
            {currentLevelXp} / {xpToNextLevel} XP
          </Text>
        </View>
        <View style={styles.progressBarContainer}>
          <View style={styles.progressBar}>
            <View
              style={[styles.progressBarFill, { width: `${levelProgressPercentage}%` }]}
            />
          </View>
          <Text style={styles.progressPercentage}>{Math.round(levelProgressPercentage)}%</Text>
        </View>
        <Text style={styles.xpNeeded}>
          {xpToNextLevel - currentLevelXp} XP needed to reach Level {currentLevel + 1}
        </Text>
      </View>

      <View style={styles.footer}>
        <View style={styles.statItem}>
          <Ionicons name="flash" size={20} color="#FF6B6B" />
          <View style={styles.statTextContainer}>
            <Text style={styles.statValue}>{totalXp.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Total XP</Text>
          </View>
        </View>
        <View style={styles.divider} />
        <View style={styles.statItem}>
          <Ionicons name="trending-up" size={20} color="#4CAF50" />
          <View style={styles.statTextContainer}>
            <Text style={styles.statValue}>Next Level</Text>
            <Text style={styles.statLabel}>Unlocks Rewards</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 15,
    marginVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  levelBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  levelInfo: {
    marginLeft: 15,
    flex: 1,
  },
  levelText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  tierText: {
    fontSize: 14,
    color: '#666',
    marginTop: 3,
  },
  xpSection: {
    marginBottom: 20,
  },
  xpHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  xpLabel: {
    fontSize: 14,
    color: '#666',
  },
  xpText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressBar: {
    flex: 1,
    height: 10,
    backgroundColor: '#E0E0E0',
    borderRadius: 5,
    overflow: 'hidden',
    marginRight: 10,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 5,
  },
  progressPercentage: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
    minWidth: 45,
    textAlign: 'right',
  },
  xpNeeded: {
    fontSize: 12,
    color: '#999',
  },
  footer: {
    flexDirection: 'row',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statTextContainer: {
    marginLeft: 10,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  divider: {
    width: 1,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 15,
  },
});
