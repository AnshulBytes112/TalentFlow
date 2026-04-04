'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'ghost';
  noHover?: boolean;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', noHover = false, children, ...props }, ref) => {
    
    const variants = {
      default: 'bg-bg-card border-border',
      elevated: 'bg-bg-elevated border-border shadow-lg shadow-black/20',
      ghost: 'bg-transparent border-transparent',
    };

    return (
      <motion.div
        ref={ref}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className={cn(
          'rounded-2xl border p-1 transition-colors',
          variants[variant],
          className
        )}
        {...(props as any)}
      >
        <div className="h-full w-full rounded-[0.85rem] overflow-hidden">
          {children}
        </div>
      </motion.div>
    );
  }
);

const CardHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col space-y-1.5 p-6', className)} {...props} />
);

const CardTitle = ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h3 className={cn('text-xl font-display font-bold leading-none tracking-tight text-text-primary', className)} {...props} />
);

const CardDescription = ({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p className={cn('text-sm text-text-secondary font-medium', className)} {...props} />
);

const CardContent = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('p-6 pt-0', className)} {...props} />
);

const CardFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex items-center p-6 pt-0', className)} {...props} />
);

Card.displayName = 'Card';

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
