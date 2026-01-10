/**
 * SpeedDatingScreen - Main lobby for speed dating events
 * Displays upcoming events, live events, and matches
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  SafeAreaView,
  Dimensions,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { useSpeedDating } from '../../hooks/useSpeedDating';
import type { SpeedDatingEvent, SpeedDatingMatch } from '../../types/speedDating.types';

const { width } = Dimensions.get('window');

interface Props {
  navigation: StackNavigationProp<any>;
}

type TabType = 'upcoming' | 'live' | 'matches';

const SpeedDatingScreen: React.FC<Props> = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState<TabType>('upcoming');

  const {
    upcomingEvents,
    liveEvents,
    matches,
    isLoading,
    isRefreshing,
    refreshData,
    registerForEvent,
    unregisterFromEvent,
    joinLiveEvent,
  } = useSpeedDating();

  /**
   * Handle event registration
   */
  const handleRegister = useCallback(async (event: SpeedDatingEvent) => {
    if (event.isRegistered) {
      Alert.alert(
        'Cancel Registration',
        `Are you sure you want to cancel your registration for "${event.title}"?`,
        [
          { text: 'No', style: 'cancel' },
          {
            text: 'Yes, Cancel',
            style: 'destructive',
            onPress: async () => {
              await unregisterFromEvent(event.id);
            },
          },
        ]
      );
    } else {
      if (event.price > 0) {
        Alert.alert(
          'Registration',
          `Register for "${event.title}" for $${event.price}?`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Register',
              onPress: async () => {
                try {
                  await registerForEvent(event.id);
                  Alert.alert('Success', 'You have been registered for the event!');
                } catch (error) {
                  Alert.alert('Error', 'Failed to register. Please try again.');
                }
              },
            },
          ]
        );
      } else {
        try {
          await registerForEvent(event.id);
          Alert.alert('Success', 'You have been registered for the event!');
        } catch (error) {
          Alert.alert('Error', 'Failed to register. Please try again.');
        }
      }
    }
  }, [registerForEvent, unregisterFromEvent]);

  /**
   * Handle joining live event
   */
  const handleJoinLive = useCallback(async (event: SpeedDatingEvent) => {
    const success = await joinLiveEvent(event.id);
    if (success) {
      navigation.navigate('SpeedDatingLobby', {
        eventId: event.id,
        eventTitle: event.title,
        roundDuration: event.roundDuration,
      });
    } else {
      Alert.alert('Error', 'Failed to join the event. Please try again.');
    }
  }, [joinLiveEvent, navigation]);

  /**
   * Handle match tap
   */
  const handleMatchTap = useCallback((match: SpeedDatingMatch) => {
    navigation.navigate('Chat', {
      matchId: match.id,
      matchName: match.user.name,
    });
  }, [navigation]);

  /**
   * Format date string
   */
  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  /**
   * Get time until event
   */
  const getTimeUntil = (dateStr: string): string => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d away`;
    if (hours > 0) return `${hours}h away`;
    return 'Starting soon';
  };

  /**
   * Get theme emoji
   */
  const getThemeEmoji = (theme: string): string => {
    const themes: Record<string, string> = {
      'Tech': '💻',
      'Food & Wine': '🍷',
      'Music': '🎵',
      'Sports': '⚽',
      'Art': '🎨',
      'Travel': '✈️',
      'General': '💕',
    };
    return themes[theme] || '💕';
  };

  /**
   * Render event card
   */
  const renderEventCard = (event: SpeedDatingEvent, isLive: boolean = false) => (
    <TouchableOpacity
      key={event.id}
      style={[styles.eventCard, isLive && styles.liveEventCard]}
      activeOpacity={0.8}
      onPress={() => isLive ? handleJoinLive(event) : null}
    >
      {isLive && (
        <LinearGradient
          colors={['#FF6B6B', '#8B5CF6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.liveGradient}
        >
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE NOW</Text>
          </View>
        </LinearGradient>
      )}

      <View style={styles.eventContent}>
        <View style={styles.eventHeader}>
          <View style={styles.themeIcon}>
            <Text style={styles.themeEmoji}>{getThemeEmoji(event.theme)}</Text>
          </View>
          <View style={styles.eventInfo}>
            <Text style={[styles.eventTitle, isLive && styles.liveEventTitle]}>
              {event.title}
            </Text>
            <Text style={[styles.eventDescription, isLive && styles.liveEventDescription]}>
              {event.description}
            </Text>
          </View>
        </View>

        <View style={styles.eventMeta}>
          <View style={styles.metaRow}>
            <Icon name="calendar-outline" size={14} color={isLive ? '#fff' : '#666'} />
            <Text style={[styles.metaText, isLive && styles.liveMetaText]}>
              {formatDate(event.date)}
            </Text>
          </View>
          <View style={styles.metaRow}>
            <Icon name="time-outline" size={14} color={isLive ? '#fff' : '#666'} />
            <Text style={[styles.metaText, isLive && styles.liveMetaText]}>
              {event.duration}min ({event.roundDuration}min/round)
            </Text>
          </View>
          <View style={styles.metaRow}>
            <Icon name="people-outline" size={14} color={isLive ? '#fff' : '#666'} />
            <Text style={[styles.metaText, isLive && styles.liveMetaText]}>
              {event.currentParticipants}/{event.maxParticipants}
            </Text>
          </View>
        </View>

        <View style={styles.eventTags}>
          <View style={[styles.tag, isLive && styles.liveTag]}>
            <Text style={[styles.tagText, isLive && styles.liveTagText]}>
              Ages {event.ageRange.min}-{event.ageRange.max}
            </Text>
          </View>
          {!isLive && (
            <View style={styles.tag}>
              <Text style={styles.tagText}>{getTimeUntil(event.date)}</Text>
            </View>
          )}
          {event.price > 0 && (
            <View style={[styles.tag, styles.priceTag]}>
              <Text style={styles.priceTagText}>${event.price}</Text>
            </View>
          )}
        </View>

        <View style={styles.eventFooter}>
          <View style={styles.hostInfo}>
            <Image source={{ uri: event.host.photoUrl }} style={styles.hostAvatar} />
            <Text style={[styles.hostName, isLive && styles.liveHostName]}>
              Hosted by {event.host.name}
            </Text>
          </View>

          {isLive ? (
            <TouchableOpacity
              style={styles.joinButton}
              onPress={() => handleJoinLive(event)}
            >
              <Icon name="play" size={18} color="#8B5CF6" />
              <Text style={styles.joinButtonText}>Join Now</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                styles.registerButton,
                event.isRegistered && styles.registeredButton,
              ]}
              onPress={() => handleRegister(event)}
            >
              <Text
                style={[
                  styles.registerButtonText,
                  event.isRegistered && styles.registeredButtonText,
                ]}
              >
                {event.isRegistered
                  ? 'Registered ✓'
                  : event.price > 0
                  ? `Register ($${event.price})`
                  : 'Register Free'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  /**
   * Render match card
   */
  const renderMatchCard = (match: SpeedDatingMatch) => (
    <TouchableOpacity
      key={match.id}
      style={styles.matchCard}
      activeOpacity={0.8}
      onPress={() => handleMatchTap(match)}
    >
      <Image source={{ uri: match.user.photoUrl }} style={styles.matchPhoto} />
      <View style={styles.matchInfo}>
        <Text style={styles.matchName}>
          {match.user.name}, {match.user.age}
        </Text>
        <Text style={styles.matchEvent}>{match.eventTitle}</Text>
        <Text style={styles.matchTime}>
          Matched {new Date(match.matchedAt).toLocaleDateString()}
        </Text>
      </View>
      <View style={styles.matchActions}>
        <TouchableOpacity style={styles.messageButton}>
          <Icon name="chatbubble" size={20} color="#FF6B6B" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  /**
   * Render empty state
   */
  const renderEmptyState = (type: TabType) => {
    const config = {
      upcoming: {
        icon: '📅',
        title: 'No upcoming events',
        subtitle: 'Check back soon for new speed dating sessions!',
      },
      live: {
        icon: '📺',
        title: 'No live events right now',
        subtitle: 'Check back during scheduled event times!',
      },
      matches: {
        icon: '💘',
        title: 'No speed dating matches yet',
        subtitle: 'Join a speed dating event to find your matches!',
      },
    };

    const { icon, title, subtitle } = config[type];

    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyIcon}>{icon}</Text>
        <Text style={styles.emptyTitle}>{title}</Text>
        <Text style={styles.emptySubtitle}>{subtitle}</Text>
        {type !== 'upcoming' && (
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => setActiveTab('upcoming')}
          >
            <Text style={styles.emptyButtonText}>View Upcoming Events</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

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
        <Text style={styles.headerTitle}>Speed Dating</Text>
        <TouchableOpacity
          style={styles.historyButton}
          onPress={() => navigation.navigate('SpeedDatingHistory')}
        >
          <Icon name="time-outline" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      {/* Hero Banner */}
      <LinearGradient
        colors={['#FF6B6B', '#8B5CF6', '#6366F1']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.heroBanner}
      >
        <View style={styles.heroContent}>
          <Text style={styles.heroTitle}>Speed Dating</Text>
          <Text style={styles.heroSubtitle}>
            Meet more people in less time with video speed dates
          </Text>
          <View style={styles.heroFeatures}>
            <View style={styles.heroFeature}>
              <Text style={styles.featureIcon}>🎥</Text>
              <Text style={styles.featureText}>Video Dates</Text>
            </View>
            <View style={styles.heroFeature}>
              <Text style={styles.featureIcon}>⏱️</Text>
              <Text style={styles.featureText}>5-min Rounds</Text>
            </View>
            <View style={styles.heroFeature}>
              <Text style={styles.featureIcon}>💘</Text>
              <Text style={styles.featureText}>Instant Matches</Text>
            </View>
          </View>
        </View>

        {liveEvents.length > 0 && (
          <TouchableOpacity
            style={styles.liveNowButton}
            onPress={() => handleJoinLive(liveEvents[0])}
          >
            <View style={styles.liveNowBadge}>
              <View style={styles.liveNowDot} />
              <Text style={styles.liveNowText}>LIVE NOW</Text>
            </View>
            <Text style={styles.liveNowAction}>Join Now</Text>
          </TouchableOpacity>
        )}
      </LinearGradient>

      {/* Tabs */}
      <View style={styles.tabs}>
        {(['upcoming', 'live', 'matches'] as TabType[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            {tab === 'live' && liveEvents.length > 0 && (
              <View style={styles.tabDot} />
            )}
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {tab === 'matches' && ` (${matches.length})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refreshData}
            tintColor="#FF6B6B"
          />
        }
      >
        {activeTab === 'upcoming' && (
          <>
            {upcomingEvents.length === 0 ? (
              renderEmptyState('upcoming')
            ) : (
              upcomingEvents.map((event) => renderEventCard(event))
            )}
          </>
        )}

        {activeTab === 'live' && (
          <>
            {liveEvents.length === 0 ? (
              renderEmptyState('live')
            ) : (
              liveEvents.map((event) => renderEventCard(event, true))
            )}
          </>
        )}

        {activeTab === 'matches' && (
          <>
            {matches.length === 0 ? (
              renderEmptyState('matches')
            ) : (
              <>
                <Text style={styles.sectionTitle}>Your Speed Dating Matches</Text>
                {matches.map((match) => renderMatchCard(match))}

                {/* How It Works */}
                <View style={styles.howItWorks}>
                  <Text style={styles.howItWorksTitle}>How Speed Dating Matches Work</Text>
                  <View style={styles.steps}>
                    {[
                      { step: '1', title: 'Video Date', desc: 'Have a quick video chat with each participant' },
                      { step: '2', title: 'Express Interest', desc: "Mark who you'd like to connect with" },
                      { step: '3', title: 'Get Matched', desc: "If mutual interest, you're matched!" },
                    ].map((item) => (
                      <View key={item.step} style={styles.step}>
                        <View style={styles.stepNumber}>
                          <Text style={styles.stepNumberText}>{item.step}</Text>
                        </View>
                        <Text style={styles.stepTitle}>{item.title}</Text>
                        <Text style={styles.stepDesc}>{item.desc}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </>
            )}
          </>
        )}

        <View style={styles.bottomSpacing} />
      </ScrollView>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
  },
  historyButton: {
    padding: 8,
  },
  heroBanner: {
    padding: 20,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
  },
  heroContent: {
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 16,
  },
  heroFeatures: {
    flexDirection: 'row',
    gap: 20,
  },
  heroFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  featureIcon: {
    fontSize: 18,
  },
  featureText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
  liveNowButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  liveNowBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  liveNowDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF4444',
  },
  liveNowText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  liveNowAction: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  activeTab: {
    backgroundColor: '#FF6B6B',
  },
  tabDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF4444',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  activeTabText: {
    color: '#fff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  eventCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  liveEventCard: {
    backgroundColor: '#8B5CF6',
  },
  liveGradient: {
    padding: 12,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  liveDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF4444',
  },
  liveText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  eventContent: {
    padding: 16,
  },
  eventHeader: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  themeIcon: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#FFE5E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  themeEmoji: {
    fontSize: 28,
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  liveEventTitle: {
    color: '#fff',
  },
  eventDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  liveEventDescription: {
    color: 'rgba(255,255,255,0.8)',
  },
  eventMeta: {
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  metaText: {
    fontSize: 13,
    color: '#666',
  },
  liveMetaText: {
    color: 'rgba(255,255,255,0.8)',
  },
  eventTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  tag: {
    backgroundColor: '#FFE5E5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  liveTag: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  tagText: {
    fontSize: 12,
    color: '#FF6B6B',
    fontWeight: '500',
  },
  liveTagText: {
    color: '#fff',
  },
  priceTag: {
    backgroundColor: '#FFF3E0',
  },
  priceTagText: {
    fontSize: 12,
    color: '#FF9800',
    fontWeight: '600',
  },
  eventFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  hostInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  hostAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  hostName: {
    fontSize: 12,
    color: '#999',
  },
  liveHostName: {
    color: 'rgba(255,255,255,0.7)',
  },
  registerButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  registeredButton: {
    backgroundColor: '#E8F5E9',
  },
  registerButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  registeredButtonText: {
    color: '#4CAF50',
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  joinButtonText: {
    color: '#8B5CF6',
    fontWeight: '700',
    fontSize: 14,
  },
  matchCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  matchPhoto: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    borderColor: '#FFE5E5',
  },
  matchInfo: {
    flex: 1,
    marginLeft: 12,
  },
  matchName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  matchEvent: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  matchTime: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  matchActions: {
    flexDirection: 'row',
    gap: 12,
  },
  messageButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFE5E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
  },
  howItWorks: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginTop: 16,
  },
  howItWorksTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  steps: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  step: {
    alignItems: 'center',
    flex: 1,
  },
  stepNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFE5E5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepNumberText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FF6B6B',
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
    textAlign: 'center',
  },
  stepDesc: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
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
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  emptyButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  bottomSpacing: {
    height: 100,
  },
});

export default SpeedDatingScreen;
