package auth

import (
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/heartly/realtime-service/internal/config"
)

var (
	ErrInvalidToken     = errors.New("invalid token")
	ErrExpiredToken     = errors.New("token has expired")
	ErrMissingToken     = errors.New("missing authorization token")
	ErrInvalidSignature = errors.New("invalid token signature")
)

// Claims represents the JWT claims structure
type Claims struct {
	UserID       string `json:"userId"`
	Email        string `json:"email"`
	Role         string `json:"role"`
	Subscription string `json:"subscription,omitempty"`
	DeviceID     string `json:"deviceId,omitempty"`
	jwt.RegisteredClaims
}

// JWTAuth handles JWT authentication
type JWTAuth struct {
	secret []byte
	issuer string
}

// NewJWTAuth creates a new JWT authenticator
func NewJWTAuth(cfg *config.Config) *JWTAuth {
	return &JWTAuth{
		secret: []byte(cfg.JWTSecret),
		issuer: cfg.JWTIssuer,
	}
}

// ValidateToken validates a JWT token and returns the claims
func (j *JWTAuth) ValidateToken(tokenString string) (*Claims, error) {
	// Remove Bearer prefix if present
	tokenString = strings.TrimPrefix(tokenString, "Bearer ")
	tokenString = strings.TrimSpace(tokenString)

	if tokenString == "" {
		return nil, ErrMissingToken
	}

	// Parse and validate the token
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		// Validate the signing method
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return j.secret, nil
	})

	if err != nil {
		if errors.Is(err, jwt.ErrTokenExpired) {
			return nil, ErrExpiredToken
		}
		if errors.Is(err, jwt.ErrSignatureInvalid) {
			return nil, ErrInvalidSignature
		}
		return nil, ErrInvalidToken
	}

	// Extract claims
	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, ErrInvalidToken
	}

	return claims, nil
}

// GenerateToken generates a new JWT token (used for testing)
func (j *JWTAuth) GenerateToken(userID, email, role string, expiration time.Duration) (string, error) {
	claims := &Claims{
		UserID: userID,
		Email:  email,
		Role:   role,
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    j.issuer,
			Subject:   userID,
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(expiration)),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(j.secret)
}

// ExtractTokenFromRequest extracts the JWT token from an HTTP request
func ExtractTokenFromRequest(r *http.Request) string {
	// Try Authorization header first
	authHeader := r.Header.Get("Authorization")
	if authHeader != "" {
		return strings.TrimPrefix(authHeader, "Bearer ")
	}

	// Try query parameter (for WebSocket connections)
	token := r.URL.Query().Get("token")
	if token != "" {
		return token
	}

	// Try cookie
	cookie, err := r.Cookie("access_token")
	if err == nil {
		return cookie.Value
	}

	return ""
}

// UserContext holds authenticated user information
type UserContext struct {
	UserID       string
	Email        string
	Role         string
	Subscription string
	DeviceID     string
}

// NewUserContextFromClaims creates a UserContext from JWT claims
func NewUserContextFromClaims(claims *Claims) *UserContext {
	return &UserContext{
		UserID:       claims.UserID,
		Email:        claims.Email,
		Role:         claims.Role,
		Subscription: claims.Subscription,
		DeviceID:     claims.DeviceID,
	}
}
