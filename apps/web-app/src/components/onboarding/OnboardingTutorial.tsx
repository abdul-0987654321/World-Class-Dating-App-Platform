/**
 * Interactive Onboarding Tutorial System
 * Guided walkthrough for new users with step-by-step instructions
 */

import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { createPortal } from 'react-dom';

// =============================================
// TYPES
// =============================================

export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  target?: string; // CSS selector for element to highlight
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  action?: 'click' | 'input' | 'scroll' | 'wait' | 'none';
  actionTarget?: string; // Selector for action element
  requiredValue?: string; // For input actions
  waitTime?: number; // For wait actions
  onEnter?: () => void;
  onExit?: () => void;
  skipable?: boolean;
  showProgress?: boolean;
}

export interface Tutorial {
  id: string;
  name: string;
  description: string;
  steps: TutorialStep[];
  trigger?: 'auto' | 'manual' | 'first-visit';
  category: 'onboarding' | 'feature' | 'tips';
  estimatedTime?: number; // seconds
  requiredCompletion?: boolean;
}

interface TutorialState {
  activeTutorial: Tutorial | null;
  currentStepIndex: number;
  completedTutorials: string[];
  skippedTutorials: string[];
  isActive: boolean;
}

interface TutorialContextType extends TutorialState {
  startTutorial: (tutorialId: string) => void;
  nextStep: () => void;
  previousStep: () => void;
  skipTutorial: () => void;
  completeTutorial: () => void;
  resetTutorial: (tutorialId: string) => void;
  isTutorialCompleted: (tutorialId: string) => boolean;
  registerTutorial: (tutorial: Tutorial) => void;
}

// =============================================
// TUTORIALS REGISTRY
// =============================================

const TUTORIALS: Tutorial[] = [
  {
    id: 'welcome',
    name: 'Welcome to Flamoral',
    description: 'Get started with the app in 5 easy steps',
    category: 'onboarding',
    trigger: 'first-visit',
    estimatedTime: 120,
    requiredCompletion: false,
    steps: [
      {
        id: 'welcome-1',
        title: 'Welcome to Flamoral!',
        description:
          'Let us show you around. This quick tour will help you get the most out of your dating experience.',
        placement: 'center',
        action: 'none',
        skipable: true,
        showProgress: true,
      },
      {
        id: 'welcome-2',
        title: 'Complete Your Profile',
        description:
          'A complete profile gets 10x more matches! Add your best photos and write a bio that shows your personality.',
        target: '[data-tutorial="profile-completion"]',
        placement: 'bottom',
        action: 'click',
        actionTarget: '[data-tutorial="profile-completion"]',
        skipable: true,
        showProgress: true,
      },
      {
        id: 'welcome-3',
        title: 'Discover Matches',
        description: 'Swipe right to like someone, left to pass. Super like by swiping up!',
        target: '[data-tutorial="discover-tab"]',
        placement: 'bottom',
        action: 'click',
        actionTarget: '[data-tutorial="discover-tab"]',
        skipable: true,
        showProgress: true,
      },
      {
        id: 'welcome-4',
        title: 'Check Your Messages',
        description:
          'When you match with someone, start a conversation here. Be yourself and have fun!',
        target: '[data-tutorial="messages-tab"]',
        placement: 'bottom',
        action: 'click',
        actionTarget: '[data-tutorial="messages-tab"]',
        skipable: true,
        showProgress: true,
      },
      {
        id: 'welcome-5',
        title: "You're All Set!",
        description: 'Start swiping and find your perfect match. Good luck! 💕',
        placement: 'center',
        action: 'none',
        skipable: false,
        showProgress: true,
      },
    ],
  },
  {
    id: 'profile-setup',
    name: 'Profile Setup Guide',
    description: 'Create a profile that stands out',
    category: 'onboarding',
    trigger: 'manual',
    estimatedTime: 300,
    steps: [
      {
        id: 'profile-1',
        title: 'Add Your Best Photos',
        description:
          'Upload 4-6 photos that show your face clearly. Smile, show hobbies, and avoid group photos as your main pic.',
        target: '[data-tutorial="photo-upload"]',
        placement: 'right',
        action: 'none',
        skipable: true,
        showProgress: true,
      },
      {
        id: 'profile-2',
        title: 'Write Your Bio',
        description:
          "Tell people what makes you unique. Mention your interests, what you're looking for, and add a conversation starter.",
        target: '[data-tutorial="bio-input"]',
        placement: 'bottom',
        action: 'none',
        skipable: true,
        showProgress: true,
      },
      {
        id: 'profile-3',
        title: 'Add Your Interests',
        description: 'Select interests that represent you. This helps us find better matches!',
        target: '[data-tutorial="interests"]',
        placement: 'top',
        action: 'none',
        skipable: true,
        showProgress: true,
      },
      {
        id: 'profile-4',
        title: 'Set Your Preferences',
        description:
          "Tell us who you're looking for. Age range, distance, and what matters most to you.",
        target: '[data-tutorial="preferences"]',
        placement: 'top',
        action: 'none',
        skipable: true,
        showProgress: true,
      },
      {
        id: 'profile-5',
        title: 'Get Verified',
        description:
          "Verified profiles get 3x more matches. Take a quick selfie to prove you're real!",
        target: '[data-tutorial="verification"]',
        placement: 'bottom',
        action: 'none',
        skipable: true,
        showProgress: true,
      },
    ],
  },
  {
    id: 'swiping-tips',
    name: 'Swiping Like a Pro',
    description: 'Master the art of matching',
    category: 'tips',
    trigger: 'manual',
    estimatedTime: 60,
    steps: [
      {
        id: 'swipe-1',
        title: 'Swipe Right = Like',
        description: "See someone you're interested in? Swipe right or tap the heart button.",
        target: '[data-tutorial="like-button"]',
        placement: 'top',
        action: 'none',
        showProgress: true,
      },
      {
        id: 'swipe-2',
        title: 'Swipe Left = Pass',
        description: "Not feeling it? Swipe left or tap the X. No pressure, they won't know.",
        target: '[data-tutorial="pass-button"]',
        placement: 'top',
        action: 'none',
        showProgress: true,
      },
      {
        id: 'swipe-3',
        title: 'Super Like = Stand Out',
        description:
          "Really like someone? Super Like them! They'll see you liked them and you're 3x more likely to match.",
        target: '[data-tutorial="superlike-button"]',
        placement: 'top',
        action: 'none',
        showProgress: true,
      },
      {
        id: 'swipe-4',
        title: 'Boost Your Profile',
        description: 'Want more visibility? Use Boost to be seen by more people for 30 minutes.',
        target: '[data-tutorial="boost-button"]',
        placement: 'top',
        action: 'none',
        showProgress: true,
      },
    ],
  },
  {
    id: 'messaging-guide',
    name: 'Conversation Starters',
    description: 'Tips for great first messages',
    category: 'tips',
    trigger: 'manual',
    estimatedTime: 90,
    steps: [
      {
        id: 'msg-1',
        title: 'Start with Their Profile',
        description:
          'Reference something specific from their bio or photos. "I see you love hiking! What\'s your favorite trail?"',
        placement: 'center',
        action: 'none',
        showProgress: true,
      },
      {
        id: 'msg-2',
        title: 'Ask Open Questions',
        description:
          'Avoid yes/no questions. "What got you into photography?" beats "Do you like photography?"',
        placement: 'center',
        action: 'none',
        showProgress: true,
      },
      {
        id: 'msg-3',
        title: 'Use Smart Replies',
        description:
          'Stuck on what to say? Tap the lightbulb for AI-powered conversation starters tailored to their profile.',
        target: '[data-tutorial="smart-replies"]',
        placement: 'top',
        action: 'none',
        showProgress: true,
      },
      {
        id: 'msg-4',
        title: 'Know When to Meet',
        description:
          'Watch for the "Ready to Meet" indicator. When it appears, suggest meeting up!',
        target: '[data-tutorial="meeting-ready"]',
        placement: 'bottom',
        action: 'none',
        showProgress: true,
      },
    ],
  },
  {
    id: 'safety-tour',
    name: 'Stay Safe While Dating',
    description: 'Important safety features',
    category: 'feature',
    trigger: 'manual',
    estimatedTime: 120,
    steps: [
      {
        id: 'safety-1',
        title: 'Safety Center',
        description:
          'Access safety resources, emergency contacts, and date planning tools anytime.',
        target: '[data-tutorial="safety-center"]',
        placement: 'left',
        action: 'none',
        showProgress: true,
      },
      {
        id: 'safety-2',
        title: 'Report & Block',
        description:
          'See something concerning? Use the report button. We take every report seriously.',
        target: '[data-tutorial="report-button"]',
        placement: 'left',
        action: 'none',
        showProgress: true,
      },
      {
        id: 'safety-3',
        title: 'Video Verify',
        description:
          "Look for the verification badge. It means they've proven they're real through video.",
        target: '[data-tutorial="verified-badge"]',
        placement: 'bottom',
        action: 'none',
        showProgress: true,
      },
      {
        id: 'safety-4',
        title: 'Share Your Plans',
        description:
          'Meeting up? Use our Date Check-in feature to share your location with trusted contacts.',
        target: '[data-tutorial="date-checkin"]',
        placement: 'top',
        action: 'none',
        showProgress: true,
      },
    ],
  },
];

// =============================================
// CONTEXT
// =============================================

const TutorialContext = createContext<TutorialContextType | null>(null);

export function useTutorial() {
  const context = useContext(TutorialContext);
  if (!context) {
    throw new Error('useTutorial must be used within TutorialProvider');
  }
  return context;
}

// =============================================
// PROVIDER
// =============================================

export const TutorialProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tutorials, setTutorials] = useState<Tutorial[]>(TUTORIALS);
  const [state, setState] = useState<TutorialState>({
    activeTutorial: null,
    currentStepIndex: 0,
    completedTutorials: [],
    skippedTutorials: [],
    isActive: false,
  });

  // Load completed tutorials from localStorage
  useEffect(() => {
    const completed = localStorage.getItem('completedTutorials');
    const skipped = localStorage.getItem('skippedTutorials');
    if (completed) {
      setState((s) => ({ ...s, completedTutorials: JSON.parse(completed) }));
    }
    if (skipped) {
      setState((s) => ({ ...s, skippedTutorials: JSON.parse(skipped) }));
    }
  }, []);

  // Auto-start first-visit tutorial
  useEffect(() => {
    const hasVisited = localStorage.getItem('hasVisitedBefore');
    if (!hasVisited) {
      const welcomeTutorial = tutorials.find((t) => t.trigger === 'first-visit');
      if (welcomeTutorial && !state.completedTutorials.includes(welcomeTutorial.id)) {
        setTimeout(() => startTutorial(welcomeTutorial.id), 1000);
      }
      localStorage.setItem('hasVisitedBefore', 'true');
    }
  }, [tutorials, state.completedTutorials]);

  const startTutorial = useCallback(
    (tutorialId: string) => {
      const tutorial = tutorials.find((t) => t.id === tutorialId);
      if (!tutorial) return;

      setState((s) => ({
        ...s,
        activeTutorial: tutorial,
        currentStepIndex: 0,
        isActive: true,
      }));

      // Run onEnter for first step
      tutorial.steps[0]?.onEnter?.();
    },
    [tutorials]
  );

  const nextStep = useCallback(() => {
    if (!state.activeTutorial) return;

    const currentStep = state.activeTutorial.steps[state.currentStepIndex];
    currentStep?.onExit?.();

    if (state.currentStepIndex < state.activeTutorial.steps.length - 1) {
      const nextIndex = state.currentStepIndex + 1;
      setState((s) => ({ ...s, currentStepIndex: nextIndex }));
      state.activeTutorial.steps[nextIndex]?.onEnter?.();
    } else {
      completeTutorial();
    }
  }, [state.activeTutorial, state.currentStepIndex]);

  const previousStep = useCallback(() => {
    if (!state.activeTutorial || state.currentStepIndex <= 0) return;

    const currentStep = state.activeTutorial.steps[state.currentStepIndex];
    currentStep?.onExit?.();

    const prevIndex = state.currentStepIndex - 1;
    setState((s) => ({ ...s, currentStepIndex: prevIndex }));
    state.activeTutorial.steps[prevIndex]?.onEnter?.();
  }, [state.activeTutorial, state.currentStepIndex]);

  const skipTutorial = useCallback(() => {
    if (!state.activeTutorial) return;

    const tutorialId = state.activeTutorial.id;
    const newSkipped = [...state.skippedTutorials, tutorialId];

    setState((s) => ({
      ...s,
      skippedTutorials: newSkipped,
      activeTutorial: null,
      currentStepIndex: 0,
      isActive: false,
    }));

    localStorage.setItem('skippedTutorials', JSON.stringify(newSkipped));
  }, [state.activeTutorial, state.skippedTutorials]);

  const completeTutorial = useCallback(() => {
    if (!state.activeTutorial) return;

    const tutorialId = state.activeTutorial.id;
    const newCompleted = [...state.completedTutorials, tutorialId];

    setState((s) => ({
      ...s,
      completedTutorials: newCompleted,
      activeTutorial: null,
      currentStepIndex: 0,
      isActive: false,
    }));

    localStorage.setItem('completedTutorials', JSON.stringify(newCompleted));
  }, [state.activeTutorial, state.completedTutorials]);

  const resetTutorial = useCallback((tutorialId: string) => {
    setState((s) => ({
      ...s,
      completedTutorials: s.completedTutorials.filter((id) => id !== tutorialId),
      skippedTutorials: s.skippedTutorials.filter((id) => id !== tutorialId),
    }));
  }, []);

  const isTutorialCompleted = useCallback(
    (tutorialId: string) => {
      return state.completedTutorials.includes(tutorialId);
    },
    [state.completedTutorials]
  );

  const registerTutorial = useCallback((tutorial: Tutorial) => {
    setTutorials((prev) => {
      if (prev.find((t) => t.id === tutorial.id)) return prev;
      return [...prev, tutorial];
    });
  }, []);

  return (
    <TutorialContext.Provider
      value={{
        ...state,
        startTutorial,
        nextStep,
        previousStep,
        skipTutorial,
        completeTutorial,
        resetTutorial,
        isTutorialCompleted,
        registerTutorial,
      }}
    >
      {children}
      {state.isActive && state.activeTutorial && (
        <TutorialOverlay
          tutorial={state.activeTutorial}
          currentStep={state.currentStepIndex}
          onNext={nextStep}
          onPrevious={previousStep}
          onSkip={skipTutorial}
          onComplete={completeTutorial}
        />
      )}
    </TutorialContext.Provider>
  );
};

// =============================================
// OVERLAY COMPONENT
// =============================================

interface TutorialOverlayProps {
  tutorial: Tutorial;
  currentStep: number;
  onNext: () => void;
  onPrevious: () => void;
  onSkip: () => void;
  onComplete: () => void;
}

const TutorialOverlay: React.FC<TutorialOverlayProps> = ({
  tutorial,
  currentStep,
  onNext,
  onPrevious,
  onSkip,
  onComplete,
}) => {
  const step = tutorial.steps[currentStep];
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const isLastStep = currentStep === tutorial.steps.length - 1;
  const isFirstStep = currentStep === 0;

  // Find and track target element
  useEffect(() => {
    if (!step.target) {
      setTargetRect(null);
      return;
    }

    const updateRect = () => {
      const element = document.querySelector(step.target!);
      if (element) {
        setTargetRect(element.getBoundingClientRect());
        // Scroll element into view
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    };

    updateRect();
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect);

    return () => {
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect);
    };
  }, [step.target]);

  // Calculate tooltip position
  const getTooltipStyle = (): React.CSSProperties => {
    if (!targetRect || step.placement === 'center') {
      return {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      };
    }

    const padding = 16;
    const tooltipWidth = 320;
    const tooltipHeight = 200;

    switch (step.placement) {
      case 'top':
        return {
          position: 'fixed',
          top: targetRect.top - tooltipHeight - padding,
          left: targetRect.left + targetRect.width / 2 - tooltipWidth / 2,
        };
      case 'bottom':
        return {
          position: 'fixed',
          top: targetRect.bottom + padding,
          left: targetRect.left + targetRect.width / 2 - tooltipWidth / 2,
        };
      case 'left':
        return {
          position: 'fixed',
          top: targetRect.top + targetRect.height / 2 - tooltipHeight / 2,
          left: targetRect.left - tooltipWidth - padding,
        };
      case 'right':
        return {
          position: 'fixed',
          top: targetRect.top + targetRect.height / 2 - tooltipHeight / 2,
          left: targetRect.right + padding,
        };
      default:
        return {
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        };
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999]" role="dialog" aria-modal="true">
      {/* Backdrop with spotlight */}
      <div className="absolute inset-0 bg-black/70 transition-opacity" />

      {/* Spotlight on target */}
      {targetRect && (
        <div
          className="absolute border-4 border-pink-500 rounded-xl shadow-[0_0_0_9999px_rgba(0,0,0,0.7)] transition-all duration-300"
          style={{
            top: targetRect.top - 8,
            left: targetRect.left - 8,
            width: targetRect.width + 16,
            height: targetRect.height + 16,
          }}
        />
      )}

      {/* Tooltip */}
      <div
        className="bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700/50 w-80 p-6"
        style={getTooltipStyle()}
      >
        {/* Progress bar */}
        {step.showProgress && (
          <div className="flex gap-1 mb-4">
            {tutorial.steps.map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  i <= currentStep ? 'bg-gradient-to-r from-pink-500 to-purple-600' : 'bg-slate-700'
                }`}
              />
            ))}
          </div>
        )}

        {/* Content */}
        <h3 className="text-white font-semibold text-lg mb-2">{step.title}</h3>
        <p className="text-slate-300 text-sm mb-6">{step.description}</p>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {step.skipable && (
              <button
                onClick={onSkip}
                className="px-3 py-1.5 text-sm text-slate-400 hover:text-white transition-colors"
              >
                Skip tutorial
              </button>
            )}
          </div>

          <div className="flex gap-2">
            {!isFirstStep && (
              <button
                onClick={onPrevious}
                className="px-4 py-2 text-sm text-slate-300 hover:text-white transition-colors"
              >
                Back
              </button>
            )}
            <button
              onClick={isLastStep ? onComplete : onNext}
              className="px-4 py-2 text-sm bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg hover:opacity-90 transition-opacity"
            >
              {isLastStep ? 'Got it!' : 'Next'}
            </button>
          </div>
        </div>

        {/* Step counter */}
        <p className="text-center text-xs text-slate-500 mt-4">
          Step {currentStep + 1} of {tutorial.steps.length}
        </p>
      </div>
    </div>,
    document.body
  );
};

// =============================================
// HELPER COMPONENTS
// =============================================

export const TutorialTrigger: React.FC<{
  tutorialId: string;
  children: React.ReactNode;
  className?: string;
}> = ({ tutorialId, children, className }) => {
  const { startTutorial } = useTutorial();

  return (
    <button onClick={() => startTutorial(tutorialId)} className={className}>
      {children}
    </button>
  );
};

export const TutorialList: React.FC<{ className?: string }> = ({ className }) => {
  const { startTutorial, isTutorialCompleted } = useTutorial();

  return (
    <div className={`space-y-3 ${className}`}>
      {TUTORIALS.map((tutorial) => (
        <button
          key={tutorial.id}
          onClick={() => startTutorial(tutorial.id)}
          className={`
            w-full p-4 rounded-xl border text-left transition-all
            ${
              isTutorialCompleted(tutorial.id)
                ? 'bg-green-500/10 border-green-500/30'
                : 'bg-slate-800/50 border-slate-700/50 hover:border-purple-500/50'
            }
          `}
        >
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-white font-medium">{tutorial.name}</h4>
              <p className="text-slate-400 text-sm">{tutorial.description}</p>
            </div>
            {isTutorialCompleted(tutorial.id) && (
              <span className="text-green-400 text-sm">Completed</span>
            )}
          </div>
          {tutorial.estimatedTime && (
            <p className="text-slate-500 text-xs mt-2">
              ~{Math.ceil(tutorial.estimatedTime / 60)} min
            </p>
          )}
        </button>
      ))}
    </div>
  );
};

export default TutorialProvider;
