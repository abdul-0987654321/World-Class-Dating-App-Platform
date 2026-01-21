/**
 * SpeedDatingResultsScreen - Match results after speed dating session
 * Shows matches with reveal animations and next steps
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  SafeAreaView,
  Animated,
  Dimensions,
  ScrollView,
  FlatList,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { useSpeedDatingMatch } from '../../hooks/useSpeedDatingMatch';
import type { SpeedDatingMatch } from '../../types/speedDating.types';

const { width, height } = Dimensions.get('window');

interface ResultsParams {
  eventId: string;
  eventTitle: string;
  likes: string[];
  matches: string[];
  roundsCompleted: number;
  totalRounds: number;
}

interface Props {
  navigation: StackNavigationProp<any>;
  route: RouteProp<{ SpeedDatingResults: ResultsParams }, 'SpeedDatingResults'>;
}

// Mock matches for demo
const getMockResultMatches = (likedIds: string[]): SpeedDatingMatch[] => {
  const allParticipants = [
    {
      id: 'p1',
      name: 'Emma',
      age: 28,
      photoUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400',
      bio: 'Adventure seeker & coffee lover',
    },
    {
      id: 'p2',
      name: 'Sophie',
      age: 26,
      photoUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400',
      bio: 'Art enthusiast, yoga practitioner',
    },
    {
      id: 'p3',
      name: 'Olivia',
      age: 29,
      photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
      bio: 'Tech professional, loves hiking',
    },
    {
      id: 'p4',
      name: 'Mia',
      age: 27,
      photoUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400',
      bio: 'Foodie, travel blogger',
    },
    {
      id: 'p5',
      name: 'Charlotte',
      age: 30,
      photoUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400',
      bio: 'Book lover, wine connoisseur',
    },
  ];

  // Simulate mutual matches (50% of liked become matches)
  return allParticipants
    .filter((p) => likedIds.includes(p.id) && Math.random() > 0.5)
    .map((p) => ({
      id: `match_${p.id}`,
      eventId: 'e1',
      eventTitle: 'Speed Dating Session',
      user: {
        id: p.id,
        name: p.name,
        photoUrl: p.photoUrl,
        age: p.age,
        bio: p.bio,
      },
      matchedAt: new Date().toISOString(),
      isMutual: true,
      hasMessaged: false,
    }));
};

const SpeedDatingResultsScreen: React.FC<Props> = ({ navigation, route }) => {
  const { eventId, eventTitle, likes, roundsCompleted, totalRounds } = route.params;

  const [resultMatches, setResultMatches] = useState<SpeedDatingMatch[]>([]);
  const [revealPhase, setRevealPhase] = useState<'intro' | 'revealing' | 'complete'>('intro');
  const [revealedCount, setRevealedCount] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);

  const { matchAnimation, playMatchRevealAnimation, resetAnimation } = useSpeedDatingMatch({
    autoLoad: false,
  });

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const confettiAnims = useRef(
    Array.from({ length: 20 }, () => ({
      x: new Animated.Value(Math.random() * width),
      y: new Animated.Value(-50),
      rotate: new Animated.Value(0),
    }))
  ).current;

  /**
   * Initialize results
   */
  useEffect(() => {
    const matches = getMockResultMatches(likes);
    setResultMatches(matches);

    // Start intro animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  /**
   * Start reveal animation
   */
  const startReveal = useCallback(() => {
    setRevealPhase('revealing');

    if (resultMatches.length === 0) {
      // No matches
      setTimeout(() => {
        setRevealPhase('complete');
      }, 1000);
    } else {
      // Reveal matches one by one
      let count = 0;
      const revealNext = () => {
        if (count < resultMatches.length) {
          playMatchRevealAnimation();
          setRevealedCount(count + 1);
          count++;

          if (count === resultMatches.length) {
            setTimeout(() => {
              setRevealPhase('complete');
              setShowConfetti(true);
              startConfettiAnimation();
            }, 1000);
          } else {
            setTimeout(revealNext, 1200);
          }
        }
      };
      revealNext();
    }
  }, [resultMatches, playMatchRevealAnimation]);

  /**
   * Confetti animation
   */
  const startConfettiAnimation = () => {
    confettiAnims.forEach((anim, index) => {
      const delay = Math.random() * 500;
      const duration = 2000 + Math.random() * 1000;

      Animated.parallel([
        Animated.timing(anim.y, {
          toValue: height + 100,
          duration,
          delay,
          useNativeDriver: true,
        }),
        Animated.timing(anim.rotate, {
          toValue: 360 * (2 + Math.random() * 2),
          duration,
          delay,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  /**
   * Handle message match
   */
  const handleMessageMatch = (match: SpeedDatingMatch) => {
    navigation.navigate('Chat', {
      matchId: match.id,
      matchName: match.user.name,
    });
  };

  /**
   * Render confetti
   */
  const renderConfetti = () => {
    const colors = ['#FF6B6B', '#8B5CF6', '#FFD700', '#4CAF50', '#FF69B4'];

    return confettiAnims.map((anim, index) => (
      <Animated.View
        key={index}
        style={[
          styles.confettiPiece,
          {
            backgroundColor: colors[index % colors.length],
            transform: [
              { translateX: anim.x },
              { translateY: anim.y },
              {
                rotate: anim.rotate.interpolate({
                  inputRange: [0, 360],
                  outputRange: ['0deg', '360deg'],
                }),
              },
            ],
          },
        ]}
      />
    ));
  };

  /**
   * Render intro screen
   */
  const renderIntro = () => (
    <View style={styles.introContainer}>
      <Animated.View
        style={[
          styles.introContent,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <LinearGradient colors={['#FF6B6B', '#8B5CF6']} style={styles.introGradient}>
          <Text style={styles.introEmoji}>🎉</Text>
          <Text style={styles.introTitle}>Session Complete!</Text>
          <Text style={styles.introStats}>
            You met {roundsCompleted} people{'\n'}and liked {likes.length}!
          </Text>

          <View style={styles.introSummary}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryNumber}>{roundsCompleted}</Text>
              <Text style={styles.summaryLabel}>Rounds</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryNumber}>{likes.length}</Text>
              <Text style={styles.summaryLabel}>Likes</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryNumber}>?</Text>
              <Text style={styles.summaryLabel}>Matches</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.revealButton} onPress={startReveal}>
            <Text style={styles.revealButtonText}>Reveal Matches</Text>
          </TouchableOpacity>
        </LinearGradient>
      </Animated.View>
    </View>
  );

  /**
   * Render revealing screen
   */
  const renderRevealing = () => (
    <View style={styles.revealingContainer}>
      <Text style={styles.revealingTitle}>Finding your matches...</Text>
      <View style={styles.revealingCards}>
        {resultMatches.slice(0, revealedCount).map((match, index) => (
          <Animated.View
            key={match.id}
            style={[
              styles.revealedCard,
              index === revealedCount - 1 && {
                transform: [
                  { scale: matchAnimation.scale },
                  {
                    rotate: matchAnimation.rotate.interpolate({
                      inputRange: [-0.1, 0, 0.1],
                      outputRange: ['-5deg', '0deg', '5deg'],
                    }),
                  },
                ],
                opacity: matchAnimation.opacity,
              },
            ]}
          >
            <Image source={{ uri: match.user.photoUrl }} style={styles.revealedPhoto} />
            <View style={styles.matchBadge}>
              <Text style={styles.matchBadgeText}>MATCH!</Text>
            </View>
          </Animated.View>
        ))}
      </View>
      <Text style={styles.revealingCount}>
        {revealedCount} / {resultMatches.length}
      </Text>
    </View>
  );

  /**
   * Render complete screen
   */
  const renderComplete = () => (
    <SafeAreaView style={styles.completeContainer}>
      {showConfetti && renderConfetti()}

      <ScrollView
        style={styles.completeScroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.completeScrollContent}
      >
        {/* Header */}
        <View style={styles.completeHeader}>
          {resultMatches.length > 0 ? (
            <>
              <Text style={styles.completeEmoji}>💕</Text>
              <Text style={styles.completeTitle}>
                {resultMatches.length} Match{resultMatches.length > 1 ? 'es' : ''}!
              </Text>
              <Text style={styles.completeSubtitle}>
                You and these people both liked each other!
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.completeEmoji}>👋</Text>
              <Text style={styles.completeTitle}>No Matches This Time</Text>
              <Text style={styles.completeSubtitle}>
                Don't worry, there are more events coming up!
              </Text>
            </>
          )}
        </View>

        {/* Matches List */}
        {resultMatches.length > 0 && (
          <View style={styles.matchesList}>
            {resultMatches.map((match) => (
              <TouchableOpacity
                key={match.id}
                style={styles.matchCard}
                onPress={() => handleMessageMatch(match)}
                activeOpacity={0.8}
              >
                <Image source={{ uri: match.user.photoUrl }} style={styles.matchPhoto} />
                <View style={styles.matchInfo}>
                  <Text style={styles.matchName}>
                    {match.user.name}, {match.user.age}
                  </Text>
                  {match.user.bio && (
                    <Text style={styles.matchBio} numberOfLines={2}>
                      {match.user.bio}
                    </Text>
                  )}
                </View>
                <TouchableOpacity
                  style={styles.messageButton}
                  onPress={() => handleMessageMatch(match)}
                >
                  <Icon name="chatbubble-ellipses" size={20} color="#fff" />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Session Stats */}
        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>Session Summary</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{roundsCompleted}</Text>
              <Text style={styles.statLabel}>People Met</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{likes.length}</Text>
              <Text style={styles.statLabel}>Likes Sent</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{resultMatches.length}</Text>
              <Text style={styles.statLabel}>Matches</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>
                {likes.length > 0 ? Math.round((resultMatches.length / likes.length) * 100) : 0}%
              </Text>
              <Text style={styles.statLabel}>Match Rate</Text>
            </View>
          </View>
        </View>

        {/* Next Steps */}
        <View style={styles.nextSteps}>
          <Text style={styles.nextStepsTitle}>What's Next?</Text>
          {resultMatches.length > 0 ? (
            <Text style={styles.nextStepsText}>
              Send a message to your matches while the conversation is fresh! Start with something
              you talked about during your speed date.
            </Text>
          ) : (
            <Text style={styles.nextStepsText}>
              Join more speed dating events to meet new people. Each event is a new opportunity!
            </Text>
          )}
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.navigate('SpeedDating')}
          >
            <Text style={styles.primaryButtonText}>Find More Events</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => navigation.navigate('SpeedDatingHistory')}
          >
            <Text style={styles.secondaryButtonText}>View History</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );

  // Render based on phase
  if (revealPhase === 'intro') {
    return renderIntro();
  }

  if (revealPhase === 'revealing') {
    return renderRevealing();
  }

  return renderComplete();
};

const styles = StyleSheet.create({
  // Intro
  introContainer: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    padding: 24,
  },
  introContent: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  introGradient: {
    padding: 40,
    alignItems: 'center',
  },
  introEmoji: {
    fontSize: 80,
    marginBottom: 24,
  },
  introTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 16,
  },
  introStats: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    lineHeight: 28,
    marginBottom: 32,
  },
  introSummary: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
  },
  summaryLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  summaryDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  revealButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 48,
    paddingVertical: 18,
    borderRadius: 30,
  },
  revealButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#8B5CF6',
  },

  // Revealing
  revealingContainer: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  revealingTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 40,
  },
  revealingCards: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 32,
  },
  revealedCard: {
    width: 100,
    height: 130,
    borderRadius: 12,
    overflow: 'hidden',
  },
  revealedPhoto: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  matchBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    backgroundColor: '#FF6B6B',
    borderRadius: 4,
    paddingVertical: 4,
    alignItems: 'center',
  },
  matchBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  revealingCount: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.7)',
  },

  // Complete
  completeContainer: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  completeScroll: {
    flex: 1,
  },
  completeScrollContent: {
    padding: 24,
    paddingBottom: 48,
  },
  completeHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  completeEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  completeTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  completeSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  matchesList: {
    marginBottom: 24,
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
    marginLeft: 16,
  },
  matchName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  matchBio: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
    lineHeight: 20,
  },
  messageButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  statItem: {
    width: '50%',
    alignItems: 'center',
    paddingVertical: 12,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FF6B6B',
  },
  statLabel: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  nextSteps: {
    backgroundColor: '#E8F5E9',
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
  },
  nextStepsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  nextStepsText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
  },
  actions: {
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#FF6B6B',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },

  // Confetti
  confettiPiece: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 2,
  },
});

export default SpeedDatingResultsScreen;
