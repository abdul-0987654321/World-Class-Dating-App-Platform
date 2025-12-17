#!/bin/bash
# Fix realtime-service to support Redis TLS

# 1. Add RedisTLS to config struct
CONFIG_FILE="backend/services/realtime-service/internal/config/config.go"
sed -i '/RedisPassword string/a\	RedisTLS      bool' "$CONFIG_FILE"
sed -i '/RedisDB:       getEnvInt/a\		RedisTLS:      getEnvBool("REDIS_TLS", false),' "$CONFIG_FILE"

# Add getEnvBool function if it doesn't exist
if ! grep -q "func getEnvBool" "$CONFIG_FILE"; then
cat >> "$CONFIG_FILE" << 'EOF'

func getEnvBool(key string, defaultValue bool) bool {
	if value := os.Getenv(key); value != "" {
		if boolValue, err := strconv.ParseBool(value); err == nil {
			return boolValue
		}
	}
	return defaultValue
}
EOF
fi

# 2. Add TLS support to Redis client
REDIS_FILE="backend/services/realtime-service/internal/pubsub/redis.go"
# Add crypto/tls import
sed -i '/^import (/a\	"crypto/tls"' "$REDIS_FILE"

# Modify NewRedisClient function to support TLS
sed -i '/client := redis.NewClient(&redis.Options{/,/})/{
s/client := redis.NewClient(&redis.Options{/opts := \&redis.Options{/
s/DialTimeout:  5 \* time.Second,/DialTimeout:  10 * time.Second,/
s/ReadTimeout:  3 \* time.Second,/ReadTimeout:  5 * time.Second,/
s/WriteTimeout: 3 \* time.Second,/WriteTimeout: 5 * time.Second,/
s/})/}\n\n\t\/\/ Enable TLS for Azure Redis\n\tif cfg.RedisTLS {\n\t\topts.TLSConfig = \&tls.Config{\n\t\t\tMinVersion: tls.VersionTLS12,\n\t\t}\n\t\tlog.Info("Redis TLS enabled")\n\t}\n\n\tclient := redis.NewClient(opts)/
}' "$REDIS_FILE"

echo "Fixed realtime-service for Redis TLS support"
