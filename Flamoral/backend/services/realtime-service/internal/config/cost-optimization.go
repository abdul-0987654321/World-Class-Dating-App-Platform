package config

import (
	"os"
	"strconv"
	"time"
)

// WebSocketCostOptimization contains configuration for cost-optimized WebSocket connections
type WebSocketCostOptimization struct {
	// Connection Pool Settings
	MaxConnections      int
	IdleTimeout         time.Duration
	HeartbeatInterval   time.Duration
	HeartbeatTimeout    time.Duration
	ConnectionDrainTime time.Duration

	// Compression Settings
	CompressionEnabled   bool
	CompressionThreshold int // Compress messages larger than this (bytes)
	CompressionLevel     int // 1-9, where 6 is balanced

	// Message Batching
	BatchingEnabled  bool
	BatchSize        int
	BatchInterval    time.Duration
	MaxBatchWaitTime time.Duration

	// Presence Optimization
	PresenceUpdateThrottle time.Duration
	PresenceBatchUpdates   bool
	PresenceBatchInterval  time.Duration

	// Rate Limiting
	MessageRateLimit       int           // Messages per minute per connection
	MessageRateLimitWindow time.Duration // Rate limit window

	// Memory Optimization
	MessageBufferSize    int
	ReadBufferSize       int
	WriteBufferSize      int
	MaxMessageQueueSize  int
	EnableMessagePooling bool

	// Auto-Scaling Triggers
	CPUThresholdScale     float64 // CPU percentage to trigger scaling
	MemoryThresholdScale  float64 // Memory percentage to trigger scaling
	ConnectionsPerInstance int     // Connections per instance before scaling
}

// GetWebSocketOptimizationConfig returns cost-optimized WebSocket configuration
func GetWebSocketOptimizationConfig() *WebSocketCostOptimization {
	return &WebSocketCostOptimization{
		// Connection Pool - Optimize for cost
		MaxConnections:      getEnvAsInt("WS_MAX_CONNECTIONS", 10000),
		IdleTimeout:         getEnvAsDuration("WS_IDLE_TIMEOUT", 5*time.Minute),
		HeartbeatInterval:   getEnvAsDuration("WS_HEARTBEAT_INTERVAL", 30*time.Second),
		HeartbeatTimeout:    getEnvAsDuration("WS_HEARTBEAT_TIMEOUT", 60*time.Second),
		ConnectionDrainTime: getEnvAsDuration("WS_CONNECTION_DRAIN_TIME", 30*time.Second),

		// Compression - Reduce bandwidth costs
		CompressionEnabled:   getEnvAsBool("WS_COMPRESSION_ENABLED", true),
		CompressionThreshold: getEnvAsInt("WS_COMPRESSION_THRESHOLD", 1024), // 1KB
		CompressionLevel:     getEnvAsInt("WS_COMPRESSION_LEVEL", 6),

		// Message Batching - Reduce message overhead
		BatchingEnabled:  getEnvAsBool("WS_BATCHING_ENABLED", true),
		BatchSize:        getEnvAsInt("WS_BATCH_SIZE", 10),
		BatchInterval:    getEnvAsDuration("WS_BATCH_INTERVAL", 100*time.Millisecond),
		MaxBatchWaitTime: getEnvAsDuration("WS_MAX_BATCH_WAIT", 500*time.Millisecond),

		// Presence Optimization - Reduce presence update frequency
		PresenceUpdateThrottle: getEnvAsDuration("WS_PRESENCE_THROTTLE", 30*time.Second),
		PresenceBatchUpdates:   getEnvAsBool("WS_PRESENCE_BATCH", true),
		PresenceBatchInterval:  getEnvAsDuration("WS_PRESENCE_BATCH_INTERVAL", 5*time.Second),

		// Rate Limiting - Prevent abuse
		MessageRateLimit:       getEnvAsInt("WS_MESSAGE_RATE_LIMIT", 60),
		MessageRateLimitWindow: getEnvAsDuration("WS_RATE_LIMIT_WINDOW", 1*time.Minute),

		// Memory Optimization
		MessageBufferSize:    getEnvAsInt("WS_MESSAGE_BUFFER_SIZE", 256),
		ReadBufferSize:       getEnvAsInt("WS_READ_BUFFER_SIZE", 4096),
		WriteBufferSize:      getEnvAsInt("WS_WRITE_BUFFER_SIZE", 4096),
		MaxMessageQueueSize:  getEnvAsInt("WS_MAX_MESSAGE_QUEUE", 100),
		EnableMessagePooling: getEnvAsBool("WS_MESSAGE_POOLING", true),

		// Auto-Scaling
		CPUThresholdScale:     getEnvAsFloat("WS_CPU_SCALE_THRESHOLD", 75.0),
		MemoryThresholdScale:  getEnvAsFloat("WS_MEMORY_SCALE_THRESHOLD", 80.0),
		ConnectionsPerInstance: getEnvAsInt("WS_CONNECTIONS_PER_INSTANCE", 5000),
	}
}

// Helper functions to get environment variables with defaults
func getEnvAsInt(key string, defaultVal int) int {
	if val := os.Getenv(key); val != "" {
		if intVal, err := strconv.Atoi(val); err == nil {
			return intVal
		}
	}
	return defaultVal
}

func getEnvAsBool(key string, defaultVal bool) bool {
	if val := os.Getenv(key); val != "" {
		if boolVal, err := strconv.ParseBool(val); err == nil {
			return boolVal
		}
	}
	return defaultVal
}

func getEnvAsDuration(key string, defaultVal time.Duration) time.Duration {
	if val := os.Getenv(key); val != "" {
		if duration, err := time.ParseDuration(val); err == nil {
			return duration
		}
	}
	return defaultVal
}

func getEnvAsFloat(key string, defaultVal float64) float64 {
	if val := os.Getenv(key); val != "" {
		if floatVal, err := strconv.ParseFloat(val, 64); err == nil {
			return floatVal
		}
	}
	return defaultVal
}

// CircuitBreakerConfig for external service calls
type CircuitBreakerConfig struct {
	FailureThreshold int
	SuccessThreshold int
	Timeout          time.Duration
	ResetTimeout     time.Duration
}

// GetCircuitBreakerConfig returns circuit breaker configuration
func GetCircuitBreakerConfig() *CircuitBreakerConfig {
	return &CircuitBreakerConfig{
		FailureThreshold: getEnvAsInt("CIRCUIT_BREAKER_FAILURE_THRESHOLD", 5),
		SuccessThreshold: getEnvAsInt("CIRCUIT_BREAKER_SUCCESS_THRESHOLD", 2),
		Timeout:          getEnvAsDuration("CIRCUIT_BREAKER_TIMEOUT", 30*time.Second),
		ResetTimeout:     getEnvAsDuration("CIRCUIT_BREAKER_RESET_TIMEOUT", 60*time.Second),
	}
}
