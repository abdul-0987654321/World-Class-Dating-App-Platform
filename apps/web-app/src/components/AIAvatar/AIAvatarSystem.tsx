/**
 * FLAMORAL AI Avatar System
 * Comprehensive guide avatar for user onboarding and safety
 *
 * Version: 2.0.0
 * Purpose: Calm, trustworthy guide throughout FLAMORAL
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type AvatarContext =
  | 'welcome'
  | 'onboarding'
  | 'profile_creation'
  | 'photo_upload'
  | 'verification'
  | 'discovery'
  | 'matching'
  | 'messaging'
  | 'video_call'
  | 'safety_tips'
  | 'subscription'
  | 'privacy_settings'
  | 'report_block'
  | 'help_center'
  | 'idle';

export interface AvatarMessage {
  id: string;
  text: string;
  context: AvatarContext;
  priority: 'high' | 'medium' | 'low';
  delay?: number;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
}

export interface AvatarState {
  isVisible: boolean;
  isMuted: boolean;
  isPaused: boolean;
  isMinimized: boolean;
  currentContext: AvatarContext;
  currentMessageIndex: number;
  hasInteracted: boolean;
}

export interface AIAvatarProps {
  initialContext?: AvatarContext;
  onContextChange?: (context: AvatarContext) => void;
  onDismiss?: () => void;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  className?: string;
}

// ============================================================================
// AVATAR SCRIPTS - PRE-APPROVED STATIC MESSAGES
// ============================================================================

export const avatarScripts: Record<AvatarContext, AvatarMessage[]> = {
  welcome: [
    {
      id: 'welcome-1',
      text: "Welcome to FLAMORAL! I'm your guide to finding meaningful connections. Your journey to love starts here.",
      context: 'welcome',
      priority: 'high',
    },
    {
      id: 'welcome-2',
      text: 'At FLAMORAL, we believe in authentic connections. Every profile is verified for your safety.',
      context: 'welcome',
      priority: 'medium',
    },
    {
      id: 'welcome-3',
      text: "Ready to create your profile? I'll walk you through each step to help you shine.",
      context: 'welcome',
      priority: 'medium',
      action: {
        label: 'Start Profile',
        href: '/signup',
      },
    },
  ],

  onboarding: [
    {
      id: 'onboarding-1',
      text: "Let's set up your FLAMORAL profile! This will take about 5 minutes, and I'll be here to help.",
      context: 'onboarding',
      priority: 'high',
    },
    {
      id: 'onboarding-2',
      text: 'Be yourself! Authentic profiles get 40% more meaningful matches.',
      context: 'onboarding',
      priority: 'medium',
    },
    {
      id: 'onboarding-3',
      text: 'Your privacy matters. You control who sees your profile and how your data is used.',
      context: 'onboarding',
      priority: 'medium',
    },
  ],

  profile_creation: [
    {
      id: 'profile-1',
      text: "Your bio is your first impression. Share what makes you unique - your passions, values, and what you're looking for.",
      context: 'profile_creation',
      priority: 'high',
    },
    {
      id: 'profile-2',
      text: 'Profiles with 4+ photos get 2x more matches. Show different sides of your personality!',
      context: 'profile_creation',
      priority: 'medium',
    },
    {
      id: 'profile-3',
      text: 'The prompts help others understand you better. Answer honestly - compatibility matters!',
      context: 'profile_creation',
      priority: 'medium',
    },
  ],

  photo_upload: [
    {
      id: 'photo-1',
      text: 'Great photos make all the difference! Use recent photos that clearly show your face.',
      context: 'photo_upload',
      priority: 'high',
    },
    {
      id: 'photo-2',
      text: "Your first photo should be a clear headshot with good lighting. Smile - it's welcoming!",
      context: 'photo_upload',
      priority: 'medium',
    },
    {
      id: 'photo-3',
      text: "Include photos of you doing activities you love. They're great conversation starters!",
      context: 'photo_upload',
      priority: 'low',
    },
  ],

  verification: [
    {
      id: 'verify-1',
      text: 'Verification helps build trust. Take a quick selfie matching the pose shown - it only takes seconds.',
      context: 'verification',
      priority: 'high',
    },
    {
      id: 'verify-2',
      text: "Verified profiles get a trusted badge and appear higher in search results. It's worth it!",
      context: 'verification',
      priority: 'medium',
    },
    {
      id: 'verify-3',
      text: 'Your verification photo is only used to confirm your identity and is never shown publicly.',
      context: 'verification',
      priority: 'medium',
    },
  ],

  discovery: [
    {
      id: 'discovery-1',
      text: 'Welcome to Discovery! Our AI has found people who match your preferences and values.',
      context: 'discovery',
      priority: 'high',
    },
    {
      id: 'discovery-2',
      text: 'The compatibility score shows how well you might connect based on interests and preferences.',
      context: 'discovery',
      priority: 'medium',
    },
    {
      id: 'discovery-3',
      text: 'Take your time! Read profiles carefully - quality connections matter more than quantity.',
      context: 'discovery',
      priority: 'low',
    },
  ],

  matching: [
    {
      id: 'match-1',
      text: 'Congratulations on your match! This means you both liked each other. Time to start a conversation!',
      context: 'matching',
      priority: 'high',
    },
    {
      id: 'match-2',
      text: 'Check their profile for conversation starters. Ask about something specific they mentioned!',
      context: 'matching',
      priority: 'medium',
    },
    {
      id: 'match-3',
      text: 'Be genuine and respectful in your first message. Personalized openers get 3x more responses.',
      context: 'matching',
      priority: 'medium',
    },
  ],

  messaging: [
    {
      id: 'message-1',
      text: 'Great conversations lead to great connections. Ask open-ended questions to keep things flowing.',
      context: 'messaging',
      priority: 'medium',
    },
    {
      id: 'message-2',
      text: 'If you feel uncomfortable at any point, you can block or report. Your safety comes first.',
      context: 'messaging',
      priority: 'high',
      action: {
        label: 'Safety Tips',
        href: '/safety',
      },
    },
    {
      id: 'message-3',
      text: "Ready to take things further? Suggest a video call to see if there's real chemistry!",
      context: 'messaging',
      priority: 'low',
    },
  ],

  video_call: [
    {
      id: 'video-1',
      text: 'Video calls are a great way to connect before meeting in person. Find a quiet, well-lit spot.',
      context: 'video_call',
      priority: 'high',
    },
    {
      id: 'video-2',
      text: 'Be yourself! Nervousness is normal. The other person is probably feeling the same way.',
      context: 'video_call',
      priority: 'medium',
    },
    {
      id: 'video-3',
      text: "If the call doesn't go well, that's okay. Not every connection is meant to be.",
      context: 'video_call',
      priority: 'low',
    },
  ],

  safety_tips: [
    {
      id: 'safety-1',
      text: 'Your safety is our top priority. Never share personal information like your address or financial details.',
      context: 'safety_tips',
      priority: 'high',
    },
    {
      id: 'safety-2',
      text: "When meeting in person, always choose a public place and tell someone where you're going.",
      context: 'safety_tips',
      priority: 'high',
    },
    {
      id: 'safety-3',
      text: 'Trust your instincts. If something feels off, it probably is. Report suspicious behavior.',
      context: 'safety_tips',
      priority: 'high',
      action: {
        label: 'Report an Issue',
        href: '/help/report',
      },
    },
    {
      id: 'safety-4',
      text: 'Be wary of anyone who refuses to video chat or makes excuses to avoid meeting safely.',
      context: 'safety_tips',
      priority: 'medium',
    },
  ],

  subscription: [
    {
      id: 'sub-1',
      text: 'Premium features can help you find your match faster. See who likes you and get unlimited swipes!',
      context: 'subscription',
      priority: 'medium',
    },
    {
      id: 'sub-2',
      text: 'Your subscription directly supports our safety team and platform improvements. Thank you!',
      context: 'subscription',
      priority: 'low',
    },
    {
      id: 'sub-3',
      text: 'Not sure? Start with a free trial to experience all Premium features.',
      context: 'subscription',
      priority: 'medium',
    },
  ],

  privacy_settings: [
    {
      id: 'privacy-1',
      text: "You're in control of your data. Adjust who can see your profile and what information is shared.",
      context: 'privacy_settings',
      priority: 'high',
    },
    {
      id: 'privacy-2',
      text: "Enable 'Incognito Mode' to browse without appearing in others' discovery feeds.",
      context: 'privacy_settings',
      priority: 'medium',
    },
    {
      id: 'privacy-3',
      text: 'You can download or delete your data at any time. Your privacy rights are protected.',
      context: 'privacy_settings',
      priority: 'medium',
    },
  ],

  report_block: [
    {
      id: 'report-1',
      text: "I'm sorry you're having a negative experience. Let me help you report or block this user.",
      context: 'report_block',
      priority: 'high',
    },
    {
      id: 'report-2',
      text: "Blocking someone removes them from your view permanently. They won't be notified.",
      context: 'report_block',
      priority: 'high',
    },
    {
      id: 'report-3',
      text: 'Your report helps keep FLAMORAL safe for everyone. Our team reviews all reports within 24 hours.',
      context: 'report_block',
      priority: 'medium',
    },
  ],

  help_center: [
    {
      id: 'help-1',
      text: 'How can I help you today? Browse our FAQ or contact our support team.',
      context: 'help_center',
      priority: 'high',
      action: {
        label: 'Contact Support',
        href: '/help/contact',
      },
    },
    {
      id: 'help-2',
      text: 'For urgent safety concerns, use the emergency report feature for priority handling.',
      context: 'help_center',
      priority: 'high',
    },
  ],

  idle: [
    {
      id: 'idle-1',
      text: "Need any help? I'm here if you have questions about FLAMORAL.",
      context: 'idle',
      priority: 'low',
    },
    {
      id: 'idle-2',
      text: 'Remember to check your matches! Someone special might be waiting.',
      context: 'idle',
      priority: 'low',
    },
  ],
};

// ============================================================================
// GUARDRAILS - TOPICS THE AVATAR WILL NOT DISCUSS
// ============================================================================

export const avatarGuardrails = {
  prohibited: [
    'relationship_advice', // No dating/relationship counseling
    'legal_advice', // No legal guidance
    'medical_advice', // No health/medical recommendations
    'financial_advice', // No financial guidance
    'personal_opinions', // No subjective opinions
    'third_party_apps', // No recommendations for other apps
    'risky_behavior', // Never encourage unsafe meetings
  ],

  escalationTriggers: [
    'harassment',
    'threats',
    'illegal_activity',
    'self_harm',
    'emergency',
    'fraud',
    'extortion',
  ],

  escalationResponse: {
    default:
      "I understand you're dealing with something serious. Let me connect you with our Safety Hub where our team can help.",
    emergency:
      "If you're in immediate danger, please contact local emergency services. Our Safety team is also available 24/7.",
  },
};

// ============================================================================
// AVATAR COMPONENT
// ============================================================================

export const AIAvatarSystem: React.FC<AIAvatarProps> = ({
  initialContext = 'welcome',
  onContextChange,
  onDismiss,
  position = 'bottom-right',
  className = '',
}) => {
  const [state, setState] = useState<AvatarState>({
    isVisible: true,
    isMuted: false,
    isPaused: false,
    isMinimized: false,
    currentContext: initialContext,
    currentMessageIndex: 0,
    hasInteracted: false,
  });

  const [reducedMotion, setReducedMotion] = useState(false);

  // Check for reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // Get current messages based on context
  const currentMessages = useMemo(() => {
    return avatarScripts[state.currentContext] || avatarScripts.idle;
  }, [state.currentContext]);

  const currentMessage = currentMessages[state.currentMessageIndex];

  // Auto-advance messages
  useEffect(() => {
    if (state.isPaused || state.isMuted || state.isMinimized) return;

    const delay = currentMessage?.delay || 8000;
    const timer = setTimeout(() => {
      setState((prev) => ({
        ...prev,
        currentMessageIndex: (prev.currentMessageIndex + 1) % currentMessages.length,
      }));
    }, delay);

    return () => clearTimeout(timer);
  }, [
    state.currentMessageIndex,
    state.isPaused,
    state.isMuted,
    state.isMinimized,
    currentMessage,
    currentMessages.length,
  ]);

  // Context change handler
  const changeContext = useCallback(
    (newContext: AvatarContext) => {
      setState((prev) => ({
        ...prev,
        currentContext: newContext,
        currentMessageIndex: 0,
      }));
      onContextChange?.(newContext);
    },
    [onContextChange]
  );

  // Control handlers
  const toggleMute = useCallback(() => {
    setState((prev) => ({ ...prev, isMuted: !prev.isMuted, hasInteracted: true }));
  }, []);

  const togglePause = useCallback(() => {
    setState((prev) => ({ ...prev, isPaused: !prev.isPaused, hasInteracted: true }));
  }, []);

  const toggleMinimize = useCallback(() => {
    setState((prev) => ({ ...prev, isMinimized: !prev.isMinimized, hasInteracted: true }));
  }, []);

  const handleDismiss = useCallback(() => {
    setState((prev) => ({ ...prev, isVisible: false }));
    onDismiss?.();
  }, [onDismiss]);

  // Position classes
  const positionClasses = {
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6',
    'top-right': 'top-20 right-6',
    'top-left': 'top-20 left-6',
  };

  if (!state.isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 50, scale: 0.9 }}
      transition={{ duration: reducedMotion ? 0 : 0.5, ease: 'easeOut' }}
      className={`fixed ${positionClasses[position]} z-50 ${className}`}
      role="complementary"
      aria-label="AI Guide Assistant"
    >
      {/* Minimized State */}
      {state.isMinimized ? (
        <motion.button
          onClick={toggleMinimize}
          className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-500 to-blue-500 flex items-center justify-center shadow-glow-pink hover:scale-110 transition-transform"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          aria-label="Expand guide assistant"
        >
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
            />
          </svg>
          {/* Notification dot */}
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-base-deep-black" />
        </motion.button>
      ) : (
        /* Expanded State */
        <div className="max-w-sm">
          <div className="bg-base-charcoal/95 backdrop-blur-xl rounded-3xl p-6 border border-base-dark-gray shadow-elevation-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <div
                    className={`w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-blue-500 flex items-center justify-center ${
                      !reducedMotion && !state.isPaused ? 'animate-avatar-pulse' : ''
                    }`}
                  >
                    <svg
                      className="w-6 h-6 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
                      />
                    </svg>
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-base-charcoal" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">FLAMORAL Guide</p>
                  <p className="text-xs text-gray-400">Here to help</p>
                </div>
              </div>

              {/* Window Controls */}
              <div className="flex items-center space-x-1">
                <button
                  onClick={toggleMinimize}
                  className="p-1.5 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-base-dark-gray"
                  aria-label="Minimize"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
                <button
                  onClick={handleDismiss}
                  className="p-1.5 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-base-dark-gray"
                  aria-label="Close"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* Message Content */}
            <div className="min-h-[80px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentMessage?.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: reducedMotion ? 0 : 0.3 }}
                >
                  <p className="text-sm text-gray-200 leading-relaxed">{currentMessage?.text}</p>

                  {/* Action Button */}
                  {currentMessage?.action && (
                    <div className="mt-3">
                      {currentMessage.action.href ? (
                        <a
                          href={currentMessage.action.href}
                          className="inline-flex items-center text-sm font-medium text-pink-400 hover:text-pink-300 transition-colors"
                        >
                          {currentMessage.action.label}
                          <svg
                            className="w-4 h-4 ml-1"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                        </a>
                      ) : (
                        <button
                          onClick={currentMessage.action.onClick}
                          className="inline-flex items-center text-sm font-medium text-pink-400 hover:text-pink-300 transition-colors"
                        >
                          {currentMessage.action.label}
                          <svg
                            className="w-4 h-4 ml-1"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                        </button>
                      )}
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Progress Indicator */}
            <div className="flex space-x-1 mt-4 mb-4">
              {currentMessages.map((_, index) => (
                <div
                  key={index}
                  className={`h-1 flex-1 rounded-full transition-colors ${
                    index === state.currentMessageIndex
                      ? 'bg-gradient-to-r from-pink-500 to-blue-500'
                      : 'bg-base-dark-gray'
                  }`}
                />
              ))}
            </div>

            {/* Control Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-base-dark-gray">
              <div className="flex items-center space-x-2">
                <button
                  onClick={toggleMute}
                  className={`p-2 rounded-lg transition-colors ${
                    state.isMuted
                      ? 'bg-pink-500/20 text-pink-400'
                      : 'bg-base-dark-gray text-gray-400 hover:text-white'
                  }`}
                  aria-label={state.isMuted ? 'Unmute messages' : 'Mute messages'}
                  title={state.isMuted ? 'Unmute' : 'Mute'}
                >
                  {state.isMuted ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
                      />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                      />
                    </svg>
                  )}
                </button>

                <button
                  onClick={togglePause}
                  className={`p-2 rounded-lg transition-colors ${
                    state.isPaused
                      ? 'bg-pink-500/20 text-pink-400'
                      : 'bg-base-dark-gray text-gray-400 hover:text-white'
                  }`}
                  aria-label={state.isPaused ? 'Resume auto-advance' : 'Pause auto-advance'}
                  title={state.isPaused ? 'Resume' : 'Pause'}
                >
                  {state.isPaused ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  )}
                </button>
              </div>

              {/* Navigation */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() =>
                    setState((prev) => ({
                      ...prev,
                      currentMessageIndex:
                        (prev.currentMessageIndex - 1 + currentMessages.length) %
                        currentMessages.length,
                    }))
                  }
                  className="p-2 rounded-lg bg-base-dark-gray text-gray-400 hover:text-white transition-colors"
                  aria-label="Previous message"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                </button>
                <button
                  onClick={() =>
                    setState((prev) => ({
                      ...prev,
                      currentMessageIndex: (prev.currentMessageIndex + 1) % currentMessages.length,
                    }))
                  }
                  className="p-2 rounded-lg bg-base-dark-gray text-gray-400 hover:text-white transition-colors"
                  aria-label="Next message"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

// ============================================================================
// AVATAR CONTEXT HOOK
// ============================================================================

export const useAvatarContext = () => {
  const [context, setContext] = useState<AvatarContext>('welcome');

  const updateContext = useCallback((newContext: AvatarContext) => {
    setContext(newContext);
  }, []);

  return { context, updateContext };
};

// ============================================================================
// AVATAR PROVIDER FOR APP-WIDE STATE
// ============================================================================

interface AvatarContextValue {
  showAvatar: boolean;
  setShowAvatar: (show: boolean) => void;
  currentContext: AvatarContext;
  setCurrentContext: (context: AvatarContext) => void;
  reducedMotion: boolean;
}

const AvatarContext = React.createContext<AvatarContextValue | null>(null);

export const AvatarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [showAvatar, setShowAvatar] = useState(true);
  const [currentContext, setCurrentContext] = useState<AvatarContext>('welcome');
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  const value = useMemo(
    () => ({
      showAvatar,
      setShowAvatar,
      currentContext,
      setCurrentContext,
      reducedMotion,
    }),
    [showAvatar, currentContext, reducedMotion]
  );

  return <AvatarContext.Provider value={value}>{children}</AvatarContext.Provider>;
};

export const useAvatar = () => {
  const context = React.useContext(AvatarContext);
  if (!context) {
    throw new Error('useAvatar must be used within an AvatarProvider');
  }
  return context;
};

export default AIAvatarSystem;
