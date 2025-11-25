import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  Image,
  ScrollView,
  Dimensions,
  Modal,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Mock matches data
const MOCK_NEW_MATCHES = [
  {
    id: 'nm1',
    name: 'Emma',
    age: 26,
    photo: 'https://randomuser.me/api/portraits/women/1.jpg',
    matchedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    hasNewMessage: false,
  },
  {
    id: 'nm2',
    name: 'Sophia',
    photo: 'https://randomuser.me/api/portraits/women/2.jpg',
    age: 24,
    matchedAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
    hasNewMessage: true,
  },
  {
    id: 'nm3',
    name: 'Olivia',
    photo: 'https://randomuser.me/api/portraits/women/3.jpg',
    age: 28,
    matchedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    hasNewMessage: false,
  },
];

const MOCK_MATCHES = [
  {
    id: 'm1',
    name: 'Ava',
    age: 25,
    photo: 'https://randomuser.me/api/portraits/women/4.jpg',
    matchedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    compatibility: 92,
    bio: 'Fitness enthusiast and beach lover.',
    interests: ['Fitness', 'Beach', 'Travel'],
    verified: true,
    lastActive: 'Online now',
  },
  {
    id: 'm2',
    name: 'Isabella',
    age: 27,
    photo: 'https://randomuser.me/api/portraits/women/5.jpg',
    matchedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    compatibility: 88,
    bio: 'Tech geek with a passion for photography.',
    interests: ['Photography', 'Technology', 'Gaming'],
    verified: true,
    lastActive: '2h ago',
  },
  {
    id: 'm3',
    name: 'Mia',
    age: 23,
    photo: 'https://randomuser.me/api/portraits/women/6.jpg',
    matchedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    compatibility: 85,
    bio: 'Art student who loves coffee and good conversations.',
    interests: ['Art', 'Coffee', 'Museums'],
    verified: false,
    lastActive: '1d ago',
  },
  {
    id: 'm4',
    name: 'Charlotte',
    age: 29,
    photo: 'https://randomuser.me/api/portraits/women/7.jpg',
    matchedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    compatibility: 82,
    bio: 'Dog mom and wine enthusiast.',
    interests: ['Dogs', 'Wine', 'Hiking'],
    verified: true,
    lastActive: '3h ago',
  },
  {
    id: 'm5',
    name: 'Amelia',
    age: 26,
    photo: 'https://randomuser.me/api/portraits/women/8.jpg',
    matchedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    compatibility: 79,
    bio: 'Bookworm and aspiring chef.',
    interests: ['Books', 'Cooking', 'Travel'],
    verified: true,
    lastActive: '5h ago',
  },
];

type NewMatch = typeof MOCK_NEW_MATCHES[0];
type Match = typeof MOCK_MATCHES[0];

const MatchesScreen = () => {
  const [newMatches, setNewMatches] = useState(MOCK_NEW_MATCHES);
  const [matches, setMatches] = useState(MOCK_MATCHES);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [filterBy, setFilterBy] = useState<'recent' | 'compatibility'>('recent');

  const handleMatchPress = useCallback((match: Match) => {
    setSelectedMatch(match);
  }, []);

  const handleStartChat = useCallback(() => {
    if (selectedMatch) {
      setSelectedMatch(null);
      // Navigate to messages with this match
    }
  }, [selectedMatch]);

  const handleUnmatch = useCallback(() => {
    if (selectedMatch) {
      setMatches((prev) => prev.filter((m) => m.id !== selectedMatch.id));
      setSelectedMatch(null);
    }
  }, [selectedMatch]);

  const sortedMatches = [...matches].sort((a, b) => {
    if (filterBy === 'compatibility') {
      return b.compatibility - a.compatibility;
    }
    return b.matchedAt.getTime() - a.matchedAt.getTime();
  });

  const renderNewMatch = ({ item }: { item: NewMatch }) => (
    <TouchableOpacity
      style={styles.newMatchItem}
      onPress={() => {
        const fullMatch = matches.find((m) => m.name === item.name);
        if (fullMatch) handleMatchPress(fullMatch);
      }}
    >
      <View style={styles.newMatchImageContainer}>
        <Image source={{ uri: item.photo }} style={styles.newMatchImage} />
        {item.hasNewMessage && <View style={styles.newMatchBadge} />}
      </View>
      <Text style={styles.newMatchName} numberOfLines={1}>
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  const renderMatch = ({ item }: { item: Match }) => (
    <TouchableOpacity
      style={styles.matchCard}
      onPress={() => handleMatchPress(item)}
    >
      <Image source={{ uri: item.photo }} style={styles.matchImage} />
      <View style={styles.matchInfo}>
        <View style={styles.matchHeader}>
          <View style={styles.nameRow}>
            <Text style={styles.matchName}>{item.name}, {item.age}</Text>
            {item.verified && (
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedIcon}>✓</Text>
              </View>
            )}
          </View>
          <View style={styles.compatibilityBadge}>
            <Text style={styles.compatibilityText}>{item.compatibility}%</Text>
          </View>
        </View>
        <Text style={styles.matchBio} numberOfLines={1}>
          {item.bio}
        </Text>
        <View style={styles.interestsRow}>
          {item.interests.slice(0, 3).map((interest, index) => (
            <View key={index} style={styles.interestTag}>
              <Text style={styles.interestText}>{interest}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.lastActive}>{item.lastActive}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Matches</Text>
        <View style={styles.matchCount}>
          <Text style={styles.matchCountText}>{matches.length} matches</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* New Matches Section */}
        {newMatches.length > 0 && (
          <View style={styles.newMatchesSection}>
            <Text style={styles.sectionTitle}>New Matches</Text>
            <FlatList
              horizontal
              data={newMatches}
              renderItem={renderNewMatch}
              keyExtractor={(item) => item.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.newMatchesList}
            />
          </View>
        )}

        {/* Filter Tabs */}
        <View style={styles.filterTabs}>
          <TouchableOpacity
            style={[
              styles.filterTab,
              filterBy === 'recent' && styles.filterTabActive,
            ]}
            onPress={() => setFilterBy('recent')}
          >
            <Text
              style={[
                styles.filterTabText,
                filterBy === 'recent' && styles.filterTabTextActive,
              ]}
            >
              Most Recent
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterTab,
              filterBy === 'compatibility' && styles.filterTabActive,
            ]}
            onPress={() => setFilterBy('compatibility')}
          >
            <Text
              style={[
                styles.filterTabText,
                filterBy === 'compatibility' && styles.filterTabTextActive,
              ]}
            >
              Best Match
            </Text>
          </TouchableOpacity>
        </View>

        {/* Matches List */}
        <View style={styles.matchesSection}>
          {sortedMatches.length > 0 ? (
            sortedMatches.map((match) => (
              <View key={match.id}>{renderMatch({ item: match })}</View>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>No matches yet</Text>
              <Text style={styles.emptySubtitle}>
                Keep swiping to find your perfect match!
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Match Detail Modal */}
      <Modal
        visible={selectedMatch !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedMatch(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedMatch && (
              <>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setSelectedMatch(null)}
                >
                  <Text style={styles.closeButtonText}>×</Text>
                </TouchableOpacity>

                <Image
                  source={{ uri: selectedMatch.photo }}
                  style={styles.modalImage}
                />

                <View style={styles.modalInfo}>
                  <View style={styles.modalNameRow}>
                    <Text style={styles.modalName}>
                      {selectedMatch.name}, {selectedMatch.age}
                    </Text>
                    {selectedMatch.verified && (
                      <View style={styles.verifiedBadge}>
                        <Text style={styles.verifiedIcon}>✓</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.compatibilitySection}>
                    <Text style={styles.compatibilityLabel}>Compatibility</Text>
                    <View style={styles.compatibilityBar}>
                      <View
                        style={[
                          styles.compatibilityFill,
                          { width: `${selectedMatch.compatibility}%` },
                        ]}
                      />
                    </View>
                    <Text style={styles.compatibilityPercent}>
                      {selectedMatch.compatibility}%
                    </Text>
                  </View>

                  <Text style={styles.modalBio}>{selectedMatch.bio}</Text>

                  <View style={styles.modalInterests}>
                    {selectedMatch.interests.map((interest, index) => (
                      <View key={index} style={styles.modalInterestTag}>
                        <Text style={styles.modalInterestText}>{interest}</Text>
                      </View>
                    ))}
                  </View>

                  <View style={styles.modalActions}>
                    <TouchableOpacity
                      style={styles.chatButton}
                      onPress={handleStartChat}
                    >
                      <Text style={styles.chatButtonText}>Send Message</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.unmatchButton}
                      onPress={handleUnmatch}
                    >
                      <Text style={styles.unmatchButtonText}>Unmatch</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  matchCount: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  matchCountText: {
    fontSize: 14,
    color: '#666',
  },
  newMatchesSection: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginLeft: 20,
    marginBottom: 15,
  },
  newMatchesList: {
    paddingHorizontal: 15,
  },
  newMatchItem: {
    alignItems: 'center',
    marginHorizontal: 8,
    width: 70,
  },
  newMatchImageContainer: {
    position: 'relative',
  },
  newMatchImage: {
    width: 65,
    height: 65,
    borderRadius: 32.5,
    borderWidth: 3,
    borderColor: '#E91E63',
  },
  newMatchBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#fff',
  },
  newMatchName: {
    fontSize: 12,
    color: '#333',
    marginTop: 6,
    textAlign: 'center',
  },
  filterTabs: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  filterTab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 10,
    backgroundColor: '#f5f5f5',
  },
  filterTabActive: {
    backgroundColor: '#E91E63',
  },
  filterTabText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  filterTabTextActive: {
    color: '#fff',
  },
  matchesSection: {
    padding: 15,
  },
  matchCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  matchImage: {
    width: 100,
    height: 120,
  },
  matchInfo: {
    flex: 1,
    padding: 12,
  },
  matchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  matchName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  verifiedBadge: {
    backgroundColor: '#2196F3',
    borderRadius: 10,
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  verifiedIcon: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  compatibilityBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  compatibilityText: {
    color: '#4CAF50',
    fontSize: 12,
    fontWeight: '600',
  },
  matchBio: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
  },
  interestsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 6,
  },
  interestTag: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    marginRight: 6,
    marginBottom: 4,
  },
  interestText: {
    fontSize: 11,
    color: '#666',
  },
  lastActive: {
    fontSize: 11,
    color: '#999',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    maxHeight: '85%',
  },
  closeButton: {
    position: 'absolute',
    top: 15,
    right: 15,
    zIndex: 1,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 24,
    lineHeight: 26,
  },
  modalImage: {
    width: '100%',
    height: 250,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
  },
  modalInfo: {
    padding: 20,
  },
  modalNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  modalName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  compatibilitySection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  compatibilityLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 10,
  },
  compatibilityBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  compatibilityFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
  compatibilityPercent: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
    marginLeft: 10,
  },
  modalBio: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
    marginBottom: 15,
  },
  modalInterests: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  modalInterestTag: {
    backgroundColor: '#E91E63',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginRight: 8,
    marginBottom: 8,
  },
  modalInterestText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
  },
  modalActions: {
    gap: 12,
  },
  chatButton: {
    backgroundColor: '#E91E63',
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
  },
  chatButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  unmatchButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  unmatchButtonText: {
    color: '#999',
    fontSize: 14,
  },
});

export default MatchesScreen;
