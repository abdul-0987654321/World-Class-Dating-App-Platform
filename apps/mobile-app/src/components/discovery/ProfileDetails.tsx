import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Image,
  Animated,
} from 'react-native';
import { Button } from '../common/Button';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface UserProfile {
  id: string;
  name: string;
  age: number;
  bio?: string;
  occupation?: string;
  education?: string;
  location?: string;
  distance?: number; // in km/miles
  photos: { id: string; url: string }[];
  interests: string[];
  lookingFor?: string;
  height?: number; // in cm
  relationshipGoal?: 'casual' | 'serious' | 'friendship' | 'not-sure';
  zodiacSign?: string;
  smoking?: 'yes' | 'no' | 'sometimes';
  drinking?: 'yes' | 'no' | 'sometimes';
  exercise?: 'active' | 'sometimes' | 'rarely';
  pets?: string[];
  languages?: string[];
  isVerified?: boolean;
  videoProfileUrl?: string;
  answerPrompts?: {
    question: string;
    answer: string;
  }[];
  spotifyArtists?: string[];
  instagramHandle?: string;
}

interface ProfileDetailsProps {
  visible: boolean;
  profile: UserProfile;
  onClose: () => void;
  onLike: () => void;
  onSuperLike: () => void;
  onPass: () => void;
  onReport: () => void;
  onBlock: () => void;
  onViewPhoto?: (photoIndex: number) => void;
}

export const ProfileDetails: React.FC<ProfileDetailsProps> = ({
  visible,
  profile,
  onClose,
  onLike,
  onSuperLike,
  onPass,
  onReport,
  onBlock,
  onViewPhoto,
}) => {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;

  const relationshipGoalLabels = {
    casual: 'Casual Dating',
    serious: 'Serious Relationship',
    friendship: 'Friendship',
    'not-sure': 'Still Figuring It Out',
  };

  const handlePhotoChange = (index: number) => {
    setCurrentPhotoIndex(index);
    if (onViewPhoto) {
      onViewPhoto(index);
    }
  };

  const renderPhotoCarousel = () => {
    if (!profile.photos || profile.photos.length === 0) {
      return (
        <View style={styles.photoPlaceholder}>
          <Text style={styles.photoPlaceholderText}>No Photos</Text>
        </View>
      );
    }

    return (
      <View style={styles.photoCarouselContainer}>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(event) => {
            const offsetX = event.nativeEvent.contentOffset.x;
            const index = Math.round(offsetX / SCREEN_WIDTH);
            handlePhotoChange(index);
          }}
        >
          {profile.photos.map((photo) => (
            <TouchableOpacity
              key={photo.id}
              activeOpacity={1}
              onPress={() => onViewPhoto && onViewPhoto(currentPhotoIndex)}
            >
              <Image source={{ uri: photo.url }} style={styles.photo} />
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Photo Indicators */}
        <View style={styles.photoIndicators}>
          {profile.photos.map((_, index) => (
            <View
              key={index}
              style={[
                styles.photoIndicator,
                index === currentPhotoIndex && styles.photoIndicatorActive,
              ]}
            />
          ))}
        </View>

        {/* Verification Badge */}
        {profile.isVerified && (
          <View style={styles.verifiedBadge}>
            <Text style={styles.verifiedBadgeIcon}>✓</Text>
            <Text style={styles.verifiedBadgeText}>Verified</Text>
          </View>
        )}
      </View>
    );
  };

  const renderBasicInfo = () => (
    <View style={styles.basicInfoSection}>
      <View style={styles.nameRow}>
        <Text style={styles.name}>
          {profile.name}, {profile.age}
        </Text>
        {profile.isVerified && <Text style={styles.verifiedIcon}>✓</Text>}
      </View>

      {profile.occupation && (
        <View style={styles.infoRow}>
          <Text style={styles.infoIcon}>💼</Text>
          <Text style={styles.infoText}>{profile.occupation}</Text>
        </View>
      )}

      {profile.education && (
        <View style={styles.infoRow}>
          <Text style={styles.infoIcon}>🎓</Text>
          <Text style={styles.infoText}>{profile.education}</Text>
        </View>
      )}

      {profile.location && (
        <View style={styles.infoRow}>
          <Text style={styles.infoIcon}>📍</Text>
          <Text style={styles.infoText}>
            {profile.location}
            {profile.distance && ` • ${profile.distance} km away`}
          </Text>
        </View>
      )}
    </View>
  );

  const renderAbout = () => {
    if (!profile.bio) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About {profile.name}</Text>
        <Text style={styles.bioText}>{profile.bio}</Text>
      </View>
    );
  };

  const renderInterests = () => {
    if (!profile.interests || profile.interests.length === 0) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Interests</Text>
        <View style={styles.interestsGrid}>
          {profile.interests.map((interest, index) => (
            <View key={index} style={styles.interestTag}>
              <Text style={styles.interestText}>{interest}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderBasics = () => {
    const hasBasics =
      profile.height ||
      profile.zodiacSign ||
      profile.smoking ||
      profile.drinking ||
      profile.exercise;

    if (!hasBasics) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Basics</Text>
        <View style={styles.basicsList}>
          {profile.height && (
            <View style={styles.basicItem}>
              <Text style={styles.basicLabel}>Height</Text>
              <Text style={styles.basicValue}>{profile.height} cm</Text>
            </View>
          )}
          {profile.zodiacSign && (
            <View style={styles.basicItem}>
              <Text style={styles.basicLabel}>Zodiac</Text>
              <Text style={styles.basicValue}>{profile.zodiacSign}</Text>
            </View>
          )}
          {profile.smoking && (
            <View style={styles.basicItem}>
              <Text style={styles.basicLabel}>Smoking</Text>
              <Text style={styles.basicValue}>
                {profile.smoking.charAt(0).toUpperCase() + profile.smoking.slice(1)}
              </Text>
            </View>
          )}
          {profile.drinking && (
            <View style={styles.basicItem}>
              <Text style={styles.basicLabel}>Drinking</Text>
              <Text style={styles.basicValue}>
                {profile.drinking.charAt(0).toUpperCase() + profile.drinking.slice(1)}
              </Text>
            </View>
          )}
          {profile.exercise && (
            <View style={styles.basicItem}>
              <Text style={styles.basicLabel}>Exercise</Text>
              <Text style={styles.basicValue}>
                {profile.exercise.charAt(0).toUpperCase() + profile.exercise.slice(1)}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderLifestyle = () => {
    const hasLifestyle = profile.pets || profile.languages || profile.relationshipGoal;

    if (!hasLifestyle) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Lifestyle</Text>
        <View style={styles.basicsList}>
          {profile.relationshipGoal && (
            <View style={styles.basicItem}>
              <Text style={styles.basicLabel}>Looking For</Text>
              <Text style={styles.basicValue}>
                {relationshipGoalLabels[profile.relationshipGoal]}
              </Text>
            </View>
          )}
          {profile.pets && profile.pets.length > 0 && (
            <View style={styles.basicItem}>
              <Text style={styles.basicLabel}>Pets</Text>
              <Text style={styles.basicValue}>{profile.pets.join(', ')}</Text>
            </View>
          )}
          {profile.languages && profile.languages.length > 0 && (
            <View style={styles.basicItem}>
              <Text style={styles.basicLabel}>Languages</Text>
              <Text style={styles.basicValue}>{profile.languages.join(', ')}</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderPrompts = () => {
    if (!profile.answerPrompts || profile.answerPrompts.length === 0) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>More About {profile.name}</Text>
        <View style={styles.promptsList}>
          {profile.answerPrompts.map((prompt, index) => (
            <View key={index} style={styles.promptCard}>
              <Text style={styles.promptQuestion}>{prompt.question}</Text>
              <Text style={styles.promptAnswer}>{prompt.answer}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderSpotify = () => {
    if (!profile.spotifyArtists || profile.spotifyArtists.length === 0) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🎵 Top Spotify Artists</Text>
        <View style={styles.artistsList}>
          {profile.spotifyArtists.map((artist, index) => (
            <View key={index} style={styles.artistTag}>
              <Text style={styles.artistText}>{artist}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderInstagram = () => {
    if (!profile.instagramHandle) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📷 Instagram</Text>
        <Text style={styles.instagramHandle}>@{profile.instagramHandle}</Text>
      </View>
    );
  };

  const renderMoreMenu = () => (
    <Modal
      visible={showMoreMenu}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowMoreMenu(false)}
    >
      <TouchableOpacity
        style={styles.menuOverlay}
        activeOpacity={1}
        onPress={() => setShowMoreMenu(false)}
      >
        <View style={styles.menuContainer}>
          <View style={styles.menuHeader}>
            <Text style={styles.menuTitle}>More Options</Text>
          </View>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              setShowMoreMenu(false);
              onReport();
            }}
          >
            <Text style={styles.menuItemIcon}>🚩</Text>
            <Text style={styles.menuItemText}>Report {profile.name}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, styles.menuItemDanger]}
            onPress={() => {
              setShowMoreMenu(false);
              onBlock();
            }}
          >
            <Text style={styles.menuItemIcon}>🚫</Text>
            <Text style={[styles.menuItemText, styles.menuItemTextDanger]}>
              Block {profile.name}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, styles.menuItemCancel]}
            onPress={() => setShowMoreMenu(false)}
          >
            <Text style={styles.menuItemTextCancel}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowMoreMenu(true)} style={styles.moreButton}>
            <Text style={styles.moreButtonText}>⋯</Text>
          </TouchableOpacity>
        </View>

        {/* Scrollable Content */}
        <Animated.ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
            useNativeDriver: false,
          })}
          scrollEventThrottle={16}
        >
          {renderPhotoCarousel()}
          {renderBasicInfo()}
          {renderAbout()}
          {renderInterests()}
          {renderPrompts()}
          {renderBasics()}
          {renderLifestyle()}
          {renderSpotify()}
          {renderInstagram()}

          {/* Spacer for action buttons */}
          <View style={styles.bottomSpacer} />
        </Animated.ScrollView>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.actionButton} onPress={onPass}>
            <View style={[styles.actionButtonInner, styles.passButton]}>
              <Text style={styles.actionButtonIcon}>✕</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={onSuperLike}>
            <View style={[styles.actionButtonInner, styles.superLikeButton]}>
              <Text style={styles.actionButtonIcon}>⭐</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={onLike}>
            <View style={[styles.actionButtonInner, styles.likeButton]}>
              <Text style={styles.actionButtonIcon}>❤️</Text>
            </View>
          </TouchableOpacity>
        </View>

        {renderMoreMenu()}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    zIndex: 10,
    backgroundColor: 'transparent',
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 24,
    color: '#FFF',
  },
  moreButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreButtonText: {
    fontSize: 28,
    color: '#FFF',
    lineHeight: 28,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  // Photos
  photoCarouselContainer: {
    height: SCREEN_HEIGHT * 0.6,
    position: 'relative',
  },
  photo: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.6,
    resizeMode: 'cover',
  },
  photoPlaceholder: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.6,
    backgroundColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPlaceholderText: {
    fontSize: 16,
    color: '#999',
  },
  photoIndicators: {
    position: 'absolute',
    top: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 20,
  },
  photoIndicator: {
    flex: 1,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 1.5,
  },
  photoIndicatorActive: {
    backgroundColor: '#FFF',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2196F3',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  verifiedBadgeIcon: {
    fontSize: 16,
    color: '#FFF',
    marginRight: 4,
  },
  verifiedBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFF',
  },
  // Basic Info
  basicInfoSection: {
    padding: 20,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  name: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginRight: 8,
  },
  verifiedIcon: {
    fontSize: 24,
    color: '#2196F3',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoIcon: {
    fontSize: 16,
    marginRight: 8,
    width: 20,
  },
  infoText: {
    fontSize: 15,
    color: '#666',
  },
  // Sections
  section: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  bioText: {
    fontSize: 15,
    color: '#666',
    lineHeight: 24,
  },
  // Interests
  interestsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  interestTag: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  interestText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  // Prompts
  promptsList: {
    gap: 16,
  },
  promptCard: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
  },
  promptQuestion: {
    fontSize: 13,
    color: '#999',
    marginBottom: 8,
  },
  promptAnswer: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  // Basics
  basicsList: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  basicItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  basicLabel: {
    fontSize: 15,
    color: '#666',
  },
  basicValue: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  // Spotify
  artistsList: {
    gap: 8,
  },
  artistTag: {
    backgroundColor: '#1DB954',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  artistText: {
    fontSize: 14,
    color: '#FFF',
    fontWeight: '500',
  },
  // Instagram
  instagramHandle: {
    fontSize: 16,
    color: '#E91E63',
    fontWeight: '500',
  },
  bottomSpacer: {
    height: 20,
  },
  // Actions
  actionsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
    paddingVertical: 20,
    paddingHorizontal: 20,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  actionButton: {
    flex: 1,
    maxWidth: 80,
  },
  actionButtonInner: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  passButton: {
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#F44336',
  },
  likeButton: {
    backgroundColor: '#E91E63',
  },
  superLikeButton: {
    backgroundColor: '#2196F3',
  },
  actionButtonIcon: {
    fontSize: 32,
  },
  // More Menu
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  menuContainer: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
  },
  menuHeader: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  menuItemDanger: {
    borderBottomWidth: 0,
  },
  menuItemIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  menuItemText: {
    fontSize: 16,
    color: '#333',
  },
  menuItemTextDanger: {
    color: '#F44336',
  },
  menuItemCancel: {
    justifyContent: 'center',
    marginTop: 8,
  },
  menuItemTextCancel: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});
