package config

import (
	"os"
	"strconv"
	"time"

	"github.com/joho/godotenv"
	log "github.com/sirupsen/logrus"
)

// Config holds all configuration for the realtime service
type Config struct {
	// Server settings
	ServerPort     string
	Environment    string
	AllowedOrigins []string

	// Redis settings
	RedisHost     string
	RedisPort     string
	RedisPassword string
	RedisDB       int

	// JWT settings
	JWTSecret     string
	JWTIssuer     string
	JWTExpiration time.Duration

	// Service-to-service authentication
	ServiceToken string

	// WebSocket settings
	WSReadBufferSize    int
	WSWriteBufferSize   int
	WSMaxMessageSize    int64
	WSPongWait          time.Duration
	WSPingPeriod        time.Duration
	WSWriteWait         time.Duration
	WSHandshakeTimeout  time.Duration

	// Rate limiting
	RateLimitRequests int
	RateLimitWindow   time.Duration

	// Presence settings
	PresenceTTL       time.Duration
	PresenceHeartbeat time.Duration

	// Typing settings
	TypingTimeout time.Duration
}

// Load loads configuration from environment variables
func Load() *Config {
	// Load .env file if exists
	if err := godotenv.Load(); err != nil {
		log.Debug("No .env file found, using environment variables")
	}

	cfg := &Config{
		// Server
		ServerPort:     getEnv("PORT", "8081"),
		Environment:    getEnv("ENVIRONMENT", "development"),
		AllowedOrigins: getEnvSlice("ALLOWED_ORIGINS", []string{"http://localhost:3000", "http://localhost:5173"}),

		// Redis
		RedisHost:     getEnv("REDIS_HOST", "localhost"),
		RedisPort:     getEnv("REDIS_PORT", "6379"),
		RedisPassword: getEnv("REDIS_PASSWORD", ""),
		RedisDB:       getEnvInt("REDIS_DB", 0),

		// JWT
		JWTSecret:     getEnv("JWT_SECRET", "your-secret-key-change-in-production"),
		JWTIssuer:     getEnv("JWT_ISSUER", "heartly"),
		JWTExpiration: getEnvDuration("JWT_EXPIRATION", 15*time.Minute),

		// Service auth
		ServiceToken: getEnv("SERVICE_TOKEN", "dev-service-token-change-in-production"),

		// WebSocket
		WSReadBufferSize:   getEnvInt("WS_READ_BUFFER_SIZE", 1024),
		WSWriteBufferSize:  getEnvInt("WS_WRITE_BUFFER_SIZE", 1024),
		WSMaxMessageSize:   int64(getEnvInt("WS_MAX_MESSAGE_SIZE", 512*1024)), // 512KB
		WSPongWait:         getEnvDuration("WS_PONG_WAIT", 60*time.Second),
		WSPingPeriod:       getEnvDuration("WS_PING_PERIOD", 54*time.Second),
		WSWriteWait:        getEnvDuration("WS_WRITE_WAIT", 10*time.Second),
		WSHandshakeTimeout: getEnvDuration("WS_HANDSHAKE_TIMEOUT", 10*time.Second),

		// Rate limiting
		RateLimitRequests: getEnvInt("RATE_LIMIT_REQUESTS", 100),
		RateLimitWindow:   getEnvDuration("RATE_LIMIT_WINDOW", time.Minute),

		// Presence
		PresenceTTL:       getEnvDuration("PRESENCE_TTL", 5*time.Minute),
		PresenceHeartbeat: getEnvDuration("PRESENCE_HEARTBEAT", 30*time.Second),

		// Typing
		TypingTimeout: getEnvDuration("TYPING_TIMEOUT", 5*time.Second),
	}

	// Ensure ping period is less than pong wait
	if cfg.WSPingPeriod >= cfg.WSPongWait {
		cfg.WSPingPeriod = (cfg.WSPongWait * 9) / 10
	}

	return cfg
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intValue, err := strconv.Atoi(value); err == nil {
			return intValue
		}
	}
	return defaultValue
}

func getEnvDuration(key string, defaultValue time.Duration) time.Duration {
	if value := os.Getenv(key); value != "" {
		if duration, err := time.ParseDuration(value); err == nil {
			return duration
		}
	}
	return defaultValue
}

func getEnvSlice(key string, defaultValue []string) []string {
	if value := os.Getenv(key); value != "" {
		return splitAndTrim(value, ",")
	}
	return defaultValue
}

func splitAndTrim(s, sep string) []string {
	var result []string
	for _, part := range splitString(s, sep) {
		trimmed := trimSpace(part)
		if trimmed != "" {
			result = append(result, trimmed)
		}
	}
	return result
}

func splitString(s, sep string) []string {
	var result []string
	start := 0
	for i := 0; i < len(s); i++ {
		if i+len(sep) <= len(s) && s[i:i+len(sep)] == sep {
			result = append(result, s[start:i])
			start = i + len(sep)
			i += len(sep) - 1
		}
	}
	result = append(result, s[start:])
	return result
}

func trimSpace(s string) string {
	start := 0
	end := len(s)
	for start < end && (s[start] == ' ' || s[start] == '\t' || s[start] == '\n' || s[start] == '\r') {
		start++
	}
	for end > start && (s[end-1] == ' ' || s[end-1] == '\t' || s[end-1] == '\n' || s[end-1] == '\r') {
		end--
	}
	return s[start:end]
}
