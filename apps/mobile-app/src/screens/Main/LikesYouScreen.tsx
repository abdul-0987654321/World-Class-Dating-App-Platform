import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { useAuth } from '../../hooks/useAuth';
import { discoveryService } from '../../services';
import { DiscoveryProfile } from '../../types/discovery.types';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

interface LikeProfile {
  id: string;
  name: string;
  age: number;
  photos: string[];
  distance: number;
  isBlurred: boolean;
}

const LikesYouScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const isPremium = user?.isPremium ?? false;

  const [likes, setLikes] = useState<LikeProfile[]>([]);
  const [totalLikes, setTotalLikes] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const mapDiscoveryProfileToLikeProfile = (profile: DiscoveryProfile): LikeProfile => ({
    id: profile.id,
    name: profile.name,
    age: profile.age,
    photos: profile.photos.map(p => p.url),
    distance: profile.distance ?? 0,
    isBlurred: !isPremium,
  });

  const fetchLikes = useCallback(async (pageNum: number = 1, refresh: boolean = false) => {
    try {
      if (refresh) {
        setIsRefreshing(true);
      } else if (pageNum === 1) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }
      setError(null);

      const response = await discoveryService.getWhoLikedYou(pageNum, 20);

      if (response.success && response.data) {
        const mappedProfiles = response.data.profiles.map(mapDiscoveryProfileToLikeProfile);

        if (pageNum === 1 || refresh) {
          setLikes(mappedProfiles);
        } else {
          setLikes(prev => [...prev, ...mappedProfiles]);
        }

        setTotalLikes(response.data.total);
        setHasMore(mappedProfiles.length === 20);
        setPage(pageNum);
      } else {
        throw new Error(response.error?.message || 'Failed to load likes');
      }
    } catch (err: any) {
      console.error('Error fetching likes:', err);
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      setIsLoadingMore(false);
    }
  }, [isPremium]);

  useEffect(() => {
    fetchLikes(1);
  }, [fetchLikes]);

  const handleRefresh = useCallback(() => {
    fetchLikes(1, true);
  }, [fetchLikes]);

  const handleLoadMore = useCallback(() => {
    if (!isLoadingMore && hasMore && !isLoading) {
      fetchLikes(page + 1);
    }
  }, [fetchLikes, page, isLoadingMore, hasMore, isLoading]);

  const handleUpgrade = () => {
    navigation.navigate('Subscription' as never);
  };

  const handleLikePress = (profile: LikeProfile) => {
    if (isPremium) {
      navigation.navigate('ProfileDetail' as never, { userId: profile.id } as never);
    } else {
      handleUpgrade();
    }
  };

  const handleRetry = () => {
    fetchLikes(1);
  };

  const renderLikeCard = ({ item }: { item: LikeProfile }) => {
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => handleLikePress(item)}
        activeOpacity={0.9}
        accessibilityRole="button"
        accessibilityLabel={`${item.name}, ${item.age} years old`}
      >
        <Image
          source={{ uri: item.photos[0] }}
          style={styles.cardImage}
          blurRadius={item.isBlurred ? 20 : 0}
        />
        {item.isBlurred && (
          <View style={styles.blurOverlay}>
            <Icon name="eye-off" size={32} color="#FFFFFF" />
          </View>
        )}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.8)']}
          style={styles.cardGradient}
        >
          <Text style={styles.cardName}>
            {isPremium ? item.name : '***'}, {item.age}
          </Text>
          <View style={styles.cardInfo}>
            <Icon name="location" size={12} color="#FFFFFF" />
            <Text style={styles.cardDistance}>{item.distance} km away</Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <View style={styles.statsContainer}>
        <Icon name="heart" size={40} color="#FF6B6B" />
        <Text style={styles.statsNumber}>{totalLikes}</Text>
        <Text style={styles.statsLabel}>
          {totalLikes === 1 ? 'Person likes you' : 'People like you'}
        </Text>
      </View>

      {!isPremium && (
        <TouchableOpacity
          style={styles.premiumBanner}
          onPress={handleUpgrade}
          accessibilityRole="button"
          accessibilityLabel="Upgrade to premium"
        >
          <LinearGradient
            colors={['#FF6B6B', '#FF8E53']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.premiumGradient}
          >
            <View style={styles.premiumContent}>
              <Icon name="star" size={24} color="#FFFFFF" />
              <View style={styles.premiumText}>
                <Text style={styles.premiumTitle}>See Who Likes You</Text>
                <Text style={styles.premiumSubtitle}>
                  Upgrade to Premium to see all your likes
                </Text>
              </View>
              <Icon name="chevron-forward" size={24} color="#FFFFFF" />
            </View>
          </LinearGradient>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Icon name="heart-outline" size={80} color="#E5E5EA" />
      <Text style={styles.emptyTitle}>No Likes Yet</Text>
      <Text style={styles.emptySubtitle}>
        Keep swiping to get more matches!
      </Text>
    </View>
  );

  const renderFooter = () => {
    if (!isLoadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#FF6B6B" />
      </View>
    );
  };

  const renderError = () => (
    <View style={styles.errorContainer}>
      <Icon name="alert-circle-outline" size={64} color="#FF6B6B" />
      <Text style={styles.errorTitle}>Oops!</Text>
      <Text style={styles.errorMessage}>{error}</Text>
      <TouchableOpacity
        style={styles.retryButton}
        onPress={handleRetry}
        accessibilityRole="button"
        accessibilityLabel="Retry loading likes"
      >
        <Text style={styles.retryButtonText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );

  const renderLoading = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#FF6B6B" />
      <Text style={styles.loadingText}>Loading your likes...</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Icon name="chevron-back" size={28} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Likes You</Text>
        <View style={styles.placeholder} />
      </View>

      {isLoading ? (
        renderLoading()
      ) : error ? (
        renderError()
      ) : (
        <FlatList
          data={likes}
          renderItem={renderLikeCard}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={renderFooter}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={['#FF6B6B']}
              tintColor="#FF6B6B"
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
  },
  placeholder: {
    width: 44,
  },
  headerContainer: {
    paddingBottom: 16,
  },
  statsContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
  },
  statsNumber: {
    fontSize: 48,
    fontWeight: '700',
    color: '#000',
    marginTop: 8,
  },
  statsLabel: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 4,
  },
  premiumBanner: {
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  premiumGradient: {
    padding: 20,
  },
  premiumContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  premiumText: {
    flex: 1,
    marginLeft: 16,
  },
  premiumTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  premiumSubtitle: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
    marginTop: 4,
  },
  listContent: {
    paddingBottom: 20,
    flexGrow: 1,
  },
  row: {
    paddingHorizontal: 16,
    marginBottom: 16,
    justifyContent: 'space-between',
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_WIDTH * 1.4,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#E5E5EA',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  blurOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
  },
  cardName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  cardDistance: {
    fontSize: 12,
    color: '#FFFFFF',
    marginLeft: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 8,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    marginTop: 16,
  },
  errorMessage: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 8,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 24,
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});

export default LikesYouScreen;
