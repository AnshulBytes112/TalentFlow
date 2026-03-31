'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Home, ArrowLeft } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Mesh Overlay */}
      <div className="absolute inset-0 mesh-gradient opacity-20 pointer-events-none" />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative z-10 w-full max-w-lg"
      >
        <Card variant="elevated" className="text-center p-8 lg:p-12 border-accent-danger/20">
          <CardHeader className="space-y-4">
            <div className="mx-auto w-24 h-24 rounded-3xl bg-accent-danger/10 flex items-center justify-center rotate-12 mb-6">
              <span className="text-5xl font-display font-black text-accent-danger">404</span>
            </div>
            <CardTitle className="text-4xl font-display font-black tracking-tight text-white uppercase">
              Lost in the <span className="text-accent-danger">Matrix</span>
            </CardTitle>
            <CardDescription className="text-lg font-medium text-text-secondary leading-relaxed">
              We couldn&apos;t find the portal you were looking for. It may have been moved or doesn&apos;t exist in this timeline.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="pt-8">
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/" className="flex-1 sm:flex-none">
                <Button className="w-full sm:w-auto px-8 font-black tracking-tight" leftIcon={<Home size={18} />}>
                  Return Home
                </Button>
              </Link>
              <Button 
                variant="ghost" 
                onClick={() => window.history.back()} 
                className="w-full sm:w-auto px-8 border border-border font-black tracking-tight hover:bg-elevated/50"
                leftIcon={<ArrowLeft size={18} />}
              >
                Go Back
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Brand Link */}
        <div className="mt-12 text-center">
          <Link href="/" className="inline-flex items-center gap-2 group opacity-50 hover:opacity-100 transition-opacity">
            <div className="w-6 h-6 rounded-lg bg-accent-primary flex items-center justify-center rotate-12 group-hover:rotate-0 transition-transform">
              <span className="font-display font-black text-bg-primary text-sm">T</span>
            </div>
            <span className="font-display font-black text-lg tracking-tight text-white italic">TalentFlow</span>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
