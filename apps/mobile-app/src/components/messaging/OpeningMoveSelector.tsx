import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Button } from '../common/Button';
import { OpeningMoveCard, OpeningMove } from './OpeningMoveCard';

interface Template {
  id: string;
  category: string;
  content: string;
  is_system: boolean;
  popularity_score: number;
}

interface OpeningMoveSelectorProps {
  userId: string;
  onSave?: () => void;
  onOpeningMovesChanged?: (moves: OpeningMove[]) => void;
}

const MAX_OPENING_MOVES = 3;

export const OpeningMoveSelector: React.FC<OpeningMoveSelectorProps> = ({
  userId,
  onSave,
  onOpeningMovesChanged,
}) => {
  const [openingMoves, setOpeningMoves] = useState<OpeningMove[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customText, setCustomText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('interests');
  const [saving, setSaving] = useState(false);

  const categories = [
    { key: 'interests', label: 'Interests', icon: '🎯' },
    { key: 'date_ideas', label: 'Date Ideas', icon: '💡' },
    { key: 'travel', label: 'Travel', icon: '✈️' },
    { key: 'fun', label: 'Fun', icon: '🎉' },
    { key: 'conversation', label: 'Deep', icon: '💬' },
    { key: 'food', label: 'Food', icon: '🍕' },
    { key: 'entertainment', label: 'Entertainment', icon: '🎬' },
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      // Load user's opening moves
      const movesResponse = await fetch('/api/users/me/opening-moves', {
        headers: { Authorization: `Bearer ${getAuthToken()}` },
      });
      const movesData = await movesResponse.json();
      setOpeningMoves(movesData.data || []);

      // Load templates
      const templatesResponse = await fetch('/api/opening-move-templates', {
        headers: { Authorization: `Bearer ${getAuthToken()}` },
      });
      const templatesData = await templatesResponse.json();
      setTemplates(templatesData.data || []);
    } catch (error) {
      console.error('Failed to load opening moves:', error);
      Alert.alert('Error', 'Failed to load opening moves');
    } finally {
      setLoading(false);
    }
  };

  const getAuthToken = (): string => {
    // This should be replaced with actual auth token retrieval
    return '';
  };

  const canAddMore = openingMoves.length < MAX_OPENING_MOVES;

  const handleAddTemplate = async (template: Template) => {
    if (!canAddMore) {
      Alert.alert('Limit Reached', `You can only have up to ${MAX_OPENING_MOVES} opening moves`);
      return;
    }

    try {
      setSaving(true);
      const response = await fetch('/api/users/me/opening-moves', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify({
          type: 'system',
          template_id: template.id,
          order: openingMoves.length,
        }),
      });

      const data = await response.json();
      if (data.success) {
        const newMoves = [...openingMoves, data.data];
        setOpeningMoves(newMoves);
        setShowTemplateModal(false);
        onOpeningMovesChanged?.(newMoves);
        Alert.alert('Success', 'Opening move added!');
      }
    } catch (error) {
      console.error('Failed to add opening move:', error);
      Alert.alert('Error', 'Failed to add opening move');
    } finally {
      setSaving(false);
    }
  };

  const handleAddCustom = async () => {
    if (!customText.trim()) {
      Alert.alert('Error', 'Please enter some text');
      return;
    }

    if (!canAddMore) {
      Alert.alert('Limit Reached', `You can only have up to ${MAX_OPENING_MOVES} opening moves`);
      return;
    }

    try {
      setSaving(true);
      const response = await fetch('/api/users/me/opening-moves', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify({
          type: 'text',
          content: customText.trim(),
          order: openingMoves.length,
        }),
      });

      const data = await response.json();
      if (data.success) {
        const newMoves = [...openingMoves, data.data];
        setOpeningMoves(newMoves);
        setCustomText('');
        setShowCustomModal(false);
        onOpeningMovesChanged?.(newMoves);
        Alert.alert('Success', 'Custom opening move added!');
      }
    } catch (error) {
      console.error('Failed to add custom opening move:', error);
      Alert.alert('Error', 'Failed to add custom opening move');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (move: OpeningMove) => {
    Alert.alert(
      'Delete Opening Move',
      'Are you sure you want to delete this opening move?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`/api/users/me/opening-moves/${move.id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${getAuthToken()}` },
              });

              const data = await response.json();
              if (data.success) {
                const newMoves = openingMoves.filter(m => m.id !== move.id);
                setOpeningMoves(newMoves);
                onOpeningMovesChanged?.(newMoves);
                Alert.alert('Success', 'Opening move deleted');
              }
            } catch (error) {
              console.error('Failed to delete opening move:', error);
              Alert.alert('Error', 'Failed to delete opening move');
            }
          },
        },
      ]
    );
  };

  const filteredTemplates = templates.filter(t => t.category === selectedCategory);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#E91E63" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Opening Moves</Text>
        <Text style={styles.subtitle}>
          Set up to {MAX_OPENING_MOVES} conversation starters for your matches to choose from
        </Text>
        <Text style={styles.count}>
          {openingMoves.length} / {MAX_OPENING_MOVES}
        </Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {openingMoves.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>💬</Text>
            <Text style={styles.emptyTitle}>No Opening Moves Yet</Text>
            <Text style={styles.emptyText}>
              Add conversation starters that your matches can respond to!
            </Text>
          </View>
        ) : (
          <View style={styles.movesList}>
            {openingMoves.map(move => (
              <OpeningMoveCard
                key={move.id}
                move={move}
                editable
                onDelete={handleDelete}
              />
            ))}
          </View>
        )}

        {canAddMore && (
          <View style={styles.addButtons}>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowTemplateModal(true)}
            >
              <Text style={styles.addButtonIcon}>📝</Text>
              <Text style={styles.addButtonText}>Choose from Templates</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowCustomModal(true)}
            >
              <Text style={styles.addButtonIcon}>✍️</Text>
              <Text style={styles.addButtonText}>Write Custom Message</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.infoCard}>
          <Text style={styles.infoIcon}>💡</Text>
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>How it works</Text>
            <Text style={styles.infoText}>
              • When someone matches with you, they'll see your opening moves
            </Text>
            <Text style={styles.infoText}>
              • They choose one to respond to, starting the conversation
            </Text>
            <Text style={styles.infoText}>
              • This helps ensure every match has a great conversation starter!
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Template Selection Modal */}
      <Modal
        visible={showTemplateModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowTemplateModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowTemplateModal(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Choose a Template</Text>
            <View style={styles.modalSpacer} />
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoryScroll}
            contentContainerStyle={styles.categoryScrollContent}
          >
            {categories.map(category => (
              <TouchableOpacity
                key={category.key}
                style={[
                  styles.categoryTab,
                  selectedCategory === category.key && styles.categoryTabActive,
                ]}
                onPress={() => setSelectedCategory(category.key)}
              >
                <Text style={styles.categoryIcon}>{category.icon}</Text>
                <Text
                  style={[
                    styles.categoryLabel,
                    selectedCategory === category.key && styles.categoryLabelActive,
                  ]}
                >
                  {category.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <ScrollView style={styles.templateList}>
            {filteredTemplates.map(template => (
              <TouchableOpacity
                key={template.id}
                style={styles.templateCard}
                onPress={() => handleAddTemplate(template)}
                disabled={saving}
              >
                <Text style={styles.templateText}>{template.content}</Text>
                <View style={styles.templateFooter}>
                  <Text style={styles.templatePopularity}>
                    ⭐ {template.popularity_score} uses
                  </Text>
                  <Text style={styles.templateAdd}>Add +</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>

      {/* Custom Text Modal */}
      <Modal
        visible={showCustomModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowCustomModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowCustomModal(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Custom Opening Move</Text>
            <View style={styles.modalSpacer} />
          </View>

          <View style={styles.customContent}>
            <Text style={styles.customLabel}>Your question or prompt:</Text>
            <TextInput
              style={styles.customInput}
              placeholder="What would you like matches to respond to?"
              placeholderTextColor="#999"
              value={customText}
              onChangeText={setCustomText}
              multiline
              maxLength={200}
              autoFocus
            />
            <Text style={styles.customCounter}>{customText.length} / 200</Text>

            <Button
              title="Add Opening Move"
              onPress={handleAddCustom}
              disabled={!customText.trim() || saving}
              loading={saving}
              fullWidth
              style={styles.customAddButton}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    backgroundColor: '#FFF',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  count: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E91E63',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 22,
  },
  movesList: {
    marginBottom: 20,
  },
  addButtons: {
    gap: 12,
    marginBottom: 20,
  },
  addButton: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E91E63',
    borderStyle: 'dashed',
  },
  addButtonIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  addButtonText: {
    fontSize: 16,
    color: '#E91E63',
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 20,
    flexDirection: 'row',
  },
  infoIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1976D2',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#1565C0',
    lineHeight: 20,
    marginBottom: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalClose: {
    fontSize: 24,
    color: '#666',
    width: 40,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  modalSpacer: {
    width: 40,
  },
  categoryScroll: {
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  categoryScrollContent: {
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
  templateList: {
    flex: 1,
    padding: 20,
  },
  templateCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  templateText: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
    marginBottom: 12,
  },
  templateFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  templatePopularity: {
    fontSize: 12,
    color: '#999',
  },
  templateAdd: {
    fontSize: 14,
    color: '#E91E63',
    fontWeight: '600',
  },
  customContent: {
    padding: 20,
  },
  customLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  customInput: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: '#333',
    minHeight: 120,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  customCounter: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
    marginTop: 8,
    marginBottom: 20,
  },
  customAddButton: {
    marginTop: 12,
  },
});
