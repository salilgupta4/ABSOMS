
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Button from '@/components/ui/Button';
import { Loader, LogIn } from 'lucide-react';
import { getPdfSettings } from '@/components/settings/pdfSettingsService';
import { useNavigate, useLocation } from 'react-router-dom';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | undefined>(undefined);
  const [logoLoading, setLogoLoading] = useState(true);
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (auth.user) {
      const from = location.state?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    }
  }, [auth.user, navigate, location.state]);


  useEffect(() => {
    (async () => {
      try {
        const settings = await getPdfSettings();
        if (settings && settings.companyLogo) {
          setLogoUrl(settings.companyLogo);
        }
      } catch (err) {
        console.error("Could not fetch logo for login page:", err);
      } finally {
        setLogoLoading(false);
      }
    })();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const success = await auth.login(email, password);
    if (!success) {
      setError('Invalid email or password. Please try again.');
      setLoading(false);
    }
    // On success, the useEffect will handle navigation, so no need to setLoading(false) here.
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-100 dark:bg-slate-900">
      <div className="w-full max-w-md p-8 space-y-8 bg-white dark:bg-slate-800 rounded-2xl shadow-lg">
        <div className="text-center">
            <div className="mx-auto h-24 w-auto mb-6 flex items-center justify-center">
                {logoLoading ? (
                    <Loader className="animate-spin text-slate-400" />
                ) : logoUrl ? (
                    <img 
                        src={logoUrl} 
                        alt="Company Logo" 
                        className="max-h-full max-w-full object-contain"
                    />
                ) : null}
            </div>
            <h1 className="text-3xl font-bold text-primary tracking-wider">ADAPTEC</h1>
            <p className="mt-2 text-slate-600 dark:text-slate-400">Sign in to your account</p>
        </div>
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-primary focus:border-primary"
            />
          </div>
          <div>
            <label htmlFor="password"className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-primary focus:border-primary"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div>
            <Button type="submit" className="w-full" disabled={loading} icon={loading ? <Loader size={16} className="animate-spin" /> : <LogIn size={16} />}>
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>
          </div>
          <div className="text-center text-xs text-slate-500">
            <p>Admin login: admin@example.com / admin</p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;