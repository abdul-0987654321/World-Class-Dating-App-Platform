import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Modal,
  Alert,
  StatusBar,
} from 'react-native';
import { SwipeCardEnhanced } from '../../components/discovery/SwipeCardEnhanced';
import { MatchModal } from '../../components/discovery/MatchModal';
import { DiscoveryStack } from '../../components/discovery/DiscoveryStack';
import { AdvancedFilters } from '../../components/discovery/AdvancedFilters';
import { ProfileDetails } from '../../components/discovery/ProfileDetails';
import { discoveryService } from '../../services/api/discovery.service';
import {
  DiscoveryProfile,
  DiscoveryFilters,
  Match,
  DiscoveryStats,
} from '../../types/discovery.types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Mock user photo for demo
const CURRENT_USER_PHOTO = 'https://randomuser.me/api/portraits/men/32.jpg';

const DEFAULT_FILTERS: DiscoveryFilters = {
  distanceMax: 50,
  ageMin: 18,
  ageMax: 50,
  heightMin: undefined,
  heightMax: undefined,
  educationLevels: [],
  relationshipGoals: [],
  smokingPreferences: [],
  drinkingPreferences: [],
  exercisePreferences: [],
  interests: [],
  sexualOrientations: [],
  verifiedOnly: false,
  showRecentlyActive: true,
};

const DiscoveryScreenEnhanced = ({ navigation }: any) => {
  const [profiles, setProfiles] = useState<DiscoveryProfile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | undefined>();

  // Match state
  const [showMatch, setShowMatch] = useState(false);
  const [matchedProfile, setMatchedProfile] = useState<Match | null>(null);

  // UI state
  const [showFilters, setShowFilters] = useState(false);
  const [showProfileDetails, setShowProfileDetails] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<DiscoveryProfile | null>(null);

  // Filters and stats
  const [filters, setFilters] = useState<DiscoveryFilters>(DEFAULT_FILTERS);
  const [stats, setStats] = useState<DiscoveryStats | null>(null);

  // Premium features state
  const [superLikesRemaining, setSuperLikesRemaining] = useState(5);
  const [rewindsRemaining, setRewindsRemaining] = useState(3);
  const [boostsRemaining, setBoostsRemaining] = useState(1);
  const [isBoostActive, setIsBoostActive] = useState(false);

  const lastSwipedProfileRef = useRef<DiscoveryProfile | null>(null);

  // Load initial profiles
  useEffect(() => {
    loadProfiles();
    loadStats();
    loadPremiumInfo();
  }, []);

  // Load more profiles when running low
  useEffect(() => {
    const remainingProfiles = profiles.length - currentIndex;
    if (remainingProfiles <= 2 && hasMore && !isLoading) {
      loadMoreProfiles();
    }
  }, [currentIndex, profiles.length, hasMore, isLoading]);

  const loadProfiles = async (newFilters?: DiscoveryFilters) => {
    setIsLoading(true);
    try {
      const response = await discoveryService.getProfiles(newFilters || filters, undefined, 20);

      if (response.success && response.data) {
        setProfiles(response.data.profiles);
        setHasMore(response.data.hasMore);
        setNextCursor(response.data.nextCursor);
        setCurrentIndex(0);
      } else {
        Alert.alert('Error', response.error?.message || 'Failed to load profiles');
      }
    } catch (error) {
      console.error('Load profiles error:', error);
      Alert.alert('Error', 'Failed to load profiles. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadMoreProfiles = async () => {
    if (!hasMore || isLoading) return;

    setIsLoading(true);
    try {
      const response = await discoveryService.getProfiles(filters, nextCursor, 20);

      if (response.success && response.data) {
        setProfiles((prev) => [...prev, ...response.data!.profiles]);
        setHasMore(response.data.hasMore);
        setNextCursor(response.data.nextCursor);
      }
    } catch (error) {
      console.error('Load more profiles error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await discoveryService.getStats();
      if (response.success && response.data) {
        setStats(response.data);
        setSuperLikesRemaining(response.data.superLikesRemaining);
        setBoostsRemaining(response.data.boostsRemaining);
        setRewindsRemaining(response.data.rewindsRemaining);
      }
    } catch (error) {
      console.error('Load stats error:', error);
    }
  };

  const loadPremiumInfo = async () => {
    try {
      const [superLikeInfo, boostStatus] = await Promise.all([
        discoveryService.getSuperLikeInfo(),
        discoveryService.getBoostStatus(),
      ]);

      if (superLikeInfo.success && superLikeInfo.data) {
        setSuperLikesRemaining(superLikeInfo.data.count);
      }

      if (boostStatus.success && boostStatus.data) {
        setIsBoostActive(boostStatus.data.isActive);
      }
    } catch (error) {
      console.error('Load premium info error:', error);
    }
  };

  const handleSwipeLeft = useCallback(async (profile: DiscoveryProfile) => {
    lastSwipedProfileRef.current = profile;

    try {
      await discoveryService.swipeLeft(profile.id);
    } catch {
      // Silently handle swipe errors
    }

    setCurrentIndex((prev) => prev + 1);
  }, []);

  const handleSwipeRight = useCallback(async (profile: DiscoveryProfile) => {
    lastSwipedProfileRef.current = profile;

    try {
      const response = await discoveryService.swipeRight(profile.id);

      if (response.success && response.data) {
        if (response.data.isMatch && response.data.match) {
          setMatchedProfile(response.data.match);
          setShowMatch(true);
        }
      }
    } catch {
      // Silently handle swipe errors
    }

    setCurrentIndex((prev) => prev + 1);
  }, []);

  const handleSwipeUp = useCallback(async (profile: DiscoveryProfile) => {
    if (superLikesRemaining <= 0) {
      Alert.alert(
        'No Super Likes Remaining',
        'You have used all your super likes for today. Upgrade to premium for unlimited super likes!',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Upgrade', onPress: () => navigation.navigate('Premium') },
        ]
      );
      return;
    }

    lastSwipedProfileRef.current = profile;

    try {
      const response = await discoveryService.superLike(profile.id);

      if (response.success && response.data) {
        setSuperLikesRemaining((prev) => prev - 1);

        if (response.data.isMatch && response.data.match) {
          setMatchedProfile(response.data.match);
          setShowMatch(true);
        } else {
          Alert.alert('Super Like Sent!', `${profile.name} will see that you super liked them!`);
        }
      } else {
        Alert.alert('Error', response.error?.message || 'Failed to send super like');
      }
    } catch {
      Alert.alert('Error', 'Failed to send super like. Please try again.');
    }

    setCurrentIndex((prev) => prev + 1);
  }, [superLikesRemaining, navigation]);

  const handleRewind = useCallback(async () => {
    if (rewindsRemaining <= 0) {
      Alert.alert(
        'No Rewinds Remaining',
        'Upgrade to premium for unlimited rewinds!',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Upgrade', onPress: () => navigation.navigate('Premium') },
        ]
      );
      return;
    }

    if (currentIndex === 0) {
      Alert.alert('Nothing to Rewind', 'You haven\'t swiped on anyone yet!');
      return;
    }

    try {
      const response = await discoveryService.rewind();

      if (response.success) {
        setCurrentIndex((prev) => Math.max(0, prev - 1));
        setRewindsRemaining((prev) => prev - 1);
        Alert.alert('Rewound!', 'Your last swipe has been undone.');
      } else {
        Alert.alert('Error', response.error?.message || 'Failed to rewind');
      }
    } catch (error) {
      console.error('Rewind error:', error);
      Alert.alert('Error', 'Failed to rewind. Please try again.');
    }
  }, [currentIndex, rewindsRemaining, navigation]);

  const handleBoost = useCallback(async () => {
    if (isBoostActive) {
      Alert.alert('Boost Active', 'Your boost is already active!');
      return;
    }

    if (boostsRemaining <= 0) {
      Alert.alert(
        'No Boosts Remaining',
        'Get up to 10x more profile views with a boost! Upgrade to premium or purchase more boosts.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Get Boosts', onPress: () => navigation.navigate('Premium') },
        ]
      );
      return;
    }

    Alert.alert(
      'Activate Boost?',
      'Get up to 10x more profile views for 30 minutes! This will use one of your boosts.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Activate',
          onPress: async () => {
            try {
              const response = await discoveryService.activateBoost();

              if (response.success && response.data) {
                setIsBoostActive(true);
                setBoostsRemaining((prev) => prev - 1);
                Alert.alert(
                  'Boost Activated!',
                  'You are now being shown to more people. Your boost will last for 30 minutes.'
                );

                // Deactivate after 30 minutes
                setTimeout(() => {
                  setIsBoostActive(false);
                }, 30 * 60 * 1000);
              } else {
                Alert.alert('Error', response.error?.message || 'Failed to activate boost');
              }
            } catch (error) {
              console.error('Boost error:', error);
              Alert.alert('Error', 'Failed to activate boost. Please try again.');
            }
          },
        },
      ]
    );
  }, [isBoostActive, boostsRemaining, navigation]);

  const handleViewProfile = (profile: DiscoveryProfile) => {
    setSelectedProfile(profile);
    setShowProfileDetails(true);
  };

  const handleApplyFilters = async (newFilters: DiscoveryFilters) => {
    setFilters(newFilters);
    setShowFilters(false);

    try {
      await discoveryService.updateFilters(newFilters);
      loadProfiles(newFilters);
    } catch (error) {
      console.error('Update filters error:', error);
      Alert.alert('Error', 'Failed to update filters. Please try again.');
    }
  };

  const handleResetFilters = () => {
    setFilters(DEFAULT_FILTERS);
    loadProfiles(DEFAULT_FILTERS);
  };

  const handleRefresh = async () => {
    await loadProfiles();
    await loadStats();
  };

  const handleSendMessage = () => {
    setShowMatch(false);
    if (matchedProfile) {
      navigation.navigate('Messages', { matchId: matchedProfile.id });
    }
  };

  const handleKeepSwiping = () => {
    setShowMatch(false);
    setMatchedProfile(null);
  };

  const currentProfile = profiles[currentIndex];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => setShowFilters(true)}>
          <View style={styles.headerButtonInner}>
            <Text style={styles.headerButtonIcon}>⚙️</Text>
            <Text style={styles.headerButtonLabel}>Filters</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Discover</Text>
          {isBoostActive && (
            <View style={styles.boostIndicator}>
              <Text style={styles.boostIndicatorText}>⚡ Boost Active</Text>
            </View>
          )}
        </View>

        <TouchableOpacity style={styles.headerButton} onPress={handleBoost}>
          <View style={styles.headerButtonInner}>
            <Text style={styles.headerButtonIcon}>⚡</Text>
            <Text style={[styles.headerButtonLabel, styles.boostLabel]}>Boost</Text>
          </View>
          {boostsRemaining > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{boostsRemaining}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Stats Bar */}
      {stats && (
        <View style={styles.statsBar}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.likesReceived}</Text>
            <Text style={styles.statLabel}>Likes</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.matchesToday}</Text>
            <Text style={styles.statLabel}>Matches Today</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{superLikesRemaining}</Text>
            <Text style={styles.statLabel}>Super Likes</Text>
          </View>
        </View>
      )}

      {/* Card Stack */}
      <View style={styles.cardContainer}>
        {isLoading && profiles.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#E91E63" />
            <Text style={styles.loadingText}>Finding profiles for you...</Text>
          </View>
        ) : currentProfile ? (
          <>
            {/* Show next cards behind for preview */}
            {profiles.slice(currentIndex + 1, currentIndex + 3).reverse().map((profile, index) => (
              <View
                key={profile.id}
                style={[
                  styles.cardBehind,
                  {
                    transform: [
                      { scale: 1 - (index + 1) * 0.03 },
                      { translateY: -(index + 1) * 10 },
                    ],
                    opacity: 1 - (index + 1) * 0.2,
                  },
                ]}
              />
            ))}

            {/* Current card */}
            <SwipeCardEnhanced
              key={currentProfile.id}
              profile={currentProfile}
              onSwipeLeft={handleSwipeLeft}
              onSwipeRight={handleSwipeRight}
              onSwipeUp={handleSwipeUp}
              onViewProfile={handleViewProfile}
            />
          </>
        ) : (
          <View style={styles.noProfilesContainer}>
            <Text style={styles.noProfilesIcon}>🔍</Text>
            <Text style={styles.noProfilesTitle}>No More Profiles</Text>
            <Text style={styles.noProfilesSubtitle}>
              {hasMore
                ? "We're finding more people for you..."
                : "You've seen everyone nearby!\nTry adjusting your filters or check back later."}
            </Text>
            {!hasMore && (
              <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
                <Text style={styles.refreshButtonText}>Refresh</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Loading indicator for background loading */}
        {isLoading && profiles.length > 0 && (
          <View style={styles.bottomLoader}>
            <ActivityIndicator size="small" color="#E91E63" />
            <Text style={styles.bottomLoaderText}>Loading more...</Text>
          </View>
        )}
      </View>

      {/* Bottom Action Bar */}
      <View style={styles.bottomActions}>
        <TouchableOpacity
          style={[styles.bottomButton, rewindsRemaining === 0 && styles.buttonDisabled]}
          onPress={handleRewind}
          disabled={currentIndex === 0 || rewindsRemaining === 0}
        >
          <Text style={styles.bottomButtonIcon}>↩️</Text>
          <Text style={styles.bottomButtonLabel}>Rewind</Text>
          {rewindsRemaining > 0 && (
            <View style={styles.smallBadge}>
              <Text style={styles.smallBadgeText}>{rewindsRemaining}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.bottomButton, superLikesRemaining === 0 && styles.buttonDisabled]}
          onPress={() => currentProfile && handleSwipeUp(currentProfile)}
          disabled={!currentProfile || superLikesRemaining === 0}
        >
          <Text style={styles.bottomButtonIcon}>⭐</Text>
          <Text style={styles.bottomButtonLabel}>Super Like</Text>
          <View style={styles.smallBadge}>
            <Text style={styles.smallBadgeText}>{superLikesRemaining}</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.bottomButton, isBoostActive && styles.buttonActive]}
          onPress={handleBoost}
        >
          <Text style={styles.bottomButtonIcon}>⚡</Text>
          <Text style={styles.bottomButtonLabel}>Boost</Text>
          {boostsRemaining > 0 && !isBoostActive && (
            <View style={styles.smallBadge}>
              <Text style={styles.smallBadgeText}>{boostsRemaining}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Match Modal */}
      <MatchModal
        visible={showMatch}
        userPhoto={CURRENT_USER_PHOTO}
        matchedProfile={
          matchedProfile
            ? {
                id: matchedProfile.matchedUserId,
                name: matchedProfile.matchedProfile.name,
                photo: matchedProfile.matchedProfile.photo,
                age: matchedProfile.matchedProfile.age,
              }
            : null
        }
        onSendMessage={handleSendMessage}
        onKeepSwiping={handleKeepSwiping}
        onClose={handleKeepSwiping}
      />

      {/* Filters Modal */}
      <Modal
        visible={showFilters}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowFilters(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowFilters(false)}>
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Filters</Text>
            <TouchableOpacity onPress={handleResetFilters}>
              <Text style={styles.modalResetText}>Reset</Text>
            </TouchableOpacity>
          </View>
          <AdvancedFilters
            initialFilters={filters}
            onApply={handleApplyFilters}
            onReset={handleResetFilters}
          />
        </SafeAreaView>
      </Modal>

      {/* Profile Details Modal */}
      {selectedProfile && (
        <ProfileDetails
          visible={showProfileDetails}
          profile={{
            ...selectedProfile,
            photos: selectedProfile.photos.map((p) => ({
              id: p.id,
              url: p.url,
            })),
          }}
          onClose={() => {
            setShowProfileDetails(false);
            setSelectedProfile(null);
          }}
          onLike={() => {
            setShowProfileDetails(false);
            if (selectedProfile) handleSwipeRight(selectedProfile);
          }}
          onSuperLike={() => {
            setShowProfileDetails(false);
            if (selectedProfile) handleSwipeUp(selectedProfile);
          }}
          onPass={() => {
            setShowProfileDetails(false);
            if (selectedProfile) handleSwipeLeft(selectedProfile);
          }}
          onReport={async () => {
            const handleReport = async (reason: string) => {
              try {
                await discoveryService.reportUser(selectedProfile.userId, reason);
                Alert.alert('Report Submitted', 'Thank you for helping keep our community safe.');
              } catch {
                Alert.alert('Error', 'Failed to submit report. Please try again.');
              }
            };
            Alert.alert('Report Profile', 'Why are you reporting this profile?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Inappropriate Photos', onPress: () => handleReport('inappropriate_photos') },
              { text: 'Fake Profile', onPress: () => handleReport('fake_profile') },
              { text: 'Harassment', onPress: () => handleReport('harassment') },
              { text: 'Other', onPress: () => handleReport('other') },
            ]);
          }}
          onBlock={async () => {
            Alert.alert(
              'Block User',
              `Are you sure you want to block ${selectedProfile.name}? You won't see each other anymore.`,
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Block',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await discoveryService.blockUser(selectedProfile.userId);
                      setShowProfileDetails(false);
                      setSelectedProfile(null);
                      Alert.alert('Blocked', `${selectedProfile.name} has been blocked.`);
                    } catch (error) {
                      Alert.alert('Error', 'Failed to block user. Please try again.');
                    }
                  },
                },
              ]
            );
          }}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerButton: {
    position: 'relative',
  },
  headerButtonInner: {
    alignItems: 'center',
  },
  headerButtonIcon: {
    fontSize: 20,
  },
  headerButtonLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  boostLabel: {
    color: '#E91E63',
    fontWeight: '600',
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  boostIndicator: {
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
  },
  boostIndicatorText: {
    fontSize: 11,
    color: '#F57C00',
    fontWeight: '600',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#E91E63',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  statsBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#E91E63',
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  cardContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    position: 'relative',
  },
  cardBehind: {
    position: 'absolute',
    width: SCREEN_WIDTH - 40,
    height: SCREEN_HEIGHT * 0.7,
    borderRadius: 20,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  loadingContainer: {
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  noProfilesContainer: {
    alignItems: 'center',
    padding: 40,
  },
  noProfilesIcon: {
    fontSize: 80,
    marginBottom: 20,
  },
  noProfilesTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  noProfilesSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  refreshButton: {
    backgroundColor: '#E91E63',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 24,
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomLoader: {
    position: 'absolute',
    bottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  bottomLoaderText: {
    color: '#fff',
    fontSize: 13,
    marginLeft: 8,
  },
  bottomActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    gap: 20,
  },
  bottomButton: {
    alignItems: 'center',
    padding: 8,
    position: 'relative',
    minWidth: 70,
  },
  bottomButtonIcon: {
    fontSize: 28,
  },
  bottomButtonLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
    fontWeight: '500',
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonActive: {
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  smallBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#E91E63',
    borderRadius: 8,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalCloseText: {
    fontSize: 16,
    color: '#666',
  },
  modalResetText: {
    fontSize: 16,
    color: '#E91E63',
    fontWeight: '600',
  },
});

export default DiscoveryScreenEnhanced;
