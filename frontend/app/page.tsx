'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Briefcase, Users, TrendingUp, Search, Globe, Shield, Zap } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import Button from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';

export default function HomePage() {
  return (
    <div className="relative min-h-screen">
      <Navbar />

      {/* Hero Section */}
      <section className="container pt-40 pb-20 lg:pt-56 lg:pb-32">
        <div className="flex flex-col items-center text-center max-w-5xl mx-auto space-y-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
          >
            <Badge variant="screening" className="px-4 py-1.5 text-xs font-black uppercase tracking-[0.2em]">
              The Future of Recruitment
            </Badge>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-black text-white leading-[1.05] tracking-tight">
              Where <span className="text-luxury">Elite Talent</span> <br />
              Meets Industry <span className="text-accent-primary italic">Pioneers</span>.
            </h1>
            <p className="text-xl lg:text-2xl text-text-secondary max-w-3xl mx-auto font-medium leading-relaxed">
              TalentFlow is the premier recruitment ecosystem for high-growth tech companies and world-class professionals.
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="flex flex-col sm:flex-row gap-6 w-full sm:w-auto"
          >
            <Link href="/register" className="w-full sm:w-auto">
              <Button size="lg" className="w-full text-lg px-10 py-8 font-black tracking-tight" rightIcon={<ArrowRight size={22} />}>
                Join the Network
              </Button>
            </Link>
            <Link href="/jobs" className="w-full sm:w-auto">
              <Button variant="ghost" size="lg" className="w-full text-lg px-10 py-8 border border-border font-black tracking-tight hover:bg-elevated/50">
                Explore Careers
              </Button>
            </Link>
          </motion.div>

          {/* Social Proof / Stats */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 1 }}
            className="pt-12 grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-16 border-t border-border w-full"
          >
            {[
              { label: 'Active Jobs', value: '12k+' },
              { label: 'Trusted Partners', value: '450+' },
              { label: 'Elite Members', value: '65k+' },
              { label: 'Success Rate', value: '98%' },
            ].map((stat, idx) => (
              <div key={idx} className="text-center space-y-1">
                <div className="text-3xl font-display font-black text-white">{stat.value}</div>
                <div className="text-[10px] uppercase tracking-widest font-bold text-text-tertiary">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Value Propositions */}
      <section className="container py-20 lg:py-40">
        <div className="grid lg:grid-cols-3 gap-8">
          <Card className="group relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
              <Shield size={120} />
            </div>
            <CardHeader className="relative z-10">
              <div className="w-12 h-12 rounded-xl bg-accent-primary/10 flex items-center justify-center text-accent-primary mb-4">
                <Shield size={24} />
              </div>
              <CardTitle className="text-2xl uppercase tracking-tight">Vetted Excellence</CardTitle>
              <CardDescription className="text-base text-text-secondary">
                Every candidate and recruiter undergoes a rigorous quality check to maintain our high-performance ecosystem.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card variant="elevated" className="group relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
              <Zap size={120} />
            </div>
            <CardHeader className="relative z-10">
              <div className="w-12 h-12 rounded-xl bg-accent-secondary/10 flex items-center justify-center text-accent-secondary mb-4">
                <Zap size={24} />
              </div>
              <CardTitle className="text-2xl uppercase tracking-tight">Hyper-Growth Sync</CardTitle>
              <CardDescription className="text-base text-text-secondary">
                Real-time pipelines and smart matching algorithms accelerate your hiring cycle by 3x.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="group relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
              <Globe size={120} />
            </div>
            <CardHeader className="relative z-10">
              <div className="w-12 h-12 rounded-xl bg-text-tertiary/10 flex items-center justify-center text-text-secondary mb-4">
                <Globe size={24} />
              </div>
              <CardTitle className="text-2xl uppercase tracking-tight">Global Connectivity</CardTitle>
              <CardDescription className="text-base text-text-secondary">
                Tap into a borderless talent market. From Silicon Valley to Singapore, we've got you covered.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container py-20 lg:py-40">
        <Card variant="elevated" className="bg-bg-secondary p-12 lg:p-24 overflow-hidden relative border-accent-primary/20">
          <div className="absolute inset-0 mesh-gradient opacity-20 pointer-events-none" />
          <div className="relative z-10 flex flex-col items-center text-center space-y-8 max-w-3xl mx-auto">
            <h2 className="text-4xl lg:text-6xl font-display font-black text-white tracking-tight">
              Ready to <span className="italic text-accent-primary underline decoration-accent-primary/30 underline-offset-8">Elevate</span> Your Career?
            </h2>
            <p className="text-xl text-text-secondary font-medium">
              Join the waiting list or create an account today to access exclusive opportunities and world-class talent.
            </p>
            <div className="flex gap-4">
              <Link href="/register">
                <Button size="lg" className="font-black px-8">Get Started Now</Button>
              </Link>
              <Button variant="ghost" className="border border-border font-black px-8">Talk to Sales</Button>
            </div>
          </div>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-bg-secondary/30 pt-20 pb-10">
        <div className="container grid md:grid-cols-4 gap-12 mb-20">
          <div className="col-span-1 md:col-span-2 space-y-6">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-accent-primary flex items-center justify-center rotate-12">
                <span className="font-display font-black text-bg-primary text-xl">T</span>
              </div>
              <span className="font-display font-black text-2xl tracking-tight text-white italic">TalentFlow</span>
            </Link>
            <p className="text-text-secondary font-medium max-w-sm leading-relaxed">
              The editorial job platform for the world&apos;s most innovative technology companies.
            </p>
          </div>
          
          <div className="space-y-4">
            <h4 className="text-xs font-black uppercase tracking-widest text-text-tertiary">Platform</h4>
            <ul className="space-y-3">
              {['Browse Jobs', 'Companies', 'Recruiters', 'Talent Search'].map(link => (
                <li key={link}>
                  <Link href="#" className="text-sm font-bold text-text-secondary hover:text-accent-primary transition-colors">{link}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="text-xs font-black uppercase tracking-widest text-text-tertiary">Community</h4>
            <ul className="space-y-3">
              {['Pricing', 'Case Studies', 'Legal', 'Privacy'].map(link => (
                <li key={link}>
                  <Link href="#" className="text-sm font-bold text-text-secondary hover:text-accent-primary transition-colors">{link}</Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
        
        <div className="container border-t border-border pt-10 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">
            &copy; 2026 TalentFlow Ecosystem. All Rights Reserved.
          </p>
          <div className="flex gap-6 text-[10px] font-bold text-text-tertiary uppercase tracking-widest">
            <Link href="#" className="hover:text-text-primary transition-colors">Twitter</Link>
            <Link href="#" className="hover:text-text-primary transition-colors">LinkedIn</Link>
            <Link href="#" className="hover:text-text-primary transition-colors">Discord</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
