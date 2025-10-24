import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import ReCAPTCHA from 'react-google-recaptcha';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isSignup, setIsSignup] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const recaptchaRef = useRef<ReCAPTCHA>(null);
  const { login, user } = useAuth();
  const navigate = useNavigate();

  // Replace with your actual reCAPTCHA site key
  const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY || '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI'; // Test key

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSignup && !recaptchaToken) {
      toast.error('Please complete the reCAPTCHA verification');
      return;
    }

    setIsLoading(true);

    try {
      if (isSignup) {
        const { supabase } = await import('@/integrations/supabase/client');
        
        // Sign up the user
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            captchaToken: recaptchaToken || undefined,
          },
        });

        if (authError) throw authError;
        if (!authData.user) throw new Error('Failed to create user');

        // Create profile
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: authData.user.id,
            name,
            email,
            cell_number: '',
            country: '',
            state: '',
            city: '',
            street: '',
            suburb: '',
            full_name_business: name,
          });

        if (profileError) throw profileError;

        // Assign client role by default
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: authData.user.id,
            role: 'client',
          });

        if (roleError) throw roleError;

        // Redirect to email confirmation page
        navigate('/email-confirmation');
      } else {
        await login(email, password);
        toast.success('Login successful!');
        navigate('/');
      }
    } catch (error: any) {
      const errorMessage = isSignup 
        ? error.message || 'Failed to create account'
        : 'Email or password incorrect';
      toast.error(errorMessage);
      // Reset reCAPTCHA on error
      if (isSignup && recaptchaRef.current) {
        recaptchaRef.current.reset();
        setRecaptchaToken(null);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecaptchaChange = (token: string | null) => {
    setRecaptchaToken(token);
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-[hsl(var(--card))]">
        <CardHeader className="text-center hud-header bg-[hsl(var(--card))] border-b-2 border-primary/20 pb-6 relative z-0">
          <CardTitle 
            className="text-3xl font-bold text-accent"
            style={{ WebkitTextStroke: '2px white', paintOrder: 'stroke fill' }}
          >
            Machine Monitor
          </CardTitle>
          <CardDescription>
            {isSignup ? 'Create a new account' : 'Sign in to access your dashboard'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignup && (
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Enter your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            {isSignup && (
              <div className="flex justify-center">
                <ReCAPTCHA
                  ref={recaptchaRef}
                  sitekey={RECAPTCHA_SITE_KEY}
                  onChange={handleRecaptchaChange}
                />
              </div>
            )}
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading || (isSignup && !recaptchaToken)}
            >
              {isLoading ? (isSignup ? 'Creating account...' : 'Signing in...') : (isSignup ? 'Sign Up' : 'Sign In')}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => {
                setIsSignup(!isSignup);
                setName('');
                setPassword('');
                setRecaptchaToken(null);
                if (recaptchaRef.current) {
                  recaptchaRef.current.reset();
                }
              }}
            >
              {isSignup ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;