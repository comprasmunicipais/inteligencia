import { createClient } from '@/lib/supabase/client';
import { ContractDTO } from '../types/dtos';
import { ContractEntity } from '../types/entities';
import { mapContractToDTO } from '../mappers/contracts';

const supabase = createClient();

export const contractService = {
  async getAll(companyId: string): Promise<ContractDTO[]> {
    const { data, error } = await supabase
      .from('contracts')
      .select('*, municipalities(name)')
      .eq('company_id', companyId)
      .order('end_date', { ascending: true });
    
    if (error) throw error;
    return (data || []).map(mapContractToDTO);
  },

  async getByMunicipality(municipalityId: string): Promise<ContractDTO[]> {
    const { data, error } = await supabase
      .from('contracts')
      .select('*, municipalities(name)')
      .eq('municipality_id', municipalityId)
      .order('end_date', { ascending: true });
    
    if (error) throw error;
    return (data || []).map(mapContractToDTO);
  },

  async create(contract: Omit<ContractEntity, 'id' | 'created_at'>): Promise<ContractDTO> {
    const { data, error } = await supabase
      .from('contracts')
      .insert([contract])
      .select('*, municipalities(name)')
      .single();
    
    if (error) {
      console.error('SUPABASE ERROR:', error);
      throw error;
    }
    return mapContractToDTO(data);
  },

  async update(id: string, updates: Partial<ContractEntity>): Promise<ContractDTO> {
    const { data, error } = await supabase
      .from('contracts')
      .update(updates)
      .eq('id', id)
      .select('*, municipalities(name)')
      .single();
    
    if (error) {
      console.error('SUPABASE ERROR:', error);
      throw error;
    }
    return mapContractToDTO(data);
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('contracts')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
};
