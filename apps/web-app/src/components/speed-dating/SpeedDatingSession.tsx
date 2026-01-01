/**
 * SpeedDatingSession Component
 *
 * Manages live speed dating sessions with:
 * - Round countdown timers
 * - Automatic participant rotation
 * - Match selection between rounds
 * - Session state management
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';

interface Participant {
  id: string;
  name: string;
  age: number;
  photoUrl: string;
  bio?: string;
}

interface SessionConfig {
  eventId: string;
  eventTitle: string;
  roundDuration: number; // in seconds
  breakDuration: number; // in seconds
  totalRounds: number;
  participants: Participant[];
}

interface SpeedDatingSessionProps {
  config: SessionConfig;
  onSessionEnd: (matches: string[]) => void;
  onLeaveSession: () => void;
}

type SessionState = 'waiting' | 'countdown' | 'active' | 'break' | 'voting' | 'ended';

const SpeedDatingSession: React.FC<SpeedDatingSessionProps> = ({
  config,
  onSessionEnd,
  onLeaveSession,
}) => {
  const [sessionState, setSessionState] = useState<SessionState>('waiting');
  const [currentRound, setCurrentRound] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(config.roundDuration);
  const [currentPartnerIndex, setCurrentPartnerIndex] = useState(0);
  const [likes, setLikes] = useState<Set<string>>(new Set());
  const [skips, setSkips] = useState<Set<string>>(new Set());
  const [showNextRoundPopup, setShowNextRoundPopup] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const currentPartner = config.participants[currentPartnerIndex];

  // Play sound effects
  const playSound = useCallback((type: 'start' | 'warning' | 'end' | 'match') => {
    // Simple beep sounds using Web Audio API
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    const frequencies = {
      start: 523.25, // C5
      warning: 440, // A4
      end: 659.25, // E5
      match: 783.99, // G5
    };

    oscillator.frequency.value = frequencies[type];
    oscillator.type = 'sine';
    gainNode.gain.value = 0.1;

    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.2);
  }, []);

  // Timer logic
  useEffect(() => {
    if (sessionState !== 'active' && sessionState !== 'break' && sessionState !== 'countdown') {
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          // Timer finished
          if (sessionState === 'countdown') {
            playSound('start');
            setSessionState('active');
            return config.roundDuration;
          } else if (sessionState === 'active') {
            playSound('end');
            setSessionState('voting');
            setShowNextRoundPopup(true);
            return 0;
          } else if (sessionState === 'break') {
            // Move to next partner
            if (currentPartnerIndex < config.participants.length - 1) {
              setCurrentPartnerIndex((prev) => prev + 1);
              setCurrentRound((prev) => prev + 1);
              setSessionState('countdown');
              return 3; // 3 second countdown
            } else {
              // Session ended
              setSessionState('ended');
              return 0;
            }
          }
        }

        // Warning sound at 10 seconds
        if (prev === 11 && sessionState === 'active') {
          playSound('warning');
        }

        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [sessionState, currentPartnerIndex, config, playSound]);

  // Handle voting (like/skip)
  const handleVote = (like: boolean) => {
    if (currentPartner) {
      if (like) {
        setLikes((prev) => new Set(prev).add(currentPartner.id));
        playSound('match');
      } else {
        setSkips((prev) => new Set(prev).add(currentPartner.id));
      }
    }
    setShowNextRoundPopup(false);
    setSessionState('break');
    setTimeRemaining(config.breakDuration);
  };

  // Start session
  const startSession = () => {
    setSessionState('countdown');
    setTimeRemaining(3);
    setCurrentRound(1);
  };

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get timer color based on time remaining
  const getTimerColor = () => {
    if (timeRemaining <= 10) return 'text-red-500';
    if (timeRemaining <= 30) return 'text-yellow-500';
    return 'text-green-500';
  };

  // End session and calculate matches
  const handleEndSession = () => {
    const matchedIds = Array.from(likes);
    onSessionEnd(matchedIds);
  };

  // Waiting state
  if (sessionState === 'waiting') {
    return (
      <div className="fixed inset-0 bg-gray-900 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8 max-w-md text-center">
          <div className="w-20 h-20 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">{config.eventTitle}</h2>
          <p className="text-gray-600 mb-6">
            You'll have {config.roundDuration / 60} minutes with each person.
            <br />
            {config.participants.length} participants are waiting!
          </p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={startSession}
              className="bg-gradient-to-r from-pink-500 to-purple-600 text-white px-8 py-3 rounded-xl font-bold hover:opacity-90 transition"
            >
              Start Session
            </button>
            <button
              onClick={onLeaveSession}
              className="bg-gray-200 text-gray-700 px-6 py-3 rounded-xl font-medium hover:bg-gray-300 transition"
            >
              Leave
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Countdown state
  if (sessionState === 'countdown') {
    return (
      <div className="fixed inset-0 bg-gray-900 flex items-center justify-center z-50">
        <div className="text-center">
          <div className="text-9xl font-bold text-white animate-pulse">{timeRemaining}</div>
          <p className="text-2xl text-white/80 mt-4">Get ready to meet {currentPartner?.name}!</p>
        </div>
      </div>
    );
  }

  // Ended state
  if (sessionState === 'ended') {
    return (
      <div className="fixed inset-0 bg-gray-900 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8 max-w-md text-center">
          <div className="w-20 h-20 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">🎉</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Session Complete!</h2>
          <p className="text-gray-600 mb-4">
            You met {config.participants.length} people and liked {likes.size}!
          </p>
          <div className="bg-pink-50 rounded-xl p-4 mb-6">
            <p className="text-sm text-gray-600">
              {likes.size > 0
                ? `You'll be notified if any of your ${likes.size} likes match with you!`
                : 'No worries, there are more events coming up!'}
            </p>
          </div>
          <button
            onClick={handleEndSession}
            className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white py-3 rounded-xl font-bold hover:opacity-90 transition"
          >
            See Results
          </button>
        </div>
      </div>
    );
  }

  // Active/Break/Voting state - Main session UI
  return (
    <div className="fixed inset-0 bg-gray-900 flex flex-col z-50">
      {/* Top bar with timer and round info */}
      <div className="bg-gray-800 p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-white/60 text-sm">Round {currentRound} of {config.participants.length}</span>
          <div className="flex gap-1">
            {config.participants.map((_, idx) => (
              <div
                key={idx}
                className={`w-2 h-2 rounded-full ${
                  idx < currentRound ? 'bg-green-500' : idx === currentRound - 1 ? 'bg-pink-500' : 'bg-gray-600'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Timer */}
        <div className={`text-center ${sessionState === 'break' ? 'opacity-50' : ''}`}>
          <div className={`text-4xl font-bold ${getTimerColor()}`}>
            {formatTime(timeRemaining)}
          </div>
          <div className="text-white/60 text-xs">
            {sessionState === 'break' ? 'Next round in...' : 'Time remaining'}
          </div>
        </div>

        <button
          onClick={onLeaveSession}
          className="text-white/60 hover:text-white transition px-4 py-2 rounded-lg hover:bg-white/10"
        >
          Leave Session
        </button>
      </div>

      {/* Video call area */}
      <div className="flex-1 flex">
        {/* Partner video (large) */}
        <div className="flex-1 relative bg-gray-800">
          {/* Placeholder for actual video stream */}
          <img
            src={currentPartner?.photoUrl}
            alt={currentPartner?.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-6 left-6 bg-black/50 backdrop-blur-sm rounded-xl px-4 py-2">
            <h3 className="text-white font-bold text-xl">{currentPartner?.name}, {currentPartner?.age}</h3>
            {currentPartner?.bio && (
              <p className="text-white/80 text-sm mt-1">{currentPartner.bio}</p>
            )}
          </div>

          {/* Timer overlay when low */}
          {timeRemaining <= 10 && sessionState === 'active' && (
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <div className="text-8xl font-bold text-red-500 animate-pulse drop-shadow-lg">
                {timeRemaining}
              </div>
            </div>
          )}
        </div>

        {/* Self video (small) */}
        <div className="absolute bottom-6 right-6 w-48 h-64 bg-gray-700 rounded-xl overflow-hidden border-2 border-white/20">
          <div className="w-full h-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
            <span className="text-6xl">😊</span>
          </div>
        </div>
      </div>

      {/* Controls bar */}
      <div className="bg-gray-800 p-4 flex items-center justify-center gap-4">
        <button className="w-14 h-14 rounded-full bg-gray-700 hover:bg-gray-600 text-white flex items-center justify-center transition">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        </button>
        <button className="w-14 h-14 rounded-full bg-gray-700 hover:bg-gray-600 text-white flex items-center justify-center transition">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </button>
        <button
          onClick={onLeaveSession}
          className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" />
          </svg>
        </button>
      </div>

      {/* Voting popup */}
      {showNextRoundPopup && sessionState === 'voting' && (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-8 max-w-sm text-center animate-bounce-in">
            <img
              src={currentPartner?.photoUrl}
              alt={currentPartner?.name}
              className="w-24 h-24 rounded-full mx-auto mb-4 border-4 border-pink-500"
            />
            <h3 className="text-xl font-bold text-gray-800 mb-2">
              Did you connect with {currentPartner?.name}?
            </h3>
            <p className="text-gray-600 text-sm mb-6">
              If you both like each other, you'll be matched!
            </p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => handleVote(false)}
                className="w-16 h-16 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-600 flex items-center justify-center transition text-2xl"
              >
                👋
              </button>
              <button
                onClick={() => handleVote(true)}
                className="w-16 h-16 rounded-full bg-gradient-to-r from-pink-500 to-red-500 hover:opacity-90 text-white flex items-center justify-center transition text-2xl"
              >
                ❤️
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSS for animations */}
      <style>{`
        @keyframes bounce-in {
          0% { transform: scale(0.5); opacity: 0; }
          70% { transform: scale(1.05); }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-bounce-in {
          animation: bounce-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default SpeedDatingSession;
