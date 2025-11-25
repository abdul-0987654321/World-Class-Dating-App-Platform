package websocket

import (
	"encoding/json"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/heartly/realtime-service/internal/presence"
	"github.com/heartly/realtime-service/internal/pubsub"
	"github.com/heartly/realtime-service/internal/typing"
	log "github.com/sirupsen/logrus"
)

// Hub maintains the set of active clients and broadcasts messages
type Hub struct {
	// Registered clients mapped by user ID
	clients map[string]map[string]*Client // userID -> clientID -> Client

	// Channel subscriptions
	subscriptions map[string]map[string]*Client // channel -> clientID -> Client

	// Register requests from clients
	Register chan *Client

	// Unregister requests from clients
	Unregister chan *Client

	// Broadcast channel for all clients
	Broadcast chan *BroadcastMessage

	// Redis pub/sub client
	redis *pubsub.RedisClient

	// Presence manager
	presence *presence.Manager

	// Typing manager
	typing *typing.Manager

	// Mutex for thread safety
	mu sync.RWMutex

	// Done channel for shutdown
	done chan struct{}
}

// BroadcastMessage represents a message to broadcast
type BroadcastMessage struct {
	Event      EventType
	Data       interface{}
	TargetIDs  []string // User IDs to target (empty = all)
	ExcludeIDs []string // User IDs to exclude
	Channel    string   // Specific channel to broadcast to
}

// NewHub creates a new Hub
func NewHub(redis *pubsub.RedisClient, presenceManager *presence.Manager, typingManager *typing.Manager) *Hub {
	return &Hub{
		clients:       make(map[string]map[string]*Client),
		subscriptions: make(map[string]map[string]*Client),
		Register:      make(chan *Client),
		Unregister:    make(chan *Client),
		Broadcast:     make(chan *BroadcastMessage, 256),
		redis:         redis,
		presence:      presenceManager,
		typing:        typingManager,
		done:          make(chan struct{}),
	}
}

// Run starts the hub's main loop
func (h *Hub) Run() {
	// Subscribe to Redis pub/sub channels
	messages, cleanup := h.redis.Subscribe(
		pubsub.ChannelMessages,
		pubsub.ChannelMatches,
		pubsub.ChannelNotifications,
		pubsub.ChannelPresence,
		pubsub.ChannelTyping,
		pubsub.ChannelCalls,
	)
	defer cleanup()

	for {
		select {
		case client := <-h.Register:
			h.registerClient(client)

		case client := <-h.Unregister:
			h.unregisterClient(client)

		case msg := <-h.Broadcast:
			h.broadcastMessage(msg)

		case pubsubMsg := <-messages:
			h.handlePubSubMessage(pubsubMsg)

		case <-h.done:
			return
		}
	}
}

// Stop stops the hub
func (h *Hub) Stop() {
	close(h.done)
}

// registerClient registers a new client
func (h *Hub) registerClient(client *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()

	// Add client to user's client map
	if _, ok := h.clients[client.UserID]; !ok {
		h.clients[client.UserID] = make(map[string]*Client)
	}
	h.clients[client.UserID][client.ID] = client

	log.WithFields(log.Fields{
		"clientId": client.ID,
		"userId":   client.UserID,
	}).Info("Client registered")

	// Update presence
	h.presence.SetOnline(client.UserID)

	// Send connected event
	client.SendMessage(EventConnected, ConnectedEvent{
		UserID:    client.UserID,
		SessionID: client.ID,
		ServerTime: time.Now(),
	})
}

// unregisterClient unregisters a client
func (h *Hub) unregisterClient(client *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()

	// Remove from user's client map
	if userClients, ok := h.clients[client.UserID]; ok {
		delete(userClients, client.ID)
		if len(userClients) == 0 {
			delete(h.clients, client.UserID)
			// Update presence to offline if no more connections
			h.presence.SetOffline(client.UserID)
		}
	}

	// Remove from all subscriptions
	for channel, subscribers := range h.subscriptions {
		delete(subscribers, client.ID)
		if len(subscribers) == 0 {
			delete(h.subscriptions, channel)
		}
	}

	// Close client
	close(client.Send)

	log.WithFields(log.Fields{
		"clientId": client.ID,
		"userId":   client.UserID,
	}).Info("Client unregistered")
}

// broadcastMessage broadcasts a message to appropriate clients
func (h *Hub) broadcastMessage(msg *BroadcastMessage) {
	h.mu.RLock()
	defer h.mu.RUnlock()

	msgJSON, err := NewMessage(msg.Event, msg.Data)
	if err != nil {
		log.WithError(err).Error("Failed to create broadcast message")
		return
	}

	msgBytes, err := json.Marshal(msgJSON)
	if err != nil {
		log.WithError(err).Error("Failed to marshal broadcast message")
		return
	}

	excludeSet := make(map[string]bool)
	for _, id := range msg.ExcludeIDs {
		excludeSet[id] = true
	}

	// If specific channel, broadcast to channel subscribers
	if msg.Channel != "" {
		if subscribers, ok := h.subscriptions[msg.Channel]; ok {
			for _, client := range subscribers {
				if !excludeSet[client.UserID] {
					select {
					case client.Send <- msgBytes:
					default:
						log.WithField("clientId", client.ID).Warn("Broadcast failed, buffer full")
					}
				}
			}
		}
		return
	}

	// If specific targets, send only to them
	if len(msg.TargetIDs) > 0 {
		for _, userID := range msg.TargetIDs {
			if excludeSet[userID] {
				continue
			}
			if userClients, ok := h.clients[userID]; ok {
				for _, client := range userClients {
					select {
					case client.Send <- msgBytes:
					default:
						log.WithField("clientId", client.ID).Warn("Broadcast failed, buffer full")
					}
				}
			}
		}
		return
	}

	// Broadcast to all clients
	for userID, userClients := range h.clients {
		if excludeSet[userID] {
			continue
		}
		for _, client := range userClients {
			select {
			case client.Send <- msgBytes:
			default:
				log.WithField("clientId", client.ID).Warn("Broadcast failed, buffer full")
			}
		}
	}
}

// handlePubSubMessage handles messages from Redis pub/sub
func (h *Hub) handlePubSubMessage(msg *pubsub.PubSubMessage) {
	switch msg.Type {
	case pubsub.TypeNewMessage:
		h.handleNewMessagePubSub(msg)
	case pubsub.TypeMessageRead:
		h.handleMessageReadPubSub(msg)
	case pubsub.TypeMessageReaction:
		h.handleMessageReactionPubSub(msg)
	case pubsub.TypeNewMatch:
		h.handleNewMatchPubSub(msg)
	case pubsub.TypeLikeReceived:
		h.handleLikeReceivedPubSub(msg)
	case pubsub.TypePresenceUpdate:
		h.handlePresenceUpdatePubSub(msg)
	case pubsub.TypeTypingStart, pubsub.TypeTypingStop:
		h.handleTypingPubSub(msg)
	case pubsub.TypeCallIncoming, pubsub.TypeCallAccepted, pubsub.TypeCallRejected, pubsub.TypeCallEnded:
		h.handleCallPubSub(msg)
	case pubsub.TypeNotification:
		h.handleNotificationPubSub(msg)
	}
}

func (h *Hub) handleNewMessagePubSub(msg *pubsub.PubSubMessage) {
	h.Broadcast <- &BroadcastMessage{
		Event:     EventMessageNew,
		Data:      msg.Payload,
		TargetIDs: msg.TargetIDs,
	}
}

func (h *Hub) handleMessageReadPubSub(msg *pubsub.PubSubMessage) {
	h.Broadcast <- &BroadcastMessage{
		Event:     EventMessageReadReceipt,
		Data:      msg.Payload,
		TargetIDs: msg.TargetIDs,
	}
}

func (h *Hub) handleMessageReactionPubSub(msg *pubsub.PubSubMessage) {
	h.Broadcast <- &BroadcastMessage{
		Event:     EventMessageReaction,
		Data:      msg.Payload,
		TargetIDs: msg.TargetIDs,
	}
}

func (h *Hub) handleNewMatchPubSub(msg *pubsub.PubSubMessage) {
	h.Broadcast <- &BroadcastMessage{
		Event:     EventMatchNew,
		Data:      msg.Payload,
		TargetIDs: msg.TargetIDs,
	}
}

func (h *Hub) handleLikeReceivedPubSub(msg *pubsub.PubSubMessage) {
	h.Broadcast <- &BroadcastMessage{
		Event:     EventLikeReceived,
		Data:      msg.Payload,
		TargetIDs: msg.TargetIDs,
	}
}

func (h *Hub) handlePresenceUpdatePubSub(msg *pubsub.PubSubMessage) {
	h.Broadcast <- &BroadcastMessage{
		Event:      EventPresenceChanged,
		Data:       msg.Payload,
		ExcludeIDs: []string{msg.UserID},
	}
}

func (h *Hub) handleTypingPubSub(msg *pubsub.PubSubMessage) {
	event := EventTypingIndicator
	h.Broadcast <- &BroadcastMessage{
		Event:      event,
		Data:       msg.Payload,
		TargetIDs:  msg.TargetIDs,
		ExcludeIDs: []string{msg.UserID},
	}
}

func (h *Hub) handleCallPubSub(msg *pubsub.PubSubMessage) {
	var event EventType
	switch msg.Type {
	case pubsub.TypeCallIncoming:
		event = EventCallIncoming
	case pubsub.TypeCallAccepted:
		event = EventCallAccepted
	case pubsub.TypeCallRejected:
		event = EventCallRejected
	case pubsub.TypeCallEnded:
		event = EventCallEnded
	}

	h.Broadcast <- &BroadcastMessage{
		Event:     event,
		Data:      msg.Payload,
		TargetIDs: msg.TargetIDs,
	}
}

func (h *Hub) handleNotificationPubSub(msg *pubsub.PubSubMessage) {
	h.Broadcast <- &BroadcastMessage{
		Event:     EventNotification,
		Data:      msg.Payload,
		TargetIDs: msg.TargetIDs,
	}
}

// SendToUser sends a message to all clients of a specific user
func (h *Hub) SendToUser(userID string, event EventType, data interface{}) {
	h.Broadcast <- &BroadcastMessage{
		Event:     event,
		Data:      data,
		TargetIDs: []string{userID},
	}
}

// SendToUsers sends a message to multiple users
func (h *Hub) SendToUsers(userIDs []string, event EventType, data interface{}) {
	h.Broadcast <- &BroadcastMessage{
		Event:     event,
		Data:      data,
		TargetIDs: userIDs,
	}
}

// GetOnlineUsers returns list of online user IDs
func (h *Hub) GetOnlineUsers() []string {
	h.mu.RLock()
	defer h.mu.RUnlock()

	users := make([]string, 0, len(h.clients))
	for userID := range h.clients {
		users = append(users, userID)
	}
	return users
}

// IsUserOnline checks if a user has any active connections
func (h *Hub) IsUserOnline(userID string) bool {
	h.mu.RLock()
	defer h.mu.RUnlock()

	clients, ok := h.clients[userID]
	return ok && len(clients) > 0
}

// GetUserConnectionCount returns the number of connections for a user
func (h *Hub) GetUserConnectionCount(userID string) int {
	h.mu.RLock()
	defer h.mu.RUnlock()

	if clients, ok := h.clients[userID]; ok {
		return len(clients)
	}
	return 0
}

// --- Message Handlers ---

// HandleMessageSend processes a new message send request
func (h *Hub) HandleMessageSend(client *Client, payload *SendMessagePayload, requestID string) {
	// Create message ID
	messageID := uuid.New().String()

	// Publish to Redis for processing by message service
	h.redis.Publish(pubsub.ChannelMessages, &pubsub.PubSubMessage{
		Type:   pubsub.TypeNewMessage,
		UserID: client.UserID,
		Payload: mustMarshal(map[string]interface{}{
			"messageId":      messageID,
			"conversationId": payload.ConversationID,
			"senderId":       client.UserID,
			"type":           payload.Type,
			"content":        payload.Content,
			"tempId":         payload.TempID,
			"replyTo":        payload.ReplyTo,
		}),
	})

	// Send delivery confirmation to sender
	client.SendMessage(EventMessageDelivered, MessageDeliveredEvent{
		MessageID: messageID,
		TempID:    payload.TempID,
	})
}

// HandleMessageRead processes a message read request
func (h *Hub) HandleMessageRead(client *Client, payload *ReadMessagePayload) {
	h.redis.Publish(pubsub.ChannelMessages, &pubsub.PubSubMessage{
		Type:   pubsub.TypeMessageRead,
		UserID: client.UserID,
		Payload: mustMarshal(map[string]interface{}{
			"conversationId": payload.ConversationID,
			"messageId":      payload.MessageID,
			"readBy":         client.UserID,
			"readAt":         time.Now(),
		}),
	})
}

// HandleMessageReact processes a message reaction
func (h *Hub) HandleMessageReact(client *Client, payload *ReactMessagePayload) {
	h.redis.Publish(pubsub.ChannelMessages, &pubsub.PubSubMessage{
		Type:   pubsub.TypeMessageReaction,
		UserID: client.UserID,
		Payload: mustMarshal(map[string]interface{}{
			"messageId": payload.MessageID,
			"userId":    client.UserID,
			"emoji":     payload.Emoji,
			"createdAt": time.Now(),
		}),
	})
}

// HandleTypingStart processes typing start event
func (h *Hub) HandleTypingStart(client *Client, conversationID string) {
	h.typing.StartTyping(client.UserID, conversationID)

	h.redis.Publish(pubsub.ChannelTyping, &pubsub.PubSubMessage{
		Type:   pubsub.TypeTypingStart,
		UserID: client.UserID,
		Payload: mustMarshal(TypingIndicatorEvent{
			ConversationID: conversationID,
			UserID:         client.UserID,
			IsTyping:       true,
		}),
	})
}

// HandleTypingStop processes typing stop event
func (h *Hub) HandleTypingStop(client *Client, conversationID string) {
	h.typing.StopTyping(client.UserID, conversationID)

	h.redis.Publish(pubsub.ChannelTyping, &pubsub.PubSubMessage{
		Type:   pubsub.TypeTypingStop,
		UserID: client.UserID,
		Payload: mustMarshal(TypingIndicatorEvent{
			ConversationID: conversationID,
			UserID:         client.UserID,
			IsTyping:       false,
		}),
	})
}

// HandlePresenceUpdate processes presence update
func (h *Hub) HandlePresenceUpdate(client *Client, status string) {
	switch status {
	case "online":
		h.presence.SetOnline(client.UserID)
	case "away":
		h.presence.SetAway(client.UserID)
	case "offline":
		h.presence.SetOffline(client.UserID)
	}

	h.redis.Publish(pubsub.ChannelPresence, &pubsub.PubSubMessage{
		Type:   pubsub.TypePresenceUpdate,
		UserID: client.UserID,
		Payload: mustMarshal(PresenceChangedEvent{
			UserID: client.UserID,
			Status: status,
		}),
	})
}

// HandleSubscribe handles channel subscription
func (h *Hub) HandleSubscribe(client *Client, channels []string) {
	h.mu.Lock()
	defer h.mu.Unlock()

	for _, channel := range channels {
		if _, ok := h.subscriptions[channel]; !ok {
			h.subscriptions[channel] = make(map[string]*Client)
		}
		h.subscriptions[channel][client.ID] = client
	}

	log.WithFields(log.Fields{
		"clientId": client.ID,
		"channels": channels,
	}).Debug("Client subscribed to channels")
}

// HandleUnsubscribe handles channel unsubscription
func (h *Hub) HandleUnsubscribe(client *Client, channels []string) {
	h.mu.Lock()
	defer h.mu.Unlock()

	for _, channel := range channels {
		if subscribers, ok := h.subscriptions[channel]; ok {
			delete(subscribers, client.ID)
			if len(subscribers) == 0 {
				delete(h.subscriptions, channel)
			}
		}
	}

	log.WithFields(log.Fields{
		"clientId": client.ID,
		"channels": channels,
	}).Debug("Client unsubscribed from channels")
}

func mustMarshal(v interface{}) json.RawMessage {
	data, _ := json.Marshal(v)
	return data
}
