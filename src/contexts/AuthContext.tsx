import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';

export type UserRole = 'super_admin' | 'company' | 'installer' | 'client';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  name: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        
        if (session?.user) {
          // Defer any Supabase calls to avoid deadlocks inside the callback
          setTimeout(() => {
            loadUserProfile(session.user);
          }, 0);
        } else {
          setUser(null);
          setIsLoading(false);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      
      if (session?.user) {
        setTimeout(() => {
          loadUserProfile(session.user);
        }, 0);
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadUserProfile = async (supabaseUser: SupabaseUser) => {
    try {
      console.log('Loading/initializing profile for user:', supabaseUser.id);

      // 1) Ensure profile exists (use maybeSingle to avoid throwing on empty)
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, name')
        .eq('id', supabaseUser.id)
        .maybeSingle();
      if (profileError) throw profileError;

      if (!profile) {
        const defaultName =
          (supabaseUser.user_metadata as any)?.name ||
          supabaseUser.email?.split('@')[0] ||
          'New User';

        const { error: insertProfileError } = await supabase.from('profiles').insert({
          id: supabaseUser.id,
          name: defaultName,
          email: supabaseUser.email,
          cell_number: '',
          country: '',
          state: '',
          city: '',
          street: '',
          suburb: '',
          full_name_business: defaultName,
        });
        if (insertProfileError) throw insertProfileError;
      }

      // 2) Ensure role exists (default to 'client')
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', supabaseUser.id)
        .maybeSingle();
      if (roleError) throw roleError;

      if (!roleData) {
        const { error: insertRoleError} = await supabase
          .from('user_roles')
          .insert({ user_id: supabaseUser.id, role: 'client' });
        if (insertRoleError) throw insertRoleError;
      }

      // 3) Fetch final values and set user
      const [{ data: finalProfile }, { data: finalRole }] = await Promise.all([
        supabase.from('profiles').select('name').eq('id', supabaseUser.id).single(),
        supabase.from('user_roles').select('role').eq('user_id', supabaseUser.id).single(),
      ]);

      setUser({
        id: supabaseUser.id,
        email: supabaseUser.email!,
        role: (finalRole as any).role as UserRole,
        name: (finalProfile as any).name,
      });
    } catch (error) {
      console.error('Error loading/initializing user profile:', error);
      // Fallback: set minimal user so app can proceed
      setUser({
        id: supabaseUser.id,
        email: supabaseUser.email || '',
        role: 'client',
        name: supabaseUser.email?.split('@')[0] || 'User',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
