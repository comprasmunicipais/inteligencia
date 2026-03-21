import { createClient } from '@/lib/supabase/client';

export interface CompanyDocument {
  id: string;
  company_id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  category: string;
  description: string | null;
  created_at?: string;
}

export const DOCUMENT_CATEGORIES = [
  {
    id: 'habilitacao_juridica',
    label: 'Habilitação Jurídica',
    description: 'Contrato Social, CNPJ, RG/CPF dos sócios',
  },
  {
    id: 'regularidade_fiscal',
    label: 'Regularidade Fiscal e Trabalhista',
    description: 'CND Federal, Estadual, Municipal, FGTS, INSS, CNDT',
  },
  {
    id: 'qualificacao_tecnica',
    label: 'Qualificação Técnica',
    description: 'Atestados de Capacidade Técnica, CAT, Declarações',
  },
  {
    id: 'qualificacao_economica',
    label: 'Qualificação Econômico-Financeira',
    description: 'Balanço Patrimonial, Certidão Negativa de Falência',
  },
  {
    id: 'outros',
    label: 'Outros',
    description: 'Documentos específicos de cada edital',
  },
];

export const companyDocumentService = {
  async getByCompany(companyId: string): Promise<CompanyDocument[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('company_documents')
      .select('*')
      .eq('company_id', companyId)
      .order('category', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('SUPABASE ERROR (companyDocuments.getByCompany):', error);
      throw error;
    }
    return data as CompanyDocument[];
  },

  async upload(file: File, companyId: string, category: string, description: string): Promise<CompanyDocument> {
    const supabase = createClient();
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
    const filePath = `${companyId}/${category}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('company-documents')
      .upload(filePath, file);

    if (uploadError) {
      console.error('SUPABASE STORAGE ERROR (companyDocuments.upload):', uploadError);
      throw uploadError;
    }

    const { data, error: dbError } = await supabase
      .from('company_documents')
      .insert([{
        company_id: companyId,
        file_name: file.name,
        file_path: filePath,
        file_type: file.type,
        file_size: file.size,
        category,
        description: description || null,
      }])
      .select('*')
      .single();

    if (dbError) {
      console.error('SUPABASE ERROR (companyDocuments.insert):', dbError);
      throw dbError;
    }

    return data as CompanyDocument;
  },

  async download(filePath: string): Promise<Blob> {
    const supabase = createClient();
    const { data, error } = await supabase.storage
      .from('company-documents')
      .download(filePath);

    if (error) {
      console.error('SUPABASE STORAGE ERROR (companyDocuments.download):', error);
      throw error;
    }
    return data;
  },

  async delete(id: string, filePath: string): Promise<void> {
    const supabase = createClient();

    const { error: storageError } = await supabase.storage
      .from('company-documents')
      .remove([filePath]);

    if (storageError) {
      console.error('SUPABASE STORAGE ERROR (companyDocuments.delete):', storageError);
      throw storageError;
    }

    const { error: dbError } = await supabase
      .from('company_documents')
      .delete()
      .eq('id', id);

    if (dbError) {
      console.error('SUPABASE ERROR (companyDocuments.deleteDb):', dbError);
      throw dbError;
    }
  }
};
