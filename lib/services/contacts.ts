import { createClient } from '@/lib/supabase/client';
import { ContactDTO } from '../types/dtos';
import { ContactEntity } from '../types/entities';
import { mapContactToDTO } from '../mappers/contacts';

const supabase = createClient();

export const contactService = {
  async getAll(companyId: string): Promise<ContactDTO[]> {
    const { data, error } = await supabase
      .from('contacts')
      .select('*, municipalities(name)')
      .eq('company_id', companyId)
      .order('name');
    
    if (error) throw error;
    return (data || []).map(mapContactToDTO);
  },

  async getByMunicipality(municipalityId: string): Promise<ContactDTO[]> {
    const { data, error } = await supabase
      .from('contacts')
      .select('*, municipalities(name)')
      .eq('municipality_id', municipalityId)
      .order('name');
    
    if (error) throw error;
    return (data || []).map(mapContactToDTO);
  },

  async getById(id: string): Promise<ContactDTO> {
    const { data, error } = await supabase
      .from('contacts')
      .select('*, municipalities(name)')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return mapContactToDTO(data);
  },

  async create(contact: Omit<ContactEntity, 'id' | 'created_at'>): Promise<ContactDTO> {
    const { data, error } = await supabase
      .from('contacts')
      .insert([contact])
      .select('*, municipalities(name)')
      .single();
    
    if (error) throw error;
    return mapContactToDTO(data);
  },

  async update(id: string, updates: Partial<ContactEntity>): Promise<ContactDTO> {
    const { data, error } = await supabase
      .from('contacts')
      .update(updates)
      .eq('id', id)
      .select('*, municipalities(name)')
      .single();
    
    if (error) throw error;
    return mapContactToDTO(data);
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('contacts')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
};
