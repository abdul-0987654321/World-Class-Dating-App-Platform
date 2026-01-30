import React, { useState, useCallback, useEffect } from 'react';
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
} from 'react-native';
import { SwipeCard } from '../../components/discovery/SwipeCard';
import { discoveryService } from '../../services/api/discovery.service';
import { DiscoveryProfile, DiscoveryFilters } from '../../types/discovery.types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface MatchModalData {
  id: string;
  name: string;
  photo: string;
}

const DiscoveryScreen = () => {
  const [profiles, setProfiles] = useState<DiscoveryProfile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
  const [hasMore, setHasMore] = useState(true);
  const [showMatch, setShowMatch] = useState(false);
  const [matchedProfile, setMatchedProfile] = useState<MatchModalData | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Partial<DiscoveryFilters>>({
    ageMin: 18,
    ageMax: 50,
    distanceMax: 50,
    verifiedOnly: false,
  });

  const handleSwipeLeft = useCallback(async (profile: DiscoveryProfile) => {
    setCurrentIndex((prev) => prev + 1);
    try {
      await discoveryService.swipeLeft(profile.id);
    } catch (err) {
      console.error('Failed to record pass:', err);
    }
  }, []);

  const handleSwipeRight = useCallback(async (profile: DiscoveryProfile) => {
    setCurrentIndex((prev) => prev + 1);
    try {
      const response = await discoveryService.swipeRight(profile.id);
      if (response.success && response.data?.isMatch && response.data.match) {
        const match = response.data.match;
        setMatchedProfile({
          id: match.matchedUserId,
          name: match.matchedProfile.name,
          photo: match.matchedProfile.photo,
        });
        setShowMatch(true);
      }
    } catch (err) {
      console.error('Failed to record like:', err);
    }
  }, []);

  const handleSwipeUp = useCallback(async (profile: DiscoveryProfile) => {
    setCurrentIndex((prev) => prev + 1);
    try {
      const response = await discoveryService.superLike(profile.id);
      if (response.success && response.data?.isMatch && response.data.match) {
        const match = response.data.match;
        setMatchedProfile({
          id: match.matchedUserId,
          name: match.matchedProfile.name,
          photo: match.matchedProfile.photo,
        });
        setShowMatch(true);
      }
    } catch (err) {
      Alert.alert('Super Like Failed', 'Unable to send super like. Please try again.');
    }
  }, []);

  const handleRewind = useCallback(async () => {
    if (currentIndex === 0) return;
    try {
      const response = await discoveryService.rewind();
      if (response.success && response.data?.success) {
        setCurrentIndex((prev) => prev - 1);
      } else {
        Alert.alert('Rewind Unavailable', 'You cannot rewind at this time.');
      }
    } catch (err) {
      Alert.alert('Rewind Failed', 'Unable to rewind. Please try again.');
    }
  }, [currentIndex]);

  const handleBoost = useCallback(async () => {
    Alert.alert('Boost Your Profile', 'Get up to 10x more profile views for 30 minutes!', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Boost Now',
        onPress: async () => {
          try {
            await discoveryService.activateBoost();
            Alert.alert('Success', 'Your profile is now boosted for 30 minutes!');
          } catch (err) {
            Alert.alert('Error', 'Failed to activate boost. Please try again.');
          }
        },
      },
    ]);
  }, []);

  const fetchProfiles = useCallback(
    async (isInitialLoad: boolean = false) => {
      if (!isInitialLoad && (isLoadingMore || !hasMore)) return;
      if (isInitialLoad) {
        setIsLoading(true);
        setError(null);
      } else {
        setIsLoadingMore(true);
      }
      try {
        const response = await discoveryService.getProfiles(
          filters,
          isInitialLoad ? undefined : nextCursor,
          20
        );
        if (response.success && response.data) {
          const newProfiles = response.data.profiles;
          if (isInitialLoad) {
            setProfiles(newProfiles);
            setCurrentIndex(0);
          } else {
            setProfiles((prev) => [...prev, ...newProfiles]);
          }
          setNextCursor(response.data.nextCursor);
          setHasMore(response.data.hasMore);
        } else {
          setError(response.error?.message || 'Failed to load profiles');
          if (isInitialLoad) setProfiles([]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unexpected error occurred');
        if (isInitialLoad) setProfiles([]);
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [filters, nextCursor, hasMore, isLoadingMore]
  );
  const handleRefresh = useCallback(() => {
    setNextCursor(undefined);
    setHasMore(true);
    setError(null);
    fetchProfiles(true);
  }, [fetchProfiles]);
  const applyFilters = useCallback(() => {
    setShowFilters(false);
    setNextCursor(undefined);
    setHasMore(true);
    setError(null);
    fetchProfiles(true);
  }, [fetchProfiles]);
  useEffect(() => {
    fetchProfiles(true);
  }, []);
  useEffect(() => {
    const remainingProfiles = profiles.length - currentIndex;
    if (remainingProfiles <= 3 && !isLoading && !isLoadingMore && hasMore && !error) {
      fetchProfiles(false);
    }
  }, [currentIndex, profiles.length, isLoading, isLoadingMore, hasMore, error, fetchProfiles]);

  const currentProfile = profiles[currentIndex];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => setShowFilters(true)}>
          <Text style={styles.headerButtonText}>Filters</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Discover</Text>

        <TouchableOpacity style={styles.headerButton} onPress={handleBoost}>
          <Text style={[styles.headerButtonText, styles.boostText]}>Boost</Text>
        </TouchableOpacity>
      </View>

      {/* Card Stack */}
      <View style={styles.cardContainer}>
        {isLoading && currentIndex >= profiles.length ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#E91E63" />
            <Text style={styles.loadingText}>Finding more profiles...</Text>
          </View>
        ) : currentProfile ? (
          <>
            {/* Show next card behind - non-interactive preview */}
            {profiles[currentIndex + 1] && (
              <View
                style={[styles.cardBehind, { transform: [{ scale: 0.95 }] }]}
                pointerEvents="none"
              >
                <SwipeCard
                  profile={profiles[currentIndex + 1]}
                  onSwipeLeft={() => {
                    /* Background card - non-interactive */
                  }}
                  onSwipeRight={() => {
                    /* Background card - non-interactive */
                  }}
                  onSwipeUp={() => {
                    /* Background card - non-interactive */
                  }}
                />
              </View>
            )}

            {/* Current card */}
            <SwipeCard
              key={currentProfile.id}
              profile={currentProfile}
              onSwipeLeft={handleSwipeLeft}
              onSwipeRight={handleSwipeRight}
              onSwipeUp={handleSwipeUp}
            />
          </>
        ) : (
          <View style={styles.noProfilesContainer}>
            <Text style={styles.noProfilesTitle}>No more profiles</Text>
            <Text style={styles.noProfilesSubtitle}>Check back later for more matches!</Text>
            <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
              <Text style={styles.refreshButtonText}>Refresh</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Bottom Actions */}
      <View style={styles.bottomActions}>
        <TouchableOpacity
          style={[styles.bottomButton, styles.rewindButton]}
          onPress={handleRewind}
          disabled={currentIndex === 0}
        >
          <Text style={styles.bottomButtonText}>↩️</Text>
          <Text style={styles.bottomButtonLabel}>Rewind</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.bottomButton, styles.superLikeBottomButton]}
          onPress={() => currentProfile && handleSwipeUp(currentProfile)}
        >
          <Text style={styles.bottomButtonText}>⭐</Text>
          <Text style={styles.bottomButtonLabel}>Super Like</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.bottomButton, styles.boostBottomButton]}
          onPress={handleBoost}
        >
          <Text style={styles.bottomButtonText}>⚡</Text>
          <Text style={styles.bottomButtonLabel}>Boost</Text>
        </TouchableOpacity>
      </View>

      {/* Match Modal */}
      <Modal
        visible={showMatch}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMatch(false)}
      >
        <View style={styles.matchModalOverlay}>
          <View style={styles.matchModalContent}>
            <Text style={styles.matchTitle}>It's a Match!</Text>
            <Text style={styles.matchSubtitle}>
              You and {matchedProfile?.name} liked each other!
            </Text>

            <View style={styles.matchActions}>
              <TouchableOpacity
                style={styles.sendMessageButton}
                onPress={() => {
                  setShowMatch(false);
                  // Navigate to messages
                }}
              >
                <Text style={styles.sendMessageText}>Send Message</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.keepSwipingButton}
                onPress={() => setShowMatch(false)}
              >
                <Text style={styles.keepSwipingText}>Keep Swiping</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Filters Modal */}
      <Modal
        visible={showFilters}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFilters(false)}
      >
        <View style={styles.filtersModalOverlay}>
          <View style={styles.filtersModalContent}>
            <View style={styles.filtersHeader}>
              <Text style={styles.filtersTitle}>Filters</Text>
              <TouchableOpacity onPress={applyFilters}>
                <Text style={styles.filtersDone}>Apply</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.filterOption}>
              <Text style={styles.filterLabel}>Age Range</Text>
              <Text style={styles.filterValue}>
                {filters.ageMin} - {filters.ageMax}
              </Text>
            </View>

            <View style={styles.filterOption}>
              <Text style={styles.filterLabel}>Maximum Distance</Text>
              <Text style={styles.filterValue}>{filters.distanceMax} km</Text>
            </View>

            <View style={styles.filterOption}>
              <Text style={styles.filterLabel}>Verified Only</Text>
              <TouchableOpacity
                style={[styles.toggleButton, filters.verifiedOnly && styles.toggleButtonActive]}
                onPress={() =>
                  setFilters((prev) => ({
                    ...prev,
                    verifiedOnly: !prev.verifiedOnly,
                  }))
                }
              >
                <Text style={[styles.toggleText, filters.verifiedOnly && styles.toggleTextActive]}>
                  {filters.verifiedOnly ? 'ON' : 'OFF'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  headerButtonText: {
    fontSize: 16,
    color: '#666',
  },
  boostText: {
    color: '#E91E63',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  cardContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  cardBehind: {
    position: 'absolute',
    opacity: 0.5,
  },
  loadingContainer: {
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#666',
  },
  noProfilesContainer: {
    alignItems: 'center',
    padding: 40,
  },
  noProfilesTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  noProfilesSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  refreshButton: {
    backgroundColor: '#E91E63',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    gap: 20,
  },
  bottomButton: {
    alignItems: 'center',
    padding: 10,
  },
  bottomButtonText: {
    fontSize: 24,
  },
  bottomButtonLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
  },
  rewindButton: {
    opacity: 0.8,
  },
  superLikeBottomButton: {},
  boostBottomButton: {},
  matchModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(233, 30, 99, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  matchModalContent: {
    alignItems: 'center',
    padding: 40,
  },
  matchTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  matchSubtitle: {
    fontSize: 18,
    color: '#fff',
    opacity: 0.9,
    marginBottom: 40,
  },
  matchActions: {
    width: '100%',
    gap: 15,
  },
  sendMessageButton: {
    backgroundColor: '#fff',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 30,
    width: SCREEN_WIDTH - 80,
    alignItems: 'center',
  },
  sendMessageText: {
    color: '#E91E63',
    fontSize: 18,
    fontWeight: '600',
  },
  keepSwipingButton: {
    paddingVertical: 15,
    paddingHorizontal: 40,
    alignItems: 'center',
  },
  keepSwipingText: {
    color: '#fff',
    fontSize: 16,
  },
  filtersModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  filtersModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '70%',
  },
  filtersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  filtersTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  filtersDone: {
    fontSize: 16,
    color: '#E91E63',
    fontWeight: '600',
  },
  filterOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  filterLabel: {
    fontSize: 16,
    color: '#333',
  },
  filterValue: {
    fontSize: 16,
    color: '#666',
  },
  toggleButton: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 15,
  },
  toggleButtonActive: {
    backgroundColor: '#E91E63',
  },
  toggleText: {
    color: '#666',
    fontWeight: '600',
  },
  toggleTextActive: {
    color: '#fff',
  },
});

export default DiscoveryScreen;
