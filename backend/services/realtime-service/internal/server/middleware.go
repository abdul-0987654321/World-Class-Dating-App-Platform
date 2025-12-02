package server

import (
	"context"
	"net/http"
	"runtime/debug"
	"time"

	"github.com/google/uuid"
	"github.com/heartly/realtime-service/internal/auth"
	log "github.com/sirupsen/logrus"
)

type contextKey string

const (
	contextKeyRequestID contextKey = "requestId"
	contextKeyUser      contextKey = "user"
)

// loggingMiddleware logs HTTP requests
func (s *Server) loggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()

		// Create response wrapper to capture status code
		wrapped := &responseWriter{ResponseWriter: w, statusCode: http.StatusOK}

		next.ServeHTTP(wrapped, r)

		// Skip logging for health checks
		if r.URL.Path == "/health" || r.URL.Path == "/ready" {
			return
		}

		duration := time.Since(start)

		log.WithFields(log.Fields{
			"method":     r.Method,
			"path":       r.URL.Path,
			"status":     wrapped.statusCode,
			"duration":   duration.String(),
			"remoteAddr": r.RemoteAddr,
			"requestId":  r.Context().Value(contextKeyRequestID),
		}).Info("HTTP request")
	})
}

// recoveryMiddleware recovers from panics
func (s *Server) recoveryMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if err := recover(); err != nil {
				log.WithFields(log.Fields{
					"error": err,
					"stack": string(debug.Stack()),
				}).Error("Panic recovered")

				http.Error(w, "Internal server error", http.StatusInternalServerError)
			}
		}()

		next.ServeHTTP(w, r)
	})
}

// requestIDMiddleware adds a request ID to each request
func (s *Server) requestIDMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requestID := r.Header.Get("X-Request-ID")
		if requestID == "" {
			requestID = uuid.New().String()
		}

		ctx := context.WithValue(r.Context(), contextKeyRequestID, requestID)
		w.Header().Set("X-Request-ID", requestID)

		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// authMiddleware validates JWT tokens for API endpoints
func (s *Server) authMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		token := auth.ExtractTokenFromRequest(r)
		if token == "" {
			respondError(w, http.StatusUnauthorized, "Missing authorization token")
			return
		}

		claims, err := s.jwtAuth.ValidateToken(token)
		if err != nil {
			switch err {
			case auth.ErrExpiredToken:
				respondError(w, http.StatusUnauthorized, "Token has expired")
			case auth.ErrInvalidSignature:
				respondError(w, http.StatusUnauthorized, "Invalid token signature")
			default:
				respondError(w, http.StatusUnauthorized, "Invalid token")
			}
			return
		}

		// Add user context to request
		userCtx := auth.NewUserContextFromClaims(claims)
		ctx := context.WithValue(r.Context(), contextKeyUser, userCtx)

		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// serviceAuthMiddleware validates service-to-service authentication
func (s *Server) serviceAuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Get service token from header
		serviceToken := r.Header.Get("X-Service-Token")
		if serviceToken == "" {
			respondError(w, http.StatusUnauthorized, "Missing service token")
			return
		}

		// Validate service token (should match configured service secret)
		expectedToken := s.config.ServiceToken
		if expectedToken == "" {
			log.Warn("Service token not configured, allowing request")
		} else if serviceToken != expectedToken {
			respondError(w, http.StatusUnauthorized, "Invalid service token")
			return
		}

		next.ServeHTTP(w, r)
	})
}

// getUserFromContext extracts user context from request context
func getUserFromContext(ctx context.Context) *auth.UserContext {
	if user, ok := ctx.Value(contextKeyUser).(*auth.UserContext); ok {
		return user
	}
	return nil
}

// responseWriter wraps http.ResponseWriter to capture status code
type responseWriter struct {
	http.ResponseWriter
	statusCode int
}

func (rw *responseWriter) WriteHeader(code int) {
	rw.statusCode = code
	rw.ResponseWriter.WriteHeader(code)
}
