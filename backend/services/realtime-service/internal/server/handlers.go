package server

import (
	"encoding/json"
	"net/http"

	"github.com/gorilla/mux"
	"github.com/gorilla/websocket"
	"github.com/heartly/realtime-service/internal/auth"
	ws "github.com/heartly/realtime-service/internal/websocket"
	log "github.com/sirupsen/logrus"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		// In production, validate origin against allowed list
		return true
	},
}

// healthHandler handles health check requests
func (s *Server) healthHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status":  "healthy",
		"service": "realtime-service",
	})
}

// readyHandler handles readiness check requests
func (s *Server) readyHandler(w http.ResponseWriter, r *http.Request) {
	// Check Redis connection
	if err := s.redis.GetClient().Ping(r.Context()).Err(); err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusServiceUnavailable)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"status": "not ready",
			"error":  "Redis connection failed",
		})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status": "ready",
	})
}

// wsHandler handles WebSocket connection upgrades
func (s *Server) wsHandler(w http.ResponseWriter, r *http.Request) {
	// Extract and validate token
	token := auth.ExtractTokenFromRequest(r)
	if token == "" {
		http.Error(w, "Missing authorization token", http.StatusUnauthorized)
		return
	}

	claims, err := s.jwtAuth.ValidateToken(token)
	if err != nil {
		log.WithError(err).Debug("Token validation failed")
		http.Error(w, "Invalid token", http.StatusUnauthorized)
		return
	}

	// Create user context
	userCtx := auth.NewUserContextFromClaims(claims)

	// Upgrade to WebSocket
	upgrader.HandshakeTimeout = s.config.WSHandshakeTimeout
	upgrader.ReadBufferSize = s.config.WSReadBufferSize
	upgrader.WriteBufferSize = s.config.WSWriteBufferSize

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.WithError(err).Error("WebSocket upgrade failed")
		return
	}

	// Create client
	client := ws.NewClient(s.hub, conn, userCtx, s.config)

	// Register client with hub
	s.hub.Register <- client

	// Start read and write pumps
	go client.WritePump()
	go client.ReadPump()

	log.WithFields(log.Fields{
		"userId":   userCtx.UserID,
		"clientId": client.ID,
	}).Info("WebSocket connection established")
}

// getPresenceHandler returns presence for a single user
func (s *Server) getPresenceHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	userID := vars["userId"]

	presence, err := s.presence.GetPresence(userID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to get presence")
		return
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"data":    presence,
	})
}

// getMultiplePresenceHandler returns presence for multiple users
func (s *Server) getMultiplePresenceHandler(w http.ResponseWriter, r *http.Request) {
	var request struct {
		UserIDs []string `json:"userIds"`
	}

	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if len(request.UserIDs) == 0 {
		respondError(w, http.StatusBadRequest, "User IDs required")
		return
	}

	if len(request.UserIDs) > 100 {
		respondError(w, http.StatusBadRequest, "Too many user IDs (max 100)")
		return
	}

	presences, err := s.presence.GetMultiplePresence(request.UserIDs)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to get presences")
		return
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"data":    presences,
	})
}

// getOnlineUsersHandler returns list of online users
func (s *Server) getOnlineUsersHandler(w http.ResponseWriter, r *http.Request) {
	users, err := s.presence.GetOnlineUsers()
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to get online users")
		return
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"data": map[string]interface{}{
			"users": users,
			"count": len(users),
		},
	})
}

// getOnlineCountHandler returns count of online users
func (s *Server) getOnlineCountHandler(w http.ResponseWriter, r *http.Request) {
	count, err := s.presence.GetOnlineCount()
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to get online count")
		return
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"data": map[string]interface{}{
			"count": count,
		},
	})
}

// getTypingHandler returns users typing in a conversation
func (s *Server) getTypingHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	conversationID := vars["conversationId"]

	users := s.typing.GetTypingUsers(conversationID)

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"data": map[string]interface{}{
			"conversationId": conversationID,
			"typingUsers":    users,
		},
	})
}

// Helper functions

func respondJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func respondError(w http.ResponseWriter, status int, message string) {
	respondJSON(w, status, map[string]interface{}{
		"success": false,
		"error": map[string]interface{}{
			"message": message,
		},
	})
}
