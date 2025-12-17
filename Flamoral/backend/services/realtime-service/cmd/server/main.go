package main

import (
	"os"

	"github.com/heartly/realtime-service/internal/config"
	"github.com/heartly/realtime-service/internal/server"
	log "github.com/sirupsen/logrus"
)

func main() {
	// Configure logging
	setupLogging()

	log.Info("Starting Heartly Realtime Service")

	// Load configuration
	cfg := config.Load()

	log.WithFields(log.Fields{
		"port":        cfg.ServerPort,
		"environment": cfg.Environment,
		"redisHost":   cfg.RedisHost,
	}).Info("Configuration loaded")

	// Create and start server
	srv, err := server.New(cfg)
	if err != nil {
		log.WithError(err).Fatal("Failed to create server")
	}

	if err := srv.Start(); err != nil {
		log.WithError(err).Fatal("Server error")
	}
}

func setupLogging() {
	// Set log format
	log.SetFormatter(&log.JSONFormatter{
		TimestampFormat: "2006-01-02T15:04:05.000Z07:00",
	})

	// Set output to stdout
	log.SetOutput(os.Stdout)

	// Set log level
	level := os.Getenv("LOG_LEVEL")
	switch level {
	case "debug":
		log.SetLevel(log.DebugLevel)
	case "warn":
		log.SetLevel(log.WarnLevel)
	case "error":
		log.SetLevel(log.ErrorLevel)
	default:
		log.SetLevel(log.InfoLevel)
	}
}
