package presence

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"
	"time"

	"github.com/go-redis/redis/v8"
	"github.com/heartly/realtime-service/internal/config"
	log "github.com/sirupsen/logrus"
)

const (
	// Status constants
	StatusOnline  = "online"
	StatusAway    = "away"
	StatusOffline = "offline"

	// Redis key prefixes
	keyPrefixPresence = "heartly:presence:"
	keyPrefixLastSeen = "heartly:lastseen:"
	keyOnlineUsers    = "heartly:online_users"
)

// UserPresence represents a user's presence status
type UserPresence struct {
	UserID    string    `json:"userId"`
	Status    string    `json:"status"`
	LastSeen  time.Time `json:"lastSeen"`
	UpdatedAt time.Time `json:"updatedAt"`
}

// Manager handles user presence tracking
type Manager struct {
	redis  *redis.Client
	ctx    context.Context
	config *config.Config

	// Local cache for hot data
	cache   map[string]*UserPresence
	cacheMu sync.RWMutex

	// Subscribers for presence changes
	subscribers   map[string][]chan *UserPresence
	subscribersMu sync.RWMutex

	done chan struct{}
}

// NewManager creates a new presence manager
func NewManager(redisClient *redis.Client, cfg *config.Config) *Manager {
	m := &Manager{
		redis:       redisClient,
		ctx:         context.Background(),
		config:      cfg,
		cache:       make(map[string]*UserPresence),
		subscribers: make(map[string][]chan *UserPresence),
		done:        make(chan struct{}),
	}

	// Start background tasks
	go m.cleanupLoop()
	go m.heartbeatLoop()

	return m
}

// Stop stops the presence manager
func (m *Manager) Stop() {
	close(m.done)
}

// SetOnline sets a user's status to online
func (m *Manager) SetOnline(userID string) error {
	return m.setStatus(userID, StatusOnline)
}

// SetAway sets a user's status to away
func (m *Manager) SetAway(userID string) error {
	return m.setStatus(userID, StatusAway)
}

// SetOffline sets a user's status to offline
func (m *Manager) SetOffline(userID string) error {
	presence := &UserPresence{
		UserID:    userID,
		Status:    StatusOffline,
		LastSeen:  time.Now(),
		UpdatedAt: time.Now(),
	}

	// Update cache
	m.cacheMu.Lock()
	m.cache[userID] = presence
	m.cacheMu.Unlock()

	// Remove from online set
	if err := m.redis.SRem(m.ctx, keyOnlineUsers, userID).Err(); err != nil {
		log.WithError(err).Error("Failed to remove user from online set")
	}

	// Update last seen
	lastSeenKey := keyPrefixLastSeen + userID
	if err := m.redis.Set(m.ctx, lastSeenKey, time.Now().Unix(), 0).Err(); err != nil {
		log.WithError(err).Error("Failed to update last seen")
	}

	// Delete presence key
	presenceKey := keyPrefixPresence + userID
	if err := m.redis.Del(m.ctx, presenceKey).Err(); err != nil {
		log.WithError(err).Error("Failed to delete presence key")
	}

	// Notify subscribers
	m.notifySubscribers(userID, presence)

	log.WithField("userId", userID).Debug("User set offline")

	return nil
}

// setStatus sets a user's presence status
func (m *Manager) setStatus(userID, status string) error {
	presence := &UserPresence{
		UserID:    userID,
		Status:    status,
		LastSeen:  time.Now(),
		UpdatedAt: time.Now(),
	}

	// Update cache
	m.cacheMu.Lock()
	m.cache[userID] = presence
	m.cacheMu.Unlock()

	// Store in Redis with TTL
	presenceKey := keyPrefixPresence + userID
	data, err := json.Marshal(presence)
	if err != nil {
		return fmt.Errorf("failed to marshal presence: %w", err)
	}

	if err := m.redis.Set(m.ctx, presenceKey, data, m.config.PresenceTTL).Err(); err != nil {
		return fmt.Errorf("failed to set presence: %w", err)
	}

	// Add to online users set
	if status == StatusOnline {
		if err := m.redis.SAdd(m.ctx, keyOnlineUsers, userID).Err(); err != nil {
			log.WithError(err).Error("Failed to add user to online set")
		}
	}

	// Notify subscribers
	m.notifySubscribers(userID, presence)

	log.WithFields(log.Fields{
		"userId": userID,
		"status": status,
	}).Debug("User presence updated")

	return nil
}

// GetPresence gets a user's presence status
func (m *Manager) GetPresence(userID string) (*UserPresence, error) {
	// Check cache first
	m.cacheMu.RLock()
	if presence, ok := m.cache[userID]; ok {
		m.cacheMu.RUnlock()
		return presence, nil
	}
	m.cacheMu.RUnlock()

	// Check Redis
	presenceKey := keyPrefixPresence + userID
	data, err := m.redis.Get(m.ctx, presenceKey).Bytes()
	if err != nil {
		if err == redis.Nil {
			// User is offline, get last seen
			return m.getOfflinePresence(userID)
		}
		return nil, fmt.Errorf("failed to get presence: %w", err)
	}

	var presence UserPresence
	if err := json.Unmarshal(data, &presence); err != nil {
		return nil, fmt.Errorf("failed to unmarshal presence: %w", err)
	}

	// Update cache
	m.cacheMu.Lock()
	m.cache[userID] = &presence
	m.cacheMu.Unlock()

	return &presence, nil
}

// getOfflinePresence gets presence for an offline user
func (m *Manager) getOfflinePresence(userID string) (*UserPresence, error) {
	lastSeenKey := keyPrefixLastSeen + userID
	lastSeenUnix, err := m.redis.Get(m.ctx, lastSeenKey).Int64()

	var lastSeen time.Time
	if err == nil {
		lastSeen = time.Unix(lastSeenUnix, 0)
	} else {
		lastSeen = time.Time{} // Zero time if never seen
	}

	return &UserPresence{
		UserID:    userID,
		Status:    StatusOffline,
		LastSeen:  lastSeen,
		UpdatedAt: time.Now(),
	}, nil
}

// GetMultiplePresence gets presence for multiple users
func (m *Manager) GetMultiplePresence(userIDs []string) (map[string]*UserPresence, error) {
	result := make(map[string]*UserPresence)

	// Build keys
	keys := make([]string, len(userIDs))
	for i, userID := range userIDs {
		keys[i] = keyPrefixPresence + userID
	}

	// Get all from Redis
	values, err := m.redis.MGet(m.ctx, keys...).Result()
	if err != nil {
		return nil, fmt.Errorf("failed to get presences: %w", err)
	}

	for i, val := range values {
		userID := userIDs[i]
		if val == nil {
			// User is offline
			presence, _ := m.getOfflinePresence(userID)
			result[userID] = presence
			continue
		}

		var presence UserPresence
		if err := json.Unmarshal([]byte(val.(string)), &presence); err != nil {
			log.WithError(err).WithField("userId", userID).Error("Failed to unmarshal presence")
			continue
		}
		result[userID] = &presence
	}

	return result, nil
}

// IsOnline checks if a user is online
func (m *Manager) IsOnline(userID string) bool {
	presence, err := m.GetPresence(userID)
	if err != nil {
		return false
	}
	return presence.Status == StatusOnline
}

// GetOnlineUsers returns a list of online user IDs
func (m *Manager) GetOnlineUsers() ([]string, error) {
	return m.redis.SMembers(m.ctx, keyOnlineUsers).Result()
}

// GetOnlineCount returns the count of online users
func (m *Manager) GetOnlineCount() (int64, error) {
	return m.redis.SCard(m.ctx, keyOnlineUsers).Result()
}

// Subscribe subscribes to presence changes for a user
func (m *Manager) Subscribe(userID string) chan *UserPresence {
	ch := make(chan *UserPresence, 10)

	m.subscribersMu.Lock()
	m.subscribers[userID] = append(m.subscribers[userID], ch)
	m.subscribersMu.Unlock()

	return ch
}

// Unsubscribe unsubscribes from presence changes
func (m *Manager) Unsubscribe(userID string, ch chan *UserPresence) {
	m.subscribersMu.Lock()
	defer m.subscribersMu.Unlock()

	subs := m.subscribers[userID]
	for i, sub := range subs {
		if sub == ch {
			m.subscribers[userID] = append(subs[:i], subs[i+1:]...)
			close(sub)
			break
		}
	}
}

// notifySubscribers notifies all subscribers of a presence change
func (m *Manager) notifySubscribers(userID string, presence *UserPresence) {
	m.subscribersMu.RLock()
	defer m.subscribersMu.RUnlock()

	for _, ch := range m.subscribers[userID] {
		select {
		case ch <- presence:
		default:
			// Channel full, skip
		}
	}
}

// Heartbeat refreshes a user's presence TTL
func (m *Manager) Heartbeat(userID string) error {
	presenceKey := keyPrefixPresence + userID
	return m.redis.Expire(m.ctx, presenceKey, m.config.PresenceTTL).Err()
}

// cleanupLoop periodically cleans up expired cache entries
func (m *Manager) cleanupLoop() {
	ticker := time.NewTicker(time.Minute)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			m.cleanupCache()
		case <-m.done:
			return
		}
	}
}

// cleanupCache removes stale entries from the cache
func (m *Manager) cleanupCache() {
	m.cacheMu.Lock()
	defer m.cacheMu.Unlock()

	now := time.Now()
	for userID, presence := range m.cache {
		// Remove offline entries older than TTL
		if presence.Status == StatusOffline && now.Sub(presence.UpdatedAt) > m.config.PresenceTTL {
			delete(m.cache, userID)
		}
	}
}

// heartbeatLoop sends periodic heartbeats for cached online users
func (m *Manager) heartbeatLoop() {
	ticker := time.NewTicker(m.config.PresenceHeartbeat)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			m.sendHeartbeats()
		case <-m.done:
			return
		}
	}
}

// sendHeartbeats refreshes TTL for all online users in cache
func (m *Manager) sendHeartbeats() {
	m.cacheMu.RLock()
	defer m.cacheMu.RUnlock()

	for userID, presence := range m.cache {
		if presence.Status == StatusOnline {
			if err := m.Heartbeat(userID); err != nil {
				log.WithError(err).WithField("userId", userID).Error("Failed to send heartbeat")
			}
		}
	}
}
