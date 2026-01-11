import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';

interface ProfileView {
  id: string;
  name: string;
  age: number;
  photo: string;
  distance: number;
  viewedAt: string;
  isBlurred: boolean;
}

// Mock data
const mockViews: ProfileView[] = [
  {
    id: '1',
    name: 'Jessica',
    age: 27,
    photo: 'https://picsum.photos/400/400?random=10',
    distance: 4,
    viewedAt: '2 hours ago',
    isBlurred: true,
  },
  {
    id: '2',
    name: 'Michelle',
    age: 25,
    photo: 'https://picsum.photos/400/400?random=11',
    distance: 6,
    viewedAt: '5 hours ago',
    isBlurred: true,
  },
  {
    id: '3',
    name: 'Lauren',
    age: 29,
    photo: 'https://picsum.photos/400/400?random=12',
    distance: 3,
    viewedAt: '1 day ago',
    isBlurred: true,
  },
  {
    id: '4',
    name: 'Amanda',
    age: 26,
    photo: 'https://picsum.photos/400/400?random=13',
    distance: 8,
    viewedAt: '2 days ago',
    isBlurred: true,
  },
];

const WhoViewedMeScreen: React.FC = () => {
  const navigation = useNavigation();
  const [views] = useState<ProfileView[]>(mockViews);
  const [isPremium] = useState(false);

  const handleUpgrade = () => {
    navigation.navigate('Subscription' as never);
  };

  const handleViewPress = (profile: ProfileView) => {
    if (isPremium) {
      navigation.navigate('ProfileDetail' as never, { userId: profile.id } as never);
    } else {
      handleUpgrade();
    }
  };

  const renderViewItem = ({ item }: { item: ProfileView }) => {
    return (
      <TouchableOpacity
        style={styles.viewItem}
        onPress={() => handleViewPress(item)}
        activeOpacity={0.9}
        accessibilityRole="button"
        accessibilityLabel={`${item.name} viewed your profile ${item.viewedAt}`}
      >
        <View style={styles.avatarContainer}>
          <Image
            source={{ uri: item.photo }}
            style={styles.avatar}
            blurRadius={item.isBlurred && !isPremium ? 15 : 0}
          />
          {item.isBlurred && !isPremium && (
            <View style={styles.avatarOverlay}>
              <Icon name="eye-off" size={24} color="#FFFFFF" />
            </View>
          )}
        </View>

        <View style={styles.viewInfo}>
          <Text style={styles.viewName}>
            {isPremium ? `${item.name}, ${item.age}` : 'Someone special'}
          </Text>
          <View style={styles.viewDetails}>
            <Icon name="location" size={14} color="#8E8E93" />
            <Text style={styles.viewDistance}>{item.distance} km away</Text>
            <Text style={styles.viewDot}>•</Text>
            <Text style={styles.viewTime}>{item.viewedAt}</Text>
          </View>
        </View>

        <Icon name="chevron-forward" size={20} color="#C7C7CC" />
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <View style={styles.statsContainer}>
        <Icon name="eye" size={40} color="#FF6B6B" />
        <Text style={styles.statsNumber}>{views.length}</Text>
        <Text style={styles.statsLabel}>
          {views.length === 1 ? 'Profile view' : 'Profile views'} this week
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
                <Text style={styles.premiumTitle}>See Who Viewed You</Text>
                <Text style={styles.premiumSubtitle}>
                  Upgrade to Premium to see everyone who's checking you out
                </Text>
              </View>
              <Icon name="chevron-forward" size={24} color="#FFFFFF" />
            </View>
          </LinearGradient>
        </TouchableOpacity>
      )}

      <View style={styles.filterContainer}>
        <TouchableOpacity style={styles.filterButton} accessibilityRole="button">
          <Text style={styles.filterText}>All Views</Text>
          <Icon name="chevron-down" size={16} color="#FF6B6B" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Icon name="eye-outline" size={80} color="#E5E5EA" />
      <Text style={styles.emptyTitle}>No Profile Views Yet</Text>
      <Text style={styles.emptySubtitle}>
        Make your profile stand out to get more views!
      </Text>
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
        <Text style={styles.headerTitle}>Who Viewed Me</Text>
        <View style={styles.placeholder} />
      </View>

      <FlatList
        data={views}
        renderItem={renderViewItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        showsVerticalScrollIndicator={false}
      />
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
  filterContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF6B6B',
    marginRight: 4,
  },
  listContent: {
    paddingBottom: 20,
  },
  viewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5EA',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  avatarOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewInfo: {
    flex: 1,
  },
  viewName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  viewDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  viewDistance: {
    fontSize: 13,
    color: '#8E8E93',
    marginLeft: 4,
  },
  viewDot: {
    fontSize: 13,
    color: '#8E8E93',
    marginHorizontal: 6,
  },
  viewTime: {
    fontSize: 13,
    color: '#8E8E93',
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
    paddingHorizontal: 40,
  },
});

export default WhoViewedMeScreen;
