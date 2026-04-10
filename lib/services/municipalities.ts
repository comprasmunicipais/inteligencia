import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

export interface MunicipalityOption {
  id: string;
  city: string;
  state: string;
  label: string;
}

export const municipalityService = {
  async getAllForSelect(): Promise<MunicipalityOption[]> {
    const { data, error } = await supabase
      .from('municipalities')
      .select('id, city, state, name')
      .order('city', { ascending: true })
      .limit(6000);
    
    if (error) {
      console.error('Error fetching municipalities for select:', error);
      throw error;
    }
    
    return (data || []).map(m => ({
      id: m.id,
      city: m.city,
      state: m.state,
      label: `${m.city} - ${m.state}`
    }));
  }
};
