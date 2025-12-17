import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Button } from '../common/Button';
import { OpeningMoveCard, OpeningMove } from './OpeningMoveCard';

interface ResponseModalProps {
  visible: boolean;
  matchId: string;
  partnerName: string;
  openingMoves: OpeningMove[];
  onClose: () => void;
  onResponseSubmitted?: () => void;
}

export const ResponseModal: React.FC<ResponseModalProps> = ({
  visible,
  matchId,
  partnerName,
  openingMoves,
  onClose,
  onResponseSubmitted,
}) => {
  const [selectedMove, setSelectedMove] = useState<OpeningMove | null>(null);
  const [responseText, setResponseText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const getAuthToken = (): string => {
    // This should be replaced with actual auth token retrieval
    return '';
  };

  const handleMoveSelect = (move: OpeningMove) => {
    setSelectedMove(move);
    setResponseText('');
  };

  const handleSubmit = async () => {
    if (!selectedMove) {
      Alert.alert('No Selection', 'Please select an opening move to respond to');
      return;
    }

    if (!responseText.trim()) {
      Alert.alert('Empty Response', 'Please write a response');
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch(`/api/matches/${matchId}/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify({
          opening_move_id: selectedMove.id,
          response_text: responseText.trim(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        Alert.alert('Success', 'Your response has been sent!');
        onResponseSubmitted?.();
        onClose();
        setSelectedMove(null);
        setResponseText('');
      } else {
        Alert.alert('Error', data.message || 'Failed to submit response');
      }
    } catch (error) {
      console.error('Failed to submit response:', error);
      Alert.alert('Error', 'Failed to submit response. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    setSelectedMove(null);
    setResponseText('');
    onClose();
  };

  const getDisplayContent = (move: OpeningMove): string => {
    if (move.type === 'system' && move.template) {
      return move.template.content;
    }
    return move.content || '';
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={handleCancel}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleCancel} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Choose & Respond</Text>
            <Text style={styles.headerSubtitle}>to {partnerName}'s opening move</Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        {/* Content */}
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Instructions */}
          <View style={styles.instructionCard}>
            <Text style={styles.instructionIcon}>💬</Text>
            <View style={styles.instructionContent}>
              <Text style={styles.instructionTitle}>Start the conversation</Text>
              <Text style={styles.instructionText}>
                {partnerName} has set up these conversation starters. Choose one and write your
                response to break the ice!
              </Text>
            </View>
          </View>

          {/* Opening Moves */}
          <View style={styles.movesSection}>
            <Text style={styles.sectionTitle}>Choose one to respond to:</Text>
            {openingMoves.map(move => (
              <OpeningMoveCard
                key={move.id}
                move={move}
                selectable
                selected={selectedMove?.id === move.id}
                onSelect={handleMoveSelect}
              />
            ))}
          </View>

          {/* Response Input */}
          {selectedMove && (
            <View style={styles.responseSection}>
              <View style={styles.selectedMoveHeader}>
                <Text style={styles.selectedMoveLabel}>Your response to:</Text>
                <View style={styles.selectedMovePreview}>
                  <Text style={styles.selectedMoveText} numberOfLines={2}>
                    "{getDisplayContent(selectedMove)}"
                  </Text>
                </View>
              </View>

              <TextInput
                style={styles.responseInput}
                placeholder="Write your response here..."
                placeholderTextColor="#999"
                value={responseText}
                onChangeText={setResponseText}
                multiline
                maxLength={500}
                autoFocus
              />

              <View style={styles.responseFooter}>
                <Text style={styles.characterCount}>
                  {responseText.length} / 500
                </Text>

                <View style={styles.tipBadge}>
                  <Text style={styles.tipBadgeIcon}>💡</Text>
                  <Text style={styles.tipBadgeText}>Be genuine and show interest</Text>
                </View>
              </View>
            </View>
          )}

          {/* Tips */}
          <View style={styles.tipsCard}>
            <Text style={styles.tipsTitle}>✨ Pro Tips</Text>
            <Text style={styles.tipText}>• Be authentic and share something personal</Text>
            <Text style={styles.tipText}>• Ask a follow-up question to keep conversation going</Text>
            <Text style={styles.tipText}>• Show enthusiasm and positivity</Text>
            <Text style={styles.tipText}>• Keep it concise but meaningful</Text>
          </View>
        </ScrollView>

        {/* Footer Actions */}
        <View style={styles.footer}>
          <Button
            title="Cancel"
            onPress={handleCancel}
            variant="outline"
            style={styles.cancelButton}
          />
          <Button
            title={submitting ? 'Sending...' : 'Send Response'}
            onPress={handleSubmit}
            disabled={!selectedMove || !responseText.trim() || submitting}
            loading={submitting}
            style={styles.submitButton}
          />
        </View>

        {/* Loading Overlay */}
        {submitting && (
          <View style={styles.loadingOverlay}>
            <View style={styles.loadingCard}>
              <ActivityIndicator size="large" color="#E91E63" />
              <Text style={styles.loadingText}>Sending your response...</Text>
            </View>
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
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  instructionCard: {
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    marginBottom: 24,
  },
  instructionIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  instructionContent: {
    flex: 1,
  },
  instructionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E65100',
    marginBottom: 6,
  },
  instructionText: {
    fontSize: 14,
    color: '#EF6C00',
    lineHeight: 20,
  },
  movesSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  responseSection: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  selectedMoveHeader: {
    marginBottom: 16,
  },
  selectedMoveLabel: {
    fontSize: 13,
    color: '#999',
    marginBottom: 8,
    fontWeight: '500',
  },
  selectedMovePreview: {
    backgroundColor: '#F5F5F5',
    borderLeftWidth: 3,
    borderLeftColor: '#E91E63',
    padding: 12,
    borderRadius: 8,
  },
  selectedMoveText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    lineHeight: 20,
  },
  responseInput: {
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: '#333',
    minHeight: 120,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  responseFooter: {
    marginTop: 12,
    gap: 8,
  },
  characterCount: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
  },
  tipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  tipBadgeIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  tipBadgeText: {
    fontSize: 12,
    color: '#1976D2',
    fontWeight: '500',
  },
  tipsCard: {
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 20,
  },
  tipsTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2E7D32',
    marginBottom: 12,
  },
  tipText: {
    fontSize: 13,
    color: '#388E3C',
    lineHeight: 20,
    marginBottom: 6,
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
  },
  submitButton: {
    flex: 2,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    minWidth: 200,
  },
  loadingText: {
    fontSize: 15,
    color: '#666',
    marginTop: 16,
    textAlign: 'center',
  },
});
