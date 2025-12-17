package typing

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/go-redis/redis/v8"
	"github.com/heartly/realtime-service/internal/config"
	log "github.com/sirupsen/logrus"
)

const (
	// Redis key prefix
	keyPrefixTyping = "heartly:typing:"
)

// TypingState represents a user's typing state
type TypingState struct {
	UserID         string    `json:"userId"`
	ConversationID string    `json:"conversationId"`
	StartedAt      time.Time `json:"startedAt"`
	ExpiresAt      time.Time `json:"expiresAt"`
}

// Manager handles typing indicators
type Manager struct {
	redis  *redis.Client
	ctx    context.Context
	config *config.Config

	// Local tracking of typing states with auto-expiration
	states   map[string]map[string]*TypingState // conversationID -> userID -> state
	statesMu sync.RWMutex

	// Callbacks for typing events
	onTypingStart func(userID, conversationID string)
	onTypingStop  func(userID, conversationID string)

	done chan struct{}
}

// NewManager creates a new typing manager
func NewManager(redisClient *redis.Client, cfg *config.Config) *Manager {
	m := &Manager{
		redis:  redisClient,
		ctx:    context.Background(),
		config: cfg,
		states: make(map[string]map[string]*TypingState),
		done:   make(chan struct{}),
	}

	// Start cleanup loop
	go m.cleanupLoop()

	return m
}

// Stop stops the typing manager
func (m *Manager) Stop() {
	close(m.done)
}

// SetCallbacks sets the typing event callbacks
func (m *Manager) SetCallbacks(onStart, onStop func(userID, conversationID string)) {
	m.onTypingStart = onStart
	m.onTypingStop = onStop
}

// StartTyping marks a user as typing in a conversation
func (m *Manager) StartTyping(userID, conversationID string) {
	m.statesMu.Lock()
	defer m.statesMu.Unlock()

	// Initialize conversation map if needed
	if _, ok := m.states[conversationID]; !ok {
		m.states[conversationID] = make(map[string]*TypingState)
	}

	// Check if already typing
	existing, wasTyping := m.states[conversationID][userID]

	now := time.Now()
	state := &TypingState{
		UserID:         userID,
		ConversationID: conversationID,
		StartedAt:      now,
		ExpiresAt:      now.Add(m.config.TypingTimeout),
	}

	m.states[conversationID][userID] = state

	// Store in Redis
	key := m.getKey(conversationID, userID)
	if err := m.redis.Set(m.ctx, key, now.Unix(), m.config.TypingTimeout).Err(); err != nil {
		log.WithError(err).Error("Failed to set typing state in Redis")
	}

	// Only fire callback if user wasn't already typing
	if !wasTyping || existing.ExpiresAt.Before(now) {
		if m.onTypingStart != nil {
			go m.onTypingStart(userID, conversationID)
		}
	}

	log.WithFields(log.Fields{
		"userId":         userID,
		"conversationId": conversationID,
	}).Debug("User started typing")
}

// StopTyping marks a user as no longer typing
func (m *Manager) StopTyping(userID, conversationID string) {
	m.statesMu.Lock()
	defer m.statesMu.Unlock()

	// Remove from local state
	if convStates, ok := m.states[conversationID]; ok {
		if _, wasTyping := convStates[userID]; wasTyping {
			delete(convStates, userID)

			// Clean up empty conversation map
			if len(convStates) == 0 {
				delete(m.states, conversationID)
			}

			// Fire callback
			if m.onTypingStop != nil {
				go m.onTypingStop(userID, conversationID)
			}
		}
	}

	// Remove from Redis
	key := m.getKey(conversationID, userID)
	if err := m.redis.Del(m.ctx, key).Err(); err != nil {
		log.WithError(err).Error("Failed to delete typing state from Redis")
	}

	log.WithFields(log.Fields{
		"userId":         userID,
		"conversationId": conversationID,
	}).Debug("User stopped typing")
}

// IsTyping checks if a user is currently typing
func (m *Manager) IsTyping(userID, conversationID string) bool {
	m.statesMu.RLock()
	defer m.statesMu.RUnlock()

	if convStates, ok := m.states[conversationID]; ok {
		if state, ok := convStates[userID]; ok {
			return state.ExpiresAt.After(time.Now())
		}
	}

	return false
}

// GetTypingUsers returns users currently typing in a conversation
func (m *Manager) GetTypingUsers(conversationID string) []string {
	m.statesMu.RLock()
	defer m.statesMu.RUnlock()

	var users []string
	now := time.Now()

	if convStates, ok := m.states[conversationID]; ok {
		for userID, state := range convStates {
			if state.ExpiresAt.After(now) {
				users = append(users, userID)
			}
		}
	}

	return users
}

// GetTypingState returns the typing state for a user in a conversation
func (m *Manager) GetTypingState(userID, conversationID string) *TypingState {
	m.statesMu.RLock()
	defer m.statesMu.RUnlock()

	if convStates, ok := m.states[conversationID]; ok {
		if state, ok := convStates[userID]; ok {
			if state.ExpiresAt.After(time.Now()) {
				return state
			}
		}
	}

	return nil
}

// ClearUserTyping clears all typing states for a user (e.g., when disconnecting)
func (m *Manager) ClearUserTyping(userID string) {
	m.statesMu.Lock()
	defer m.statesMu.Unlock()

	var conversationsToNotify []string

	for conversationID, convStates := range m.states {
		if _, ok := convStates[userID]; ok {
			conversationsToNotify = append(conversationsToNotify, conversationID)
			delete(convStates, userID)

			if len(convStates) == 0 {
				delete(m.states, conversationID)
			}
		}
	}

	// Fire callbacks for each cleared typing state
	for _, conversationID := range conversationsToNotify {
		if m.onTypingStop != nil {
			go m.onTypingStop(userID, conversationID)
		}

		// Delete from Redis
		key := m.getKey(conversationID, userID)
		m.redis.Del(m.ctx, key)
	}
}

// cleanupLoop periodically removes expired typing states
func (m *Manager) cleanupLoop() {
	ticker := time.NewTicker(time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			m.cleanup()
		case <-m.done:
			return
		}
	}
}

// cleanup removes expired typing states
func (m *Manager) cleanup() {
	m.statesMu.Lock()
	defer m.statesMu.Unlock()

	now := time.Now()
	var expired []struct {
		userID         string
		conversationID string
	}

	for conversationID, convStates := range m.states {
		for userID, state := range convStates {
			if state.ExpiresAt.Before(now) {
				expired = append(expired, struct {
					userID         string
					conversationID string
				}{userID, conversationID})
			}
		}
	}

	// Remove expired states and fire callbacks
	for _, e := range expired {
		if convStates, ok := m.states[e.conversationID]; ok {
			delete(convStates, e.userID)
			if len(convStates) == 0 {
				delete(m.states, e.conversationID)
			}
		}

		if m.onTypingStop != nil {
			go m.onTypingStop(e.userID, e.conversationID)
		}
	}
}

// getKey returns the Redis key for a typing state
func (m *Manager) getKey(conversationID, userID string) string {
	return fmt.Sprintf("%s%s:%s", keyPrefixTyping, conversationID, userID)
}
