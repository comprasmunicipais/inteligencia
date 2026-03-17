import { createClient } from '@/lib/supabase/client';

export interface MunicipalityDocument {
  id: string;
  company_id: string;
  municipality_id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  uploaded_by: string;
  created_at?: string;
}

export const documentService = {
  async getByMunicipality(municipalityId: string) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('municipality_documents')
      .select('*')
      .eq('municipality_id', municipalityId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('SUPABASE ERROR (documents.getByMunicipality):', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      throw error;
    }
    return data as MunicipalityDocument[];
  },

  async upload(file: File, municipalityId: string, companyId: string, userId: string) {
    const supabase = createClient();
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${companyId}/${municipalityId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('municipality-documents')
      .upload(filePath, file);

    if (uploadError) {
      console.error('SUPABASE STORAGE ERROR (documents.upload):', {
        message: (uploadError as any).message,
        details: (uploadError as any).details,
        hint: (uploadError as any).hint,
        code: (uploadError as any).code
      });
      throw uploadError;
    }

    const { data, error: dbError } = await supabase
      .from('municipality_documents')
      .insert([
        {
          company_id: companyId,
          municipality_id: municipalityId,
          file_name: file.name,
          file_path: filePath,
          file_type: file.type,
          file_size: file.size,
          uploaded_by: userId,
        },
      ])
      .select('*')
      .single();

    if (dbError) {
      console.error('SUPABASE ERROR (documents.insert):', {
        message: dbError.message,
        details: dbError.details,
        hint: dbError.hint,
        code: dbError.code
      });
      throw dbError;
    }
    return data as MunicipalityDocument;
  },

  async download(filePath: string) {
    const supabase = createClient();
    const { data, error } = await supabase.storage
      .from('municipality-documents')
      .download(filePath);

    if (error) {
      console.error('SUPABASE STORAGE ERROR (documents.download):', {
        message: (error as any).message,
        details: (error as any).details,
        hint: (error as any).hint,
        code: (error as any).code
      });
      throw error;
    }
    return data;
  },

  async delete(id: string, filePath: string) {
    const supabase = createClient();
    const { error: storageError } = await supabase.storage
      .from('municipality-documents')
      .remove([filePath]);

    if (storageError) {
      console.error('SUPABASE STORAGE ERROR (documents.deleteStorage):', {
        message: (storageError as any).message,
        details: (storageError as any).details,
        hint: (storageError as any).hint,
        code: (storageError as any).code
      });
      throw storageError;
    }

    const { error: dbError } = await supabase
      .from('municipality_documents')
      .delete()
      .eq('id', id);

    if (dbError) {
      console.error('SUPABASE ERROR (documents.deleteDb):', {
        message: dbError.message,
        details: dbError.details,
        hint: dbError.hint,
        code: dbError.code
      });
      throw dbError;
    }
  }
};
