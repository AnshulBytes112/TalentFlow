'use client';

import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
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
    const internalRef = useRef<HTMLInputElement | null>(null);

    const setRefs = (el: HTMLInputElement | null) => {
      internalRef.current = el;
      if (typeof ref === 'function') {
        ref(el);
      } else if (ref) {
        (ref as React.MutableRefObject<HTMLInputElement | null>).current = el;
      }
    };

    const syncAutofillToState = () => {
      const currentValue = internalRef.current?.value || '';
      if (currentValue && currentValue !== String(value ?? '')) {
        setHasValue(true);
        onChange?.({
          target: { value: currentValue },
          currentTarget: { value: currentValue }
        } as React.ChangeEvent<HTMLInputElement>);
      }
    };

    useEffect(() => {
        setHasValue(!!value);
    }, [value]);

    useLayoutEffect(() => {
      // On first paint, pick up browser-injected values (autofill/password manager)
      // so label and typed value don't overlap visually.
      syncAutofillToState();
    }, []);

    useEffect(() => {
      // Browser/password-manager autofill often updates DOM value without firing React events.
      const t1 = window.setTimeout(syncAutofillToState, 60);
      const t2 = window.setTimeout(syncAutofillToState, 400);

      const intervalId = window.setInterval(syncAutofillToState, 250);
      const stopPollingId = window.setTimeout(() => {
        window.clearInterval(intervalId);
      }, 6000);

      const observer = new MutationObserver(syncAutofillToState);
      if (internalRef.current) {
        observer.observe(internalRef.current, {
          attributes: true,
          attributeFilter: ['value']
        });
      }

      return () => {
        window.clearTimeout(t1);
        window.clearTimeout(t2);
        window.clearTimeout(stopPollingId);
        window.clearInterval(intervalId);
        observer.disconnect();
      };
    }, [value]);

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      syncAutofillToState();
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
            ref={setRefs}
            value={value}
            onChange={(e) => {
              setHasValue(!!e.target.value);
              onChange?.(e);
            }}
            onFocus={handleFocus}
            onBlur={handleBlur}
            className={cn(
              'peer relative z-20 w-full h-full bg-transparent text-text-primary outline-none placeholder:opacity-0 caret-accent-primary',
              'pt-6 pb-1', // Extra top padding keeps text clear of floating label
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
              top: isFloating ? '18%' : '50%',
              y: '-50%',
              scale: isFloating ? 0.72 : 1,
              color: error ? '#F87171' : (isFocused ? '#6EE7B7' : '#94A3B8'),
            } as any}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className={cn(
              "absolute pointer-events-none origin-left font-medium z-30",
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
