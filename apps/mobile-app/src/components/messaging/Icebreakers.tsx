import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Button } from '../common/Button';

export interface Icebreaker {
  id: string;
  text: string;
  category: IcebreakerCategory;
  isPremium?: boolean;
}

export type IcebreakerCategory =
  | 'witty'
  | 'thoughtful'
  | 'flirty'
  | 'funny'
  | 'deep'
  | 'casual'
  | 'contextual';

export interface UserProfile {
  id: string;
  name: string;
  bio?: string;
  interests?: string[];
  photos?: { url: string }[];
}

interface IcebreakersProps {
  visible: boolean;
  profile: UserProfile;
  subscriptionTier: 'free' | 'premium' | 'premium_plus';
  onClose: () => void;
  onSelectIcebreaker: (text: string) => void;
  onGenerateContextual?: (profile: UserProfile) => Promise<Icebreaker[]>;
}

export const Icebreakers: React.FC<IcebreakersProps> = ({
  visible,
  profile,
  subscriptionTier,
  onClose,
  onSelectIcebreaker,
  onGenerateContextual,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<IcebreakerCategory>('casual');
  const [customMessage, setCustomMessage] = useState('');
  const [contextualIcebreakers, setContextualIcebreakers] = useState<Icebreaker[]>([]);
  const [isLoadingContextual, setIsLoadingContextual] = useState(false);
  const [showCustomInput, setShowCustomInput] = useState(false);

  const isPremium = subscriptionTier === 'premium' || subscriptionTier === 'premium_plus';

  // Predefined icebreakers
  const predefinedIcebreakers: Icebreaker[] = [
    // Casual
    { id: 'c1', text: `Hey ${profile.name}! How's your day going?`, category: 'casual' },
    { id: 'c2', text: `Hi ${profile.name}! What are you up to today?`, category: 'casual' },
    {
      id: 'c3',
      text: `Hey! Love your profile. What's keeping you busy these days?`,
      category: 'casual',
    },

    // Witty
    { id: 'w1', text: `So... do you come here often? 😄`, category: 'witty', isPremium: true },
    {
      id: 'w2',
      text: `I'd say we matched by accident, but I don't believe in accidents 😉`,
      category: 'witty',
      isPremium: true,
    },
    {
      id: 'w3',
      text: `Plot twist: we're both the catch of the day 🎣`,
      category: 'witty',
      isPremium: true,
    },

    // Thoughtful
    {
      id: 't1',
      text: `Your profile caught my attention. What's something you're passionate about?`,
      category: 'thoughtful',
    },
    {
      id: 't2',
      text: `I'd love to know more about you. What's been making you smile lately?`,
      category: 'thoughtful',
    },
    {
      id: 't3',
      text: `What's something you've always wanted to try but haven't yet?`,
      category: 'thoughtful',
    },

    // Flirty
    {
      id: 'f1',
      text: `Well hello there 😊 What brings someone like you to a place like this?`,
      category: 'flirty',
      isPremium: true,
    },
    {
      id: 'f2',
      text: `Okay, I'll admit it - your smile is dangerously attractive 😉`,
      category: 'flirty',
      isPremium: true,
    },
    {
      id: 'f3',
      text: `I had to swipe right. Some opportunities you just don't pass up 😏`,
      category: 'flirty',
      isPremium: true,
    },

    // Funny
    {
      id: 'fu1',
      text: `Quick: pineapple on pizza - yay or nay? (This is important)`,
      category: 'funny',
    },
    {
      id: 'fu2',
      text: `I promise I'm not a serial killer. That's what a serial killer would say though... 🤔`,
      category: 'funny',
    },
    {
      id: 'fu3',
      text: `What's your go-to karaoke song? (Asking for a friend who can't sing)`,
      category: 'funny',
    },

    // Deep
    {
      id: 'd1',
      text: `What's a life experience that changed your perspective?`,
      category: 'deep',
      isPremium: true,
    },
    {
      id: 'd2',
      text: `If you could have dinner with anyone, living or dead, who would it be?`,
      category: 'deep',
      isPremium: true,
    },
    { id: 'd3', text: `What's your biggest dream right now?`, category: 'deep', isPremium: true },
  ];

  // Load contextual icebreakers when modal opens
  useEffect(() => {
    if (visible && onGenerateContextual && contextualIcebreakers.length === 0) {
      loadContextualIcebreakers();
    }
  }, [visible]);

  const loadContextualIcebreakers = async () => {
    if (!onGenerateContextual) return;

    setIsLoadingContextual(true);
    try {
      const contextual = await onGenerateContextual(profile);
      setContextualIcebreakers(contextual);
    } catch (error) {
      console.error('Failed to load contextual icebreakers:', error);
    } finally {
      setIsLoadingContextual(false);
    }
  };

  const categories: {
    key: IcebreakerCategory;
    label: string;
    icon: string;
    isPremium?: boolean;
  }[] = [
    { key: 'contextual', label: 'AI Suggested', icon: '✨', isPremium: true },
    { key: 'casual', label: 'Casual', icon: '👋' },
    { key: 'thoughtful', label: 'Thoughtful', icon: '💭' },
    { key: 'funny', label: 'Funny', icon: '😄' },
    { key: 'witty', label: 'Witty', icon: '🎯', isPremium: true },
    { key: 'flirty', label: 'Flirty', icon: '😘', isPremium: true },
    { key: 'deep', label: 'Deep', icon: '🌊', isPremium: true },
  ];

  const getIcebreakersForCategory = (): Icebreaker[] => {
    if (selectedCategory === 'contextual') {
      return contextualIcebreakers;
    }
    return predefinedIcebreakers.filter((ib) => ib.category === selectedCategory);
  };

  const handleCategorySelect = (category: IcebreakerCategory) => {
    const categoryInfo = categories.find((c) => c.key === category);

    if (categoryInfo?.isPremium && !isPremium) {
      // Show upgrade prompt
      return;
    }

    setSelectedCategory(category);
    setShowCustomInput(false);
  };

  const handleIcebreakerSelect = (icebreaker: Icebreaker) => {
    if (icebreaker.isPremium && !isPremium) {
      // Show upgrade prompt
      return;
    }

    onSelectIcebreaker(icebreaker.text);
    onClose();
  };

  const handleCustomMessageSend = () => {
    if (customMessage.trim()) {
      onSelectIcebreaker(customMessage.trim());
      setCustomMessage('');
      onClose();
    }
  };

  const renderCategoryTab = (category: {
    key: IcebreakerCategory;
    label: string;
    icon: string;
    isPremium?: boolean;
  }) => {
    const isActive = selectedCategory === category.key;
    const isLocked = category.isPremium && !isPremium;

    return (
      <TouchableOpacity
        key={category.key}
        style={[
          styles.categoryTab,
          isActive && styles.categoryTabActive,
          isLocked && styles.categoryTabLocked,
        ]}
        onPress={() => handleCategorySelect(category.key)}
      >
        <Text style={styles.categoryIcon}>{category.icon}</Text>
        <Text
          style={[
            styles.categoryLabel,
            isActive && styles.categoryLabelActive,
            isLocked && styles.categoryLabelLocked,
          ]}
        >
          {category.label}
        </Text>
        {isLocked && <Text style={styles.lockIcon}>🔒</Text>}
      </TouchableOpacity>
    );
  };

  const renderIcebreakerCard = (icebreaker: Icebreaker) => {
    const isLocked = icebreaker.isPremium && !isPremium;

    return (
      <TouchableOpacity
        key={icebreaker.id}
        style={[styles.icebreakerCard, isLocked && styles.icebreakerCardLocked]}
        onPress={() => handleIcebreakerSelect(icebreaker)}
        disabled={isLocked}
      >
        <View style={styles.icebreakerContent}>
          <Text style={[styles.icebreakerText, isLocked && styles.icebreakerTextLocked]}>
            {icebreaker.text}
          </Text>
          {isLocked && (
            <View style={styles.premiumOverlay}>
              <Text style={styles.premiumOverlayIcon}>🔒</Text>
              <Text style={styles.premiumOverlayText}>Premium</Text>
            </View>
          )}
        </View>
        {!isLocked && (
          <View style={styles.sendButton}>
            <Text style={styles.sendButtonText}>Send</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderContextualSection = () => {
    if (isLoadingContextual) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#E91E63" />
          <Text style={styles.loadingText}>Generating personalized icebreakers...</Text>
        </View>
      );
    }

    if (contextualIcebreakers.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>✨</Text>
          <Text style={styles.emptyTitle}>AI-Powered Suggestions</Text>
          <Text style={styles.emptyDescription}>
            Our AI analyzes {profile.name}'s profile to suggest personalized conversation starters
            that are more likely to get a response.
          </Text>
          {onGenerateContextual && (
            <Button
              title="Generate Suggestions"
              onPress={loadContextualIcebreakers}
              style={styles.generateButton}
            />
          )}
        </View>
      );
    }

    return (
      <View style={styles.icebreakersContainer}>
        {contextualIcebreakers.map(renderIcebreakerCard)}
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Start a Conversation</Text>
            <Text style={styles.headerSubtitle}>with {profile.name}</Text>
          </View>
          <View style={styles.headerSpacer} />
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

        {/* Icebreakers Content */}
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {selectedCategory === 'contextual' ? (
            renderContextualSection()
          ) : (
            <View style={styles.icebreakersContainer}>
              {getIcebreakersForCategory().map(renderIcebreakerCard)}
            </View>
          )}

          {/* Tips */}
          <View style={styles.tipsCard}>
            <Text style={styles.tipsTitle}>💡 Conversation Tips</Text>
            <Text style={styles.tipText}>• Be genuine and authentic</Text>
            <Text style={styles.tipText}>• Reference something from their profile</Text>
            <Text style={styles.tipText}>• Ask open-ended questions</Text>
            <Text style={styles.tipText}>• Keep it light and fun</Text>
          </View>
        </ScrollView>

        {/* Custom Message Input */}
        <View style={styles.footer}>
          {showCustomInput ? (
            <View style={styles.customInputContainer}>
              <TextInput
                style={styles.customInput}
                placeholder="Type your own message..."
                placeholderTextColor="#999"
                value={customMessage}
                onChangeText={setCustomMessage}
                multiline
                maxLength={500}
                autoFocus
              />
              <View style={styles.customInputActions}>
                <TouchableOpacity
                  onPress={() => {
                    setShowCustomInput(false);
                    setCustomMessage('');
                  }}
                >
                  <Text style={styles.customInputCancel}>Cancel</Text>
                </TouchableOpacity>
                <Button
                  title="Send"
                  onPress={handleCustomMessageSend}
                  disabled={!customMessage.trim()}
                  style={styles.customSendButton}
                />
              </View>
            </View>
          ) : (
            <Button
              title="Write Your Own Message"
              onPress={() => setShowCustomInput(true)}
              variant="outline"
              fullWidth
            />
          )}
        </View>

        {/* Premium Upgrade Prompt */}
        {!isPremium && (
          <View style={styles.upgradePrompt}>
            <Text style={styles.upgradePromptIcon}>💎</Text>
            <Text style={styles.upgradePromptText}>
              Unlock all icebreaker categories with Premium
            </Text>
          </View>
        )}
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
  categoryTabLocked: {
    opacity: 0.6,
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
  categoryLabelLocked: {
    color: '#999',
  },
  lockIcon: {
    fontSize: 12,
    marginLeft: 4,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  icebreakersContainer: {
    gap: 12,
  },
  icebreakerCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  icebreakerCardLocked: {
    opacity: 0.7,
  },
  icebreakerContent: {
    flex: 1,
    marginRight: 12,
  },
  icebreakerText: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },
  icebreakerTextLocked: {
    color: '#999',
  },
  sendButton: {
    backgroundColor: '#E91E63',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  sendButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  premiumOverlay: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  premiumOverlayIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  premiumOverlayText: {
    fontSize: 12,
    color: '#FFD700',
    fontWeight: '600',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 15,
    color: '#666',
    marginTop: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  emptyDescription: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  generateButton: {
    marginTop: 8,
  },
  tipsCard: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 20,
    marginTop: 24,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1976D2',
    marginBottom: 12,
  },
  tipText: {
    fontSize: 14,
    color: '#1565C0',
    lineHeight: 22,
    marginBottom: 4,
  },
  footer: {
    padding: 20,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  customInputContainer: {
    gap: 12,
  },
  customInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: '#333',
    minHeight: 100,
    maxHeight: 150,
    textAlignVertical: 'top',
  },
  customInputActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  customInputCancel: {
    fontSize: 15,
    color: '#E91E63',
    fontWeight: '500',
  },
  customSendButton: {
    paddingHorizontal: 32,
  },
  upgradePrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF3E0',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#FFE0B2',
  },
  upgradePromptIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  upgradePromptText: {
    fontSize: 13,
    color: '#E65100',
    fontWeight: '500',
  },
});
