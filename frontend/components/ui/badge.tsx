'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'applied' | 'screening' | 'interview' | 'offer' | 'rejected' | 'withdrawn';
}

const Badge = (props: BadgeProps) => {
  const { variant = 'default', className, children, ...rest } = props;
  
  const variants = {
    default: 'bg-bg-elevated text-text-secondary border-border',
    applied: 'bg-accent-secondary/10 text-accent-secondary border-accent-secondary/20',
    screening: 'bg-accent-warning/10 text-accent-warning border-accent-warning/20',
    interview: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    offer: 'bg-accent-primary/10 text-accent-primary border-accent-primary/20',
    rejected: 'bg-accent-danger/10 text-accent-danger border-accent-danger/20',
    withdrawn: 'bg-text-tertiary/10 text-text-tertiary border-text-tertiary/20',
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border transition-all duration-200',
        variants[variant],
        className
      )}
      {...(rest as any)}
    >
      <span className={cn(
        "w-1.5 h-1.5 rounded-full mr-1.5",
        variant === 'default' ? "bg-text-tertiary" : `bg-current`
      )} />
      {children}
    </motion.div>
  );
};

export default Badge;
