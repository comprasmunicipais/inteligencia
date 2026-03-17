import { createClient } from '@/lib/supabase/client';
import { DealDTO } from '../types/dtos';
import { DealEntity } from '../types/entities';
import { mapDealToDTO } from '../mappers/deals';

export const dealService = {
  async getAll(companyId: string): Promise<DealDTO[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('deals')
      .select('*, municipalities(name)')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('SUPABASE ERROR (deals.getAll):', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      throw error;
    }
    return (data || []).map(mapDealToDTO);
  },

  async getByMunicipality(municipalityId: string): Promise<DealDTO[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('deals')
      .select('*, municipalities(name)')
      .eq('municipality_id', municipalityId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('SUPABASE ERROR (deals.getByMunicipality):', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      throw error;
    }
    return (data || []).map(mapDealToDTO);
  },

  async create(deal: Partial<DealEntity>): Promise<DealDTO> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('deals')
      .insert([deal])
      .select('*')
      .single();

    if (error) {
      console.error('SUPABASE ERROR (deals.create):', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      throw error;
    }
    return mapDealToDTO(data);
  },

  async update(id: string, deal: Partial<DealEntity>): Promise<DealDTO> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('deals')
      .update(deal)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('SUPABASE ERROR (deals.update):', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      throw error;
    }
    return mapDealToDTO(data);
  },

  async delete(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('deals')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};
