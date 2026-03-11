import React from 'react';
import { motion } from 'framer-motion';

/**
 * AnimatedBackground — decorative radial gradient orbs that drift slowly
 * behind the entire application. Pointer-events disabled so they never
 * interfere with clicks.
 */
export const AnimatedBackground: React.FC = () => {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      {/* Orb 1 — violet, top-left quadrant */}
      <motion.div
        className="absolute rounded-full opacity-[0.13]"
        style={{
          width: 600,
          height: 600,
          top: -180,
          left: -120,
          background:
            'radial-gradient(circle, var(--accent-start) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
        animate={{
          x: [0, 80, 0],
          y: [0, -60, 0],
          scale: [1, 1.15, 1],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: 'easeInOut',
          repeatType: 'mirror',
        }}
      />

      {/* Orb 2 — cyan, bottom-right quadrant */}
      <motion.div
        className="absolute rounded-full opacity-[0.10]"
        style={{
          width: 500,
          height: 500,
          bottom: -160,
          right: -80,
          background:
            'radial-gradient(circle, var(--accent-end) 0%, transparent 70%)',
          filter: 'blur(50px)',
        }}
        animate={{
          x: [0, -60, 0],
          y: [0, 80, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 30,
          repeat: Infinity,
          ease: 'easeInOut',
          repeatType: 'mirror',
        }}
      />

      {/* Orb 3 — pink, center-right, very faint */}
      <motion.div
        className="absolute rounded-full opacity-[0.07]"
        style={{
          width: 400,
          height: 400,
          top: '35%',
          right: '20%',
          background:
            'radial-gradient(circle, var(--accent-pink) 0%, transparent 70%)',
          filter: 'blur(55px)',
        }}
        animate={{
          x: [0, 40, -40, 0],
          y: [0, -40, 20, 0],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: 'easeInOut',
          repeatType: 'mirror',
        }}
      />

      {/* Subtle grid texture */}
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.07) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.07) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
        }}
      />
    </div>
  );
};
