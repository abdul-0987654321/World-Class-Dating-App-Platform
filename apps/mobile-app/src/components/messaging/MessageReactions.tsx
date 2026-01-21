/**
 * Message Reactions Component
 * Displays emoji reactions on messages and allows adding/removing reactions
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, FlatList, Pressable } from 'react-native';

interface Reaction {
  emoji: string;
  count: number;
  users: string[];
}

interface MessageReactionsProps {
  messageId: string;
  reactions: Reaction[];
  currentUserId: string;
  userReaction?: string;
  onAddReaction: (emoji: string) => void;
  onRemoveReaction: () => void;
}

const AVAILABLE_EMOJIS = [
  '❤️',
  '😂',
  '😮',
  '😢',
  '😡',
  '👍',
  '👎',
  '🔥',
  '💯',
  '🎉',
  '😍',
  '😘',
  '🤗',
  '🤔',
  '😎',
  '🥳',
  '😇',
  '🤩',
  '💪',
  '👏',
];

export const MessageReactions: React.FC<MessageReactionsProps> = ({
  messageId,
  reactions,
  currentUserId,
  userReaction,
  onAddReaction,
  onRemoveReaction,
}) => {
  const [pickerVisible, setPickerVisible] = useState(false);

  const handleEmojiPress = (emoji: string) => {
    if (userReaction === emoji) {
      // Same emoji, remove reaction
      onRemoveReaction();
    } else {
      // Different emoji or new reaction
      onAddReaction(emoji);
    }
    setPickerVisible(false);
  };

  const renderReaction = ({ item }: { item: Reaction }) => {
    const isUserReaction = item.users.includes(currentUserId);

    return (
      <TouchableOpacity
        style={[styles.reactionBubble, isUserReaction && styles.reactionBubbleActive]}
        onPress={() => handleEmojiPress(item.emoji)}
        activeOpacity={0.7}
      >
        <Text style={styles.reactionEmoji}>{item.emoji}</Text>
        {item.count > 1 && (
          <Text style={[styles.reactionCount, isUserReaction && styles.reactionCountActive]}>
            {item.count}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  const renderEmojiPicker = ({ item }: { item: string }) => (
    <TouchableOpacity
      style={[styles.emojiPickerItem, userReaction === item && styles.emojiPickerItemActive]}
      onPress={() => handleEmojiPress(item)}
      activeOpacity={0.7}
    >
      <Text style={styles.emojiPickerEmoji}>{item}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Existing Reactions */}
      {reactions.length > 0 && (
        <View style={styles.reactionsRow}>
          <FlatList
            data={reactions}
            renderItem={renderReaction}
            keyExtractor={(item) => item.emoji}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.reactionsList}
          />
        </View>
      )}

      {/* Add Reaction Button */}
      <TouchableOpacity
        style={styles.addReactionButton}
        onPress={() => setPickerVisible(true)}
        activeOpacity={0.7}
      >
        <Text style={styles.addReactionEmoji}>➕</Text>
      </TouchableOpacity>

      {/* Emoji Picker Modal */}
      <Modal
        visible={pickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setPickerVisible(false)}>
          <View style={styles.emojiPicker}>
            <Text style={styles.emojiPickerTitle}>React with emoji</Text>
            <FlatList
              data={AVAILABLE_EMOJIS}
              renderItem={renderEmojiPicker}
              keyExtractor={(item) => item}
              numColumns={5}
              contentContainerStyle={styles.emojiPickerGrid}
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  reactionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reactionsList: {
    gap: 6,
  },
  reactionBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  reactionBubbleActive: {
    backgroundColor: '#FFE6F0',
    borderColor: '#E91E63',
  },
  reactionEmoji: {
    fontSize: 14,
  },
  reactionCount: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
  },
  reactionCountActive: {
    color: '#E91E63',
  },
  addReactionButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F0F0',
    borderRadius: 14,
    marginLeft: 6,
  },
  addReactionEmoji: {
    fontSize: 14,
    opacity: 0.6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiPicker: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '80%',
    maxHeight: '60%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  emojiPickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  emojiPickerGrid: {
    paddingBottom: 8,
  },
  emojiPickerItem: {
    width: '18%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    margin: '1%',
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
  },
  emojiPickerItemActive: {
    backgroundColor: '#FFE6F0',
  },
  emojiPickerEmoji: {
    fontSize: 28,
  },
});

export default MessageReactions;
