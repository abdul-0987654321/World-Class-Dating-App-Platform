/**
 * Enhanced Discovery Screen
 * Includes:
 * - Swipe cards with compatibility scores
 * - Super Like with message
 * - Undo/Rewind functionality
 * - Advanced filters
 * - Boost integration
 * - Profile insights tracking
 */

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
  ScrollView,
  TextInput,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Profile {
  id: string;
  name: string;
  age: number;
  bio: string;
  photos: string[];
  distance: number;
  occupation: string;
  verified: boolean;
  interests: string[];
  compatibilityScore?: number;
  commonInterests?: string[];
  location?: string;
  education?: string;
  height?: number;
}

interface AdvancedFilters {
  minAge: number;
  maxAge: number;
  maxDistance: number;
  showVerifiedOnly: boolean;
  heightMin?: number;
  heightMax?: number;
  education?: string[];
  religion?: string[];
  smoking?: string[];
  drinking?: string[];
  hasChildren?: boolean | 'either';
  wantsChildren?: boolean | 'either';
}

const EnhancedDiscoveryScreen = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [showMatch, setShowMatch] = useState(false);
  const [matchedProfile, setMatchedProfile] = useState<any>(null);

  // New features state
  const [showSuperLikeModal, setShowSuperLikeModal] = useState(false);
  const [superLikeMessage, setSuperLikeMessage] = useState('');
  const [superLikeQuota, setSuperLikeQuota] = useState({ remaining: 1, total: 1 });
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [filters, setFilters] = useState<AdvancedFilters>({
    minAge: 18,
    maxAge: 50,
    maxDistance: 50,
    showVerifiedOnly: false,
  });
  const [undoStack, setUndoStack] = useState<any[]>([]);
  const [hasActiveBoost, setHasActiveBoost] = useState(false);
  const [boostExpiresAt, setBoostExpiresAt] = useState<Date | null>(null);

  // Animation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    loadProfiles();
    loadSuperLikeQuota();
    checkActiveBoost();
  }, []);

  const loadProfiles = async () => {
    setIsLoading(true);
    try {
      // API call to get recommendations
      // const response = await api.get('/recommendations', { params: filters });
      // setProfiles(response.data.recommendations);

      // Mock data for now
      const mockProfiles = generateMockProfiles();
      setProfiles(mockProfiles);
    } catch (error) {
      console.error('Failed to load profiles:', error);
      Alert.alert('Error', 'Failed to load profiles');
    } finally {
      setIsLoading(false);
    }
  };

  const loadSuperLikeQuota = async () => {
    try {
      // const response = await api.get('/super-likes/quota');
      // setSuperLikeQuota(response.data);
      setSuperLikeQuota({ remaining: 1, total: 1 });
    } catch (error) {
      console.error('Failed to load quota:', error);
    }
  };

  const checkActiveBoost = async () => {
    try {
      // const response = await api.get('/boosts/active');
      // setHasActiveBoost(response.data?.active || false);
      // setBoostExpiresAt(response.data?.expiresAt);
    } catch (error) {
      console.error('Failed to check boost:', error);
    }
  };

  const generateMockProfiles = (): Profile[] => {
    return Array.from({ length: 20 }, (_, i) => ({
      id: `profile-${i}`,
      name: ['Emma', 'Sophia', 'Olivia', 'Ava', 'Isabella'][i % 5],
      age: 24 + (i % 10),
      bio: 'Coffee lover, adventure seeker, and dog mom.',
      photos: [`https://i.pravatar.cc/400?img=${i + 1}`],
      distance: Math.floor(Math.random() * 30) + 1,
      occupation: ['Marketing Manager', 'Engineer', 'Designer', 'Teacher'][i % 4],
      verified: i % 3 === 0,
      interests: ['Travel', 'Coffee', 'Hiking', 'Music'],
      compatibilityScore: Math.floor(Math.random() * 40) + 60,
      commonInterests: ['Travel', 'Coffee'],
      location: 'New York, NY',
      education: 'Bachelors Degree',
      height: 165 + (i % 20),
    }));
  };

  const handleSwipeLeft = useCallback(async () => {
    const profile = profiles[currentIndex];
    if (!profile) return;

    // Add to undo stack
    setUndoStack((prev) => [...prev, { profile, action: 'pass', index: currentIndex }]);

    setCurrentIndex((prev) => prev + 1);
    animateTransition();
  }, [profiles, currentIndex]);

  const handleSwipeRight = useCallback(async () => {
    const profile = profiles[currentIndex];
    if (!profile) return;

    // Add to undo stack
    setUndoStack((prev) => [...prev, { profile, action: 'like', index: currentIndex }]);

    // Check for match
    const matched = Math.random() > 0.7; // Simulate match
    if (matched) {
      setMatchedProfile(profile);
      setShowMatch(true);
    }

    setCurrentIndex((prev) => prev + 1);
    animateTransition();
  }, [profiles, currentIndex]);

  const handleSuperLike = useCallback(() => {
    if (superLikeQuota.remaining <= 0) {
      Alert.alert('No Super Likes Left', 'Upgrade to premium for more Super Likes!');
      return;
    }
    setShowSuperLikeModal(true);
  }, [superLikeQuota]);

  const confirmSuperLike = useCallback(async () => {
    const profile = profiles[currentIndex];
    if (!profile) return;

    try {
      // Send Super Like
      // await api.post('/super-likes', {
      //   targetUserId: profile.id,
      //   message: superLikeMessage || undefined,
      // });

      Alert.alert('Super Like Sent!', `${profile.name} will be notified.`);

      setShowSuperLikeModal(false);
      setSuperLikeMessage('');
      setSuperLikeQuota((prev) => ({ ...prev, remaining: prev.remaining - 1 }));

      // Add to undo stack
      setUndoStack((prev) => [...prev, { profile, action: 'super_like', index: currentIndex }]);

      setCurrentIndex((prev) => prev + 1);
      animateTransition();
    } catch (error) {
      console.error('Failed to send Super Like:', error);
      Alert.alert('Error', 'Failed to send Super Like');
    }
  }, [profiles, currentIndex, superLikeMessage]);

  const handleUndo = useCallback(async () => {
    if (undoStack.length === 0) {
      Alert.alert('Nothing to Undo', 'No recent swipes to undo');
      return;
    }

    try {
      // Undo last swipe
      // await api.post('/swipes/undo');

      const lastAction = undoStack[undoStack.length - 1];
      setUndoStack((prev) => prev.slice(0, -1));
      setCurrentIndex(lastAction.index);

      Alert.alert('Undone', 'Last swipe has been undone');
    } catch (error) {
      console.error('Failed to undo:', error);
      Alert.alert('Error', 'Failed to undo swipe');
    }
  }, [undoStack]);

  const activateBoost = useCallback(async () => {
    Alert.alert('Activate Boost', 'Get 10x more profile views for 30 minutes!', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Activate',
        onPress: async () => {
          try {
            // await api.post('/boosts/activate');
            setHasActiveBoost(true);
            setBoostExpiresAt(new Date(Date.now() + 30 * 60000));
            Alert.alert('Boost Activated!', 'Your profile is now being shown 10x more!');
          } catch (error: any) {
            console.error('Failed to activate boost:', error);
            Alert.alert('Error', error.message || 'Failed to activate boost');
          }
        },
      },
    ]);
  }, []);

  const animateTransition = () => {
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const currentProfile = profiles[currentIndex];

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B6B" />
        <Text style={styles.loadingText}>Finding perfect matches...</Text>
      </View>
    );
  }

  if (!currentProfile) {
    return (
      <View style={styles.emptyContainer}>
        <Icon name="emoticon-sad-outline" size={80} color="#CCC" />
        <Text style={styles.emptyTitle}>No More Profiles</Text>
        <Text style={styles.emptySubtitle}>Check back later for more matches!</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={loadProfiles}>
          <Text style={styles.refreshButtonText}>Refresh</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setShowFiltersModal(true)}>
          <Icon name="tune" size={28} color="#333" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Discovery</Text>

        <TouchableOpacity onPress={activateBoost}>
          <LinearGradient
            colors={hasActiveBoost ? ['#FFD700', '#FFA500'] : ['#FF6B6B', '#FF8E53']}
            style={styles.boostButton}
          >
            <Icon name="lightning-bolt" size={20} color="#FFF" />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Boost Active Banner */}
      {hasActiveBoost && (
        <View style={styles.boostBanner}>
          <Icon name="lightning-bolt" size={16} color="#FFD700" />
          <Text style={styles.boostBannerText}>Boost Active - 10x Visibility!</Text>
        </View>
      )}

      {/* Profile Card */}
      <View style={styles.cardContainer}>
        <View style={styles.card}>
          <LinearGradient
            colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.8)']}
            style={styles.cardGradient}
          />

          {/* Compatibility Score Badge */}
          {currentProfile.compatibilityScore && (
            <View style={styles.compatibilityBadge}>
              <Text style={styles.compatibilityText}>
                {currentProfile.compatibilityScore}% Match
              </Text>
            </View>
          )}

          {/* Verified Badge */}
          {currentProfile.verified && (
            <View style={styles.verifiedBadge}>
              <Icon name="check-decagram" size={24} color="#4CAF50" />
            </View>
          )}

          {/* Profile Info */}
          <View style={styles.profileInfo}>
            <View style={styles.profileHeader}>
              <Text style={styles.profileName}>
                {currentProfile.name}, {currentProfile.age}
              </Text>
              <View style={styles.distanceContainer}>
                <Icon name="map-marker" size={16} color="#FFF" />
                <Text style={styles.distanceText}>{currentProfile.distance} km away</Text>
              </View>
            </View>

            <Text style={styles.profileOccupation}>{currentProfile.occupation}</Text>

            {currentProfile.commonInterests && currentProfile.commonInterests.length > 0 && (
              <View style={styles.commonInterestsContainer}>
                <Icon name="heart" size={14} color="#FF6B6B" />
                <Text style={styles.commonInterestsText}>
                  You both like {currentProfile.commonInterests.join(', ')}
                </Text>
              </View>
            )}

            <Text style={styles.profileBio} numberOfLines={3}>
              {currentProfile.bio}
            </Text>

            <View style={styles.interestsContainer}>
              {currentProfile.interests.slice(0, 4).map((interest, index) => (
                <View key={index} style={styles.interestTag}>
                  <Text style={styles.interestText}>{interest}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        {/* Undo Button */}
        <TouchableOpacity
          style={[
            styles.actionButton,
            styles.undoButton,
            undoStack.length === 0 && styles.disabledButton,
          ]}
          onPress={handleUndo}
          disabled={undoStack.length === 0}
        >
          <Icon name="undo-variant" size={24} color="#FFA500" />
        </TouchableOpacity>

        {/* Pass Button */}
        <TouchableOpacity
          style={[styles.actionButton, styles.passButton]}
          onPress={handleSwipeLeft}
        >
          <Icon name="close" size={32} color="#FF6B6B" />
        </TouchableOpacity>

        {/* Super Like Button */}
        <TouchableOpacity
          style={[styles.actionButton, styles.superLikeButton]}
          onPress={handleSuperLike}
        >
          <LinearGradient colors={['#4C9EFF', '#00D4FF']} style={styles.superLikeGradient}>
            <Icon name="star" size={28} color="#FFF" />
          </LinearGradient>
          {superLikeQuota.remaining > 0 && (
            <View style={styles.quotaBadge}>
              <Text style={styles.quotaText}>{superLikeQuota.remaining}</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Like Button */}
        <TouchableOpacity
          style={[styles.actionButton, styles.likeButton]}
          onPress={handleSwipeRight}
        >
          <Icon name="heart" size={32} color="#4CAF50" />
        </TouchableOpacity>

        {/* Filters Button */}
        <TouchableOpacity
          style={[styles.actionButton, styles.filtersButton]}
          onPress={() => setShowFiltersModal(true)}
        >
          <Icon name="filter-variant" size={24} color="#9C27B0" />
        </TouchableOpacity>
      </View>

      {/* Super Like Modal */}
      <Modal
        visible={showSuperLikeModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSuperLikeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => setShowSuperLikeModal(false)}
            >
              <Icon name="close" size={24} color="#666" />
            </TouchableOpacity>

            <LinearGradient colors={['#4C9EFF', '#00D4FF']} style={styles.modalHeader}>
              <Icon name="star" size={40} color="#FFF" />
              <Text style={styles.modalTitle}>Super Like {currentProfile.name}</Text>
            </LinearGradient>

            <Text style={styles.modalSubtitle}>
              Stand out and send a message with your Super Like!
            </Text>

            <TextInput
              style={styles.messageInput}
              placeholder="Write a message (optional)"
              placeholderTextColor="#999"
              multiline
              maxLength={500}
              value={superLikeMessage}
              onChangeText={setSuperLikeMessage}
            />

            <Text style={styles.characterCount}>{superLikeMessage.length}/500</Text>

            <TouchableOpacity style={styles.confirmButton} onPress={confirmSuperLike}>
              <LinearGradient colors={['#4C9EFF', '#00D4FF']} style={styles.confirmButtonGradient}>
                <Text style={styles.confirmButtonText}>Send Super Like</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Match Modal */}
      <Modal
        visible={showMatch}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowMatch(false)}
      >
        <View style={styles.matchOverlay}>
          <View style={styles.matchContent}>
            <Text style={styles.matchTitle}>It's a Match!</Text>
            <Text style={styles.matchSubtitle}>
              You and {matchedProfile?.name} liked each other
            </Text>

            <TouchableOpacity
              style={styles.sendMessageButton}
              onPress={() => {
                setShowMatch(false);
                // Navigate to chat
              }}
            >
              <Text style={styles.sendMessageText}>Send Message</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setShowMatch(false)}>
              <Text style={styles.keepSwipingText}>Keep Swiping</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Advanced Filters Modal */}
      <Modal
        visible={showFiltersModal}
        animationType="slide"
        onRequestClose={() => setShowFiltersModal(false)}
      >
        <SafeAreaView style={styles.filtersContainer}>
          <View style={styles.filtersHeader}>
            <TouchableOpacity onPress={() => setShowFiltersModal(false)}>
              <Icon name="close" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.filtersTitle}>Filters</Text>
            <TouchableOpacity onPress={loadProfiles}>
              <Text style={styles.applyText}>Apply</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.filtersContent}>
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>
                Age Range: {filters.minAge} - {filters.maxAge}
              </Text>
              {/* Add Range Sliders */}
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Distance: {filters.maxDistance} km</Text>
              {/* Add Range Slider */}
            </View>

            <TouchableOpacity style={styles.filterOption}>
              <Text style={styles.filterOptionText}>Verified Only</Text>
              <Icon
                name={filters.showVerifiedOnly ? 'checkbox-marked' : 'checkbox-blank-outline'}
                size={24}
                color="#FF6B6B"
              />
            </TouchableOpacity>

            <Text style={styles.filterSectionTitle}>Advanced</Text>

            {/* Add more advanced filter options */}
          </ScrollView>
        </SafeAreaView>
      </Modal>
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
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
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
  refreshButton: {
    marginTop: 24,
    paddingHorizontal: 32,
    paddingVertical: 12,
    backgroundColor: '#FF6B6B',
    borderRadius: 24,
  },
  refreshButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFF',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  boostButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  boostBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    backgroundColor: '#FFF9E6',
  },
  boostBannerText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#FFA500',
    fontWeight: '600',
  },
  cardContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    width: SCREEN_WIDTH - 32,
    height: SCREEN_HEIGHT * 0.65,
    borderRadius: 16,
    backgroundColor: '#E0E0E0',
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  cardGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  compatibilityBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  compatibilityText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  verifiedBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  profileInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
  },
  profileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  profileName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFF',
  },
  distanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  distanceText: {
    fontSize: 14,
    color: '#FFF',
    marginLeft: 4,
  },
  profileOccupation: {
    fontSize: 16,
    color: '#FFF',
    marginTop: 4,
    opacity: 0.9,
  },
  commonInterestsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  commonInterestsText: {
    fontSize: 14,
    color: '#FFF',
    marginLeft: 4,
  },
  profileBio: {
    fontSize: 14,
    color: '#FFF',
    marginTop: 8,
    lineHeight: 20,
  },
  interestsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
  },
  interestTag: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  interestText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '500',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  actionButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
    backgroundColor: '#FFF',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  undoButton: {
    width: 48,
    height: 48,
  },
  passButton: {
    width: 64,
    height: 64,
  },
  superLikeButton: {
    width: 56,
    height: 56,
    backgroundColor: 'transparent',
    elevation: 0,
  },
  superLikeGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  likeButton: {
    width: 64,
    height: 64,
  },
  filtersButton: {
    width: 48,
    height: 48,
  },
  quotaBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FF6B6B',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quotaText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  disabledButton: {
    opacity: 0.4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    minHeight: SCREEN_HEIGHT * 0.5,
  },
  modalClose: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
  },
  modalHeader: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 16,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
    marginTop: 12,
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  messageInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  characterCount: {
    alignSelf: 'flex-end',
    color: '#999',
    fontSize: 12,
    marginTop: 8,
  },
  confirmButton: {
    marginTop: 24,
  },
  confirmButtonGradient: {
    paddingVertical: 16,
    borderRadius: 24,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  matchOverlay: {
    flex: 1,
    backgroundColor: 'rgba(255,107,107,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  matchContent: {
    alignItems: 'center',
  },
  matchTitle: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 16,
  },
  matchSubtitle: {
    fontSize: 18,
    color: '#FFF',
    marginBottom: 32,
    textAlign: 'center',
  },
  sendMessageButton: {
    backgroundColor: '#FFF',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 24,
    marginBottom: 16,
  },
  sendMessageText: {
    color: '#FF6B6B',
    fontSize: 18,
    fontWeight: 'bold',
  },
  keepSwipingText: {
    color: '#FFF',
    fontSize: 16,
  },
  filtersContainer: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  filtersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  filtersTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  applyText: {
    fontSize: 16,
    color: '#FF6B6B',
    fontWeight: '600',
  },
  filtersContent: {
    flex: 1,
    padding: 16,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  filterSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 24,
    marginBottom: 16,
  },
  filterOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  filterOptionText: {
    fontSize: 16,
    color: '#333',
  },
});

export default EnhancedDiscoveryScreen;
