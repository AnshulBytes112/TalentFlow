'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Mail, Lock, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

const extractApiErrorMessage = (payload: any, fallback = 'Request failed') => {
  if (!payload || typeof payload !== 'object') return fallback;

  const first = Array.isArray(payload.errors) ? payload.errors[0] : null;
  const firstErrorMessage = typeof first === 'string'
    ? first
    : (first && typeof first.message === 'string' ? first.message : '');

  if (typeof payload.message === 'string' && payload.message.trim()) {
    if (payload.message.toLowerCase().includes('validation') && firstErrorMessage) {
      return firstErrorMessage;
    }
    return payload.message;
  }

  return firstErrorMessage || fallback;
};

export default function ForgotPasswordPage() {
  const [formData, setFormData] = useState({
    email: '',
    otp: '',
    password: '',
    confirmPassword: '',
  });
  const [otpSent, setOtpSent] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const sendOtp = async () => {
    if (!formData.email) {
      toast.error('Please enter your email');
      return;
    }

    setIsSendingOtp(true);
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(extractApiErrorMessage(data, 'Failed to send OTP'));
      }

      setOtpSent(true);
      toast.success('If your email exists, OTP has been sent');
    } catch (error: any) {
      toast.error(error.message || 'Failed to send OTP');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const resetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!otpSent) {
      toast.error('Please request OTP first');
      return;
    }

    if (!formData.otp) {
      toast.error('Please enter OTP');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setIsResetting(true);
    try {
      const response = await fetch('/api/auth/reset-password-with-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          otp: formData.otp,
          password: formData.password,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(extractApiErrorMessage(data, 'Failed to reset password'));
      }

      toast.success('Password reset successful. You can login now.');
      setFormData({ email: '', otp: '', password: '', confirmPassword: '' });
      setOtpSent(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to reset password');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-xl rounded-2xl border border-border bg-bg-card/70 p-8 md:p-10 space-y-8">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-display font-black text-text-primary">Forgot Password</h1>
          <p className="text-text-secondary">Reset your password using email OTP verification.</p>
        </div>

        <form onSubmit={resetPassword} className="space-y-5">
          <Input
            label="Email Address"
            type="email"
            leftIcon={<Mail size={18} />}
            value={formData.email}
            onChange={(e) => {
              const email = e.target.value;
              setFormData((prev) => ({ ...prev, email }));
              setOtpSent(false);
            }}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3">
            <Input
              label="OTP"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              leftIcon={<ShieldCheck size={18} />}
              value={formData.otp}
              onChange={(e) => setFormData((prev) => ({ ...prev, otp: e.target.value.replace(/\D/g, '').slice(0, 6) }))}
              required
            />
            <Button type="button" variant="outline" className="h-14 px-5" isLoading={isSendingOtp} onClick={sendOtp}>
              {otpSent ? 'Resend OTP' : 'Send OTP'}
            </Button>
          </div>

          <Input
            label="New Password"
            type={showPassword ? 'text' : 'password'}
            leftIcon={<Lock size={18} />}
            rightIcon={
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="hover:text-accent-primary transition-colors outline-none"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            }
            value={formData.password}
            onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
            required
          />

          <Input
            label="Confirm New Password"
            type={showConfirmPassword ? 'text' : 'password'}
            leftIcon={<Lock size={18} />}
            rightIcon={
              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                className="hover:text-accent-primary transition-colors outline-none"
                aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            }
            value={formData.confirmPassword}
            onChange={(e) => setFormData((prev) => ({ ...prev, confirmPassword: e.target.value }))}
            required
          />

          <Button type="submit" className="w-full py-6 font-bold" isLoading={isResetting}>
            Reset Password
          </Button>
        </form>

        <p className="text-center text-sm text-text-tertiary">
          Remembered your password?{' '}
          <Link href="/login" className="text-accent-primary hover:underline font-bold">
            Back to Login
          </Link>
        </p>
      </div>
    </div>
  );
}
