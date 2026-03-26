'use client';
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';

type UserRole = 'user' | 'company_admin' | 'platform_admin';

interface CompanyContextType {
  user: User | null;
  companyId: string | null;
  role: UserRole | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export function CompanyProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUserData = useCallback(async (currentUser: User) => {
    const supabase = createClient();
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id, role')
      .eq('id', currentUser.id)
      .single();

    if (profile) {
      setCompanyId(profile.company_id);
      setRole(profile.role as UserRole);
    } else {
      console.warn('Profile not found for user:', currentUser.id);
      setCompanyId(null);
      setRole('user');
    }
  }, []);

  useEffect(() => {
    const supabase = createClient();

    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        await loadUserData(user);
      } else {
        setUser(null);
        setCompanyId(null);
        setRole(null);
      }
      setLoading(false);
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setUser(session.user);
        await loadUserData(session.user);
      } else {
        setUser(null);
        setCompanyId(null);
        setRole(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [loadUserData]);

  const signOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
  };

  return (
    <CompanyContext.Provider value={{ user, companyId, role, loading, signOut }}>
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
