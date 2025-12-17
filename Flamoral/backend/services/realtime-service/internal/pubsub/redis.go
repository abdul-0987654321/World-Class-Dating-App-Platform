package pubsub

import (
	"context"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"time"

	"github.com/go-redis/redis/v8"
	"github.com/heartly/realtime-service/internal/config"
	log "github.com/sirupsen/logrus"
)

// Channel constants for pub/sub
const (
	ChannelMessages     = "heartly:messages"
	ChannelMatches      = "heartly:matches"
	ChannelNotifications = "heartly:notifications"
	ChannelPresence     = "heartly:presence"
	ChannelTyping       = "heartly:typing"
	ChannelCalls        = "heartly:calls"
)

// MessageType represents the type of pub/sub message
type MessageType string

const (
	TypeNewMessage       MessageType = "NEW_MESSAGE"
	TypeMessageRead      MessageType = "MESSAGE_READ"
	TypeMessageDelivered MessageType = "MESSAGE_DELIVERED"
	TypeMessageReaction  MessageType = "MESSAGE_REACTION"
	TypeNewMatch         MessageType = "NEW_MATCH"
	TypeLikeReceived     MessageType = "LIKE_RECEIVED"
	TypePresenceUpdate   MessageType = "PRESENCE_UPDATE"
	TypeTypingStart      MessageType = "TYPING_START"
	TypeTypingStop       MessageType = "TYPING_STOP"
	TypeCallIncoming     MessageType = "CALL_INCOMING"
	TypeCallAccepted     MessageType = "CALL_ACCEPTED"
	TypeCallRejected     MessageType = "CALL_REJECTED"
	TypeCallEnded        MessageType = "CALL_ENDED"
	TypeNotification     MessageType = "NOTIFICATION"
)

// PubSubMessage represents a message sent through pub/sub
type PubSubMessage struct {
	Type      MessageType     `json:"type"`
	UserID    string          `json:"userId"`
	TargetIDs []string        `json:"targetIds,omitempty"`
	Payload   json.RawMessage `json:"payload"`
	Timestamp time.Time       `json:"timestamp"`
}

// RedisClient wraps the Redis client with pub/sub functionality
type RedisClient struct {
	client *redis.Client
	ctx    context.Context
}

// NewRedisClient creates a new Redis client with TLS support
func NewRedisClient(cfg *config.Config) (*RedisClient, error) {
	ctx := context.Background()

	opts := &redis.Options{
		Addr:         fmt.Sprintf("%s:%s", cfg.RedisHost, cfg.RedisPort),
		Password:     cfg.RedisPassword,
		DB:           cfg.RedisDB,
		PoolSize:     100,
		MinIdleConns: 10,
		DialTimeout:  10 * time.Second,
		ReadTimeout:  5 * time.Second,
		WriteTimeout: 5 * time.Second,
	}

	// Enable TLS for Azure Redis
	if cfg.RedisTLS {
		opts.TLSConfig = &tls.Config{
			MinVersion: tls.VersionTLS12,
		}
		log.Info("Redis TLS enabled")
	}

	client := redis.NewClient(opts)

	// Test connection
	if err := client.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("failed to connect to Redis: %w", err)
	}

	log.Info("Connected to Redis successfully")

	return &RedisClient{
		client: client,
		ctx:    ctx,
	}, nil
}

// Close closes the Redis client
func (r *RedisClient) Close() error {
	return r.client.Close()
}

// Publish publishes a message to a channel
func (r *RedisClient) Publish(channel string, message *PubSubMessage) error {
	message.Timestamp = time.Now()

	data, err := json.Marshal(message)
	if err != nil {
		return fmt.Errorf("failed to marshal message: %w", err)
	}

	if err := r.client.Publish(r.ctx, channel, data).Err(); err != nil {
		return fmt.Errorf("failed to publish message: %w", err)
	}

	return nil
}

// PublishToUser publishes a message directly to a user's channel
func (r *RedisClient) PublishToUser(userID string, message *PubSubMessage) error {
	channel := fmt.Sprintf("heartly:user:%s", userID)
	return r.Publish(channel, message)
}

// Subscribe subscribes to channels and returns a channel for messages
func (r *RedisClient) Subscribe(channels ...string) (<-chan *PubSubMessage, func()) {
	pubsub := r.client.Subscribe(r.ctx, channels...)
	messageChan := make(chan *PubSubMessage, 100)

	go func() {
		defer close(messageChan)

		for msg := range pubsub.Channel() {
			var pubsubMsg PubSubMessage
			if err := json.Unmarshal([]byte(msg.Payload), &pubsubMsg); err != nil {
				log.WithError(err).Error("Failed to unmarshal pub/sub message")
				continue
			}

			select {
			case messageChan <- &pubsubMsg:
			default:
				log.Warn("Message channel full, dropping message")
			}
		}
	}()

	cleanup := func() {
		pubsub.Close()
	}

	return messageChan, cleanup
}

// SubscribeToUserChannel subscribes to a specific user's channel
func (r *RedisClient) SubscribeToUserChannel(userID string) (<-chan *PubSubMessage, func()) {
	channel := fmt.Sprintf("heartly:user:%s", userID)
	return r.Subscribe(channel)
}

// Set stores a value with optional expiration
func (r *RedisClient) Set(key string, value interface{}, expiration time.Duration) error {
	data, err := json.Marshal(value)
	if err != nil {
		return fmt.Errorf("failed to marshal value: %w", err)
	}
	return r.client.Set(r.ctx, key, data, expiration).Err()
}

// Get retrieves a value
func (r *RedisClient) Get(key string, dest interface{}) error {
	data, err := r.client.Get(r.ctx, key).Bytes()
	if err != nil {
		if err == redis.Nil {
			return nil
		}
		return err
	}
	return json.Unmarshal(data, dest)
}

// Delete removes a key
func (r *RedisClient) Delete(keys ...string) error {
	return r.client.Del(r.ctx, keys...).Err()
}

// SetAdd adds members to a set
func (r *RedisClient) SetAdd(key string, members ...interface{}) error {
	return r.client.SAdd(r.ctx, key, members...).Err()
}

// SetRemove removes members from a set
func (r *RedisClient) SetRemove(key string, members ...interface{}) error {
	return r.client.SRem(r.ctx, key, members...).Err()
}

// SetMembers returns all members of a set
func (r *RedisClient) SetMembers(key string) ([]string, error) {
	return r.client.SMembers(r.ctx, key).Result()
}

// SetIsMember checks if a member exists in a set
func (r *RedisClient) SetIsMember(key string, member interface{}) (bool, error) {
	return r.client.SIsMember(r.ctx, key, member).Result()
}

// Expire sets expiration on a key
func (r *RedisClient) Expire(key string, expiration time.Duration) error {
	return r.client.Expire(r.ctx, key, expiration).Err()
}

// GetClient returns the underlying Redis client for advanced operations
func (r *RedisClient) GetClient() *redis.Client {
	return r.client
}

// Context returns the context
func (r *RedisClient) Context() context.Context {
	return r.ctx
}
