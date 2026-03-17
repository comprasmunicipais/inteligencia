'use client';

import { useEffect, useState } from 'react';
import { createClient } from './client';
import { Database } from '@/types/database';

export function useAccounts() {
  const [accounts, setAccounts] = useState<Database['public']['Tables']['accounts']['Row'][]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAccounts = async () => {
      const supabase = createClient();
      try {
        const { data, error } = await supabase
          .from('accounts')
          .select('*')
          .order('name', { ascending: true });

        if (error) throw error;
        setAccounts(data || []);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAccounts();
  }, []);

  return { accounts, loading, error };
}

export function usePipeline() {
  const [stages, setStages] = useState<Database['public']['Tables']['pipeline_stages']['Row'][]>([]);
  const [deals, setDeals] = useState<Database['public']['Tables']['deals']['Row'][]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient();
      try {
        const [stagesRes, dealsRes] = await Promise.all([
          supabase.from('pipeline_stages').select('*').order('order_index'),
          supabase.from('deals').select('*')
        ]);

        if (stagesRes.error) throw stagesRes.error;
        if (dealsRes.error) throw dealsRes.error;

        setStages(stagesRes.data || []);
        setDeals(dealsRes.data || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return { stages, deals, loading };
}
