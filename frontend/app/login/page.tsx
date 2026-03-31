'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Github } from 'lucide-react';
import { signIn, useSession } from 'next-auth/react';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

const LoginPage = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { status } = useSession();

  React.useEffect(() => {
    if (status === 'authenticated') {
      router.push('/dashboard');
    }
  }, [status, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});

    try {
      const result = await signIn('credentials', {
        redirect: false,
        email: formData.email,
        password: formData.password,
      });

      if (result?.error) {
        toast.error(result.error || 'Invalid credentials');
        setErrors({ auth: result.error });
      } else {
        toast.success('Welcome back!');
        router.push('/dashboard');
        router.refresh();
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-bg-primary overflow-hidden">
      {/* Visual Side */}
      <div className="hidden lg:flex relative bg-bg-secondary p-16 flex-col justify-between overflow-hidden">
        {/* Animated Background Shapes */}
        <div className="absolute inset-0 z-0">
           <motion.div 
             animate={{ 
               scale: [1, 1.2, 1],
               rotate: [0, 90, 0],
               x: [-20, 20, -20],
               y: [-20, 20, -20]
             }}
             transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
             className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-accent-primary/10 rounded-full blur-[120px]"
           />
           <motion.div 
             animate={{ 
               scale: [1.2, 1, 1.2],
               rotate: [0, -90, 0],
               x: [20, -20, 20],
               y: [20, -20, 20]
             }}
             transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
             className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-accent-secondary/10 rounded-full blur-[100px]"
           />
        </div>

        {/* Content */}
        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-xl bg-accent-primary flex items-center justify-center rotate-12 group-hover:rotate-0 transition-all duration-500">
              <span className="font-display font-black text-bg-primary text-2xl">T</span>
            </div>
            <span className="font-display font-black text-3xl tracking-tight text-text-primary group-hover:text-accent-primary transition-colors">TalentFlow</span>
          </Link>
        </div>

        <div className="relative z-10 space-y-6 max-w-lg">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl lg:text-4xl font-display font-black text-white leading-[1.1] tracking-tight"
          >
            Access the <span className="text-accent-primary italic underline decoration-accent-primary/20 underline-offset-8">Elite</span> Talent Network.
          </motion.h1>
          <p className="text-xl text-text-secondary font-medium leading-relaxed">
            The world's most innovative companies use TalentFlow to build high-performance teams.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-6">
           <div className="flex -space-x-3">
              {[1,2,3,4].map(i => (
                <div key={i} className="w-10 h-10 rounded-full border-2 border-bg-secondary bg-elevated flex items-center justify-center text-xs font-bold text-text-tertiary">
                   U{i}
                </div>
              ))}
           </div>
           <p className="text-sm text-text-tertiary font-bold tracking-wide uppercase">Trusted by 50k+ professionals</p>
        </div>
      </div>

      {/* Form Side */}
      <div className="flex items-center justify-center p-8 lg:p-24 relative">
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full max-w-md space-y-12"
        >
          <div className="space-y-4">
            <h2 className="text-4xl font-display font-black text-text-primary tracking-tight">Welcome Back</h2>
            <p className="text-text-secondary font-medium outline-none">Enter your credentials to access your dashboard</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              label="Email Address"
              type="email"
              placeholder="name@company.com"
              leftIcon={<Mail size={18} />}
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
            
            <div className="space-y-2">
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                leftIcon={<Lock size={18} />}
                rightIcon={
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)}
                    className="hover:text-accent-primary transition-colors outline-none"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                }
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
              />
              <div className="flex justify-end">
                <Link href="/forgot-password" title="Forgot Password" className="text-xs font-bold text-text-tertiary hover:text-accent-primary transition-colors outline-none">
                  Forgot your password?
                </Link>
              </div>
            </div>

            <div className="flex items-center gap-2 px-1">
              <input 
                type="checkbox" 
                id="remember" 
                className="w-4 h-4 rounded border-border bg-bg-secondary text-accent-primary focus:ring-accent-primary/20 transition-all cursor-pointer"
              />
              <label htmlFor="remember" className="text-sm text-text-secondary font-medium cursor-pointer select-none">
                Remember me for 30 days
              </label>
            </div>

            <Button 
              type="submit" 
              className="w-full text-base py-6 font-bold tracking-tight" 
              isLoading={isLoading}
              rightIcon={<ArrowRight size={20} />}
            >
              Sign In to TalentFlow
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase tracking-widest font-black text-text-tertiary">
              <span className="bg-bg-primary px-4">Or continue with</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <Button variant="ghost" className="border border-border py-3">
                <Github size={18} className="mr-2" /> Github
             </Button>
             <Button variant="ghost" className="border border-border py-3">
                <Github size={18} className="mr-2" /> Google
             </Button>
          </div>

          <p className="text-center text-sm text-text-tertiary font-medium">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-accent-primary hover:underline font-bold">
              Join the network
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default LoginPage;
