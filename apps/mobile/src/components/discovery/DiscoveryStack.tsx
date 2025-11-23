import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { SwipeCard } from './SwipeCard';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Profile {
  id: string;
  name: string;
  age: number;
  bio?: string;
  photos: string[];
  distance?: number;
  occupation?: string;
  verified?: boolean;
}

interface DiscoveryStackProps {
  profiles: Profile[];
  isLoading: boolean;
  onSwipeLeft: (profile: Profile) => void;
  onSwipeRight: (profile: Profile) => void;
  onSwipeUp: (profile: Profile) => void;
  onLoadMore: () => void;
  onRefresh?: () => void;
  hasMore: boolean;
}

export const DiscoveryStack: React.FC<DiscoveryStackProps> = ({
  profiles,
  isLoading,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onLoadMore,
  onRefresh,
  hasMore,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Load more profiles when running low
  useEffect(() => {
    const remainingProfiles = profiles.length - currentIndex;
    if (remainingProfiles <= 2 && hasMore && !isLoading) {
      onLoadMore();
    }
  }, [currentIndex, profiles.length, hasMore, isLoading, onLoadMore]);

  const handleSwipeLeft = (profile: Profile) => {
    onSwipeLeft(profile);
    setCurrentIndex((prev) => prev + 1);
  };

  const handleSwipeRight = (profile: Profile) => {
    onSwipeRight(profile);
    setCurrentIndex((prev) => prev + 1);
  };

  const handleSwipeUp = (profile: Profile) => {
    onSwipeUp(profile);
    setCurrentIndex((prev) => prev + 1);
  };

  const handleRefresh = async () => {
    if (!onRefresh || isRefreshing) return;

    setIsRefreshing(true);
    try {
      await onRefresh();
      setCurrentIndex(0);
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const renderEmptyState = () => {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconContainer}>
          <Text style={styles.emptyIcon}>🔍</Text>
        </View>
        <Text style={styles.emptyTitle}>No More Profiles</Text>
        <Text style={styles.emptyMessage}>
          {hasMore
            ? "We're finding more people for you..."
            : "You've seen everyone in your area.\nTry adjusting your filters or check back later!"}
        </Text>
        {onRefresh && (
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={handleRefresh}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text style={styles.refreshButtonText}>Refresh</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderLoadingSkeleton = () => {
    return (
      <View style={styles.skeletonContainer}>
        <View style={styles.skeletonCard}>
          <View style={styles.skeletonImage} />
          <View style={styles.skeletonInfo}>
            <View style={styles.skeletonName} />
            <View style={styles.skeletonBio} />
            <View style={styles.skeletonDetails} />
          </View>
        </View>
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#E91E63" />
          <Text style={styles.loadingText}>Finding profiles...</Text>
        </View>
      </View>
    );
  };

  const renderCardStack = () => {
    const visibleProfiles = profiles.slice(currentIndex, currentIndex + 3);

    if (visibleProfiles.length === 0) {
      return renderEmptyState();
    }

    return (
      <View style={styles.stackContainer}>
        {/* Render cards in reverse order so the top card is on top */}
        {visibleProfiles
          .slice()
          .reverse()
          .map((profile, reverseIndex) => {
            const index = visibleProfiles.length - 1 - reverseIndex;
            const isTopCard = index === 0;

            // Calculate card offset and scale for stack effect
            const scale = 1 - index * 0.03;
            const translateY = -index * 10;

            return (
              <View
                key={profile.id}
                style={[
                  styles.cardContainer,
                  {
                    transform: [{ scale }, { translateY }],
                    zIndex: index === 0 ? 10 : 10 - index,
                  },
                ]}
                pointerEvents={isTopCard ? 'auto' : 'none'}
              >
                {isTopCard ? (
                  <SwipeCard
                    profile={profile}
                    onSwipeLeft={handleSwipeLeft}
                    onSwipeRight={handleSwipeRight}
                    onSwipeUp={handleSwipeUp}
                  />
                ) : (
                  // Static card for stack preview
                  <View style={styles.previewCard}>
                    <View style={styles.previewOverlay} />
                  </View>
                )}
              </View>
            );
          })}

        {/* Card counter */}
        <View style={styles.counterContainer}>
          <Text style={styles.counterText}>
            {currentIndex + 1} / {profiles.length}
            {hasMore ? '+' : ''}
          </Text>
        </View>
      </View>
    );
  };

  const renderBottomLoader = () => {
    if (!isLoading || profiles.length === 0) return null;

    return (
      <View style={styles.bottomLoader}>
        <ActivityIndicator size="small" color="#E91E63" />
        <Text style={styles.bottomLoaderText}>Loading more profiles...</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {isLoading && profiles.length === 0 ? renderLoadingSkeleton() : renderCardStack()}
      {renderBottomLoader()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stackContainer: {
    flex: 1,
    width: SCREEN_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  cardContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewCard: {
    width: SCREEN_WIDTH - 40,
    height: SCREEN_HEIGHT * 0.7,
    borderRadius: 20,
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  previewOverlay: {
    flex: 1,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  counterContainer: {
    position: 'absolute',
    top: 20,
    left: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  counterText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyIcon: {
    fontSize: 64,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  refreshButton: {
    backgroundColor: '#E91E63',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 24,
    minWidth: 120,
    alignItems: 'center',
  },
  refreshButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  skeletonContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  skeletonCard: {
    width: SCREEN_WIDTH - 40,
    height: SCREEN_HEIGHT * 0.7,
    borderRadius: 20,
    backgroundColor: '#FFF',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  skeletonImage: {
    width: '100%',
    height: '70%',
    backgroundColor: '#E0E0E0',
  },
  skeletonInfo: {
    padding: 20,
  },
  skeletonName: {
    width: '60%',
    height: 24,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    marginBottom: 12,
  },
  skeletonBio: {
    width: '80%',
    height: 16,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    marginBottom: 8,
  },
  skeletonDetails: {
    width: '40%',
    height: 16,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
  },
  bottomLoader: {
    position: 'absolute',
    bottom: 100,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  bottomLoaderText: {
    color: '#FFF',
    fontSize: 14,
    marginLeft: 8,
  },
});
