'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, leftIcon, rightIcon, children, disabled, ...props }, ref) => {
    
    const variants = {
      primary: 'bg-accent-primary text-background hover:shadow-[0_0_15px_rgba(110,231,183,0.2)] shadow-accent-primary/10',
      secondary: 'bg-accent-secondary text-text-primary hover:shadow-[0_0_15px_rgba(59,130,246,0.2)] shadow-accent-secondary/10',
      ghost: 'bg-transparent text-text-secondary hover:bg-elevated hover:text-text-primary',
      danger: 'bg-accent-danger text-text-primary hover:shadow-[0_0_15px_rgba(248,113,113,0.2)] shadow-accent-danger/10',
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
        <span className={cn(isLoading && 'opacity-0')}>{children}</span>
        {!isLoading && rightIcon && <span className="ml-2">{rightIcon}</span>}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
