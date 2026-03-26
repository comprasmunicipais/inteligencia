import { createClient } from '@/lib/supabase/client';
import { MunicipalityDTO, MunicipalityListItem } from '../types/dtos';
import { MunicipalityEntity } from '../types/entities';
import { mapMunicipalityToDTO } from '../mappers/accounts';

export interface MunicipalityFilters {
  state?: string;
  region?: string;
  population_range?: string;
  min_population?: number;
  max_population?: number;
  min_area?: number;
  max_area?: number;
  min_year?: number;
  max_year?: number;
  status?: string;
  searchTerm?: string;
  has_opportunities?: boolean;
}

const supabase = createClient();

export const accountService = {
  async getAll(filters?: MunicipalityFilters, page: number = 1, pageSize: number = 10): Promise<{ data: MunicipalityDTO[], count: number }> {
    let query = supabase
      .from('municipalities')
      .select('*', { count: 'exact' });

    if (filters) {
      if (filters.state) query = query.eq('state', filters.state);
      if (filters.region) query = query.eq('region', filters.region);
      if (filters.population_range) query = query.eq('population_range', filters.population_range);
      if (filters.min_population) query = query.gte('population', filters.min_population);
      if (filters.max_population) query = query.lte('population', filters.max_population);
      if (filters.min_area) query = query.gte('area_km2', filters.min_area);
      if (filters.max_area) query = query.lte('area_km2', filters.max_area);
      if (filters.min_year) query = query.gte('installation_year', filters.min_year);
      if (filters.max_year) query = query.lte('installation_year', filters.max_year);
      if (filters.status) query = query.eq('status', filters.status);

      if (filters.searchTerm) {
        query = query.or(`name.ilike.%${filters.searchTerm}%,city.ilike.%${filters.searchTerm}%,mayor_name.ilike.%${filters.searchTerm}%`);
      }

      if (filters.has_opportunities) {
        // Filtra apenas municípios que têm ao menos uma oportunidade vinculada
        const { data: oppMunicipalities } = await supabase
          .from('opportunities')
          .select('municipality_id')
          .not('municipality_id', 'is', null);

        const ids = [...new Set((oppMunicipalities || []).map(o => o.municipality_id))];

        if (ids.length === 0) {
          return { data: [], count: 0 };
        }

        query = query.in('id', ids);
      }
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await query
      .order('name')
      .range(from, to);

    if (error) throw error;
    return {
      data: (data || []).map(mapMunicipalityToDTO),
      count: count || 0
    };
  },

  async getById(id: string): Promise<MunicipalityDTO> {
    const { data, error } = await supabase
      .from('municipalities')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return mapMunicipalityToDTO(data);
  },

  async create(municipality: Omit<MunicipalityEntity, 'id' | 'created_at' | 'updated_at'>): Promise<MunicipalityDTO> {
    const { data, error } = await supabase
      .from('municipalities')
      .insert([municipality])
      .select()
      .single();

    if (error) throw error;

    if (data.email) {
      await supabase.from('municipality_emails').upsert(
        {
          municipality_id: data.id,
          email: data.email,
          department_label: 'institucional',
          source: 'manual',
          is_strategic: true,
        },
        { onConflict: 'municipality_id,email' }
      );
    }

    return mapMunicipalityToDTO(data);
  },

  async update(id: string, updates: Partial<MunicipalityEntity>): Promise<MunicipalityDTO> {
    const { data, error } = await supabase
      .from('municipalities')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    if (updates.email) {
      await supabase.from('municipality_emails').upsert(
        {
          municipality_id: id,
          email: updates.email,
          department_label: 'institucional',
          source: 'manual',
          is_strategic: true,
        },
        { onConflict: 'municipality_id,email' }
      );
    }

    return mapMunicipalityToDTO(data);
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('municipalities')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async upsertMany(municipalities: any[]): Promise<MunicipalityDTO[]> {
    const { data, error } = await supabase
      .from('municipalities')
      .upsert(municipalities, { onConflict: 'city,state' })
      .select();

    if (error) throw error;
    return (data || []).map(mapMunicipalityToDTO);
  },

  async logImport(log: {
    file_name: string;
    records_total: number;
    records_inserted: number;
    records_updated: number;
    records_errors: number;
    imported_by: string;
  }) {
    const { data, error } = await supabase
      .from('municipalities_import_log')
      .insert([log])
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};
