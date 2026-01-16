/**
 * Top Picks Screen
 * Daily curated high-quality matches
 * Premium feature
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Dimensions,
  RefreshControl,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.9;

interface TopPick {
  userId: string;
  name: string;
  age: number;
  photos: string[];
  bio: string;
  occupation: string;
  compatibilityScore: number;
  distance: number;
  verified: boolean;
  commonInterests: string[];
  insights: string[];
  topPickReason: string;
  suggestedOpener: string;
  rank: number;
}

const TopPicksScreen = ({ navigation }: any) => {
  const [topPicks, setTopPicks] = useState<TopPick[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [generatedAt, setGeneratedAt] = useState<string>('');
  const [expiresAt, setExpiresAt] = useState<string>('');

  useEffect(() => {
    loadTopPicks();
  }, []);

  const loadTopPicks = async (forceRefresh = false) => {
    try {
      setIsLoading(true);

      // API call
      // const response = await api.get('/recommendations/top-picks', {
      //   params: { forceRefresh }
      // });

      // Mock data
      const mockPicks: TopPick[] = Array.from({ length: 10 }, (_, i) => ({
        userId: `user-${i}`,
        name: ['Emma', 'Sophia', 'Olivia', 'Ava', 'Isabella', 'Mia', 'Charlotte', 'Amelia', 'Harper', 'Evelyn'][i],
        age: 25 + i,
        photos: [`https://i.pravatar.cc/400?img=${10 + i}`],
        bio: 'Adventure seeker and coffee enthusiast. Looking for meaningful connections.',
        occupation: ['Marketing Manager', 'Software Engineer', 'Designer', 'Teacher', 'Doctor'][i % 5],
        compatibilityScore: 85 + (i % 15),
        distance: 2 + i,
        verified: i % 2 === 0,
        commonInterests: ['Travel', 'Coffee', 'Hiking'],
        insights: [
          'Exceptional compatibility match',
          `You share ${2 + i} interests`,
          'Recently active'
        ],
        topPickReason: ['Exceptional compatibility match', 'High-quality complete profile', 'Perfect match for your preferences'][i % 3],
        suggestedOpener: `I noticed you're into ${['travel', 'coffee', 'hiking'][i % 3]}! What got you interested in that?`,
        rank: i + 1,
      }));

      setTopPicks(mockPicks);
      setGeneratedAt(new Date().toISOString());
      setExpiresAt(new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString());
    } catch (error) {
      console.error('Failed to load Top Picks:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadTopPicks(true);
  };

  const handleCardPress = (pick: TopPick) => {
    navigation.navigate('ProfileDetail', { userId: pick.userId, fromTopPicks: true });
  };

  const handleLike = async (pick: TopPick) => {
    try {
      // await api.post('/swipes', { targetUserId: pick.userId, action: 'like' });
      // Remove from list
      setTopPicks(picks => picks.filter(p => p.userId !== pick.userId));
    } catch {
      // Silently handle like errors
    }
  };

  const handleSuperLike = async (pick: TopPick) => {
    navigation.navigate('SuperLikeModal', { profile: pick });
  };

  const handleShowInfo = () => {
    Alert.alert(
      'About Top Picks',
      'Top Picks are premium matches curated daily just for you based on your preferences, activity, and compatibility scores.\n\n• Refreshes every 24 hours\n• Higher compatibility scores\n• Verified profiles prioritized\n• Based on your interests and preferences',
      [{ text: 'Got it', style: 'default' }]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B6B" />
        <Text style={styles.loadingText}>Curating your Top Picks...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={28} color="#333" />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <LinearGradient
            colors={['#FFD700', '#FFA500']}
            style={styles.crownBadge}
          >
            <Icon name="crown" size={20} color="#FFF" />
          </LinearGradient>
          <Text style={styles.headerTitle}>Top Picks</Text>
        </View>

        <TouchableOpacity onPress={handleShowInfo}>
          <Icon name="information-outline" size={28} color="#333" />
        </TouchableOpacity>
      </View>

      {/* Info Banner */}
      <View style={styles.infoBanner}>
        <Text style={styles.infoBannerText}>
          {topPicks.length} premium matches curated just for you today
        </Text>
        <Text style={styles.infoBannerSubtext}>
          Refreshes in {calculateHoursUntil(expiresAt)} hours
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {topPicks.map((pick, index) => (
          <TouchableOpacity
            key={pick.userId}
            style={styles.card}
            onPress={() => handleCardPress(pick)}
            activeOpacity={0.9}
          >
            <Image
              source={{ uri: pick.photos[0] }}
              style={styles.cardImage}
              resizeMode="cover"
            />

            <LinearGradient
              colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.8)']}
              style={styles.cardGradient}
            />

            {/* Rank Badge */}
            <View style={styles.rankBadge}>
              <Text style={styles.rankText}>#{pick.rank}</Text>
            </View>

            {/* Compatibility Score */}
            <View style={styles.scoreBadge}>
              <LinearGradient
                colors={['#4CAF50', '#81C784']}
                style={styles.scoreGradient}
              >
                <Icon name="heart-pulse" size={16} color="#FFF" />
                <Text style={styles.scoreText}>{pick.compatibilityScore}%</Text>
              </LinearGradient>
            </View>

            {/* Verified Badge */}
            {pick.verified && (
              <View style={styles.verifiedBadge}>
                <Icon name="check-decagram" size={24} color="#4CAF50" />
              </View>
            )}

            {/* Profile Info */}
            <View style={styles.cardInfo}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.cardName}>{pick.name}, {pick.age}</Text>
                  <Text style={styles.cardOccupation}>{pick.occupation}</Text>
                  <View style={styles.distanceContainer}>
                    <Icon name="map-marker" size={14} color="#FFF" />
                    <Text style={styles.distanceText}>{pick.distance} km away</Text>
                  </View>
                </View>
              </View>

              {/* Top Pick Reason */}
              <View style={styles.reasonContainer}>
                <Icon name="star" size={14} color="#FFD700" />
                <Text style={styles.reasonText}>{pick.topPickReason}</Text>
              </View>

              {/* Insights */}
              <View style={styles.insightsContainer}>
                {pick.insights.slice(0, 2).map((insight, i) => (
                  <View key={i} style={styles.insightTag}>
                    <Icon name="check-circle" size={12} color="#4CAF50" />
                    <Text style={styles.insightText}>{insight}</Text>
                  </View>
                ))}
              </View>

              {/* Common Interests */}
              {pick.commonInterests.length > 0 && (
                <View style={styles.interestsRow}>
                  <Icon name="heart" size={14} color="#FF6B6B" />
                  <Text style={styles.interestsText}>
                    You both like {pick.commonInterests.join(', ')}
                  </Text>
                </View>
              )}

              {/* Suggested Opener */}
              <View style={styles.openerContainer}>
                <Icon name="lightbulb-on-outline" size={14} color="#FFA500" />
                <Text style={styles.openerText} numberOfLines={2}>
                  "{pick.suggestedOpener}"
                </Text>
              </View>

              {/* Action Buttons */}
              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={styles.passButton}
                  onPress={() => setTopPicks(picks => picks.filter(p => p.userId !== pick.userId))}
                >
                  <Icon name="close" size={24} color="#FF6B6B" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.superLikeButton}
                  onPress={() => handleSuperLike(pick)}
                >
                  <LinearGradient
                    colors={['#4C9EFF', '#00D4FF']}
                    style={styles.superLikeGradient}
                  >
                    <Icon name="star" size={20} color="#FFF" />
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.likeButton}
                  onPress={() => handleLike(pick)}
                >
                  <Icon name="heart" size={24} color="#4CAF50" />
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        ))}

        {/* Empty State */}
        {topPicks.length === 0 && (
          <View style={styles.emptyState}>
            <Icon name="crown-outline" size={80} color="#CCC" />
            <Text style={styles.emptyTitle}>All caught up!</Text>
            <Text style={styles.emptySubtitle}>
              Check back tomorrow for new Top Picks
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const calculateHoursUntil = (dateString: string): number => {
  const now = new Date();
  const target = new Date(dateString);
  const diff = target.getTime() - now.getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60)));
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  crownBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  infoBanner: {
    backgroundColor: '#FFF9E6',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#FFE0B2',
  },
  infoBannerText: {
    fontSize: 14,
    color: '#FFA500',
    fontWeight: '600',
    textAlign: 'center',
  },
  infoBannerSubtext: {
    fontSize: 12,
    color: '#FF9800',
    textAlign: 'center',
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
  },
  card: {
    width: CARD_WIDTH,
    height: 500,
    backgroundColor: '#FFF',
    borderRadius: 16,
    marginHorizontal: SCREEN_WIDTH * 0.05,
    marginVertical: 12,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
  },
  rankBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: '#FFD700',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  rankText: {
    color: '#333',
    fontSize: 14,
    fontWeight: 'bold',
  },
  scoreBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  scoreGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  scoreText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  verifiedBadge: {
    position: 'absolute',
    top: 60,
    right: 16,
  },
  cardInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cardName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
  },
  cardOccupation: {
    fontSize: 16,
    color: '#FFF',
    marginTop: 4,
    opacity: 0.9,
  },
  distanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  distanceText: {
    fontSize: 14,
    color: '#FFF',
    marginLeft: 4,
  },
  reasonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,215,0,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  reasonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  insightsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  insightTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 4,
  },
  insightText: {
    color: '#FFF',
    fontSize: 11,
    marginLeft: 4,
  },
  interestsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  interestsText: {
    color: '#FFF',
    fontSize: 13,
    marginLeft: 4,
  },
  openerContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255,165,0,0.2)',
    padding: 10,
    borderRadius: 12,
    marginBottom: 12,
  },
  openerText: {
    color: '#FFF',
    fontSize: 12,
    fontStyle: 'italic',
    marginLeft: 6,
    flex: 1,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  passButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
  },
  superLikeButton: {
    width: 56,
    height: 56,
  },
  superLikeGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  likeButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
});

export default TopPicksScreen;
