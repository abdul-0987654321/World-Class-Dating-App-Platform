import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

interface GamificationData {
  experience: {
    currentLevel: number;
    totalXp: number;
    currentLevelXp: number;
    xpToNextLevel: number;
    levelProgressPercentage: number;
  };
  streaks: Array<{
    streakType: string;
    currentStreak: number;
    longestStreak: number;
  }>;
  challenges: Array<{
    id: string;
    title: string;
    description: string;
    progress: number;
    target: number;
    progressPercentage: number;
  }>;
  badges: Array<{
    id: string;
    name: string;
    iconName: string;
    iconColor: string;
  }>;
  achievements: Array<{
    id: string;
    name: string;
    category: string;
    isUnlocked: boolean;
  }>;
}

export const GamificationDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<GamificationData | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'challenges' | 'achievements' | 'badges'>(
    'overview'
  );

  useEffect(() => {
    fetchGamificationData();
  }, []);

  const fetchGamificationData = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/gamification/dashboard');
      setData(response.data.data);
    } catch (error) {
      console.error('Error fetching gamification data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B6B" />
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Failed to load gamification data</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with Level and XP */}
      <View style={styles.header}>
        <View style={styles.levelBadge}>
          <Ionicons name="star" size={24} color="#FFD700" />
          <Text style={styles.levelText}>Level {data.experience.currentLevel}</Text>
        </View>
        <View style={styles.xpContainer}>
          <Text style={styles.xpText}>
            {data.experience.currentLevelXp} / {data.experience.xpToNextLevel} XP
          </Text>
          <View style={styles.xpBar}>
            <View
              style={[styles.xpBarFill, { width: `${data.experience.levelProgressPercentage}%` }]}
            />
          </View>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'overview' && styles.activeTab]}
          onPress={() => setActiveTab('overview')}
        >
          <Text style={[styles.tabText, activeTab === 'overview' && styles.activeTabText]}>
            Overview
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'challenges' && styles.activeTab]}
          onPress={() => setActiveTab('challenges')}
        >
          <Text style={[styles.tabText, activeTab === 'challenges' && styles.activeTabText]}>
            Challenges
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'achievements' && styles.activeTab]}
          onPress={() => setActiveTab('achievements')}
        >
          <Text style={[styles.tabText, activeTab === 'achievements' && styles.activeTabText]}>
            Achievements
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'badges' && styles.activeTab]}
          onPress={() => setActiveTab('badges')}
        >
          <Text style={[styles.tabText, activeTab === 'badges' && styles.activeTabText]}>
            Badges
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === 'overview' && (
          <View>
            {/* Streaks */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Current Streaks</Text>
              {data.streaks.map((streak, index) => (
                <View key={index} style={styles.streakCard}>
                  <Ionicons name="flame" size={32} color="#FF6B6B" />
                  <View style={styles.streakInfo}>
                    <Text style={styles.streakType}>
                      {streak.streakType.charAt(0).toUpperCase() + streak.streakType.slice(1)}{' '}
                      Streak
                    </Text>
                    <Text style={styles.streakCount}>{streak.currentStreak} days</Text>
                    <Text style={styles.streakRecord}>Best: {streak.longestStreak} days</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Active Challenges */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Active Challenges</Text>
              {data.challenges.slice(0, 3).map((challenge) => (
                <View key={challenge.id} style={styles.challengeCard}>
                  <Text style={styles.challengeTitle}>{challenge.title}</Text>
                  <Text style={styles.challengeDescription}>{challenge.description}</Text>
                  <View style={styles.progressContainer}>
                    <View style={styles.progressBar}>
                      <View
                        style={[
                          styles.progressBarFill,
                          { width: `${challenge.progressPercentage}%` },
                        ]}
                      />
                    </View>
                    <Text style={styles.progressText}>
                      {challenge.progress} / {challenge.target}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {activeTab === 'challenges' && (
          <View style={styles.section}>
            {data.challenges.map((challenge) => (
              <View key={challenge.id} style={styles.challengeCard}>
                <Text style={styles.challengeTitle}>{challenge.title}</Text>
                <Text style={styles.challengeDescription}>{challenge.description}</Text>
                <View style={styles.progressContainer}>
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressBarFill,
                        { width: `${challenge.progressPercentage}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.progressText}>
                    {challenge.progress} / {challenge.target}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {activeTab === 'achievements' && (
          <View style={styles.section}>
            {data.achievements.map((achievement) => (
              <View
                key={achievement.id}
                style={[styles.achievementCard, !achievement.isUnlocked && styles.lockedCard]}
              >
                <Ionicons
                  name={achievement.isUnlocked ? 'trophy' : 'lock-closed'}
                  size={24}
                  color={achievement.isUnlocked ? '#FFD700' : '#999'}
                />
                <View style={styles.achievementInfo}>
                  <Text
                    style={[styles.achievementName, !achievement.isUnlocked && styles.lockedText]}
                  >
                    {achievement.name}
                  </Text>
                  <Text style={styles.achievementCategory}>{achievement.category}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {activeTab === 'badges' && (
          <View style={styles.badgeGrid}>
            {data.badges.map((badge) => (
              <View key={badge.id} style={styles.badgeCard}>
                <View style={[styles.badgeIcon, { backgroundColor: badge.iconColor + '20' }]}>
                  <Ionicons
                    name={badge.iconName as IoniconsName}
                    size={32}
                    color={badge.iconColor}
                  />
                </View>
                <Text style={styles.badgeName}>{badge.name}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  header: {
    backgroundColor: '#FFF',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  levelText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginLeft: 10,
    color: '#333',
  },
  xpContainer: {
    marginTop: 10,
  },
  xpText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  xpBar: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  xpBarFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#FF6B6B',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
  },
  activeTabText: {
    color: '#FF6B6B',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  streakCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  streakInfo: {
    marginLeft: 15,
    flex: 1,
  },
  streakType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  streakCount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF6B6B',
    marginTop: 5,
  },
  streakRecord: {
    fontSize: 12,
    color: '#999',
    marginTop: 3,
  },
  challengeCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  challengeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  challengeDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  progressContainer: {
    marginTop: 10,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 5,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#2196F3',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
  },
  achievementCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lockedCard: {
    opacity: 0.5,
  },
  achievementInfo: {
    marginLeft: 15,
    flex: 1,
  },
  achievementName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  lockedText: {
    color: '#999',
  },
  achievementCategory: {
    fontSize: 12,
    color: '#666',
    marginTop: 3,
  },
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 10,
  },
  badgeCard: {
    width: '33.33%',
    padding: 10,
    alignItems: 'center',
  },
  badgeIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  badgeName: {
    fontSize: 12,
    color: '#333',
    textAlign: 'center',
  },
});
