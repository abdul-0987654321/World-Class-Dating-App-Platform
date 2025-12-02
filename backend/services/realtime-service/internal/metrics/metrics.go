package metrics

import (
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

var (
	// WebSocket Connections
	WebSocketConnections = promauto.NewGauge(prometheus.GaugeOpts{
		Name: "realtime_websocket_connections_total",
		Help: "Total number of active WebSocket connections",
	})

	WebSocketConnectionsTotal = promauto.NewCounterVec(prometheus.CounterOpts{
		Name: "realtime_websocket_connections_count",
		Help: "Total number of WebSocket connections by status",
	}, []string{"status"}) // status: connected, disconnected, error

	// Messages
	MessagesReceived = promauto.NewCounterVec(prometheus.CounterOpts{
		Name: "realtime_messages_received_total",
		Help: "Total number of messages received by event type",
	}, []string{"event"})

	MessagesSent = promauto.NewCounterVec(prometheus.CounterOpts{
		Name: "realtime_messages_sent_total",
		Help: "Total number of messages sent by event type",
	}, []string{"event"})

	MessageProcessingDuration = promauto.NewHistogramVec(prometheus.HistogramOpts{
		Name:    "realtime_message_processing_duration_seconds",
		Help:    "Time taken to process messages",
		Buckets: prometheus.DefBuckets,
	}, []string{"event"})

	// Presence
	OnlineUsers = promauto.NewGauge(prometheus.GaugeOpts{
		Name: "realtime_online_users_total",
		Help: "Total number of online users",
	})

	PresenceUpdates = promauto.NewCounterVec(prometheus.CounterOpts{
		Name: "realtime_presence_updates_total",
		Help: "Total number of presence updates by status",
	}, []string{"status"}) // status: online, away, offline

	// Typing
	TypingIndicators = promauto.NewCounterVec(prometheus.CounterOpts{
		Name: "realtime_typing_indicators_total",
		Help: "Total number of typing indicators",
	}, []string{"action"}) // action: start, stop

	// Redis
	RedisPubSubMessages = promauto.NewCounterVec(prometheus.CounterOpts{
		Name: "realtime_redis_pubsub_messages_total",
		Help: "Total number of Redis pub/sub messages by type",
	}, []string{"type"})

	RedisOperationDuration = promauto.NewHistogramVec(prometheus.HistogramOpts{
		Name:    "realtime_redis_operation_duration_seconds",
		Help:    "Time taken for Redis operations",
		Buckets: prometheus.DefBuckets,
	}, []string{"operation"})

	RedisErrors = promauto.NewCounterVec(prometheus.CounterOpts{
		Name: "realtime_redis_errors_total",
		Help: "Total number of Redis errors by operation",
	}, []string{"operation"})

	// Errors
	Errors = promauto.NewCounterVec(prometheus.CounterOpts{
		Name: "realtime_errors_total",
		Help: "Total number of errors by type",
	}, []string{"type", "event"})

	// Hub
	BroadcastQueueSize = promauto.NewGauge(prometheus.GaugeOpts{
		Name: "realtime_broadcast_queue_size",
		Help: "Current size of the broadcast queue",
	})

	ClientSendBufferSize = promauto.NewHistogram(prometheus.HistogramOpts{
		Name:    "realtime_client_send_buffer_size",
		Help:    "Client send buffer size distribution",
		Buckets: []float64{0, 10, 50, 100, 200, 500, 1000, 2000, 5000},
	})
)

// RecordWebSocketConnection records a new WebSocket connection
func RecordWebSocketConnection(status string) {
	if status == "connected" {
		WebSocketConnections.Inc()
	} else if status == "disconnected" {
		WebSocketConnections.Dec()
	}
	WebSocketConnectionsTotal.WithLabelValues(status).Inc()
}

// RecordMessageReceived records a received message
func RecordMessageReceived(event string) {
	MessagesReceived.WithLabelValues(event).Inc()
}

// RecordMessageSent records a sent message
func RecordMessageSent(event string) {
	MessagesSent.WithLabelValues(event).Inc()
}

// RecordPresenceUpdate records a presence update
func RecordPresenceUpdate(status string) {
	PresenceUpdates.WithLabelValues(status).Inc()
}

// RecordTypingIndicator records a typing indicator
func RecordTypingIndicator(action string) {
	TypingIndicators.WithLabelValues(action).Inc()
}

// RecordRedisPubSubMessage records a Redis pub/sub message
func RecordRedisPubSubMessage(msgType string) {
	RedisPubSubMessages.WithLabelValues(msgType).Inc()
}

// RecordError records an error
func RecordError(errorType, event string) {
	Errors.WithLabelValues(errorType, event).Inc()
}

// UpdateOnlineUsers updates the online users count
func UpdateOnlineUsers(count int64) {
	OnlineUsers.Set(float64(count))
}

// UpdateBroadcastQueueSize updates the broadcast queue size
func UpdateBroadcastQueueSize(size int) {
	BroadcastQueueSize.Set(float64(size))
}

// RecordClientSendBufferSize records client send buffer size
func RecordClientSendBufferSize(size int) {
	ClientSendBufferSize.Observe(float64(size))
}
