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
} from 'react-native';
import { SwipeCard } from '../../components/discovery/SwipeCard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Mock profile data
const MOCK_PROFILES = [
  {
    id: '1',
    name: 'Emma',
    age: 26,
    bio: 'Coffee lover, adventure seeker, and dog mom. Looking for someone to explore the city with!',
    photos: ['https://randomuser.me/api/portraits/women/1.jpg'],
    distance: 3,
    occupation: 'Marketing Manager',
    verified: true,
    interests: ['Travel', 'Coffee', 'Hiking', 'Dogs'],
  },
  {
    id: '2',
    name: 'Sophia',
    age: 24,
    bio: 'Yoga instructor by day, foodie by night. Lets find the best tacos in town!',
    photos: ['https://randomuser.me/api/portraits/women/2.jpg'],
    distance: 5,
    occupation: 'Yoga Instructor',
    verified: true,
    interests: ['Yoga', 'Food', 'Wellness', 'Music'],
  },
  {
    id: '3',
    name: 'Olivia',
    age: 28,
    bio: 'Bookworm and wine enthusiast. Looking for deep conversations and cozy dates.',
    photos: ['https://randomuser.me/api/portraits/women/3.jpg'],
    distance: 2,
    occupation: 'Writer',
    verified: false,
    interests: ['Books', 'Wine', 'Art', 'Movies'],
  },
  {
    id: '4',
    name: 'Ava',
    age: 25,
    bio: 'Fitness enthusiast and beach lover. Life is too short for boring dates!',
    photos: ['https://randomuser.me/api/portraits/women/4.jpg'],
    distance: 8,
    occupation: 'Personal Trainer',
    verified: true,
    interests: ['Fitness', 'Beach', 'Travel', 'Cooking'],
  },
  {
    id: '5',
    name: 'Isabella',
    age: 27,
    bio: 'Tech geek with a passion for photography. Always looking for the perfect shot.',
    photos: ['https://randomuser.me/api/portraits/women/5.jpg'],
    distance: 4,
    occupation: 'Software Engineer',
    verified: true,
    interests: ['Photography', 'Technology', 'Gaming', 'Travel'],
  },
];

interface Match {
  id: string;
  name: string;
  photo: string;
}

const DiscoveryScreen = () => {
  const [profiles, setProfiles] = useState(MOCK_PROFILES);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [showMatch, setShowMatch] = useState(false);
  const [matchedProfile, setMatchedProfile] = useState<Match | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    minAge: 18,
    maxAge: 50,
    maxDistance: 50,
    showVerifiedOnly: false,
  });

  const handleSwipeLeft = useCallback((profile: typeof MOCK_PROFILES[0]) => {
    console.log('Passed on:', profile.name);
    setCurrentIndex((prev) => prev + 1);
  }, []);

  const handleSwipeRight = useCallback((profile: typeof MOCK_PROFILES[0]) => {
    console.log('Liked:', profile.name);

    // Simulate 30% match rate
    if (Math.random() < 0.3) {
      setMatchedProfile({
        id: profile.id,
        name: profile.name,
        photo: profile.photos[0],
      });
      setShowMatch(true);
    }

    setCurrentIndex((prev) => prev + 1);
  }, []);

  const handleSwipeUp = useCallback((profile: typeof MOCK_PROFILES[0]) => {
    console.log('Super liked:', profile.name);

    // Simulate 50% match rate for super likes
    if (Math.random() < 0.5) {
      setMatchedProfile({
        id: profile.id,
        name: profile.name,
        photo: profile.photos[0],
      });
      setShowMatch(true);
    }

    setCurrentIndex((prev) => prev + 1);
  }, []);

  const handleRewind = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  }, [currentIndex]);

  const handleBoost = useCallback(() => {
    Alert.alert(
      'Boost Your Profile',
      'Get up to 10x more profile views for 30 minutes!',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Boost Now', onPress: () => console.log('Boost activated') },
      ]
    );
  }, []);

  const loadMoreProfiles = useCallback(async () => {
    setIsLoading(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Shuffle and add more mock profiles
    const moreProfiles = MOCK_PROFILES.map((p) => ({
      ...p,
      id: `${p.id}-${Date.now()}`,
    }));
    setProfiles((prev) => [...prev, ...moreProfiles]);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    // Load more when running low on profiles
    if (currentIndex >= profiles.length - 2 && !isLoading) {
      loadMoreProfiles();
    }
  }, [currentIndex, profiles.length, isLoading, loadMoreProfiles]);

  const currentProfile = profiles[currentIndex];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => setShowFilters(true)}
        >
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
            {/* Show next card behind */}
            {profiles[currentIndex + 1] && (
              <View style={[styles.cardBehind, { transform: [{ scale: 0.95 }] }]}>
                <SwipeCard
                  profile={profiles[currentIndex + 1]}
                  onSwipeLeft={() => {}}
                  onSwipeRight={() => {}}
                  onSwipeUp={() => {}}
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
            <Text style={styles.noProfilesSubtitle}>
              Check back later for more matches!
            </Text>
            <TouchableOpacity
              style={styles.refreshButton}
              onPress={loadMoreProfiles}
            >
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
              <TouchableOpacity onPress={() => setShowFilters(false)}>
                <Text style={styles.filtersDone}>Done</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.filterOption}>
              <Text style={styles.filterLabel}>Age Range</Text>
              <Text style={styles.filterValue}>
                {filters.minAge} - {filters.maxAge}
              </Text>
            </View>

            <View style={styles.filterOption}>
              <Text style={styles.filterLabel}>Maximum Distance</Text>
              <Text style={styles.filterValue}>{filters.maxDistance} km</Text>
            </View>

            <View style={styles.filterOption}>
              <Text style={styles.filterLabel}>Verified Only</Text>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  filters.showVerifiedOnly && styles.toggleButtonActive,
                ]}
                onPress={() =>
                  setFilters((prev) => ({
                    ...prev,
                    showVerifiedOnly: !prev.showVerifiedOnly,
                  }))
                }
              >
                <Text
                  style={[
                    styles.toggleText,
                    filters.showVerifiedOnly && styles.toggleTextActive,
                  ]}
                >
                  {filters.showVerifiedOnly ? 'ON' : 'OFF'}
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
