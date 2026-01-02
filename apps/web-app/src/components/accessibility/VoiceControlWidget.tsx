/**
 * Voice Control Widget
 * Floating accessibility widget for voice-controlled navigation
 */

import React, { useState, useEffect } from 'react';
import { useVoiceControl, VoiceCommand } from '../../hooks/useVoiceControl';

interface VoiceControlWidgetProps {
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  minimized?: boolean;
}

export const VoiceControlWidget: React.FC<VoiceControlWidgetProps> = ({
  position = 'bottom-right',
  minimized: initialMinimized = true,
}) => {
  const {
    isListening,
    isSupported,
    isEnabled,
    transcript,
    lastCommand,
    error,
    confidence,
    startListening,
    stopListening,
    toggleListening,
    getCommands,
  } = useVoiceControl();

  const [minimized, setMinimized] = useState(initialMinimized);
  const [showCommands, setShowCommands] = useState(false);

  // Position classes
  const positionClasses: Record<string, string> = {
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-right': 'top-20 right-4',
    'top-left': 'top-20 left-4',
  };

  if (!isSupported) {
    return null; // Don't render if not supported
  }

  const commands = getCommands();
  const commandsByCategory = groupCommandsByCategory(commands);

  return (
    <div
      className={`fixed ${positionClasses[position]} z-50`}
      role="region"
      aria-label="Voice control"
    >
      {/* Minimized button */}
      {minimized ? (
        <button
          onClick={() => setMinimized(false)}
          className={`
            p-3 rounded-full shadow-lg transition-all duration-300
            ${isEnabled
              ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white animate-pulse'
              : 'bg-slate-800/90 text-slate-300 hover:bg-slate-700'
            }
          `}
          aria-label={`Voice control ${isEnabled ? 'active' : 'inactive'}. Click to expand.`}
        >
          <MicrophoneIcon listening={isListening} />
        </button>
      ) : (
        /* Expanded widget */
        <div
          className="
            bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl
            border border-slate-700/50 overflow-hidden
            w-80 max-h-[60vh] flex flex-col
          "
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-700/50">
            <div className="flex items-center gap-3">
              <div
                className={`
                  p-2 rounded-xl
                  ${isListening
                    ? 'bg-gradient-to-r from-pink-500 to-purple-600'
                    : 'bg-slate-700'
                  }
                `}
              >
                <MicrophoneIcon listening={isListening} />
              </div>
              <div>
                <h3 className="text-white font-semibold text-sm">Voice Control</h3>
                <p className="text-slate-400 text-xs">
                  {isListening ? 'Listening...' : isEnabled ? 'Ready' : 'Disabled'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setMinimized(true)}
              className="p-1 text-slate-400 hover:text-white transition-colors"
              aria-label="Minimize voice control"
            >
              <MinimizeIcon />
            </button>
          </div>

          {/* Status */}
          <div className="p-4 space-y-3">
            {/* Toggle button */}
            <button
              onClick={toggleListening}
              className={`
                w-full py-3 px-4 rounded-xl font-medium transition-all
                ${isEnabled
                  ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                  : 'bg-gradient-to-r from-pink-500 to-purple-600 text-white hover:opacity-90'
                }
              `}
            >
              {isEnabled ? 'Stop Listening' : 'Start Voice Control'}
            </button>

            {/* Transcript display */}
            {isEnabled && (
              <div className="space-y-2">
                <div className="bg-slate-800/50 rounded-xl p-3">
                  <p className="text-xs text-slate-400 mb-1">Heard:</p>
                  <p className="text-white text-sm min-h-[20px]">
                    {transcript || 'Listening for commands...'}
                  </p>
                  {confidence > 0 && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 h-1 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-pink-500 to-purple-600 rounded-full transition-all"
                          style={{ width: `${confidence * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-400">
                        {Math.round(confidence * 100)}%
                      </span>
                    </div>
                  )}
                </div>

                {lastCommand && (
                  <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3">
                    <p className="text-xs text-green-400">
                      Last command: "{lastCommand}"
                    </p>
                  </div>
                )}

                {error && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3">
                    <p className="text-xs text-red-400">{error}</p>
                  </div>
                )}
              </div>
            )}

            {/* Commands toggle */}
            <button
              onClick={() => setShowCommands(!showCommands)}
              className="w-full flex items-center justify-between py-2 px-3 text-sm text-slate-400 hover:text-white transition-colors"
            >
              <span>Available Commands</span>
              <ChevronIcon expanded={showCommands} />
            </button>
          </div>

          {/* Commands list */}
          {showCommands && (
            <div className="max-h-64 overflow-y-auto border-t border-slate-700/50">
              {Object.entries(commandsByCategory).map(([category, cmds]) => (
                <div key={category} className="p-3 border-b border-slate-700/50 last:border-b-0">
                  <p className="text-xs text-purple-400 uppercase font-semibold mb-2">
                    {category}
                  </p>
                  <div className="space-y-1">
                    {cmds.map((cmd, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs">
                        <span className="text-pink-400">"{cmd.phrases[0]}"</span>
                        <span className="text-slate-500">→</span>
                        <span className="text-slate-400">{cmd.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Footer */}
          <div className="p-3 bg-slate-800/50 border-t border-slate-700/50">
            <p className="text-xs text-slate-500 text-center">
              Say "help" to hear available commands
            </p>
          </div>
        </div>
      )}

      {/* ARIA live region for announcements */}
      <div
        id="voice-announcements"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      />
    </div>
  );
};

// Helper to group commands by category
function groupCommandsByCategory(commands: VoiceCommand[]): Record<string, VoiceCommand[]> {
  return commands.reduce((acc, cmd) => {
    const category = cmd.category;
    if (!acc[category]) acc[category] = [];
    acc[category].push(cmd);
    return acc;
  }, {} as Record<string, VoiceCommand[]>);
}

// Icons
const MicrophoneIcon: React.FC<{ listening: boolean }> = ({ listening }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className={`w-5 h-5 ${listening ? 'animate-pulse' : ''}`}
  >
    <path d="M8.25 4.5a3.75 3.75 0 117.5 0v8.25a3.75 3.75 0 11-7.5 0V4.5z" />
    <path d="M6 10.5a.75.75 0 01.75.75v1.5a5.25 5.25 0 1010.5 0v-1.5a.75.75 0 011.5 0v1.5a6.751 6.751 0 01-6 6.709v2.291h3a.75.75 0 010 1.5h-7.5a.75.75 0 010-1.5h3v-2.291a6.751 6.751 0 01-6-6.709v-1.5A.75.75 0 016 10.5z" />
  </svg>
);

const MinimizeIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
    <path fillRule="evenodd" d="M5 10a.75.75 0 01.75-.75h8.5a.75.75 0 010 1.5h-8.5A.75.75 0 015 10z" clipRule="evenodd" />
  </svg>
);

const ChevronIcon: React.FC<{ expanded: boolean }> = ({ expanded }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    fill="currentColor"
    className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
  >
    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
  </svg>
);

export default VoiceControlWidget;
