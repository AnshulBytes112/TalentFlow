'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const Spinner = ({ size = 'md', className }: SpinnerProps) => {
  const sizes = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
    xl: 'w-16 h-16 border-4',
  };

  return (
    <div className={cn('relative flex items-center justify-center', className)}>
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        className={cn(
          'rounded-full border-t-accent-primary border-r-transparent border-b-accent-primary/20 border-l-transparent',
          sizes[size]
        )}
      />
      {/* Subtle center glow */}
      {size === 'xl' && (
        <motion.div
          animate={{ opacity: [0.2, 0.5, 0.2] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute w-4 h-4 bg-accent-primary blur-lg rounded-full"
        />
      )}
    </div>
  );
};

export default Spinner;
