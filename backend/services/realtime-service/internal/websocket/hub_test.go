package websocket

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/heartly/realtime-service/internal/auth"
	"github.com/heartly/realtime-service/internal/config"
	"github.com/heartly/realtime-service/internal/presence"
	"github.com/heartly/realtime-service/internal/pubsub"
	"github.com/heartly/realtime-service/internal/typing"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// MockClient creates a mock client for testing
func createMockClient(hub *Hub, userID string) *Client {
	cfg := &config.Config{
		WSMaxMessageSize: 1024,
		WSPongWait:       60 * time.Second,
		WSPingPeriod:     54 * time.Second,
		WSWriteWait:      10 * time.Second,
	}

	userCtx := &auth.UserContext{
		UserID: userID,
		Email:  userID + "@test.com",
		Role:   "user",
	}

	return &Client{
		ID:            "client-" + userID,
		UserID:        userID,
		User:          userCtx,
		Hub:           hub,
		Send:          make(chan []byte, 256),
		Done:          make(chan struct{}),
		config:        cfg,
		subscriptions: make(map[string]bool),
	}
}

func TestHubRegisterClient(t *testing.T) {
	// Create mock dependencies
	cfg := &config.Config{
		PresenceTTL:       5 * time.Minute,
		PresenceHeartbeat: 30 * time.Second,
		TypingTimeout:     5 * time.Second,
	}

	// Note: In real tests, you'd use actual Redis or mock it
	// For this example, we're showing the structure
	redis := &pubsub.RedisClient{}
	presenceManager := presence.NewManager(nil, cfg)
	typingManager := typing.NewManager(nil, cfg)

	hub := NewHub(redis, presenceManager, typingManager)

	client := createMockClient(hub, "user-1")

	// Register client
	hub.registerClient(client)

	// Verify client is registered
	assert.Contains(t, hub.clients, client.UserID)
	assert.Contains(t, hub.clients[client.UserID], client.ID)
	assert.Equal(t, client, hub.clients[client.UserID][client.ID])
}

func TestHubUnregisterClient(t *testing.T) {
	cfg := &config.Config{
		PresenceTTL:       5 * time.Minute,
		PresenceHeartbeat: 30 * time.Second,
		TypingTimeout:     5 * time.Second,
	}

	redis := &pubsub.RedisClient{}
	presenceManager := presence.NewManager(nil, cfg)
	typingManager := typing.NewManager(nil, cfg)

	hub := NewHub(redis, presenceManager, typingManager)

	client := createMockClient(hub, "user-1")

	// Register then unregister
	hub.registerClient(client)
	hub.unregisterClient(client)

	// Verify client is unregistered
	assert.NotContains(t, hub.clients, client.UserID)
}

func TestHubMultipleClientsPerUser(t *testing.T) {
	cfg := &config.Config{
		PresenceTTL:       5 * time.Minute,
		PresenceHeartbeat: 30 * time.Second,
		TypingTimeout:     5 * time.Second,
	}

	redis := &pubsub.RedisClient{}
	presenceManager := presence.NewManager(nil, cfg)
	typingManager := typing.NewManager(nil, cfg)

	hub := NewHub(redis, presenceManager, typingManager)

	// Register two clients for the same user
	client1 := createMockClient(hub, "user-1")
	client2 := createMockClient(hub, "user-1")
	client2.ID = "client-user-1-2" // Different client ID

	hub.registerClient(client1)
	hub.registerClient(client2)

	// Verify both clients are registered
	assert.Len(t, hub.clients[client1.UserID], 2)

	// Unregister first client
	hub.unregisterClient(client1)

	// User should still be in hub (second client still connected)
	assert.Contains(t, hub.clients, client1.UserID)
	assert.Len(t, hub.clients[client1.UserID], 1)

	// Unregister second client
	hub.unregisterClient(client2)

	// User should be removed from hub
	assert.NotContains(t, hub.clients, client1.UserID)
}

func TestHubBroadcastToTargetUsers(t *testing.T) {
	cfg := &config.Config{
		PresenceTTL:       5 * time.Minute,
		PresenceHeartbeat: 30 * time.Second,
		TypingTimeout:     5 * time.Second,
	}

	redis := &pubsub.RedisClient{}
	presenceManager := presence.NewManager(nil, cfg)
	typingManager := typing.NewManager(nil, cfg)

	hub := NewHub(redis, presenceManager, typingManager)

	// Register clients
	client1 := createMockClient(hub, "user-1")
	client2 := createMockClient(hub, "user-2")
	client3 := createMockClient(hub, "user-3")

	hub.registerClient(client1)
	hub.registerClient(client2)
	hub.registerClient(client3)

	// Broadcast to specific users
	msg := &BroadcastMessage{
		Event:     EventMessageNew,
		Data:      map[string]string{"test": "data"},
		TargetIDs: []string{"user-1", "user-2"},
	}

	hub.broadcastMessage(msg)

	// Verify message received by target users
	select {
	case <-client1.Send:
		// Success
	case <-time.After(100 * time.Millisecond):
		t.Error("Client 1 did not receive message")
	}

	select {
	case <-client2.Send:
		// Success
	case <-time.After(100 * time.Millisecond):
		t.Error("Client 2 did not receive message")
	}

	// Verify client3 did not receive message
	select {
	case <-client3.Send:
		t.Error("Client 3 should not have received message")
	case <-time.After(50 * time.Millisecond):
		// Success
	}
}

func TestHubGetOnlineUsers(t *testing.T) {
	cfg := &config.Config{
		PresenceTTL:       5 * time.Minute,
		PresenceHeartbeat: 30 * time.Second,
		TypingTimeout:     5 * time.Second,
	}

	redis := &pubsub.RedisClient{}
	presenceManager := presence.NewManager(nil, cfg)
	typingManager := typing.NewManager(nil, cfg)

	hub := NewHub(redis, presenceManager, typingManager)

	// Register clients
	client1 := createMockClient(hub, "user-1")
	client2 := createMockClient(hub, "user-2")

	hub.registerClient(client1)
	hub.registerClient(client2)

	// Get online users
	users := hub.GetOnlineUsers()

	assert.Len(t, users, 2)
	assert.Contains(t, users, "user-1")
	assert.Contains(t, users, "user-2")
}

func TestHubIsUserOnline(t *testing.T) {
	cfg := &config.Config{
		PresenceTTL:       5 * time.Minute,
		PresenceHeartbeat: 30 * time.Second,
		TypingTimeout:     5 * time.Second,
	}

	redis := &pubsub.RedisClient{}
	presenceManager := presence.NewManager(nil, cfg)
	typingManager := typing.NewManager(nil, cfg)

	hub := NewHub(redis, presenceManager, typingManager)

	client := createMockClient(hub, "user-1")

	// User not online initially
	assert.False(t, hub.IsUserOnline("user-1"))

	// Register client
	hub.registerClient(client)

	// User should be online
	assert.True(t, hub.IsUserOnline("user-1"))

	// Unregister client
	hub.unregisterClient(client)

	// User should be offline
	assert.False(t, hub.IsUserOnline("user-1"))
}

func TestNewMessage(t *testing.T) {
	data := map[string]string{
		"test": "data",
	}

	msg, err := NewMessage(EventMessageNew, data)

	assert.NoError(t, err)
	assert.Equal(t, EventMessageNew, msg.Event)
	assert.NotNil(t, msg.Data)

	// Parse data back
	var parsedData map[string]string
	err = msg.ParseData(&parsedData)

	assert.NoError(t, err)
	assert.Equal(t, data, parsedData)
}

func TestMessageSerialization(t *testing.T) {
	payload := SendMessagePayload{
		ConversationID: "conv-123",
		Type:           "TEXT",
		Content: MessageContent{
			Text: "Hello, World!",
		},
		TempID: "temp-456",
	}

	msg, err := NewMessage(EventMessageSend, payload)
	assert.NoError(t, err)

	// Serialize
	msgBytes, err := json.Marshal(msg)
	assert.NoError(t, err)

	// Deserialize
	var deserialized Message
	err = json.Unmarshal(msgBytes, &deserialized)
	assert.NoError(t, err)

	// Parse data
	var parsedPayload SendMessagePayload
	err = deserialized.ParseData(&parsedPayload)
	assert.NoError(t, err)

	assert.Equal(t, payload.ConversationID, parsedPayload.ConversationID)
	assert.Equal(t, payload.Type, parsedPayload.Type)
	assert.Equal(t, payload.Content.Text, parsedPayload.Content.Text)
	assert.Equal(t, payload.TempID, parsedPayload.TempID)
}
