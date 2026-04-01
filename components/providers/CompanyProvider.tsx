'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';

type UserRole = 'user' | 'company_admin' | 'platform_admin';

interface CompanyContextType {
  user: User | null;
  companyId: string | null;
  role: UserRole | null;
  loading: boolean;
  isDemo: boolean;
  signOut: () => Promise<void>;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export function CompanyProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const getUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        // In a real scenario, we would fetch the user's profile from a 'profiles' or 'users' table
        // For now, we'll mock the company_id and role from user metadata or a mock fetch
        const { data: profile } = await supabase
          .from('profiles')
          .select('company_id, role')
          .eq('id', user.id)
          .single();

        if (profile) {
          setCompanyId(profile.company_id);
          setRole(profile.role as UserRole);
        } else {
          // Fallback for development if profile doesn't exist yet
          // In production, we should probably redirect to a setup page or show an error
          console.warn('Profile not found for user:', user.id);
          setCompanyId(null);
          setRole('user'); // Default to basic user role
        }
      }

      setLoading(false);
    };

    getUserData();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session) {
        setCompanyId(null);
        setRole(null);
      } else {
        getUserData();
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const isDemo = user?.user_metadata?.is_demo === true;

  return (
    <CompanyContext.Provider value={{ user, companyId, role, loading, isDemo, signOut }}>
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  const context = useContext(CompanyContext);
  if (context === undefined) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
}
