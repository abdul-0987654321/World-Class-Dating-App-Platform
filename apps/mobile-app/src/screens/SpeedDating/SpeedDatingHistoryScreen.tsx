/**
 * SpeedDatingHistoryScreen - Past speed dating sessions
 * Shows session history with stats and matches
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  SafeAreaView,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SpeedDatingHistoryEntry, SpeedDatingMatch } from '../../types/speedDating.types';

interface Props {
  navigation: StackNavigationProp<any>;
}

// Mock history data
const getMockHistory = (): SpeedDatingHistoryEntry[] => [
  {
    id: 'h1',
    eventId: 'e1',
    eventTitle: 'Friday Night Mixers',
    eventTheme: 'General',
    date: new Date(Date.now() - 86400000).toISOString(),
    participantCount: 12,
    roundsCompleted: 10,
    matchCount: 3,
    matches: [
      {
        id: 'm1',
        eventId: 'e1',
        user: {
          id: 'u1',
          name: 'Emma',
          photoUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100',
          age: 28,
        },
        matchedAt: new Date(Date.now() - 86400000).toISOString(),
        isMutual: true,
        hasMessaged: true,
      },
      {
        id: 'm2',
        eventId: 'e1',
        user: {
          id: 'u2',
          name: 'Sophie',
          photoUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100',
          age: 26,
        },
        matchedAt: new Date(Date.now() - 86400000).toISOString(),
        isMutual: true,
        hasMessaged: false,
      },
    ],
    duration: 60,
  },
  {
    id: 'h2',
    eventId: 'e2',
    eventTitle: 'Tech Professionals Meetup',
    eventTheme: 'Tech',
    date: new Date(Date.now() - 604800000).toISOString(),
    participantCount: 8,
    roundsCompleted: 8,
    matchCount: 2,
    matches: [
      {
        id: 'm3',
        eventId: 'e2',
        user: {
          id: 'u3',
          name: 'Olivia',
          photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
          age: 29,
        },
        matchedAt: new Date(Date.now() - 604800000).toISOString(),
        isMutual: true,
        hasMessaged: true,
      },
    ],
    duration: 45,
  },
  {
    id: 'h3',
    eventId: 'e3',
    eventTitle: 'Foodies & Wine Lovers',
    eventTheme: 'Food & Wine',
    date: new Date(Date.now() - 1209600000).toISOString(),
    participantCount: 15,
    roundsCompleted: 12,
    matchCount: 4,
    matches: [
      {
        id: 'm4',
        eventId: 'e3',
        user: {
          id: 'u4',
          name: 'Mia',
          photoUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100',
          age: 27,
        },
        matchedAt: new Date(Date.now() - 1209600000).toISOString(),
        isMutual: true,
        hasMessaged: false,
      },
    ],
    duration: 75,
  },
];

const SpeedDatingHistoryScreen: React.FC<Props> = ({ navigation }) => {
  const [history, setHistory] = useState<SpeedDatingHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  /**
   * Load history data
   */
  const loadHistory = useCallback(async () => {
    try {
      // In production, fetch from API
      // For now, use mock data
      setHistory(getMockHistory());
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  /**
   * Handle refresh
   */
  const handleRefresh = () => {
    setIsRefreshing(true);
    loadHistory();
  };

  /**
   * Format date
   */
  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / 86400000);

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  /**
   * Get theme emoji
   */
  const getThemeEmoji = (theme: string): string => {
    const themes: Record<string, string> = {
      Tech: '💻',
      'Food & Wine': '🍷',
      Music: '🎵',
      Sports: '⚽',
      Art: '🎨',
      Travel: '✈️',
      General: '💕',
    };
    return themes[theme] || '💕';
  };

  /**
   * Calculate total stats
   */
  const getTotalStats = () => {
    return {
      totalSessions: history.length,
      totalMatches: history.reduce((sum, h) => sum + h.matchCount, 0),
      totalPeopleMet: history.reduce((sum, h) => sum + h.participantCount, 0),
      avgMatchRate:
        history.length > 0
          ? Math.round(
              (history.reduce((sum, h) => sum + h.matchCount / h.roundsCompleted, 0) /
                history.length) *
                100
            )
          : 0,
    };
  };

  /**
   * Handle match tap
   */
  const handleMatchTap = (match: SpeedDatingMatch) => {
    navigation.navigate('Chat', {
      matchId: match.id,
      matchName: match.user.name,
    });
  };

  /**
   * Toggle expand session
   */
  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  /**
   * Render stats header
   */
  const renderStats = () => {
    const stats = getTotalStats();

    return (
      <LinearGradient
        colors={['#FF6B6B', '#8B5CF6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.statsCard}
      >
        <Text style={styles.statsTitle}>Your Speed Dating Stats</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.totalSessions}</Text>
            <Text style={styles.statLabel}>Sessions</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.totalPeopleMet}</Text>
            <Text style={styles.statLabel}>People Met</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.totalMatches}</Text>
            <Text style={styles.statLabel}>Matches</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.avgMatchRate}%</Text>
            <Text style={styles.statLabel}>Match Rate</Text>
          </View>
        </View>
      </LinearGradient>
    );
  };

  /**
   * Render history item
   */
  const renderHistoryItem = ({ item }: { item: SpeedDatingHistoryEntry }) => {
    const isExpanded = expandedId === item.id;

    return (
      <TouchableOpacity
        style={styles.historyCard}
        onPress={() => toggleExpand(item.id)}
        activeOpacity={0.8}
      >
        {/* Header */}
        <View style={styles.historyHeader}>
          <View style={styles.themeIcon}>
            <Text style={styles.themeEmoji}>{getThemeEmoji(item.eventTheme)}</Text>
          </View>
          <View style={styles.historyInfo}>
            <Text style={styles.historyTitle}>{item.eventTitle}</Text>
            <Text style={styles.historyDate}>{formatDate(item.date)}</Text>
          </View>
          <View style={styles.historyStats}>
            <View style={styles.matchBadge}>
              <Text style={styles.matchBadgeText}>{item.matchCount} matches</Text>
            </View>
            <Icon name={isExpanded ? 'chevron-up' : 'chevron-down'} size={20} color="#999" />
          </View>
        </View>

        {/* Quick Stats */}
        <View style={styles.quickStats}>
          <View style={styles.quickStat}>
            <Icon name="people-outline" size={16} color="#666" />
            <Text style={styles.quickStatText}>{item.participantCount} people</Text>
          </View>
          <View style={styles.quickStat}>
            <Icon name="time-outline" size={16} color="#666" />
            <Text style={styles.quickStatText}>{item.duration} min</Text>
          </View>
          <View style={styles.quickStat}>
            <Icon name="checkmark-circle-outline" size={16} color="#666" />
            <Text style={styles.quickStatText}>{item.roundsCompleted} rounds</Text>
          </View>
        </View>

        {/* Expanded Content */}
        {isExpanded && item.matches.length > 0 && (
          <View style={styles.matchesSection}>
            <Text style={styles.matchesSectionTitle}>Matches from this session</Text>
            {item.matches.map((match) => (
              <TouchableOpacity
                key={match.id}
                style={styles.matchItem}
                onPress={() => handleMatchTap(match)}
              >
                <Image source={{ uri: match.user.photoUrl }} style={styles.matchPhoto} />
                <View style={styles.matchInfo}>
                  <Text style={styles.matchName}>
                    {match.user.name}, {match.user.age}
                  </Text>
                  <Text style={styles.matchStatus}>
                    {match.hasMessaged ? 'Messaged' : 'Not yet messaged'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.matchButton, match.hasMessaged && styles.matchButtonSecondary]}
                  onPress={() => handleMatchTap(match)}
                >
                  <Icon
                    name="chatbubble-ellipses"
                    size={18}
                    color={match.hasMessaged ? '#666' : '#fff'}
                  />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {isExpanded && item.matches.length === 0 && (
          <View style={styles.noMatches}>
            <Text style={styles.noMatchesText}>No matches from this session</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  /**
   * Render empty state
   */
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>📅</Text>
      <Text style={styles.emptyTitle}>No Speed Dating History</Text>
      <Text style={styles.emptySubtitle}>
        Your past speed dating sessions will appear here. Join an event to get started!
      </Text>
      <TouchableOpacity
        style={styles.emptyButton}
        onPress={() => navigation.navigate('SpeedDating')}
      >
        <Text style={styles.emptyButtonText}>Find Events</Text>
      </TouchableOpacity>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B6B" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Session History</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Content */}
      {history.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={history}
          renderItem={renderHistoryItem}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={renderStats}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor="#FF6B6B"
            />
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </SafeAreaView>
  );
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  headerRight: {
    width: 40,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  statsCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 16,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  historyCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  themeIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#FFE5E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  themeEmoji: {
    fontSize: 24,
  },
  historyInfo: {
    flex: 1,
    marginLeft: 12,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  historyDate: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  historyStats: {
    alignItems: 'flex-end',
  },
  matchBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 4,
  },
  matchBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4CAF50',
  },
  quickStats: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 16,
  },
  quickStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  quickStatText: {
    fontSize: 13,
    color: '#666',
  },
  matchesSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  matchesSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  matchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  matchPhoto: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#FFE5E5',
  },
  matchInfo: {
    flex: 1,
    marginLeft: 12,
  },
  matchName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  matchStatus: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  matchButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  matchButtonSecondary: {
    backgroundColor: '#F0F0F0',
  },
  noMatches: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    alignItems: 'center',
  },
  noMatchesText: {
    fontSize: 14,
    color: '#999',
  },
  separator: {
    height: 12,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  emptyButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 24,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

export default SpeedDatingHistoryScreen;
