// MySQL-based Login Page for ABS OMS
import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Eye, EyeOff, Loader, AlertCircle } from 'lucide-react';
import { useMySQLAuth } from '@/contexts/MySQLAuthContext';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

const MySQLLoginPage: React.FC = () => {
  const { user, login, loading, error } = useMySQLAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutTime, setLockoutTime] = useState(0);

  // If user is already authenticated, redirect to dashboard
  if (user && !loading) {
    return <Navigate to="/dashboard" replace />;
  }

  // Handle account lockout
  useEffect(() => {
    if (loginAttempts >= 5) {
      setIsLocked(true);
      setLockoutTime(15 * 60); // 15 minutes lockout
      
      const interval = setInterval(() => {
        setLockoutTime((prev) => {
          if (prev <= 1) {
            setIsLocked(false);
            setLoginAttempts(0);
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [loginAttempts]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isLocked) {
      return;
    }

    if (!formData.email.trim() || !formData.password) {
      return;
    }

    setIsSubmitting(true);

    try {
      const success = await login(formData.email.trim(), formData.password);
      
      if (success) {
        // Login successful - will be redirected by the Navigate component above
        setLoginAttempts(0);
      } else {
        // Login failed
        setLoginAttempts(prev => prev + 1);
        // Clear password on failure
        setFormData(prev => ({ ...prev, password: '' }));
      }
    } catch (error) {
      console.error('Login error:', error);
      setLoginAttempts(prev => prev + 1);
      setFormData(prev => ({ ...prev, password: '' }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatLockoutTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
        <div className="flex flex-col items-center">
          <Loader className="animate-spin text-primary mb-4" size={48} />
          <p className="text-slate-600 dark:text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primary mb-2">ABS OMS</h1>
          <p className="text-slate-600 dark:text-slate-400">Order Management System</p>
          <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">MySQL Version</p>
        </div>

        <Card className="p-6 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-center text-slate-800 dark:text-slate-200 mb-6">
                Sign In
              </h2>
              
              {/* Error Messages */}
              {error && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg flex items-center">
                  <AlertCircle className="text-red-500 mr-2 flex-shrink-0" size={16} />
                  <span className="text-red-600 dark:text-red-400 text-sm">{error}</span>
                </div>
              )}

              {/* Account Lockout Warning */}
              {isLocked && (
                <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <div className="flex items-center">
                    <AlertCircle className="text-yellow-500 mr-2 flex-shrink-0" size={16} />
                    <div className="text-yellow-600 dark:text-yellow-400 text-sm">
                      <p className="font-semibold">Account temporarily locked</p>
                      <p>Too many failed attempts. Try again in {formatLockoutTime(lockoutTime)}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Login Attempts Warning */}
              {loginAttempts >= 3 && !isLocked && (
                <div className="mb-4 p-3 bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800 rounded-lg">
                  <div className="flex items-center">
                    <AlertCircle className="text-orange-500 mr-2 flex-shrink-0" size={16} />
                    <span className="text-orange-600 dark:text-orange-400 text-sm">
                      Warning: {5 - loginAttempts} attempt(s) remaining before account lockout
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                disabled={isSubmitting || isLocked}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-primary focus:border-primary dark:bg-slate-700 dark:text-slate-100 disabled:opacity-50"
                placeholder="Enter your email"
                autoComplete="email"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  disabled={isSubmitting || isLocked}
                  className="w-full px-3 py-2 pr-10 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-primary focus:border-primary dark:bg-slate-700 dark:text-slate-100 disabled:opacity-50"
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isSubmitting || isLocked}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 disabled:opacity-50"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting || isLocked || !formData.email.trim() || !formData.password}
                icon={isSubmitting ? <Loader size={16} className="animate-spin" /> : undefined}
              >
                {isSubmitting ? 'Signing In...' : 'Sign In'}
              </Button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Contact your administrator if you need help accessing your account
            </p>
          </div>
        </Card>

        <div className="mt-6 text-center">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            © 2025 ABSPL. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default MySQLLoginPage;