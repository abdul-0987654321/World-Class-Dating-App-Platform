package server

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/gorilla/mux"
	"github.com/gorilla/websocket"
	"github.com/heartly/realtime-service/internal/auth"
	"github.com/heartly/realtime-service/internal/pubsub"
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

// publishMessageHandler handles internal API for publishing messages
func (s *Server) publishMessageHandler(w http.ResponseWriter, r *http.Request) {
	var request struct {
		ConversationID string                 `json:"conversationId"`
		MessageID      string                 `json:"messageId"`
		SenderID       string                 `json:"senderId"`
		ReceiverID     string                 `json:"receiverId"`
		Content        string                 `json:"content"`
		Type           string                 `json:"type"`
		Metadata       map[string]interface{} `json:"metadata"`
	}

	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	// Validate required fields
	if request.ConversationID == "" || request.MessageID == "" || request.SenderID == "" {
		respondError(w, http.StatusBadRequest, "Missing required fields")
		return
	}

	// Publish message to Redis for WebSocket clients
	err := s.redis.Publish(pubsub.ChannelMessages, &pubsub.PubSubMessage{
		Type:      pubsub.TypeNewMessage,
		UserID:    request.SenderID,
		TargetIDs: []string{request.ReceiverID},
		Payload: mustMarshalJSON(map[string]interface{}{
			"id":             request.MessageID,
			"conversationId": request.ConversationID,
			"senderId":       request.SenderID,
			"receiverId":     request.ReceiverID,
			"content":        request.Content,
			"type":           request.Type,
			"metadata":       request.Metadata,
		}),
	})

	if err != nil {
		log.WithError(err).Error("Failed to publish message")
		respondError(w, http.StatusInternalServerError, "Failed to publish message")
		return
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"message": "Message published successfully",
	})
}

// publishReadReceiptHandler handles internal API for publishing read receipts
func (s *Server) publishReadReceiptHandler(w http.ResponseWriter, r *http.Request) {
	var request struct {
		ConversationID string   `json:"conversationId"`
		MessageIDs     []string `json:"messageIds"`
		ReadBy         string   `json:"readBy"`
		SenderID       string   `json:"senderId"`
	}

	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	// Publish read receipt to Redis
	err := s.redis.Publish(pubsub.ChannelMessages, &pubsub.PubSubMessage{
		Type:      pubsub.TypeMessageRead,
		UserID:    request.ReadBy,
		TargetIDs: []string{request.SenderID},
		Payload: mustMarshalJSON(map[string]interface{}{
			"conversationId": request.ConversationID,
			"messageIds":     request.MessageIDs,
			"readBy":         request.ReadBy,
			"readAt":         time.Now(),
		}),
	})

	if err != nil {
		log.WithError(err).Error("Failed to publish read receipt")
		respondError(w, http.StatusInternalServerError, "Failed to publish read receipt")
		return
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"message": "Read receipt published successfully",
	})
}

// publishTypingHandler handles internal API for publishing typing indicators
func (s *Server) publishTypingHandler(w http.ResponseWriter, r *http.Request) {
	var request struct {
		ConversationID string `json:"conversationId"`
		UserID         string `json:"userId"`
		TargetUserID   string `json:"targetUserId"`
		IsTyping       bool   `json:"isTyping"`
	}

	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	msgType := pubsub.TypeTypingStart
	if !request.IsTyping {
		msgType = pubsub.TypeTypingStop
	}

	err := s.redis.Publish(pubsub.ChannelTyping, &pubsub.PubSubMessage{
		Type:      msgType,
		UserID:    request.UserID,
		TargetIDs: []string{request.TargetUserID},
		Payload: mustMarshalJSON(map[string]interface{}{
			"conversationId": request.ConversationID,
			"userId":         request.UserID,
			"isTyping":       request.IsTyping,
		}),
	})

	if err != nil {
		log.WithError(err).Error("Failed to publish typing indicator")
		respondError(w, http.StatusInternalServerError, "Failed to publish typing indicator")
		return
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"message": "Typing indicator published successfully",
	})
}

// getConversationParticipantsHandler returns online participants in a conversation
func (s *Server) getConversationParticipantsHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	conversationID := vars["conversationId"]

	participants := s.hub.GetConversationParticipants(conversationID)

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"data": map[string]interface{}{
			"conversationId": conversationID,
			"participants":   participants,
			"count":          len(participants),
		},
	})
}

// joinConversationHandler allows a user to join a conversation room
func (s *Server) joinConversationHandler(w http.ResponseWriter, r *http.Request) {
	var request struct {
		ConversationID string `json:"conversationId"`
		UserID         string `json:"userId"`
	}

	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	s.hub.JoinConversation(request.UserID, request.ConversationID)

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"message": "User joined conversation successfully",
	})
}

// leaveConversationHandler allows a user to leave a conversation room
func (s *Server) leaveConversationHandler(w http.ResponseWriter, r *http.Request) {
	var request struct {
		ConversationID string `json:"conversationId"`
		UserID         string `json:"userId"`
	}

	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	s.hub.LeaveConversation(request.UserID, request.ConversationID)

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"message": "User left conversation successfully",
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

func mustMarshalJSON(v interface{}) json.RawMessage {
	data, _ := json.Marshal(v)
	return data
}
