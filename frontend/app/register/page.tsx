'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, Check, ArrowRight, UserCircle, Briefcase, Info } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import {Card} from '@/components/ui/Card';

const RegisterPage = () => {
  const router = useRouter();
  const { status } = useSession();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  React.useEffect(() => {
    if (status === 'authenticated') {
      router.push('/dashboard');
    }
  }, [status, router]);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: '', // 'jobseeker' or 'recruiter'
  });

  const passwordStrength = useMemo(() => {
    if (!formData.password) return { label: '', color: 'bg-border', width: '0%', score: 0 };
    let score = 0;
    if (formData.password.length > 8) score++;
    if (/[A-Z]/.test(formData.password)) score++;
    if (/[0-9]/.test(formData.password)) score++;
    if (/[^A-Za-z0-9]/.test(formData.password)) score++;

    const levels = [
      { label: 'Very Weak', color: 'bg-accent-danger', width: '25%', score: 1 },
      { label: 'Weak', color: 'bg-accent-warning', width: '50%', score: 2 },
      { label: 'Good', color: 'bg-accent-secondary', width: '75%', score: 3 },
      { label: 'Strong', color: 'bg-accent-primary', width: '100%', score: 4 },
    ];

    return levels[score - 1] || levels[0];
  }, [formData.password]);

  const handleNextStep = () => {
    if (step === 1 && !formData.role) {
      toast.error('Please select your role to continue');
      return;
    }
    setStep(step + 1);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      toast.success('Account created! Please log in.');
      router.push('/login');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-bg-primary overflow-hidden">
      {/* Visual Side (Similar to Login) */}
      <div className="hidden lg:flex relative bg-bg-secondary p-16 flex-col justify-between overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-40 mesh-gradient" />
        
        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-xl bg-accent-primary flex items-center justify-center rotate-12 group-hover:rotate-0 transition-all duration-500">
              <span className="font-display font-black text-bg-primary text-2xl">T</span>
            </div>
            <span className="font-display font-black text-3xl tracking-tight text-white group-hover:text-accent-primary transition-colors">TalentFlow</span>
          </Link>
        </div>

        <div className="relative z-10 space-y-6 max-w-lg">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl lg:text-4xl font-display font-black text-white leading-[1.1] tracking-tight"
          >
            Start Your <span className="text-accent-secondary italic underline decoration-accent-secondary/20 underline-offset-8">Career</span> Revolution.
          </motion.h1>
          <p className="text-xl text-text-secondary font-medium leading-relaxed">
            Join the most exclusive portal connecting world-class talent with industry pioneers.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-4 p-4 rounded-2xl bg-bg-card/50 border border-border backdrop-blur-md">
           <Info className="text-accent-primary flex-shrink-0" size={20} />
           <p className="text-xs text-text-secondary font-medium">Verify your email after registration to access all features.</p>
        </div>
      </div>

      {/* Form Side */}
      <div className="flex items-center justify-center p-8 lg:p-20 relative">
        <div className="w-full max-w-md space-y-12">
          {/* Progress Indicator */}
          <div className="flex items-center gap-3">
             {[1,2].map(i => (
                <div key={i} className={cn(
                   "h-1.5 flex-1 rounded-full bg-border overflow-hidden transition-all duration-500",
                   step >= i ? "bg-accent-primary" : "bg-border"
                )}>
                   {step === i && (
                      <motion.div 
                        initial={{ x: '-100%' }}
                        animate={{ x: '0%' }}
                        className="w-full h-full bg-accent-primary"
                      />
                   )}
                </div>
             ))}
          </div>

          <AnimatePresence mode="wait">
            {step === 1 ? (
              <motion.div 
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-10"
              >
                <div className="space-y-4">
                  <h2 className="text-4xl font-display font-black text-text-primary tracking-tight">Select your role</h2>
                  <p className="text-text-secondary font-medium">How would you like to use TalentFlow?</p>
                </div>

                <div className="grid gap-6">
                   <Card 
                     onClick={() => setFormData({ ...formData, role: 'jobseeker' })}
                     className={cn(
                        "relative cursor-pointer transition-all border-2",
                        formData.role === 'jobseeker' ? "border-accent-primary bg-accent-primary/5" : "border-border hover:border-text-tertiary"
                     )}
                   >
                      <div className="p-8 flex items-center gap-6">
                         <div className={cn("p-4 rounded-2xl transition-colors", formData.role === 'jobseeker' ? "bg-accent-primary text-bg-primary" : "bg-elevated text-text-tertiary")}>
                            <UserCircle size={32} />
                         </div>
                         <div className="space-y-1">
                            <h4 className="text-lg font-display font-black text-text-primary uppercase tracking-tight">I&apos;m looking for a job</h4>
                            <p className="text-xs text-text-tertiary font-bold">Discover elite opportunities</p>
                         </div>
                         {formData.role === 'jobseeker' && (
                            <motion.div layoutId="choice" className="absolute right-6 top-1/2 -translate-y-1/2 w-6 h-6 bg-accent-primary rounded-full flex items-center justify-center text-bg-primary">
                               <Check size={14} />
                            </motion.div>
                         )}
                      </div>
                   </Card>

                   <Card 
                     onClick={() => setFormData({ ...formData, role: 'recruiter' })}
                     className={cn(
                        "relative cursor-pointer transition-all border-2",
                        formData.role === 'recruiter' ? "border-accent-secondary bg-accent-secondary/5" : "border-border hover:border-text-tertiary"
                     )}
                   >
                      <div className="p-8 flex items-center gap-6">
                         <div className={cn("p-4 rounded-2xl transition-colors", formData.role === 'recruiter' ? "bg-accent-secondary text-white" : "bg-elevated text-text-tertiary")}>
                            <Briefcase size={32} />
                         </div>
                         <div className="space-y-1">
                            <h4 className="text-lg font-display font-black text-text-primary uppercase tracking-tight">I&apos;m hiring talent</h4>
                            <p className="text-xs text-text-tertiary font-bold">Find world-class professionals</p>
                         </div>
                         {formData.role === 'recruiter' && (
                            <motion.div layoutId="choice" className="absolute right-6 top-1/2 -translate-y-1/2 w-6 h-6 bg-accent-secondary rounded-full flex items-center justify-center text-white">
                               <Check size={14} />
                            </motion.div>
                         )}
                      </div>
                   </Card>
                </div>

                <Button onClick={handleNextStep} className="w-full py-6 font-bold" rightIcon={<ArrowRight size={20} />}>
                   Continue Registration
                </Button>
              </motion.div>
            ) : (
              <motion.div 
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="space-y-2">
                  <button onClick={() => setStep(1)} className="text-xs font-bold text-accent-primary hover:underline transition-all mb-4 block">
                     ← Change role ({formData.role === 'jobseeker' ? 'Candidate' : 'Employer'})
                  </button>
                  <h2 className="text-4xl font-display font-black text-text-primary tracking-tight">Create account</h2>
                  <p className="text-text-secondary font-medium">Elevate your hiring experience</p>
                </div>

                <form onSubmit={handleRegister} className="space-y-5">
                   <div className="grid grid-cols-2 gap-4">
                      <Input
                        label="First Name"
                        leftIcon={<User size={18} />}
                        value={formData.firstName}
                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                        required
                      />
                      <Input
                        label="Last Name"
                        value={formData.lastName}
                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                        required
                      />
                   </div>
                  <Input
                    label="Email Address"
                    type="email"
                    leftIcon={<Mail size={18} />}
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />

                  <div className="space-y-2">
                    <Input
                      label="Password"
                      type="password"
                      leftIcon={<Lock size={18} />}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required
                    />
                    
                    {/* Password Strength Indicator */}
                    {formData.password && (
                       <div className="space-y-2 px-1">
                          <div className="flex justify-between text-[10px] tracking-widest font-black uppercase">
                             <span className="text-text-tertiary">Security Strength</span>
                             <span className={cn(
                                passwordStrength.color === 'bg-accent-primary' ? 'text-accent-primary' : 
                                passwordStrength.color === 'bg-accent-warning' ? 'text-accent-warning' : 'text-accent-danger'
                             )}>{passwordStrength.label}</span>
                          </div>
                          <div className="h-1 w-full bg-border rounded-full overflow-hidden">
                             <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: passwordStrength.width }}
                                className={cn("h-full transition-colors duration-500", passwordStrength.color)}
                             />
                          </div>
                       </div>
                    )}
                  </div>

                  <Input
                    label="Confirm Password"
                    type="password"
                    leftIcon={<Lock size={18} />}
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    required
                  />

                  <Button 
                    type="submit" 
                    className="w-full py-6 font-bold" 
                    isLoading={isLoading}
                    rightIcon={<Check size={20} />}
                  >
                    Create Member Account
                  </Button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          <p className="text-center text-sm text-text-tertiary font-medium">
            Already have an account?{' '}
            <Link href="/login" className="text-accent-primary hover:underline font-bold">
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
