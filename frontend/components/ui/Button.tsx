'use client';

import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends HTMLMotionProps<"button"> {
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, leftIcon, rightIcon, children, disabled, ...props }, ref) => {
    
    const variants = {
      primary: 'bg-accent-primary text-bg-primary hover:bg-accent-secondary focus:ring-accent-primary',
      secondary: 'bg-bg-secondary text-text-primary hover:bg-bg-elevated border border-border focus:ring-border',
      danger: 'bg-accent-danger/10 text-accent-danger hover:bg-accent-danger/20 border border-transparent focus:ring-accent-danger',
      outline: 'bg-transparent text-text-primary border border-text-tertiary/30 hover:bg-bg-elevated focus:ring-text-tertiary/30',
      ghost: 'bg-transparent text-text-secondary hover:bg-elevated hover:text-text-primary border border-transparent focus:ring-transparent shadow-none',
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-xs rounded-lg',
      md: 'px-5 py-2.5 text-sm rounded-xl font-bold',
      lg: 'px-10 py-4 text-base rounded-2xl font-black uppercase tracking-tight',
    };

    return (
      <motion.button
        ref={ref}
        whileHover={{ scale: 1.015, y: -1 }}
        whileTap={{ scale: 0.99 }}
        disabled={disabled || isLoading}
        className={cn(
          'relative inline-flex items-center justify-center transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed border border-transparent',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {isLoading && (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        )}
        {!isLoading && leftIcon && <span className="mr-2">{leftIcon}</span>}
        <span className={cn(isLoading && 'opacity-0')}>{children as React.ReactNode}</span>
        {!isLoading && rightIcon && <span className="ml-2">{rightIcon}</span>}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
