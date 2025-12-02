/**
 * GIF Picker Component
 * Allows users to search and select GIFs from Giphy/Tenor
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  FlatList,
  Image,
  ActivityIndicator,
  SafeAreaView,
  Dimensions,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GIF_SIZE = (SCREEN_WIDTH - 48) / 2;

// Note: In production, use actual Giphy/Tenor API
// For now, we'll use mock data
const MOCK_GIFS = [
  { id: '1', url: 'https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif', title: 'Heart' },
  { id: '2', url: 'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif', title: 'Love' },
  { id: '3', url: 'https://media.giphy.com/media/26u4cqiYI30juCOGY/giphy.gif', title: 'Kiss' },
  { id: '4', url: 'https://media.giphy.com/media/l2SpZtackEqFmMT3G/giphy.gif', title: 'Hug' },
  { id: '5', url: 'https://media.giphy.com/media/3og0IExSrnfW2kUaaI/giphy.gif', title: 'Smile' },
  { id: '6', url: 'https://media.giphy.com/media/3o7TKnCdBx37R1h3lS/giphy.gif', title: 'Laugh' },
  { id: '7', url: 'https://media.giphy.com/media/l0MYEqEzwMWFCg8rm/giphy.gif', title: 'Wink' },
  { id: '8', url: 'https://media.giphy.com/media/l0HlPwMAzh13pcZ20/giphy.gif', title: 'Dance' },
];

const TRENDING_GIFS = MOCK_GIFS;

interface GifPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelectGif: (gifUrl: string) => void;
}

export const GifPicker: React.FC<GifPickerProps> = ({ visible, onClose, onSelectGif }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [gifs, setGifs] = useState(TRENDING_GIFS);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<'trending' | 'search'>('trending');

  const categories = [
    { id: 'love', label: 'Love', emoji: '❤️' },
    { id: 'happy', label: 'Happy', emoji: '😊' },
    { id: 'funny', label: 'Funny', emoji: '😂' },
    { id: 'excited', label: 'Excited', emoji: '🎉' },
    { id: 'cool', label: 'Cool', emoji: '😎' },
  ];

  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);

    if (!query.trim()) {
      setSelectedCategory('trending');
      setGifs(TRENDING_GIFS);
      return;
    }

    setSelectedCategory('search');
    setIsLoading(true);

    try {
      // In production, implement actual Giphy/Tenor API search
      // const response = await fetch(`https://api.giphy.com/v1/gifs/search?api_key=YOUR_KEY&q=${query}&limit=20`);
      // const data = await response.json();
      // setGifs(data.data.map(gif => ({ id: gif.id, url: gif.images.fixed_height.url, title: gif.title })));

      // Mock search - filter existing GIFs
      setTimeout(() => {
        const filtered = MOCK_GIFS.filter(gif =>
          gif.title.toLowerCase().includes(query.toLowerCase())
        );
        setGifs(filtered);
        setIsLoading(false);
      }, 500);
    } catch (error) {
      console.error('Error searching GIFs:', error);
      setIsLoading(false);
    }
  }, []);

  const handleCategoryPress = useCallback(async (categoryId: string) => {
    setSearchQuery(categoryId);
    setSelectedCategory('search');
    setIsLoading(true);

    try {
      // In production, fetch GIFs for this category
      setTimeout(() => {
        setGifs(MOCK_GIFS);
        setIsLoading(false);
      }, 500);
    } catch (error) {
      console.error('Error loading category:', error);
      setIsLoading(false);
    }
  }, []);

  const handleSelectGif = useCallback((gifUrl: string) => {
    onSelectGif(gifUrl);
    onClose();
    setSearchQuery('');
    setSelectedCategory('trending');
    setGifs(TRENDING_GIFS);
  }, [onSelectGif, onClose]);

  const renderGifItem = ({ item }: { item: typeof MOCK_GIFS[0] }) => (
    <TouchableOpacity
      style={styles.gifItem}
      onPress={() => handleSelectGif(item.url)}
      activeOpacity={0.8}
    >
      <Image
        source={{ uri: item.url }}
        style={styles.gifImage}
        resizeMode="cover"
      />
    </TouchableOpacity>
  );

  const renderCategoryItem = ({ item }: { item: typeof categories[0] }) => (
    <TouchableOpacity
      style={styles.categoryItem}
      onPress={() => handleCategoryPress(item.id)}
    >
      <Text style={styles.categoryEmoji}>{item.emoji}</Text>
      <Text style={styles.categoryLabel}>{item.label}</Text>
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Choose a GIF</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search GIFs..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={handleSearch}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {/* Categories */}
        <View style={styles.categoriesSection}>
          <FlatList
            horizontal
            data={categories}
            renderItem={renderCategoryItem}
            keyExtractor={(item) => item.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesList}
          />
        </View>

        {/* Section Title */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {selectedCategory === 'trending' ? 'Trending GIFs' : `Results for "${searchQuery}"`}
          </Text>
        </View>

        {/* GIF Grid */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#E91E63" />
            <Text style={styles.loadingText}>Loading GIFs...</Text>
          </View>
        ) : gifs.length > 0 ? (
          <FlatList
            data={gifs}
            renderItem={renderGifItem}
            keyExtractor={(item) => item.id}
            numColumns={2}
            contentContainerStyle={styles.gifGrid}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No GIFs found</Text>
            <Text style={styles.emptySubtext}>Try a different search term</Text>
          </View>
        )}

        {/* Powered by */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Powered by Giphy</Text>
        </View>
      </SafeAreaView>
    </Modal>
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    color: '#666',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  categoriesSection: {
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  categoriesList: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  categoryItem: {
    alignItems: 'center',
    marginHorizontal: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
  },
  categoryEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  categoryLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  sectionHeader: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#f9f9f9',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
  },
  gifGrid: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  gifItem: {
    width: GIF_SIZE,
    height: GIF_SIZE,
    margin: 6,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
  },
  gifImage: {
    width: '100%',
    height: '100%',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  footer: {
    paddingVertical: 12,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
  },
});
