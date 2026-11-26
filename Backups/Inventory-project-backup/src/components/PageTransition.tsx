import React from 'react';
import { motion } from 'motion/react';

interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Smooth editorial entrance/exit wrapper for page routes.
 */
export const PageTransition: React.FC<PageTransitionProps> = ({ children, className }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.996 }}
      animate={{
        opacity: 1,
        y: 0,
        scale: 1,
        transition: { duration: 0.26, ease: [0.22, 1, 0.36, 1] },
      }}
      exit={{
        opacity: 0,
        y: -6,
        scale: 0.998,
        transition: { duration: 0.14, ease: [0.4, 0, 1, 1] },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};
