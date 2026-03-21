import { createClient } from '@/lib/supabase/client';

export interface CompanyCatalog {
  id: string;
  company_id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  product_line: string | null;
  created_at?: string;
}

export const catalogService = {
  async getByCompany(companyId: string): Promise<CompanyCatalog[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('company_catalogs')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('SUPABASE ERROR (catalogs.getByCompany):', error);
      throw error;
    }
    return data as CompanyCatalog[];
  },

  async upload(file: File, companyId: string, productLine: string): Promise<CompanyCatalog> {
    const supabase = createClient();
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
    const filePath = `${companyId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('catalogs')
      .upload(filePath, file);

    if (uploadError) {
      console.error('SUPABASE STORAGE ERROR (catalogs.upload):', uploadError);
      throw uploadError;
    }

    const { data, error: dbError } = await supabase
      .from('company_catalogs')
      .insert([{
        company_id: companyId,
        file_name: file.name,
        file_path: filePath,
        file_type: file.type,
        file_size: file.size,
        product_line: productLine || null,
      }])
      .select('*')
      .single();

    if (dbError) {
      console.error('SUPABASE ERROR (catalogs.insert):', dbError);
      throw dbError;
    }

    return data as CompanyCatalog;
  },

  async download(filePath: string): Promise<Blob> {
    const supabase = createClient();
    const { data, error } = await supabase.storage
      .from('catalogs')
      .download(filePath);

    if (error) {
      console.error('SUPABASE STORAGE ERROR (catalogs.download):', error);
      throw error;
    }
    return data;
  },

  async delete(id: string, filePath: string): Promise<void> {
    const supabase = createClient();

    const { error: storageError } = await supabase.storage
      .from('catalogs')
      .remove([filePath]);

    if (storageError) {
      console.error('SUPABASE STORAGE ERROR (catalogs.delete):', storageError);
      throw storageError;
    }

    const { error: dbError } = await supabase
      .from('company_catalogs')
      .delete()
      .eq('id', id);

    if (dbError) {
      console.error('SUPABASE ERROR (catalogs.deleteDb):', dbError);
      throw dbError;
    }
  }
};
