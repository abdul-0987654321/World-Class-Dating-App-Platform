/**
 * MatchCelebration - Particle-based Match Animation Component
 *
 * Features:
 * - Canvas-based particle system for 60fps performance
 * - Confetti and heart burst effects
 * - Hardware-accelerated rendering
 * - Configurable celebration types
 *
 * @package @flamoral/web
 */

import React, { useEffect, useRef, useCallback, memo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ANIMATION_CONFIG, CELEBRATION_CONFIG } from '@flamoral/shared/animations';

// ============================================================================
// TYPES
// ============================================================================

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  rotation: number;
  rotationSpeed: number;
  shape: 'square' | 'circle' | 'heart' | 'star';
  opacity: number;
  gravity: number;
  decay: number;
}

interface MatchedUser {
  id: string;
  name: string;
  photo: string;
}

export interface MatchCelebrationProps {
  visible: boolean;
  currentUser: MatchedUser;
  matchedUser: MatchedUser;
  onSendMessage: () => void;
  onKeepSwiping: () => void;
  onClose: () => void;
}

// ============================================================================
// PARTICLE SYSTEM (Canvas-based for performance)
// ============================================================================

type ParticleConfig = {
  particleCount: number;
  spread: number;
  startVelocity: number;
  gravity: number;
  colors: readonly string[];
  shapes: readonly string[];
  scalar?: number;
  decay?: number;
  ticks?: number;
};

const useParticleSystem = (
  canvasRef: React.RefObject<HTMLCanvasElement>,
  active: boolean,
  config: ParticleConfig = CELEBRATION_CONFIG.confetti
) => {
  // Provide defaults for optional properties
  const fullConfig = {
    ...config,
    decay: config.decay ?? 0.91,
    ticks: config.ticks ?? 200,
  };
  const particlesRef = useRef<Particle[]>([]);
  const animationFrameRef = useRef<number>();

  const createParticle = useCallback(
    (origin: { x: number; y: number }): Particle => {
      const angle = (Math.random() * fullConfig.spread - fullConfig.spread / 2) * (Math.PI / 180);
      const velocity = fullConfig.startVelocity * (0.5 + Math.random() * 0.5);

      return {
        x: origin.x,
        y: origin.y,
        vx: Math.sin(angle) * velocity,
        vy: -Math.cos(angle) * velocity,
        color: fullConfig.colors[Math.floor(Math.random() * fullConfig.colors.length)],
        size: 8 + Math.random() * 6,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 10,
        shape: fullConfig.shapes[Math.floor(Math.random() * fullConfig.shapes.length)] as Particle['shape'],
        opacity: 1,
        gravity: fullConfig.gravity,
        decay: fullConfig.decay,
      };
    },
    [config]
  );

  const drawParticle = useCallback(
    (ctx: CanvasRenderingContext2D, particle: Particle) => {
      ctx.save();
      ctx.translate(particle.x, particle.y);
      ctx.rotate((particle.rotation * Math.PI) / 180);
      ctx.globalAlpha = particle.opacity;
      ctx.fillStyle = particle.color;

      switch (particle.shape) {
        case 'square':
          ctx.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size);
          break;
        case 'circle':
          ctx.beginPath();
          ctx.arc(0, 0, particle.size / 2, 0, Math.PI * 2);
          ctx.fill();
          break;
        case 'heart':
          drawHeart(ctx, particle.size);
          break;
        case 'star':
          drawStar(ctx, particle.size);
          break;
      }

      ctx.restore();
    },
    []
  );

  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particlesRef.current = particlesRef.current.filter((particle) => {
      // Update physics
      particle.vy += particle.gravity * 0.3;
      particle.vx *= particle.decay;
      particle.vy *= particle.decay;
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.rotation += particle.rotationSpeed;
      particle.opacity *= 0.99;

      // Draw if still visible
      if (particle.opacity > 0.01 && particle.y < canvas.height + 50) {
        drawParticle(ctx, particle);
        return true;
      }
      return false;
    });

    if (particlesRef.current.length > 0 || active) {
      animationFrameRef.current = requestAnimationFrame(animate);
    }
  }, [canvasRef, drawParticle, active]);

  const burst = useCallback(
    (origin?: { x: number; y: number }) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const defaultOrigin = {
        x: canvas.width / 2,
        y: canvas.height / 2,
      };
      const burstOrigin = origin || defaultOrigin;

      // Create particles
      for (let i = 0; i < fullConfig.particleCount; i++) {
        particlesRef.current.push(createParticle(burstOrigin));
      }

      // Start animation if not running
      if (!animationFrameRef.current) {
        animate();
      }
    },
    [canvasRef, fullConfig.particleCount, createParticle, animate]
  );

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return { burst };
};

// Helper functions for drawing shapes
const drawHeart = (ctx: CanvasRenderingContext2D, size: number) => {
  ctx.beginPath();
  const topCurveHeight = size * 0.3;
  ctx.moveTo(0, topCurveHeight);
  // Top left curve
  ctx.bezierCurveTo(0, 0, -size / 2, 0, -size / 2, topCurveHeight);
  // Bottom left curve
  ctx.bezierCurveTo(-size / 2, size * 0.55, 0, size * 0.7, 0, size);
  // Bottom right curve
  ctx.bezierCurveTo(0, size * 0.7, size / 2, size * 0.55, size / 2, topCurveHeight);
  // Top right curve
  ctx.bezierCurveTo(size / 2, 0, 0, 0, 0, topCurveHeight);
  ctx.fill();
};

const drawStar = (ctx: CanvasRenderingContext2D, size: number) => {
  const spikes = 5;
  const outerRadius = size / 2;
  const innerRadius = size / 4;

  ctx.beginPath();
  for (let i = 0; i < spikes * 2; i++) {
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const angle = (i * Math.PI) / spikes - Math.PI / 2;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.closePath();
  ctx.fill();
};

// ============================================================================
// MATCH CELEBRATION COMPONENT
// ============================================================================

export const MatchCelebration = memo<MatchCelebrationProps>(({
  visible,
  currentUser,
  matchedUser,
  onSendMessage,
  onKeepSwiping,
  onClose,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showContent, setShowContent] = useState(false);

  const { burst: confettiBurst } = useParticleSystem(canvasRef, visible, CELEBRATION_CONFIG.confetti);
  const { burst: heartBurst } = useParticleSystem(canvasRef, visible, CELEBRATION_CONFIG.heartBurst);

  // Trigger celebration effects when visible
  useEffect(() => {
    if (visible) {
      setShowContent(false);

      // Resize canvas
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
      }

      // Trigger confetti burst
      setTimeout(() => confettiBurst(), 100);
      setTimeout(() => confettiBurst({ x: window.innerWidth * 0.3, y: window.innerHeight * 0.3 }), 200);
      setTimeout(() => confettiBurst({ x: window.innerWidth * 0.7, y: window.innerHeight * 0.3 }), 300);

      // Trigger heart burst in center
      setTimeout(() => heartBurst(), 400);

      // Show content after initial burst
      setTimeout(() => setShowContent(true), 500);
    }
  }, [visible, confettiBurst, heartBurst]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Background */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-br from-pink-600/95 via-rose-500/95 to-pink-700/95"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          />

          {/* Particle Canvas */}
          <canvas
            ref={canvasRef}
            className="absolute inset-0 pointer-events-none"
            style={{ zIndex: 10 }}
          />

          {/* Content */}
          <AnimatePresence>
            {showContent && (
              <motion.div
                className="relative z-20 flex flex-col items-center px-6 text-white"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{
                  type: 'spring',
                  ...ANIMATION_CONFIG.springs.bouncy,
                }}
              >
                {/* Title */}
                <motion.h1
                  className="text-5xl md:text-7xl font-bold mb-8 text-center"
                  initial={{ opacity: 0, y: -30, rotate: -10 }}
                  animate={{ opacity: 1, y: 0, rotate: 0 }}
                  transition={{
                    type: 'spring',
                    damping: 10,
                    stiffness: 100,
                    delay: 0.1,
                  }}
                  style={{
                    textShadow: '0 4px 20px rgba(0,0,0,0.3)',
                  }}
                >
                  It's a Match!
                </motion.h1>

                {/* Profile Images */}
                <div className="flex items-center justify-center gap-4 mb-8">
                  {/* Current User */}
                  <motion.div
                    className="relative"
                    initial={{ opacity: 0, scale: 0, x: -100 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    transition={{
                      type: 'spring',
                      ...ANIMATION_CONFIG.springs.bouncy,
                      delay: 0.2,
                    }}
                  >
                    <div className="w-28 h-28 md:w-36 md:h-36 rounded-full border-4 border-white overflow-hidden shadow-2xl">
                      <img
                        src={currentUser.photo}
                        alt={currentUser.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </motion.div>

                  {/* Heart Icon */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{
                      opacity: 1,
                      scale: [0, 1.3, 1],
                    }}
                    transition={{
                      delay: 0.4,
                      duration: 0.5,
                      times: [0, 0.6, 1],
                    }}
                  >
                    <motion.span
                      className="text-5xl md:text-6xl"
                      animate={{
                        scale: [1, 1.1, 1],
                      }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        ease: 'easeInOut',
                      }}
                    >
                      <span role="img" aria-label="hearts">&#128149;</span>
                    </motion.span>
                  </motion.div>

                  {/* Matched User */}
                  <motion.div
                    className="relative"
                    initial={{ opacity: 0, scale: 0, x: 100 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    transition={{
                      type: 'spring',
                      ...ANIMATION_CONFIG.springs.bouncy,
                      delay: 0.3,
                    }}
                  >
                    <div className="w-28 h-28 md:w-36 md:h-36 rounded-full border-4 border-white overflow-hidden shadow-2xl">
                      <img
                        src={matchedUser.photo}
                        alt={matchedUser.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </motion.div>
                </div>

                {/* Subtitle */}
                <motion.p
                  className="text-xl md:text-2xl mb-2 text-center font-medium"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  You and {matchedUser.name} liked each other!
                </motion.p>

                <motion.p
                  className="text-white/80 mb-8 text-center"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                >
                  Start a conversation and make a connection
                </motion.p>

                {/* Action Buttons */}
                <motion.div
                  className="flex flex-col gap-4 w-full max-w-xs"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                >
                  <motion.button
                    onClick={onSendMessage}
                    className="w-full py-4 px-8 bg-white text-pink-600 font-bold text-lg rounded-full shadow-lg hover:shadow-xl transition-shadow"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Send Message
                  </motion.button>

                  <motion.button
                    onClick={onKeepSwiping}
                    className="w-full py-4 px-8 bg-transparent border-2 border-white text-white font-semibold rounded-full hover:bg-white/10 transition-colors"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Keep Swiping
                  </motion.button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Close Button */}
          <motion.button
            onClick={onClose}
            className="absolute top-6 right-6 z-30 w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-colors"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.8 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            aria-label="Close"
          >
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

MatchCelebration.displayName = 'MatchCelebration';

export default MatchCelebration;
