/**
 * Achievement Showcase Component
 * Displays user's showcased achievements on profile
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/Feather';

interface ShowcasedAchievement {
  id: string;
  name: string;
  description: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
  iconName?: string;
  badgeImageUrl?: string;
  unlockedAt: string;
}

interface AchievementShowcaseProps {
  userId?: string; // If viewing another user's profile
  editable?: boolean;
  onEdit?: () => void;
}

export const AchievementShowcase: React.FC<AchievementShowcaseProps> = ({
  userId,
  editable = false,
  onEdit,
}) => {
  const [achievements, setAchievements] = useState<ShowcasedAchievement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadShowcaseAchievements();
  }, [userId]);

  const loadShowcaseAchievements = async () => {
    try {
      setLoading(true);
      const endpoint = userId
        ? `/api/achievements/user/${userId}/showcase`
        : '/api/achievements/user/me/showcase';

      const response = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${await getAuthToken()}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setAchievements(data.data);
      }
    } catch (error) {
      console.error('Error loading showcase achievements:', error);
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#4A90E2" />
      </View>
    );
  }

  if (achievements.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Icon name="award" size={40} color="#BDC3C7" />
        <Text style={styles.emptyText}>
          {editable ? 'No achievements showcased yet' : 'No achievements to display'}
        </Text>
        {editable && (
          <TouchableOpacity style={styles.addButton} onPress={onEdit}>
            <Text style={styles.addButtonText}>Add Achievements</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Icon name="award" size={20} color="#2C3E50" />
          <Text style={styles.title}>Achievements</Text>
        </View>
        {editable && (
          <TouchableOpacity onPress={onEdit}>
            <Icon name="edit-2" size={20} color="#4A90E2" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {achievements.map((achievement) => (
          <View key={achievement.id} style={styles.achievementCard}>
            <LinearGradient colors={getTierColor(achievement.tier)} style={styles.cardGradient}>
              {/* Badge/Icon */}
              <View style={styles.badgeContainer}>
                {achievement.badgeImageUrl ? (
                  <Image
                    source={{ uri: achievement.badgeImageUrl }}
                    style={styles.badgeImage}
                  />
                ) : (
                  <Icon name={achievement.iconName || 'award'} size={40} color="white" />
                )}
              </View>

              {/* Tier Indicator */}
              <View style={styles.tierIndicator}>
                <Text style={styles.tierText}>{achievement.tier.toUpperCase()}</Text>
              </View>

              {/* Info */}
              <Text style={styles.achievementName} numberOfLines={2}>
                {achievement.name}
              </Text>
            </LinearGradient>
          </View>
        ))}

        {/* Add More Button (if editable and not at max) */}
        {editable && achievements.length < 5 && (
          <TouchableOpacity style={styles.addCard} onPress={onEdit}>
            <Icon name="plus-circle" size={40} color="#4A90E2" />
            <Text style={styles.addCardText}>Add More</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    paddingVertical: 15,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 30,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#7F8C8D',
    marginTop: 10,
    textAlign: 'center',
  },
  addButton: {
    marginTop: 15,
    backgroundColor: '#4A90E2',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    marginBottom: 15,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginLeft: 8,
  },
  scrollContent: {
    paddingHorizontal: 15,
  },
  achievementCard: {
    width: 120,
    height: 150,
    marginRight: 12,
    borderRadius: 15,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  cardGradient: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badgeContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeImage: {
    width: 50,
    height: 50,
  },
  tierIndicator: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  tierText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: 'white',
  },
  achievementName: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
    textAlign: 'center',
  },
  addCard: {
    width: 120,
    height: 150,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#4A90E2',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
  },
  addCardText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4A90E2',
    marginTop: 8,
  },
});
