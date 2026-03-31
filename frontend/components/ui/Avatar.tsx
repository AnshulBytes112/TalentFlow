'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import Image from 'next/image';

interface AvatarProps {
  src?: string;
  alt?: string;
  initials?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const Avatar = ({ src, alt, initials, size = 'md', className }: AvatarProps) => {
  const sizes = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-14 h-14 text-base',
    xl: 'w-24 h-24 text-xl',
  };

  const [hasError, setHasError] = React.useState(false);

  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={cn(
        'relative flex-shrink-0 rounded-full overflow-hidden border border-border bg-bg-elevated flex items-center justify-center font-display font-bold text-text-secondary select-none',
        sizes[size],
        className
      )}
    >
      {src && !hasError ? (
        <Image
          src={src}
          alt={alt || 'Avatar'}
          fill
          className="object-cover"
          onError={() => setHasError(true)}
        />
      ) : (
        <span>{initials?.toUpperCase() || '??'}</span>
      )}
      
      {/* Subtle ring overlay */}
      <div className="absolute inset-0 rounded-full border border-white/5 pointer-events-none" />
    </motion.div>
  );
};

export default Avatar;
