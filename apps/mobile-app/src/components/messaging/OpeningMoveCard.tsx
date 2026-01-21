import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';

export interface OpeningMove {
  id: string;
  type: 'text' | 'image' | 'system';
  content?: string;
  image_url?: string;
  template?: {
    id: string;
    category: string;
    content: string;
  };
  order: number;
}

interface OpeningMoveCardProps {
  move: OpeningMove;
  onSelect?: (move: OpeningMove) => void;
  onEdit?: (move: OpeningMove) => void;
  onDelete?: (move: OpeningMove) => void;
  editable?: boolean;
  selectable?: boolean;
  selected?: boolean;
}

export const OpeningMoveCard: React.FC<OpeningMoveCardProps> = ({
  move,
  onSelect,
  onEdit,
  onDelete,
  editable = false,
  selectable = false,
  selected = false,
}) => {
  const getDisplayContent = (): string => {
    if (move.type === 'system' && move.template) {
      return move.template.content;
    }
    return move.content || '';
  };

  const getCategoryEmoji = (category?: string): string => {
    const emojiMap: { [key: string]: string } = {
      interests: '🎯',
      date_ideas: '💡',
      travel: '✈️',
      fun: '🎉',
      conversation: '💬',
      food: '🍕',
      entertainment: '🎬',
    };
    return category ? emojiMap[category] || '💭' : '💭';
  };

  const handlePress = () => {
    if (selectable && onSelect) {
      onSelect(move);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.card, selectable && styles.selectableCard, selected && styles.selectedCard]}
      onPress={handlePress}
      disabled={!selectable}
      activeOpacity={selectable ? 0.7 : 1}
    >
      <View style={styles.cardContent}>
        {/* Type Indicator */}
        <View style={styles.typeIndicator}>
          {move.type === 'image' ? (
            <Text style={styles.typeIcon}>🖼️</Text>
          ) : move.type === 'system' ? (
            <Text style={styles.typeIcon}>{getCategoryEmoji(move.template?.category)}</Text>
          ) : (
            <Text style={styles.typeIcon}>✍️</Text>
          )}
          <Text style={styles.typeLabel}>
            {move.type === 'image' ? 'Image' : move.type === 'system' ? 'Template' : 'Custom'}
          </Text>
        </View>

        {/* Content */}
        {move.type === 'image' && move.image_url ? (
          <View style={styles.imageContainer}>
            <Image source={{ uri: move.image_url }} style={styles.image} resizeMode="cover" />
          </View>
        ) : (
          <Text style={styles.contentText}>{getDisplayContent()}</Text>
        )}

        {/* Template Category Badge */}
        {move.type === 'system' && move.template && (
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeText}>{move.template.category.replace('_', ' ')}</Text>
          </View>
        )}
      </View>

      {/* Action Buttons */}
      {editable && (
        <View style={styles.actions}>
          {onEdit && (
            <TouchableOpacity style={styles.actionButton} onPress={() => onEdit(move)}>
              <Text style={styles.actionIcon}>✏️</Text>
            </TouchableOpacity>
          )}
          {onDelete && (
            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={() => onDelete(move)}
            >
              <Text style={styles.actionIcon}>🗑️</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Selected Indicator */}
      {selected && (
        <View style={styles.selectedIndicator}>
          <Text style={styles.selectedIcon}>✓</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#F0F0F0',
  },
  selectableCard: {
    borderColor: '#E0E0E0',
  },
  selectedCard: {
    borderColor: '#E91E63',
    backgroundColor: '#FFF0F5',
  },
  cardContent: {
    flex: 1,
  },
  typeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  typeIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  typeLabel: {
    fontSize: 12,
    color: '#999',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  imageContainer: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 8,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  contentText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
    marginBottom: 8,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 8,
  },
  categoryBadgeText: {
    fontSize: 11,
    color: '#1976D2',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    backgroundColor: '#FFEBEE',
  },
  actionIcon: {
    fontSize: 16,
  },
  selectedIndicator: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E91E63',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedIcon: {
    fontSize: 16,
    color: '#FFF',
    fontWeight: 'bold',
  },
});
