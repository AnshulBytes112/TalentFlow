'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { AlertCircle } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, leftIcon, rightIcon, value, onChange, onFocus, onBlur, ...props }, ref) => {
    const [isFocused, setIsFocused] = useState(false);
    const [hasValue, setHasValue] = useState(!!value);

    useEffect(() => {
        setHasValue(!!value);
    }, [value]);

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      setHasValue(!!e.target.value);
      onBlur?.(e);
    };

    const isFloating = isFocused || hasValue;

    return (
      <div className="w-full space-y-1">
        <div className="relative flex items-center h-14 bg-bg-secondary border border-border rounded-xl overflow-hidden focus-within:border-accent-primary focus-within:ring-1 focus-within:ring-accent-primary/20 transition-all duration-200">
          
          {leftIcon && (
            <div className="absolute left-4 flex items-center justify-center text-text-tertiary transition-colors peer-focus:text-accent-primary z-10 pointer-events-none">
              {leftIcon}
            </div>
          )}
          
          <input
            ref={ref}
            value={value}
            onChange={(e) => {
              setHasValue(!!e.target.value);
              onChange?.(e);
            }}
            onFocus={handleFocus}
            onBlur={handleBlur}
            className={cn(
              'peer w-full h-full bg-transparent text-text-primary outline-none placeholder:opacity-0',
              'pt-5 pb-1', // Padding to push text down to make room for label
              leftIcon ? 'pl-11' : 'pl-4',
              rightIcon ? 'pr-11' : 'pr-4',
              error && 'text-accent-danger',
              className
            )}
            {...props}
          />

          {rightIcon && (
            <div className="absolute right-4 flex items-center justify-center text-text-tertiary z-10">
              {rightIcon}
            </div>
          )}

          {/* Floating Label */}
          <motion.label
            initial={false}
            animate={{
              top: isFloating ? '25%' : '50%',
              y: '-50%',
              scale: isFloating ? 0.75 : 1,
              color: error ? '#F87171' : (isFocused ? '#6EE7B7' : '#94A3B8'),
            } as any}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className={cn(
              "absolute pointer-events-none origin-left font-medium z-10",
              leftIcon ? "left-11" : "left-4"
            )}
            style={{
              fontWeight: isFloating ? 700 : 500,
            } as React.CSSProperties}
          >
            {label}
          </motion.label>
        </div>

        {/* Error message */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-1.5 text-accent-danger text-xs px-1"
            >
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{error}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
