import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Animated,
} from 'react-native';
import { Button } from '../common/Button';

export type GiftCategory = 'flowers' | 'romantic' | 'fun' | 'luxury' | 'seasonal';

export interface Gift {
  id: string;
  name: string;
  emoji: string;
  price: number;
  category: GiftCategory;
  description: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  animationType?: 'float' | 'bounce' | 'pulse' | 'spin';
}

export interface RecipientUser {
  id: string;
  name: string;
  photoUrl?: string;
}

interface GiftsProps {
  visible: boolean;
  recipient: RecipientUser;
  availableCoins: number;
  onClose: () => void;
  onSendGift: (giftId: string, message?: string) => Promise<void>;
  onBuyCoins: () => void;
}

export const Gifts: React.FC<GiftsProps> = ({
  visible,
  recipient,
  availableCoins,
  onClose,
  onSendGift,
  onBuyCoins,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<GiftCategory>('romantic');
  const [selectedGift, setSelectedGift] = useState<Gift | null>(null);
  const [giftMessage, setGiftMessage] = useState('');
  const [showMessageInput, setShowMessageInput] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const categories: { key: GiftCategory; label: string; icon: string }[] = [
    { key: 'romantic', label: 'Romantic', icon: '💝' },
    { key: 'flowers', label: 'Flowers', icon: '🌹' },
    { key: 'fun', label: 'Fun', icon: '🎉' },
    { key: 'luxury', label: 'Luxury', icon: '💎' },
    { key: 'seasonal', label: 'Seasonal', icon: '🎄' },
  ];

  const gifts: Gift[] = [
    // Romantic
    {
      id: 'heart',
      name: 'Heart',
      emoji: '❤️',
      price: 50,
      category: 'romantic',
      description: 'Show your affection',
      rarity: 'common',
      animationType: 'pulse',
    },
    {
      id: 'kiss',
      name: 'Kiss',
      emoji: '💋',
      price: 75,
      category: 'romantic',
      description: 'Send a virtual kiss',
      rarity: 'common',
      animationType: 'float',
    },
    {
      id: 'love_letter',
      name: 'Love Letter',
      emoji: '💌',
      price: 100,
      category: 'romantic',
      description: 'A heartfelt message',
      rarity: 'rare',
      animationType: 'bounce',
    },
    {
      id: 'cupid',
      name: 'Cupid',
      emoji: '💘',
      price: 200,
      category: 'romantic',
      description: "Cupid's arrow of love",
      rarity: 'epic',
      animationType: 'spin',
    },

    // Flowers
    {
      id: 'rose',
      name: 'Red Rose',
      emoji: '🌹',
      price: 80,
      category: 'flowers',
      description: 'Classic romantic gesture',
      rarity: 'common',
      animationType: 'float',
    },
    {
      id: 'bouquet',
      name: 'Bouquet',
      emoji: '💐',
      price: 150,
      category: 'flowers',
      description: 'Beautiful flower bouquet',
      rarity: 'rare',
      animationType: 'bounce',
    },
    {
      id: 'tulip',
      name: 'Tulip',
      emoji: '🌷',
      price: 90,
      category: 'flowers',
      description: 'Elegant tulip',
      rarity: 'common',
      animationType: 'float',
    },
    {
      id: 'cherry_blossom',
      name: 'Cherry Blossom',
      emoji: '🌸',
      price: 120,
      category: 'flowers',
      description: 'Delicate and beautiful',
      rarity: 'rare',
      animationType: 'float',
    },

    // Fun
    {
      id: 'party',
      name: 'Party Popper',
      emoji: '🎉',
      price: 60,
      category: 'fun',
      description: 'Celebrate together',
      rarity: 'common',
      animationType: 'bounce',
    },
    {
      id: 'cake',
      name: 'Birthday Cake',
      emoji: '🎂',
      price: 100,
      category: 'fun',
      description: 'Make their day special',
      rarity: 'rare',
      animationType: 'bounce',
    },
    {
      id: 'balloon',
      name: 'Balloon',
      emoji: '🎈',
      price: 40,
      category: 'fun',
      description: 'Light and cheerful',
      rarity: 'common',
      animationType: 'float',
    },
    {
      id: 'fireworks',
      name: 'Fireworks',
      emoji: '🎆',
      price: 180,
      category: 'fun',
      description: 'Spectacular display',
      rarity: 'epic',
      animationType: 'bounce',
    },

    // Luxury
    {
      id: 'diamond',
      name: 'Diamond',
      emoji: '💎',
      price: 500,
      category: 'luxury',
      description: 'Ultimate luxury gift',
      rarity: 'legendary',
      animationType: 'spin',
    },
    {
      id: 'crown',
      name: 'Crown',
      emoji: '👑',
      price: 300,
      category: 'luxury',
      description: 'Treat them like royalty',
      rarity: 'epic',
      animationType: 'spin',
    },
    {
      id: 'champagne',
      name: 'Champagne',
      emoji: '🍾',
      price: 250,
      category: 'luxury',
      description: 'Celebrate in style',
      rarity: 'epic',
      animationType: 'bounce',
    },
    {
      id: 'yacht',
      name: 'Yacht',
      emoji: '🛥️',
      price: 1000,
      category: 'luxury',
      description: 'The ultimate luxury',
      rarity: 'legendary',
      animationType: 'float',
    },

    // Seasonal
    {
      id: 'christmas_tree',
      name: 'Christmas Tree',
      emoji: '🎄',
      price: 150,
      category: 'seasonal',
      description: 'Holiday spirit',
      rarity: 'rare',
      animationType: 'bounce',
    },
    {
      id: 'jack_o_lantern',
      name: "Jack O'Lantern",
      emoji: '🎃',
      price: 120,
      category: 'seasonal',
      description: 'Spooky fun',
      rarity: 'rare',
      animationType: 'bounce',
    },
    {
      id: 'snowflake',
      name: 'Snowflake',
      emoji: '❄️',
      price: 80,
      category: 'seasonal',
      description: 'Winter magic',
      rarity: 'common',
      animationType: 'float',
    },
    {
      id: 'firework_heart',
      name: 'Heart Firework',
      emoji: '💖',
      price: 200,
      category: 'seasonal',
      description: "Valentine's special",
      rarity: 'epic',
      animationType: 'pulse',
    },
  ];

  const getRarityColor = (rarity: Gift['rarity']): string => {
    switch (rarity) {
      case 'common':
        return '#9E9E9E';
      case 'rare':
        return '#2196F3';
      case 'epic':
        return '#9C27B0';
      case 'legendary':
        return '#FFD700';
      default:
        return '#666';
    }
  };

  const getRarityLabel = (rarity: Gift['rarity']): string => {
    switch (rarity) {
      case 'common':
        return 'Common';
      case 'rare':
        return 'Rare';
      case 'epic':
        return 'Epic';
      case 'legendary':
        return 'Legendary';
      default:
        return '';
    }
  };

  const handleSelectGift = (gift: Gift) => {
    if (availableCoins < gift.price) {
      Alert.alert(
        'Insufficient Coins',
        `You need ${gift.price} coins but only have ${availableCoins}. Would you like to buy more coins?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Buy Coins', onPress: onBuyCoins },
        ]
      );
      return;
    }

    setSelectedGift(gift);
    setShowMessageInput(true);
  };

  const handleSendGift = async () => {
    if (!selectedGift) return;

    setIsSending(true);
    try {
      await onSendGift(selectedGift.id, giftMessage.trim() || undefined);

      Alert.alert('Gift Sent! 🎁', `You sent ${selectedGift.name} to ${recipient.name}!`, [
        { text: 'OK', onPress: handleClose },
      ]);
    } catch (error: any) {
      Alert.alert(
        'Failed to Send Gift',
        error.message || 'Something went wrong. Please try again.'
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleClose = () => {
    setSelectedGift(null);
    setGiftMessage('');
    setShowMessageInput(false);
    onClose();
  };

  const getGiftsForCategory = (): Gift[] => {
    return gifts.filter((g) => g.category === selectedCategory);
  };

  const renderCategoryTab = (category: { key: GiftCategory; label: string; icon: string }) => {
    const isActive = selectedCategory === category.key;

    return (
      <TouchableOpacity
        key={category.key}
        style={[styles.categoryTab, isActive && styles.categoryTabActive]}
        onPress={() => {
          setSelectedCategory(category.key);
          setSelectedGift(null);
          setShowMessageInput(false);
        }}
      >
        <Text style={styles.categoryIcon}>{category.icon}</Text>
        <Text style={[styles.categoryLabel, isActive && styles.categoryLabelActive]}>
          {category.label}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderGiftCard = (gift: Gift) => {
    const rarityColor = getRarityColor(gift.rarity);
    const canAfford = availableCoins >= gift.price;

    return (
      <TouchableOpacity
        key={gift.id}
        style={[styles.giftCard, !canAfford && styles.giftCardDisabled]}
        onPress={() => handleSelectGift(gift)}
        disabled={!canAfford}
      >
        <View style={[styles.giftRarityBadge, { backgroundColor: rarityColor }]}>
          <Text style={styles.giftRarityText}>{getRarityLabel(gift.rarity)}</Text>
        </View>

        <View style={styles.giftEmojiContainer}>
          <Text style={styles.giftEmoji}>{gift.emoji}</Text>
        </View>

        <Text style={styles.giftName}>{gift.name}</Text>
        <Text style={styles.giftDescription}>{gift.description}</Text>

        <View style={styles.giftPriceContainer}>
          <Text style={styles.giftPriceIcon}>💰</Text>
          <Text style={[styles.giftPrice, !canAfford && styles.giftPriceDisabled]}>
            {gift.price}
          </Text>
        </View>

        {!canAfford && (
          <View style={styles.giftLocked}>
            <Text style={styles.giftLockedIcon}>🔒</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderMessageInput = () => {
    if (!showMessageInput || !selectedGift) return null;

    return (
      <Modal
        visible={showMessageInput}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowMessageInput(false)}
      >
        <View style={styles.messageModalOverlay}>
          <View style={styles.messageModalContainer}>
            <View style={styles.messageModalHeader}>
              <TouchableOpacity
                onPress={() => {
                  setShowMessageInput(false);
                  setGiftMessage('');
                }}
                style={styles.messageModalCloseButton}
              >
                <Text style={styles.messageModalCloseButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.messageModalContent}>
              <View style={styles.selectedGiftPreview}>
                <Text style={styles.selectedGiftEmoji}>{selectedGift.emoji}</Text>
                <Text style={styles.selectedGiftName}>{selectedGift.name}</Text>
              </View>

              <Text style={styles.messageModalTitle}>Send to {recipient.name}</Text>

              <View style={styles.messageInputContainer}>
                <Text style={styles.messageInputLabel}>Add a personal message (optional)</Text>
                <TextInput
                  style={styles.messageInput}
                  placeholder="Write something nice..."
                  placeholderTextColor="#999"
                  value={giftMessage}
                  onChangeText={setGiftMessage}
                  multiline
                  maxLength={200}
                />
                <Text style={styles.messageCharCount}>{giftMessage.length}/200</Text>
              </View>

              <View style={styles.messageCostSummary}>
                <View style={styles.messageCostRow}>
                  <Text style={styles.messageCostLabel}>Gift Cost:</Text>
                  <View style={styles.messageCostValue}>
                    <Text style={styles.messageCostIcon}>💰</Text>
                    <Text style={styles.messageCostText}>{selectedGift.price}</Text>
                  </View>
                </View>
                <View style={styles.messageCostRow}>
                  <Text style={styles.messageCostLabel}>Your Balance:</Text>
                  <View style={styles.messageCostValue}>
                    <Text style={styles.messageCostIcon}>💰</Text>
                    <Text style={styles.messageCostText}>{availableCoins}</Text>
                  </View>
                </View>
                <View style={styles.messageCostDivider} />
                <View style={styles.messageCostRow}>
                  <Text style={styles.messageCostLabelTotal}>After Purchase:</Text>
                  <View style={styles.messageCostValue}>
                    <Text style={styles.messageCostIcon}>💰</Text>
                    <Text style={styles.messageCostTextTotal}>
                      {availableCoins - selectedGift.price}
                    </Text>
                  </View>
                </View>
              </View>

              <Button
                title={`Send Gift (${selectedGift.price} coins)`}
                onPress={handleSendGift}
                loading={isSending}
                disabled={isSending}
                fullWidth
                style={styles.sendGiftButton}
              />
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={handleClose}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Send a Gift</Text>
            <Text style={styles.headerSubtitle}>to {recipient.name}</Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        {/* Coins Balance */}
        <View style={styles.coinsBar}>
          <View style={styles.coinsBalance}>
            <Text style={styles.coinsIcon}>💰</Text>
            <Text style={styles.coinsText}>{availableCoins} coins</Text>
          </View>
          <TouchableOpacity onPress={onBuyCoins} style={styles.buyCoinsButton}>
            <Text style={styles.buyCoinsButtonText}>+ Buy More</Text>
          </TouchableOpacity>
        </View>

        {/* Category Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesScroll}
          contentContainerStyle={styles.categoriesContent}
        >
          {categories.map(renderCategoryTab)}
        </ScrollView>

        {/* Gifts Grid */}
        <ScrollView
          style={styles.giftsScroll}
          contentContainerStyle={styles.giftsContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.giftsGrid}>{getGiftsForCategory().map(renderGiftCard)}</View>

          {/* Info Card */}
          <View style={styles.infoCard}>
            <Text style={styles.infoCardIcon}>💡</Text>
            <Text style={styles.infoCardText}>
              Stand out by sending a gift! Recipients are more likely to respond to messages that
              include a thoughtful gift.
            </Text>
          </View>
        </ScrollView>

        {/* Message Input Modal */}
        {renderMessageInput()}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    color: '#666',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#999',
    marginTop: 2,
  },
  headerSpacer: {
    width: 40,
  },
  coinsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  coinsBalance: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  coinsIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  coinsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E65100',
  },
  buyCoinsButton: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  buyCoinsButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  categoriesScroll: {
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    maxHeight: 60,
  },
  categoriesContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  categoryTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    marginRight: 8,
  },
  categoryTabActive: {
    backgroundColor: '#E91E63',
  },
  categoryIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  categoryLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  categoryLabelActive: {
    color: '#FFF',
  },
  giftsScroll: {
    flex: 1,
  },
  giftsContent: {
    padding: 16,
  },
  giftsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  giftCard: {
    width: '48%',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    position: 'relative',
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  giftCardDisabled: {
    opacity: 0.5,
  },
  giftRarityBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  giftRarityText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#FFF',
    textTransform: 'uppercase',
  },
  giftEmojiContainer: {
    marginBottom: 8,
  },
  giftEmoji: {
    fontSize: 48,
  },
  giftName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 4,
  },
  giftDescription: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginBottom: 12,
  },
  giftPriceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  giftPriceIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  giftPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#E65100',
  },
  giftPriceDisabled: {
    color: '#999',
  },
  giftLocked: {
    position: 'absolute',
    bottom: 8,
    right: 8,
  },
  giftLockedIcon: {
    fontSize: 16,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  infoCardIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  infoCardText: {
    flex: 1,
    fontSize: 13,
    color: '#1565C0',
    lineHeight: 18,
  },
  // Message Input Modal
  messageModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  messageModalContainer: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  messageModalHeader: {
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  messageModalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageModalCloseButtonText: {
    fontSize: 18,
    color: '#666',
  },
  messageModalContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  selectedGiftPreview: {
    alignItems: 'center',
    marginBottom: 20,
  },
  selectedGiftEmoji: {
    fontSize: 80,
    marginBottom: 12,
  },
  selectedGiftName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  messageModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  messageInputContainer: {
    marginBottom: 24,
  },
  messageInputLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  messageInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: '#333',
    minHeight: 100,
    maxHeight: 150,
    textAlignVertical: 'top',
    marginBottom: 8,
  },
  messageCharCount: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
  },
  messageCostSummary: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  messageCostRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  messageCostLabel: {
    fontSize: 14,
    color: '#666',
  },
  messageCostLabelTotal: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  messageCostValue: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  messageCostIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  messageCostText: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  messageCostTextTotal: {
    fontSize: 16,
    color: '#E65100',
    fontWeight: 'bold',
  },
  messageCostDivider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 8,
  },
  sendGiftButton: {
    marginTop: 8,
  },
});
