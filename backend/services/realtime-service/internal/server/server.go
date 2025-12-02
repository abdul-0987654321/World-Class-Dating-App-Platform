package server

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gorilla/mux"
	"github.com/heartly/realtime-service/internal/auth"
	"github.com/heartly/realtime-service/internal/config"
	"github.com/heartly/realtime-service/internal/presence"
	"github.com/heartly/realtime-service/internal/pubsub"
	"github.com/heartly/realtime-service/internal/typing"
	"github.com/heartly/realtime-service/internal/websocket"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"github.com/rs/cors"
	log "github.com/sirupsen/logrus"
)

// Server represents the realtime server
type Server struct {
	config   *config.Config
	router   *mux.Router
	server   *http.Server
	redis    *pubsub.RedisClient
	hub      *websocket.Hub
	presence *presence.Manager
	typing   *typing.Manager
	jwtAuth  *auth.JWTAuth
}

// New creates a new server
func New(cfg *config.Config) (*Server, error) {
	// Initialize Redis
	redis, err := pubsub.NewRedisClient(cfg)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to Redis: %w", err)
	}

	// Initialize managers
	presenceManager := presence.NewManager(redis.GetClient(), cfg)
	typingManager := typing.NewManager(redis.GetClient(), cfg)
	jwtAuth := auth.NewJWTAuth(cfg)

	// Create hub
	hub := websocket.NewHub(redis, presenceManager, typingManager)

	s := &Server{
		config:   cfg,
		router:   mux.NewRouter(),
		redis:    redis,
		hub:      hub,
		presence: presenceManager,
		typing:   typingManager,
		jwtAuth:  jwtAuth,
	}

	s.setupRoutes()
	s.setupMiddleware()

	return s, nil
}

// setupRoutes configures the router
func (s *Server) setupRoutes() {
	// Health check
	s.router.HandleFunc("/health", s.healthHandler).Methods("GET")
	s.router.HandleFunc("/ready", s.readyHandler).Methods("GET")

	// Metrics
	s.router.Handle("/metrics", promhttp.Handler())

	// WebSocket endpoint
	s.router.HandleFunc("/ws", s.wsHandler).Methods("GET")

	// REST API endpoints
	api := s.router.PathPrefix("/api/v1").Subrouter()
	api.Use(s.authMiddleware)

	// Presence endpoints
	api.HandleFunc("/presence/{userId}", s.getPresenceHandler).Methods("GET")
	api.HandleFunc("/presence", s.getMultiplePresenceHandler).Methods("POST")
	api.HandleFunc("/online", s.getOnlineUsersHandler).Methods("GET")
	api.HandleFunc("/online/count", s.getOnlineCountHandler).Methods("GET")

	// Typing endpoints
	api.HandleFunc("/typing/{conversationId}", s.getTypingHandler).Methods("GET")

	// Internal API endpoints (service-to-service)
	internal := s.router.PathPrefix("/api/internal").Subrouter()
	internal.Use(s.serviceAuthMiddleware)

	// Message publishing endpoints
	internal.HandleFunc("/messages/publish", s.publishMessageHandler).Methods("POST")
	internal.HandleFunc("/messages/read-receipt", s.publishReadReceiptHandler).Methods("POST")
	internal.HandleFunc("/messages/typing", s.publishTypingHandler).Methods("POST")

	// Conversation management endpoints
	internal.HandleFunc("/conversations/{conversationId}/participants", s.getConversationParticipantsHandler).Methods("GET")
	internal.HandleFunc("/conversations/join", s.joinConversationHandler).Methods("POST")
	internal.HandleFunc("/conversations/leave", s.leaveConversationHandler).Methods("POST")
}

// setupMiddleware configures middleware
func (s *Server) setupMiddleware() {
	// CORS
	c := cors.New(cors.Options{
		AllowedOrigins:   s.config.AllowedOrigins,
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Authorization", "Content-Type", "X-Request-ID"},
		ExposedHeaders:   []string{"X-Request-ID"},
		AllowCredentials: true,
		MaxAge:           86400,
	})

	s.router.Use(c.Handler)
	s.router.Use(s.loggingMiddleware)
	s.router.Use(s.recoveryMiddleware)
	s.router.Use(s.requestIDMiddleware)
}

// Start starts the server
func (s *Server) Start() error {
	// Start the hub
	go s.hub.Run()

	// Create HTTP server
	s.server = &http.Server{
		Addr:         ":" + s.config.ServerPort,
		Handler:      s.router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Start server in goroutine
	go func() {
		log.WithField("port", s.config.ServerPort).Info("Starting realtime server")
		if err := s.server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.WithError(err).Fatal("Server failed to start")
		}
	}()

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Info("Shutting down server...")

	return s.Shutdown()
}

// Shutdown gracefully shuts down the server
func (s *Server) Shutdown() error {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// Stop hub
	s.hub.Stop()

	// Stop managers
	s.presence.Stop()
	s.typing.Stop()

	// Close Redis
	if err := s.redis.Close(); err != nil {
		log.WithError(err).Error("Failed to close Redis connection")
	}

	// Shutdown HTTP server
	if err := s.server.Shutdown(ctx); err != nil {
		return fmt.Errorf("server shutdown failed: %w", err)
	}

	log.Info("Server shutdown complete")
	return nil
}

// GetHub returns the WebSocket hub
func (s *Server) GetHub() *websocket.Hub {
	return s.hub
}

// GetPresence returns the presence manager
func (s *Server) GetPresence() *presence.Manager {
	return s.presence
}

// GetTyping returns the typing manager
func (s *Server) GetTyping() *typing.Manager {
	return s.typing
}
