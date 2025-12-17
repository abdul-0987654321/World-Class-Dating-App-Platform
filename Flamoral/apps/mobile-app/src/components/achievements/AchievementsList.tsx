/**
 * Achievements List Component
 * Displays all achievements with progress tracking
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/Feather';

interface Achievement {
  id: string;
  name: string;
  description: string;
  category: 'profile' | 'social' | 'activity' | 'hidden';
  tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
  iconName?: string;
  iconColor?: string;
  badgeImageUrl?: string;
  currentProgress: number;
  requiredProgress: number;
  isUnlocked: boolean;
  unlockedAt?: string;
  rewardCoins: number;
  rewardSuperLikes: number;
  rewardBoosts: number;
}

interface AchievementsListProps {
  onAchievementPress?: (achievement: Achievement) => void;
}

export const AchievementsList: React.FC<AchievementsListProps> = ({ onAchievementPress }) => {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = [
    { id: 'all', label: 'All', icon: 'grid' },
    { id: 'profile', label: 'Profile', icon: 'user' },
    { id: 'social', label: 'Social', icon: 'users' },
    { id: 'activity', label: 'Activity', icon: 'activity' },
  ];

  useEffect(() => {
    loadAchievements();
  }, []);

  const loadAchievements = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/achievements/user/me', {
        headers: {
          Authorization: `Bearer ${await getAuthToken()}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setAchievements(data.data);
      }
    } catch (error) {
      console.error('Error loading achievements:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAuthToken = async () => {
    // Implement token retrieval logic
    return 'your-auth-token';
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'bronze':
        return ['#CD7F32', '#965A2E'];
      case 'silver':
        return ['#C0C0C0', '#A8A8A8'];
      case 'gold':
        return ['#FFD700', '#FFA500'];
      case 'platinum':
        return ['#E5E4E2', '#BFC1C2'];
      case 'diamond':
        return ['#B9F2FF', '#00D4FF'];
      default:
        return ['#95A5A6', '#7F8C8D'];
    }
  };

  const getProgressPercentage = (achievement: Achievement) => {
    return Math.min((achievement.currentProgress / achievement.requiredProgress) * 100, 100);
  };

  const filteredAchievements = achievements.filter(
    (achievement) => selectedCategory === 'all' || achievement.category === selectedCategory
  );

  const renderAchievement = ({ item }: { item: Achievement }) => {
    const progressPercentage = getProgressPercentage(item);
    const isLocked = !item.isUnlocked;

    return (
      <TouchableOpacity
        style={[styles.achievementCard, isLocked && styles.achievementCardLocked]}
        onPress={() => onAchievementPress && onAchievementPress(item)}
        activeOpacity={0.7}
      >
        <LinearGradient
          colors={isLocked ? ['#ECF0F1', '#BDC3C7'] : getTierColor(item.tier)}
          style={styles.cardGradient}
        >
          {/* Badge/Icon */}
          <View style={[styles.iconContainer, isLocked && styles.iconContainerLocked]}>
            {item.badgeImageUrl ? (
              <Image source={{ uri: item.badgeImageUrl }} style={styles.badgeImage} />
            ) : (
              <Icon
                name={item.iconName || 'award'}
                size={32}
                color={isLocked ? '#95A5A6' : 'white'}
              />
            )}
            {item.isUnlocked && (
              <View style={styles.unlockedBadge}>
                <Icon name="check-circle" size={20} color="#27AE60" />
              </View>
            )}
          </View>

          {/* Content */}
          <View style={styles.content}>
            <View style={styles.header}>
              <Text style={[styles.name, isLocked && styles.textLocked]} numberOfLines={1}>
                {item.name}
              </Text>
              <View style={styles.tierBadge}>
                <Text style={styles.tierText}>{item.tier.toUpperCase()}</Text>
              </View>
            </View>

            <Text style={[styles.description, isLocked && styles.textLocked]} numberOfLines={2}>
              {item.description}
            </Text>

            {/* Progress Bar */}
            {!item.isUnlocked && (
              <View style={styles.progressSection}>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${progressPercentage}%` }]} />
                </View>
                <Text style={styles.progressText}>
                  {item.currentProgress} / {item.requiredProgress}
                </Text>
              </View>
            )}

            {/* Rewards */}
            <View style={styles.rewards}>
              {item.rewardCoins > 0 && (
                <View style={styles.rewardItem}>
                  <Icon name="dollar-sign" size={14} color={isLocked ? '#95A5A6' : 'white'} />
                  <Text style={[styles.rewardText, isLocked && styles.textLocked]}>
                    {item.rewardCoins}
                  </Text>
                </View>
              )}
              {item.rewardSuperLikes > 0 && (
                <View style={styles.rewardItem}>
                  <Icon name="star" size={14} color={isLocked ? '#95A5A6' : 'white'} />
                  <Text style={[styles.rewardText, isLocked && styles.textLocked]}>
                    {item.rewardSuperLikes}
                  </Text>
                </View>
              )}
              {item.rewardBoosts > 0 && (
                <View style={styles.rewardItem}>
                  <Icon name="zap" size={14} color={isLocked ? '#95A5A6' : 'white'} />
                  <Text style={[styles.rewardText, isLocked && styles.textLocked]}>
                    {item.rewardBoosts}
                  </Text>
                </View>
              )}
            </View>

            {item.isUnlocked && item.unlockedAt && (
              <Text style={styles.unlockedDate}>
                Unlocked {new Date(item.unlockedAt).toLocaleDateString()}
              </Text>
            )}
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
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
      {/* Category Filter */}
      <View style={styles.categoryFilter}>
        {categories.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.categoryButton,
              selectedCategory === category.id && styles.categoryButtonActive,
            ]}
            onPress={() => setSelectedCategory(category.id)}
          >
            <Icon
              name={category.icon}
              size={20}
              color={selectedCategory === category.id ? '#4A90E2' : '#95A5A6'}
            />
            <Text
              style={[
                styles.categoryLabel,
                selectedCategory === category.id && styles.categoryLabelActive,
              ]}
            >
              {category.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Achievements List */}
      <FlatList
        data={filteredAchievements}
        renderItem={renderAchievement}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
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
  categoryFilter: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E1E8ED',
  },
  categoryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginHorizontal: 5,
    borderRadius: 20,
    backgroundColor: '#F5F7FA',
  },
  categoryButtonActive: {
    backgroundColor: '#E3F2FD',
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#95A5A6',
    marginLeft: 5,
  },
  categoryLabelActive: {
    color: '#4A90E2',
  },
  listContent: {
    padding: 15,
  },
  achievementCard: {
    marginBottom: 15,
    borderRadius: 15,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  achievementCardLocked: {
    opacity: 0.7,
  },
  cardGradient: {
    flexDirection: 'row',
    padding: 15,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  iconContainerLocked: {
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  badgeImage: {
    width: 40,
    height: 40,
  },
  unlockedBadge: {
    position: 'absolute',
    bottom: -5,
    right: -5,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 2,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    flex: 1,
  },
  tierBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginLeft: 10,
  },
  tierText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: 'white',
  },
  description: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 10,
  },
  textLocked: {
    color: '#7F8C8D',
  },
  progressSection: {
    marginBottom: 10,
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 5,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4A90E2',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'right',
  },
  rewards: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  rewardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginTop: 5,
  },
  rewardText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
    marginLeft: 4,
  },
  unlockedDate: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 8,
    fontStyle: 'italic',
  },
});
