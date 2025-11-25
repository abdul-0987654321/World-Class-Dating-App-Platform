package websocket

import (
	"encoding/json"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"github.com/heartly/realtime-service/internal/auth"
	"github.com/heartly/realtime-service/internal/config"
	log "github.com/sirupsen/logrus"
)

// Client represents a WebSocket client connection
type Client struct {
	ID       string
	UserID   string
	DeviceID string
	User     *auth.UserContext
	Hub      *Hub
	Conn     *websocket.Conn
	Send     chan []byte
	Done     chan struct{}

	config      *config.Config
	mu          sync.RWMutex
	lastPing    time.Time
	isClosing   bool
	subscriptions map[string]bool
}

// NewClient creates a new WebSocket client
func NewClient(hub *Hub, conn *websocket.Conn, user *auth.UserContext, cfg *config.Config) *Client {
	return &Client{
		ID:            uuid.New().String(),
		UserID:        user.UserID,
		DeviceID:      user.DeviceID,
		User:          user,
		Hub:           hub,
		Conn:          conn,
		Send:          make(chan []byte, 256),
		Done:          make(chan struct{}),
		config:        cfg,
		lastPing:      time.Now(),
		subscriptions: make(map[string]bool),
	}
}

// ReadPump pumps messages from the WebSocket connection to the hub
func (c *Client) ReadPump() {
	defer func() {
		c.Hub.Unregister <- c
		c.Conn.Close()
	}()

	c.Conn.SetReadLimit(c.config.WSMaxMessageSize)
	c.Conn.SetReadDeadline(time.Now().Add(c.config.WSPongWait))
	c.Conn.SetPongHandler(func(string) error {
		c.mu.Lock()
		c.lastPing = time.Now()
		c.mu.Unlock()
		c.Conn.SetReadDeadline(time.Now().Add(c.config.WSPongWait))
		return nil
	})

	for {
		_, messageBytes, err := c.Conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.WithError(err).WithField("clientId", c.ID).Error("WebSocket read error")
			}
			break
		}

		var msg Message
		if err := json.Unmarshal(messageBytes, &msg); err != nil {
			c.SendError("INVALID_MESSAGE", "Failed to parse message")
			continue
		}

		c.handleMessage(&msg)
	}
}

// WritePump pumps messages from the hub to the WebSocket connection
func (c *Client) WritePump() {
	ticker := time.NewTicker(c.config.WSPingPeriod)
	defer func() {
		ticker.Stop()
		c.Conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.Send:
			c.Conn.SetWriteDeadline(time.Now().Add(c.config.WSWriteWait))
			if !ok {
				// Hub closed the channel
				c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.Conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			w.Write(message)

			// Write any queued messages
			n := len(c.Send)
			for i := 0; i < n; i++ {
				w.Write([]byte{'\n'})
				w.Write(<-c.Send)
			}

			if err := w.Close(); err != nil {
				return
			}

		case <-ticker.C:
			c.Conn.SetWriteDeadline(time.Now().Add(c.config.WSWriteWait))
			if err := c.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}

		case <-c.Done:
			return
		}
	}
}

// handleMessage processes incoming WebSocket messages
func (c *Client) handleMessage(msg *Message) {
	logger := log.WithFields(log.Fields{
		"clientId": c.ID,
		"userId":   c.UserID,
		"event":    msg.Event,
	})

	switch msg.Event {
	case EventPing:
		c.handlePing(msg)

	case EventMessageSend:
		c.handleMessageSend(msg)

	case EventMessageRead:
		c.handleMessageRead(msg)

	case EventMessageReact:
		c.handleMessageReact(msg)

	case EventTypingStart:
		c.handleTypingStart(msg)

	case EventTypingStop:
		c.handleTypingStop(msg)

	case EventPresenceUpdate:
		c.handlePresenceUpdate(msg)

	case EventSubscribe:
		c.handleSubscribe(msg)

	case EventUnsubscribe:
		c.handleUnsubscribe(msg)

	default:
		logger.Warn("Unknown event type")
		c.SendError("UNKNOWN_EVENT", "Unknown event type")
	}
}

// handlePing handles ping messages
func (c *Client) handlePing(msg *Message) {
	c.SendMessage(EventPong, map[string]interface{}{
		"timestamp": time.Now(),
	})
}

// handleMessageSend handles sending a new message
func (c *Client) handleMessageSend(msg *Message) {
	var payload SendMessagePayload
	if err := msg.ParseData(&payload); err != nil {
		c.SendError("INVALID_PAYLOAD", "Invalid message payload")
		return
	}

	// Forward to hub for processing
	c.Hub.HandleMessageSend(c, &payload, msg.RequestID)
}

// handleMessageRead handles marking a message as read
func (c *Client) handleMessageRead(msg *Message) {
	var payload ReadMessagePayload
	if err := msg.ParseData(&payload); err != nil {
		c.SendError("INVALID_PAYLOAD", "Invalid payload")
		return
	}

	c.Hub.HandleMessageRead(c, &payload)
}

// handleMessageReact handles message reactions
func (c *Client) handleMessageReact(msg *Message) {
	var payload ReactMessagePayload
	if err := msg.ParseData(&payload); err != nil {
		c.SendError("INVALID_PAYLOAD", "Invalid payload")
		return
	}

	c.Hub.HandleMessageReact(c, &payload)
}

// handleTypingStart handles typing start event
func (c *Client) handleTypingStart(msg *Message) {
	var payload TypingPayload
	if err := msg.ParseData(&payload); err != nil {
		c.SendError("INVALID_PAYLOAD", "Invalid payload")
		return
	}

	c.Hub.HandleTypingStart(c, payload.ConversationID)
}

// handleTypingStop handles typing stop event
func (c *Client) handleTypingStop(msg *Message) {
	var payload TypingPayload
	if err := msg.ParseData(&payload); err != nil {
		c.SendError("INVALID_PAYLOAD", "Invalid payload")
		return
	}

	c.Hub.HandleTypingStop(c, payload.ConversationID)
}

// handlePresenceUpdate handles presence update
func (c *Client) handlePresenceUpdate(msg *Message) {
	var payload PresencePayload
	if err := msg.ParseData(&payload); err != nil {
		c.SendError("INVALID_PAYLOAD", "Invalid payload")
		return
	}

	c.Hub.HandlePresenceUpdate(c, payload.Status)
}

// handleSubscribe handles channel subscription
func (c *Client) handleSubscribe(msg *Message) {
	var payload SubscribePayload
	if err := msg.ParseData(&payload); err != nil {
		c.SendError("INVALID_PAYLOAD", "Invalid payload")
		return
	}

	c.mu.Lock()
	for _, channel := range payload.Channels {
		c.subscriptions[channel] = true
	}
	c.mu.Unlock()

	c.Hub.HandleSubscribe(c, payload.Channels)
}

// handleUnsubscribe handles channel unsubscription
func (c *Client) handleUnsubscribe(msg *Message) {
	var payload SubscribePayload
	if err := msg.ParseData(&payload); err != nil {
		c.SendError("INVALID_PAYLOAD", "Invalid payload")
		return
	}

	c.mu.Lock()
	for _, channel := range payload.Channels {
		delete(c.subscriptions, channel)
	}
	c.mu.Unlock()

	c.Hub.HandleUnsubscribe(c, payload.Channels)
}

// SendMessage sends a message to the client
func (c *Client) SendMessage(event EventType, data interface{}) error {
	msg, err := NewMessage(event, data)
	if err != nil {
		return err
	}

	msgBytes, err := json.Marshal(msg)
	if err != nil {
		return err
	}

	c.mu.RLock()
	if c.isClosing {
		c.mu.RUnlock()
		return nil
	}
	c.mu.RUnlock()

	select {
	case c.Send <- msgBytes:
		return nil
	default:
		log.WithField("clientId", c.ID).Warn("Client send buffer full")
		return nil
	}
}

// SendError sends an error message to the client
func (c *Client) SendError(code, message string) {
	c.SendMessage(EventError, ErrorEvent{
		Code:    code,
		Message: message,
	})
}

// Close closes the client connection
func (c *Client) Close() {
	c.mu.Lock()
	if c.isClosing {
		c.mu.Unlock()
		return
	}
	c.isClosing = true
	c.mu.Unlock()

	close(c.Done)
}

// IsSubscribed checks if client is subscribed to a channel
func (c *Client) IsSubscribed(channel string) bool {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.subscriptions[channel]
}

// GetSubscriptions returns all subscribed channels
func (c *Client) GetSubscriptions() []string {
	c.mu.RLock()
	defer c.mu.RUnlock()

	channels := make([]string, 0, len(c.subscriptions))
	for channel := range c.subscriptions {
		channels = append(channels, channel)
	}
	return channels
}
