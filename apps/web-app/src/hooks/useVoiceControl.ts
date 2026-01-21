/**
 * Voice Control Navigation Hook
 * Enables voice-controlled navigation for accessibility
 * Uses Web Speech API for speech recognition
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

// Check for browser support
const SpeechRecognition =
  (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

export interface VoiceCommand {
  phrases: string[];
  action: () => void;
  description: string;
  category: 'navigation' | 'action' | 'ui' | 'accessibility';
}

export interface VoiceControlState {
  isListening: boolean;
  isSupported: boolean;
  isEnabled: boolean;
  transcript: string;
  lastCommand: string | null;
  error: string | null;
  confidence: number;
}

export interface VoiceControlOptions {
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
  onCommand?: (command: string, confidence: number) => void;
  onError?: (error: string) => void;
  onStart?: () => void;
  onEnd?: () => void;
}

const DEFAULT_OPTIONS: VoiceControlOptions = {
  language: 'en-US',
  continuous: true,
  interimResults: true,
};

export function useVoiceControl(options: VoiceControlOptions = {}) {
  const navigate = useNavigate();
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const [state, setState] = useState<VoiceControlState>({
    isListening: false,
    isSupported: !!SpeechRecognition,
    isEnabled: false,
    transcript: '',
    lastCommand: null,
    error: null,
    confidence: 0,
  });

  const recognitionRef = useRef<any>(null);
  const commandsRef = useRef<VoiceCommand[]>([]);

  // Built-in navigation commands
  const defaultCommands: VoiceCommand[] = [
    // Navigation
    {
      phrases: ['go home', 'home', 'go to home', 'navigate home'],
      action: () => navigate('/'),
      description: 'Navigate to home page',
      category: 'navigation',
    },
    {
      phrases: ['go to discover', 'discover', 'find matches', 'show matches'],
      action: () => navigate('/discover'),
      description: 'Navigate to discover page',
      category: 'navigation',
    },
    {
      phrases: ['go to messages', 'messages', 'show messages', 'open messages', 'chat'],
      action: () => navigate('/messages'),
      description: 'Navigate to messages',
      category: 'navigation',
    },
    {
      phrases: ['go to profile', 'my profile', 'show profile', 'view profile'],
      action: () => navigate('/profile'),
      description: 'Navigate to profile',
      category: 'navigation',
    },
    {
      phrases: ['go to settings', 'settings', 'open settings'],
      action: () => navigate('/settings'),
      description: 'Navigate to settings',
      category: 'navigation',
    },
    {
      phrases: ['go to safety', 'safety center', 'open safety'],
      action: () => navigate('/safety'),
      description: 'Navigate to safety center',
      category: 'navigation',
    },
    {
      phrases: ['go to subscription', 'subscription', 'upgrade', 'premium'],
      action: () => navigate('/subscription'),
      description: 'Navigate to subscription page',
      category: 'navigation',
    },
    {
      phrases: ['go back', 'back', 'previous page', 'go to previous'],
      action: () => navigate(-1),
      description: 'Go to previous page',
      category: 'navigation',
    },
    {
      phrases: ['go forward', 'forward', 'next page'],
      action: () => navigate(1),
      description: 'Go to next page',
      category: 'navigation',
    },

    // Actions
    {
      phrases: ['like', 'like this', 'swipe right', 'yes'],
      action: () => document.dispatchEvent(new CustomEvent('voice:like')),
      description: 'Like current profile',
      category: 'action',
    },
    {
      phrases: ['pass', 'skip', 'swipe left', 'no', 'next'],
      action: () => document.dispatchEvent(new CustomEvent('voice:pass')),
      description: 'Pass on current profile',
      category: 'action',
    },
    {
      phrases: ['super like', 'superlike', 'love this'],
      action: () => document.dispatchEvent(new CustomEvent('voice:superlike')),
      description: 'Super like current profile',
      category: 'action',
    },
    {
      phrases: ['send message', 'send', 'reply'],
      action: () => document.dispatchEvent(new CustomEvent('voice:send')),
      description: 'Send current message',
      category: 'action',
    },

    // UI Controls
    {
      phrases: ['scroll down', 'page down', 'down'],
      action: () => window.scrollBy({ top: 300, behavior: 'smooth' }),
      description: 'Scroll down',
      category: 'ui',
    },
    {
      phrases: ['scroll up', 'page up', 'up'],
      action: () => window.scrollBy({ top: -300, behavior: 'smooth' }),
      description: 'Scroll up',
      category: 'ui',
    },
    {
      phrases: ['scroll to top', 'go to top', 'top of page'],
      action: () => window.scrollTo({ top: 0, behavior: 'smooth' }),
      description: 'Scroll to top',
      category: 'ui',
    },
    {
      phrases: ['scroll to bottom', 'go to bottom', 'bottom of page'],
      action: () => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }),
      description: 'Scroll to bottom',
      category: 'ui',
    },
    {
      phrases: ['close', 'close modal', 'dismiss', 'cancel'],
      action: () => {
        document.dispatchEvent(new CustomEvent('voice:close'));
        // Also try to find and click close buttons
        const closeBtn = document.querySelector('[aria-label="Close"]') as HTMLElement;
        if (closeBtn) closeBtn.click();
      },
      description: 'Close current modal or dialog',
      category: 'ui',
    },
    {
      phrases: ['confirm', 'ok', 'yes please', 'accept'],
      action: () => {
        document.dispatchEvent(new CustomEvent('voice:confirm'));
        const confirmBtn = document.querySelector('[data-confirm]') as HTMLElement;
        if (confirmBtn) confirmBtn.click();
      },
      description: 'Confirm current action',
      category: 'ui',
    },

    // Accessibility
    {
      phrases: ['stop listening', 'stop voice', 'voice off', 'mute'],
      action: () => stopListening(),
      description: 'Stop voice control',
      category: 'accessibility',
    },
    {
      phrases: ['read page', 'read aloud', "what's on screen"],
      action: () => readPageContent(),
      description: 'Read page content aloud',
      category: 'accessibility',
    },
    {
      phrases: ['help', 'voice help', 'what can I say', 'show commands'],
      action: () => announceCommands(),
      description: 'List available commands',
      category: 'accessibility',
    },
    {
      phrases: ['increase text', 'bigger text', 'larger font'],
      action: () => adjustFontSize(1.1),
      description: 'Increase text size',
      category: 'accessibility',
    },
    {
      phrases: ['decrease text', 'smaller text', 'smaller font'],
      action: () => adjustFontSize(0.9),
      description: 'Decrease text size',
      category: 'accessibility',
    },
    {
      phrases: ['high contrast', 'contrast mode', 'dark mode'],
      action: () => toggleHighContrast(),
      description: 'Toggle high contrast mode',
      category: 'accessibility',
    },
  ];

  // Initialize commands
  useEffect(() => {
    commandsRef.current = [...defaultCommands];
  }, [navigate]);

  // Initialize speech recognition
  useEffect(() => {
    if (!SpeechRecognition) {
      setState((s) => ({ ...s, error: 'Speech recognition not supported in this browser' }));
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = opts.continuous;
    recognition.interimResults = opts.interimResults;
    recognition.lang = opts.language;

    recognition.onstart = () => {
      setState((s) => ({ ...s, isListening: true, error: null }));
      opts.onStart?.();
      announce('Voice control active. Say "help" for available commands.');
    };

    recognition.onend = () => {
      setState((s) => ({ ...s, isListening: false }));
      opts.onEnd?.();
      // Auto-restart if still enabled
      if (state.isEnabled && recognitionRef.current) {
        try {
          recognition.start();
        } catch (e) {
          // Ignore - may already be running
        }
      }
    };

    recognition.onerror = (event: any) => {
      const errorMessage = getErrorMessage(event.error);
      setState((s) => ({ ...s, error: errorMessage }));
      opts.onError?.(errorMessage);
    };

    recognition.onresult = (event: any) => {
      const result = event.results[event.results.length - 1];
      const transcript = result[0].transcript.toLowerCase().trim();
      const confidence = result[0].confidence;

      setState((s) => ({ ...s, transcript, confidence }));

      if (result.isFinal) {
        processCommand(transcript, confidence);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [opts.language, opts.continuous, opts.interimResults]);

  // Process voice command
  const processCommand = useCallback(
    (transcript: string, confidence: number) => {
      const commands = commandsRef.current;

      for (const command of commands) {
        for (const phrase of command.phrases) {
          if (transcript.includes(phrase.toLowerCase())) {
            setState((s) => ({ ...s, lastCommand: phrase }));
            opts.onCommand?.(phrase, confidence);

            // Announce and execute
            announce(`Executing: ${command.description}`);
            command.action();
            return;
          }
        }
      }

      // No command matched
      if (confidence > 0.7) {
        announce(`Command not recognized: ${transcript}. Say "help" for available commands.`);
      }
    },
    [opts.onCommand]
  );

  // Start listening
  const startListening = useCallback(() => {
    if (!recognitionRef.current) return;

    try {
      recognitionRef.current.start();
      setState((s) => ({ ...s, isEnabled: true, error: null }));
    } catch (error: any) {
      setState((s) => ({ ...s, error: error.message }));
    }
  }, []);

  // Stop listening
  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return;

    recognitionRef.current.stop();
    setState((s) => ({ ...s, isEnabled: false, isListening: false }));
    announce('Voice control disabled.');
  }, []);

  // Toggle listening
  const toggleListening = useCallback(() => {
    if (state.isEnabled) {
      stopListening();
    } else {
      startListening();
    }
  }, [state.isEnabled, startListening, stopListening]);

  // Register custom command
  const registerCommand = useCallback((command: VoiceCommand) => {
    commandsRef.current.push(command);
  }, []);

  // Unregister command
  const unregisterCommand = useCallback((phrase: string) => {
    commandsRef.current = commandsRef.current.filter(
      (cmd) => !cmd.phrases.includes(phrase.toLowerCase())
    );
  }, []);

  // Get all commands
  const getCommands = useCallback(() => {
    return commandsRef.current;
  }, []);

  return {
    ...state,
    startListening,
    stopListening,
    toggleListening,
    registerCommand,
    unregisterCommand,
    getCommands,
  };
}

// Helper functions
function getErrorMessage(error: string): string {
  const messages: Record<string, string> = {
    'no-speech': 'No speech detected. Please try again.',
    'audio-capture': 'Microphone not available. Please check permissions.',
    'not-allowed': 'Microphone access denied. Please enable in browser settings.',
    network: 'Network error. Please check your connection.',
    aborted: 'Speech recognition aborted.',
    'language-not-supported': 'Language not supported.',
  };
  return messages[error] || `Speech recognition error: ${error}`;
}

function announce(message: string) {
  // Use speech synthesis for announcements
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.rate = 1.1;
    utterance.pitch = 1;
    speechSynthesis.speak(utterance);
  }

  // Also update ARIA live region
  const liveRegion = document.getElementById('voice-announcements') || createLiveRegion();
  liveRegion.textContent = message;
}

function createLiveRegion(): HTMLElement {
  const region = document.createElement('div');
  region.id = 'voice-announcements';
  region.setAttribute('role', 'status');
  region.setAttribute('aria-live', 'polite');
  region.setAttribute('aria-atomic', 'true');
  region.className = 'sr-only';
  document.body.appendChild(region);
  return region;
}

function readPageContent() {
  const mainContent = document.querySelector('main') || document.body;
  const headings = mainContent.querySelectorAll('h1, h2, h3');
  const content: string[] = [];

  headings.forEach((h) => {
    content.push(h.textContent || '');
  });

  const message =
    content.length > 0
      ? `Page content: ${content.join('. ')}`
      : 'No main content found on this page.';

  announce(message);
}

function announceCommands() {
  const categories = ['navigation', 'action', 'ui', 'accessibility'];
  const examples: Record<string, string> = {
    navigation: 'Say "go home", "messages", "profile", or "settings"',
    action: 'Say "like", "pass", "super like", or "send message"',
    ui: 'Say "scroll down", "scroll up", or "close"',
    accessibility: 'Say "read page", "bigger text", or "high contrast"',
  };

  const message = Object.entries(examples)
    .map(([cat, ex]) => `${cat}: ${ex}`)
    .join('. ');

  announce(`Available commands. ${message}`);
}

function adjustFontSize(multiplier: number) {
  const html = document.documentElement;
  const currentSize = parseFloat(getComputedStyle(html).fontSize);
  html.style.fontSize = `${currentSize * multiplier}px`;
  announce(`Text size ${multiplier > 1 ? 'increased' : 'decreased'}`);
}

function toggleHighContrast() {
  document.body.classList.toggle('high-contrast');
  const isHighContrast = document.body.classList.contains('high-contrast');
  announce(`High contrast mode ${isHighContrast ? 'enabled' : 'disabled'}`);
}

export default useVoiceControl;
