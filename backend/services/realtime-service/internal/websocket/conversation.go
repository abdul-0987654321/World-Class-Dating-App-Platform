package websocket

import (
	"sync"

	log "github.com/sirupsen/logrus"
)

// ConversationManager manages WebSocket rooms/conversations
type ConversationManager struct {
	// Map of conversation ID to participant user IDs
	conversations map[string]map[string]bool // conversationID -> userID -> bool

	// Map of user ID to conversation IDs they're in
	userConversations map[string]map[string]bool // userID -> conversationID -> bool

	mu sync.RWMutex
}

// NewConversationManager creates a new conversation manager
func NewConversationManager() *ConversationManager {
	return &ConversationManager{
		conversations:     make(map[string]map[string]bool),
		userConversations: make(map[string]map[string]bool),
	}
}

// JoinConversation adds a user to a conversation room
func (cm *ConversationManager) JoinConversation(conversationID, userID string) {
	cm.mu.Lock()
	defer cm.mu.Unlock()

	// Add to conversation participants
	if _, ok := cm.conversations[conversationID]; !ok {
		cm.conversations[conversationID] = make(map[string]bool)
	}
	cm.conversations[conversationID][userID] = true

	// Add to user's conversations
	if _, ok := cm.userConversations[userID]; !ok {
		cm.userConversations[userID] = make(map[string]bool)
	}
	cm.userConversations[userID][conversationID] = true

	log.WithFields(log.Fields{
		"conversationId": conversationID,
		"userId":         userID,
	}).Debug("User joined conversation")
}

// LeaveConversation removes a user from a conversation room
func (cm *ConversationManager) LeaveConversation(conversationID, userID string) {
	cm.mu.Lock()
	defer cm.mu.Unlock()

	// Remove from conversation participants
	if participants, ok := cm.conversations[conversationID]; ok {
		delete(participants, userID)
		if len(participants) == 0 {
			delete(cm.conversations, conversationID)
		}
	}

	// Remove from user's conversations
	if conversations, ok := cm.userConversations[userID]; ok {
		delete(conversations, conversationID)
		if len(conversations) == 0 {
			delete(cm.userConversations, userID)
		}
	}

	log.WithFields(log.Fields{
		"conversationId": conversationID,
		"userId":         userID,
	}).Debug("User left conversation")
}

// LeaveAllConversations removes a user from all conversations
func (cm *ConversationManager) LeaveAllConversations(userID string) {
	cm.mu.Lock()
	defer cm.mu.Unlock()

	// Get all conversations the user is in
	conversations, ok := cm.userConversations[userID]
	if !ok {
		return
	}

	// Remove user from each conversation
	for conversationID := range conversations {
		if participants, ok := cm.conversations[conversationID]; ok {
			delete(participants, userID)
			if len(participants) == 0 {
				delete(cm.conversations, conversationID)
			}
		}
	}

	// Remove user's conversation list
	delete(cm.userConversations, userID)

	log.WithField("userId", userID).Debug("User left all conversations")
}

// GetConversationParticipants returns all participants in a conversation
func (cm *ConversationManager) GetConversationParticipants(conversationID string) []string {
	cm.mu.RLock()
	defer cm.mu.RUnlock()

	participants, ok := cm.conversations[conversationID]
	if !ok {
		return []string{}
	}

	userIDs := make([]string, 0, len(participants))
	for userID := range participants {
		userIDs = append(userIDs, userID)
	}
	return userIDs
}

// GetUserConversations returns all conversations a user is in
func (cm *ConversationManager) GetUserConversations(userID string) []string {
	cm.mu.RLock()
	defer cm.mu.RUnlock()

	conversations, ok := cm.userConversations[userID]
	if !ok {
		return []string{}
	}

	conversationIDs := make([]string, 0, len(conversations))
	for conversationID := range conversations {
		conversationIDs = append(conversationIDs, conversationID)
	}
	return conversationIDs
}

// IsUserInConversation checks if a user is in a conversation
func (cm *ConversationManager) IsUserInConversation(conversationID, userID string) bool {
	cm.mu.RLock()
	defer cm.mu.RUnlock()

	participants, ok := cm.conversations[conversationID]
	if !ok {
		return false
	}

	return participants[userID]
}

// GetConversationCount returns the number of active conversations
func (cm *ConversationManager) GetConversationCount() int {
	cm.mu.RLock()
	defer cm.mu.RUnlock()

	return len(cm.conversations)
}

// GetParticipantCount returns the number of participants in a conversation
func (cm *ConversationManager) GetParticipantCount(conversationID string) int {
	cm.mu.RLock()
	defer cm.mu.RUnlock()

	participants, ok := cm.conversations[conversationID]
	if !ok {
		return 0
	}

	return len(participants)
}
