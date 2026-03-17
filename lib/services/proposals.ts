import { createClient } from '@/lib/supabase/client';
import { ProposalDTO } from '../types/dtos';
import { ProposalEntity } from '../types/entities';
import { mapProposalToDTO } from '../mappers/proposals';

const supabase = createClient();

export const proposalService = {
  async getAll(companyId: string): Promise<ProposalDTO[]> {
    const { data, error } = await supabase
      .from('proposals')
      .select('*, municipalities(name)')
      .eq('company_id', companyId)
      .order('date', { ascending: false });
    
    if (error) throw error;
    return (data || []).map(mapProposalToDTO);
  },

  async getByMunicipality(municipalityId: string): Promise<ProposalDTO[]> {
    const { data, error } = await supabase
      .from('proposals')
      .select('*, municipalities(name)')
      .eq('municipality_id', municipalityId)
      .order('date', { ascending: false });
    
    if (error) throw error;
    return (data || []).map(mapProposalToDTO);
  },

  async create(proposal: Omit<ProposalEntity, 'id' | 'created_at'>): Promise<ProposalDTO> {
    const { data, error } = await supabase
      .from('proposals')
      .insert([proposal])
      .select('*, municipalities(name)')
      .single();
    
    if (error) {
      console.error('Error creating proposal:', error);
      throw error;
    }
    return mapProposalToDTO(data);
  },

  async update(id: string, updates: Partial<ProposalEntity>): Promise<ProposalDTO> {
    const { data, error } = await supabase
      .from('proposals')
      .update(updates)
      .eq('id', id)
      .select('*, municipalities(name)')
      .single();
    
    if (error) {
      console.error('Error updating proposal:', error);
      throw error;
    }
    return mapProposalToDTO(data);
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('proposals')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
};
