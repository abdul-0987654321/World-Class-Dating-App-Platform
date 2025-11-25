package websocket

import (
	"encoding/json"
	"time"
)

// EventType represents WebSocket event types
type EventType string

const (
	// Client -> Server events
	EventMessageSend    EventType = "message:send"
	EventMessageRead    EventType = "message:read"
	EventMessageReact   EventType = "message:react"
	EventTypingStart    EventType = "typing:start"
	EventTypingStop     EventType = "typing:stop"
	EventPresenceUpdate EventType = "presence:update"
	EventSubscribe      EventType = "subscribe"
	EventUnsubscribe    EventType = "unsubscribe"
	EventPing           EventType = "ping"

	// Server -> Client events
	EventMessageNew         EventType = "message:new"
	EventMessageDelivered   EventType = "message:delivered"
	EventMessageReadReceipt EventType = "message:read_receipt"
	EventMessageReaction    EventType = "message:reaction"
	EventTypingIndicator    EventType = "typing:indicator"
	EventPresenceChanged    EventType = "presence:changed"
	EventMatchNew           EventType = "match:new"
	EventLikeReceived       EventType = "like:received"
	EventSuperLikeReceived  EventType = "superlike:received"
	EventCallIncoming       EventType = "call:incoming"
	EventCallAccepted       EventType = "call:accepted"
	EventCallRejected       EventType = "call:rejected"
	EventCallEnded          EventType = "call:ended"
	EventNotification       EventType = "notification"
	EventPong               EventType = "pong"
	EventError              EventType = "error"
	EventConnected          EventType = "connected"
)

// Message represents a WebSocket message
type Message struct {
	Event     EventType       `json:"event"`
	Data      json.RawMessage `json:"data,omitempty"`
	RequestID string          `json:"requestId,omitempty"`
	Timestamp time.Time       `json:"timestamp"`
}

// NewMessage creates a new message
func NewMessage(event EventType, data interface{}) (*Message, error) {
	var rawData json.RawMessage
	var err error

	if data != nil {
		rawData, err = json.Marshal(data)
		if err != nil {
			return nil, err
		}
	}

	return &Message{
		Event:     event,
		Data:      rawData,
		Timestamp: time.Now(),
	}, nil
}

// ParseData parses the message data into the provided struct
func (m *Message) ParseData(v interface{}) error {
	if m.Data == nil {
		return nil
	}
	return json.Unmarshal(m.Data, v)
}

// --- Client -> Server Payloads ---

// SendMessagePayload represents data for sending a message
type SendMessagePayload struct {
	ConversationID string          `json:"conversationId"`
	Type           string          `json:"type"` // TEXT, IMAGE, GIF, VOICE, VIDEO
	Content        MessageContent  `json:"content"`
	TempID         string          `json:"tempId"` // Client-generated ID for optimistic updates
	ReplyTo        string          `json:"replyTo,omitempty"`
}

// MessageContent represents the content of a message
type MessageContent struct {
	Text         string       `json:"text,omitempty"`
	MediaURL     string       `json:"mediaUrl,omitempty"`
	ThumbnailURL string       `json:"thumbnailUrl,omitempty"`
	Duration     int          `json:"duration,omitempty"` // for voice/video
	GifID        string       `json:"gifId,omitempty"`
	LinkPreview  *LinkPreview `json:"linkPreview,omitempty"`
}

// LinkPreview represents a link preview
type LinkPreview struct {
	URL         string `json:"url"`
	Title       string `json:"title"`
	Description string `json:"description"`
	Image       string `json:"image"`
}

// ReadMessagePayload represents data for marking a message as read
type ReadMessagePayload struct {
	ConversationID string `json:"conversationId"`
	MessageID      string `json:"messageId"`
}

// ReactMessagePayload represents data for reacting to a message
type ReactMessagePayload struct {
	MessageID string `json:"messageId"`
	Emoji     string `json:"emoji"`
}

// TypingPayload represents typing indicator data
type TypingPayload struct {
	ConversationID string `json:"conversationId"`
}

// PresencePayload represents presence update data
type PresencePayload struct {
	Status string `json:"status"` // online, away, offline
}

// SubscribePayload represents subscription data
type SubscribePayload struct {
	Channels []string `json:"channels"`
}

// --- Server -> Client Payloads ---

// NewMessageEvent represents a new message event
type NewMessageEvent struct {
	Message        MessageData `json:"message"`
	ConversationID string      `json:"conversationId"`
}

// MessageData represents message data sent to clients
type MessageData struct {
	ID             string          `json:"id"`
	ConversationID string          `json:"conversationId"`
	SenderID       string          `json:"senderId"`
	Type           string          `json:"type"`
	Content        MessageContent  `json:"content"`
	Reactions      []ReactionData  `json:"reactions,omitempty"`
	ReadBy         []ReadByData    `json:"readBy,omitempty"`
	ReplyTo        string          `json:"replyTo,omitempty"`
	Status         string          `json:"status"`
	CreatedAt      time.Time       `json:"createdAt"`
}

// ReactionData represents a reaction
type ReactionData struct {
	UserID    string    `json:"userId"`
	Emoji     string    `json:"emoji"`
	CreatedAt time.Time `json:"createdAt"`
}

// ReadByData represents read receipt data
type ReadByData struct {
	UserID string    `json:"userId"`
	ReadAt time.Time `json:"readAt"`
}

// MessageDeliveredEvent represents a message delivered confirmation
type MessageDeliveredEvent struct {
	MessageID string `json:"messageId"`
	TempID    string `json:"tempId"`
}

// ReadReceiptEvent represents a read receipt event
type ReadReceiptEvent struct {
	ConversationID string    `json:"conversationId"`
	MessageID      string    `json:"messageId"`
	ReadBy         string    `json:"readBy"`
	ReadAt         time.Time `json:"readAt"`
}

// ReactionEvent represents a reaction event
type ReactionEvent struct {
	MessageID string       `json:"messageId"`
	Reaction  ReactionData `json:"reaction"`
}

// TypingIndicatorEvent represents a typing indicator event
type TypingIndicatorEvent struct {
	ConversationID string `json:"conversationId"`
	UserID         string `json:"userId"`
	IsTyping       bool   `json:"isTyping"`
}

// PresenceChangedEvent represents a presence change event
type PresenceChangedEvent struct {
	UserID   string     `json:"userId"`
	Status   string     `json:"status"`
	LastSeen *time.Time `json:"lastSeen,omitempty"`
}

// NewMatchEvent represents a new match event
type NewMatchEvent struct {
	Match        MatchData        `json:"match"`
	Conversation ConversationData `json:"conversation"`
}

// MatchData represents match information
type MatchData struct {
	ID           string    `json:"id"`
	UserID       string    `json:"userId"`
	MatchedWith  UserBrief `json:"matchedWith"`
	MatchedAt    time.Time `json:"matchedAt"`
	IsSuperLike  bool      `json:"isSuperLike"`
}

// UserBrief represents brief user information
type UserBrief struct {
	ID          string `json:"id"`
	DisplayName string `json:"displayName"`
	PhotoURL    string `json:"photoUrl"`
	Age         int    `json:"age,omitempty"`
}

// ConversationData represents conversation information
type ConversationData struct {
	ID           string      `json:"id"`
	Participants []UserBrief `json:"participants"`
	CreatedAt    time.Time   `json:"createdAt"`
}

// LikeReceivedEvent represents a like received event
type LikeReceivedEvent struct {
	LikerID     string    `json:"likerId"`
	IsSuperLike bool      `json:"isSuperLike"`
	ReceivedAt  time.Time `json:"receivedAt"`
	// Blurred info for non-premium users
	BlurredPhoto string `json:"blurredPhoto,omitempty"`
}

// CallEvent represents a call-related event
type CallEvent struct {
	CallID     string    `json:"callId"`
	CallerID   string    `json:"callerId"`
	CalleeID   string    `json:"calleeId"`
	Type       string    `json:"type"` // video, audio
	Action     string    `json:"action,omitempty"`
	RoomToken  string    `json:"roomToken,omitempty"`
	StartedAt  time.Time `json:"startedAt,omitempty"`
	EndedAt    time.Time `json:"endedAt,omitempty"`
}

// NotificationEvent represents a notification event
type NotificationEvent struct {
	ID        string                 `json:"id"`
	Type      string                 `json:"type"`
	Title     string                 `json:"title"`
	Body      string                 `json:"body"`
	Data      map[string]interface{} `json:"data,omitempty"`
	CreatedAt time.Time              `json:"createdAt"`
}

// ErrorEvent represents an error event
type ErrorEvent struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

// ConnectedEvent represents a connected event
type ConnectedEvent struct {
	UserID    string    `json:"userId"`
	SessionID string    `json:"sessionId"`
	ServerTime time.Time `json:"serverTime"`
}
