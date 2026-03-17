'use client';

import React, { useState, useRef } from 'react';
import Header from '@/components/shared/Header';
import { 
  Upload, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ArrowRight,
  Database,
  History,
  Trash2,
  FileText,
  ChevronRight,
  ChevronLeft,
  Search
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { accountService } from '@/lib/services/accounts';
import { Region } from '@/lib/types/enums';
import { useCompany } from '@/components/providers/CompanyProvider';

interface RowError {
  row: number;
  column: string;
  value: any;
  message: string;
}

interface ImportPreview {
  fileName: string;
  totalRows: number;
  validRows: number;
  errorRows: number;
  data: any[];
  rowErrors: RowError[];
}

export default function MunicipalitiesImportPage() {
  const { user } = useCompany();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [importMode, setImportMode] = useState<'insert' | 'update' | 'upsert'>('upsert');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.xls') || selectedFile.name.endsWith('.csv')) {
        setFile(selectedFile);
        generatePreview(selectedFile);
      } else {
        toast.error('Por favor, selecione um arquivo Excel (.xlsx, .xls) ou CSV.');
      }
    }
  };

  const normalizeNumber = (value: any, type: 'int' | 'decimal'): { value: number | null, error?: string } => {
    if (value === undefined || value === null || value === '') return { value: null };
    
    const strValue = String(value).trim();
    if (strValue === '') return { value: null };

    // Remove spaces
    let clean = strValue.replace(/\s/g, '');

    if (type === 'int') {
      // For integers, we expect something like "1.948" or "1948"
      // If there's a comma, it's a decimal.
      if (clean.includes(',')) {
        const [intPart, decPart] = clean.split(',');
        const decVal = parseInt(decPart.replace(/\D/g, '') || '0', 10);
        if (decVal > 0) {
          return { value: null, error: `Valor decimal não permitido para campo inteiro` };
        }
        clean = intPart;
      }
      // Remove dots (thousand separators)
      const normalized = clean.replace(/\./g, '').replace(/\D/g, '');
      const result = parseInt(normalized, 10);
      return isNaN(result) ? { value: null, error: `Valor inválido` } : { value: result };
    } else {
      // Decimal
      // Handle BR format "1.234,56" -> "1234.56"
      if (clean.includes(',') && clean.includes('.')) {
        // If both exist, dot is thousand, comma is decimal
        clean = clean.replace(/\./g, '').replace(',', '.');
      } else if (clean.includes(',')) {
        // Only comma: "1234,56" -> "1234.56"
        clean = clean.replace(',', '.');
      } else if (clean.includes('.')) {
        // Only dot: "1.234"
        // In BR context, if it's a large number, it's likely 1234.
        // But if it's "22.69", it's likely 22.69.
        const parts = clean.split('.');
        if (parts.length === 2 && parts[1].length === 3) {
          clean = clean.replace(/\./g, '');
        }
      }
      
      const result = parseFloat(clean);
      return isNaN(result) ? { value: null, error: `Valor inválido` } : { value: result };
    }
  };

  const generatePreview = async (file: File) => {
    setLoading(true);
    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        if (jsonData.length === 0) {
          toast.error('O arquivo está vazio.');
          setLoading(false);
          return;
        }

        const rowErrors: RowError[] = [];
        let validRowsCount = 0;

        const validatedData = jsonData.map((row: any, index) => {
          const rowNum = index + 2; // +1 for 0-indexed, +1 for header row
          let hasError = false;

          const pop = normalizeNumber(row['QUANTIDADE POPULACIONAL'], 'int');
          if (pop.error) {
            rowErrors.push({ row: rowNum, column: 'QUANTIDADE POPULACIONAL', value: row['QUANTIDADE POPULACIONAL'], message: pop.error });
            hasError = true;
          }

          const area = normalizeNumber(row['Km2-IBGE'], 'decimal');
          if (area.error) {
            rowErrors.push({ row: rowNum, column: 'Km2-IBGE', value: row['Km2-IBGE'], message: area.error });
            hasError = true;
          }

          const year = normalizeNumber(row['Ano Instal-IBGE'], 'int');
          if (year.error) {
            rowErrors.push({ row: rowNum, column: 'Ano Instal-IBGE', value: row['Ano Instal-IBGE'], message: year.error });
            hasError = true;
          }

          if (!hasError) validRowsCount++;

          return {
            ...row,
            _normalized: {
              population: pop.value,
              area_km2: area.value,
              installation_year: year.value,
              hasError
            }
          };
        });

        const columns = Object.keys(jsonData[0] as object);
        const expectedColumns = [
          'Prefeitura', 'Nome do Prefeito', 'Endereco Prefeitura', 'Cidade', 'Uf', 
          'CEP', 'DDD', 'Tel Prefeitura', 'E-mail', 'QUANTIDADE POPULACIONAL', 
          'Região', 'Km2-IBGE', 'Ano Instal-IBGE', 'FAIXA_POPULAÇÃO', 'Site'
        ];

        const missingColumns = expectedColumns.filter(col => !columns.includes(col));
        if (missingColumns.length > 0) {
          toast.warning(`Algumas colunas esperadas não foram encontradas: ${missingColumns.join(', ')}`);
        }

        setPreview({
          fileName: file.name,
          totalRows: jsonData.length,
          validRows: validRowsCount,
          errorRows: jsonData.length - validRowsCount,
          data: validatedData,
          rowErrors: rowErrors
        });
        setLoading(false);
      };
      reader.readAsArrayBuffer(file);
    } catch (error) {
      console.error('Error reading file:', error);
      toast.error('Erro ao ler o arquivo.');
      setLoading(false);
    }
  };

  const normalizeRegion = (region: string): Region | undefined => {
    if (!region) return undefined;
    const r = region.toUpperCase().trim();
    if (['NORTE', 'NORDESTE', 'CENTRO-OESTE', 'SUDESTE', 'SUL'].includes(r)) {
      return r as Region;
    }
    return undefined;
  };

  const normalizePopulationRange = (range: string): string | undefined => {
    if (!range) return undefined;
    const validRanges = [
      'Menor que 15.000',
      'Entre 15.001 e 30.000',
      'Entre 30.001 e 50.000',
      'Entre 50.001 e 100.000',
      'Entre 100.001 e 200.000',
      'Entre 200.001 e 300.000',
      'Entre 300.001 e 500.000',
      'Entre 500.001 e 1.000.000',
      'Maior que Um Milhão'
    ];
    return validRanges.find(vr => vr.toLowerCase() === range.trim().toLowerCase()) || range.trim();
  };

  const handleImport = async () => {
    if (!preview || !user) return;
    setImporting(true);
    
    let inserted = 0;
    let updated = 0;
    let errors = preview.errorRows;

    const batchSize = 100;
    const batches = [];
    for (let i = 0; i < preview.data.length; i += batchSize) {
      batches.push(preview.data.slice(i, i + batchSize));
    }

    try {
      for (const batch of batches) {
        const normalizedBatch = batch
          .filter(row => !row._normalized?.hasError)
          .map(row => ({
            name: String(row['Prefeitura'] || ''),
            mayor_name: String(row['Nome do Prefeito'] || ''),
            address: String(row['Endereco Prefeitura'] || ''),
            city: String(row['Cidade'] || ''),
            state: String(row['Uf'] || '').toUpperCase(),
            zip_code: String(row['CEP'] || ''),
            ddd: String(row['DDD'] || ''),
            phone: String(row['Tel Prefeitura'] || ''),
            email: String(row['E-mail'] || ''),
            population: row._normalized?.population || 0,
            region: normalizeRegion(String(row['Região'] || '')),
            area_km2: row._normalized?.area_km2 || 0,
            installation_year: row._normalized?.installation_year || 0,
            population_range: normalizePopulationRange(String(row['FAIXA_POPULAÇÃO'] || '')),
            website: String(row['Site'] || '')
          }));

        if (normalizedBatch.length === 0) continue;

        const result = await accountService.upsertMany(normalizedBatch);
        if (result) {
          inserted += result.length;
        }
      }

      await accountService.logImport({
        file_name: preview.fileName,
        records_total: preview.totalRows,
        records_inserted: inserted,
        records_updated: updated,
        records_errors: errors,
        imported_by: user.id
      });

      toast.success('Importação concluída com sucesso!');
      setPreview(null);
      setFile(null);
    } catch (error: any) {
      console.error('Import error:', error);
      toast.error(`Erro durante a importação: ${error.message}`);
    } finally {
      setImporting(false);
    }
  };

  const resetImport = () => {
    setFile(null);
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <>
      <Header 
        title="Importação de Municípios" 
        subtitle="Atualize a base oficial de prefeituras brasileiras via planilha Excel ou CSV." 
      />
      
      <div className="flex-1 overflow-y-auto p-8 bg-[#f8fafc]">
        <div className="max-w-5xl mx-auto space-y-8">
          {/* Upload Section */}
          {!preview ? (
            <div 
              className={cn(
                "border-2 border-dashed border-gray-200 rounded-3xl p-12 bg-white text-center transition-all hover:border-blue-400 hover:bg-blue-50/30 group cursor-pointer",
                loading && "opacity-50 pointer-events-none"
              )}
              onClick={() => fileInputRef.current?.click()}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
                accept=".xlsx,.xls,.csv"
              />
              <div className="size-20 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 mx-auto mb-6 group-hover:scale-110 transition-transform">
                {loading ? <Loader2 className="size-10 animate-spin" /> : <Upload className="size-10" />}
              </div>
              <h2 className="text-xl font-black text-gray-900 mb-2">Selecione sua planilha</h2>
              <p className="text-gray-500 max-w-sm mx-auto mb-8">
                Arraste seu arquivo ou clique para buscar. Formatos aceitos: <strong>.xlsx, .xls, .csv</strong>
              </p>
              
              <div className="flex items-center justify-center gap-8 text-xs font-bold text-gray-400 uppercase tracking-widest">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="size-4" />
                  Colunas Mapeadas
                </div>
                <div className="flex items-center gap-2">
                  <Database className="size-4" />
                  Deduplicação Automática
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Preview Header */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="size-12 rounded-xl bg-green-50 flex items-center justify-center text-green-600">
                    <FileSpreadsheet className="size-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-gray-900">{preview.fileName}</h3>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                      {preview.totalRows} registros detectados
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={resetImport}
                    className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    Trocar Arquivo
                  </button>
                  <button 
                    onClick={handleImport}
                    disabled={importing}
                    className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-all shadow-md disabled:opacity-50"
                  >
                    {importing ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Importando...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="size-4" />
                        Confirmar Importação
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Import Options */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { id: 'insert', title: 'Apenas Novos', desc: 'Ignora registros que já existem na base.' },
                  { id: 'update', title: 'Apenas Atualizar', desc: 'Atualiza dados de municípios existentes.' },
                  { id: 'upsert', title: 'Inserir + Atualizar', desc: 'Modo recomendado. Sincroniza toda a base.' },
                ].map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => setImportMode(mode.id as any)}
                    className={cn(
                      "p-4 rounded-2xl border text-left transition-all",
                      importMode === mode.id 
                        ? "bg-blue-50 border-blue-200 ring-2 ring-blue-100" 
                        : "bg-white border-gray-200 hover:border-gray-300"
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-black text-gray-900">{mode.title}</span>
                      <div className={cn(
                        "size-4 rounded-full border-2 flex items-center justify-center",
                        importMode === mode.id ? "border-blue-600 bg-blue-600" : "border-gray-300"
                      )}>
                        {importMode === mode.id && <div className="size-1.5 rounded-full bg-white" />}
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed">{mode.desc}</p>
                  </button>
                ))}
              </div>

              {/* Error Summary */}
              {preview.rowErrors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-6 space-y-4">
                  <div className="flex items-center gap-3 text-red-600">
                    <AlertCircle className="size-5" />
                    <h4 className="font-black uppercase tracking-widest text-sm">Erros Detectados ({preview.rowErrors.length})</h4>
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {preview.rowErrors.slice(0, 50).map((err, idx) => (
                      <p key={idx} className="text-xs text-red-700">
                        Linha {err.row}: Coluna &quot;{err.column}&quot; tem valor inválido &quot;{err.value}&quot; ({err.message})
                      </p>
                    ))}
                    {preview.rowErrors.length > 50 && (
                      <p className="text-xs text-red-500 italic">...e mais {preview.rowErrors.length - 50} erros.</p>
                    )}
                  </div>
                  <p className="text-xs text-red-600 font-bold">
                    As linhas com erro serão ignoradas durante a importação.
                  </p>
                </div>
              )}

              {/* Data Preview Table */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                  <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest">Prévia dos Dados</h4>
                  <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-md">
                    Exibindo os primeiros 10 registros
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 text-gray-500 font-bold uppercase tracking-wider">
                      <tr>
                        <th className="px-6 py-3">Prefeitura</th>
                        <th className="px-6 py-3">Cidade</th>
                        <th className="px-6 py-3">UF</th>
                        <th className="px-6 py-3">População</th>
                        <th className="px-6 py-3">Região</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {preview.data.slice(0, 10).map((row, idx) => (
                        <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-4 font-bold text-gray-900">{row['Prefeitura']}</td>
                          <td className="px-6 py-4 text-gray-600">{row['Cidade']}</td>
                          <td className="px-6 py-4">
                            <span className="bg-gray-100 px-2 py-0.5 rounded font-bold text-gray-700">{row['Uf']}</span>
                          </td>
                          <td className="px-6 py-4 text-gray-600">{row['QUANTIDADE POPULACIONAL']}</td>
                          <td className="px-6 py-4 text-gray-600">{row['Região']}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Instructions Card */}
          <div className="bg-blue-900 rounded-3xl p-8 text-white shadow-xl">
            <div className="flex items-start gap-6">
              <div className="size-12 rounded-2xl bg-white/10 flex items-center justify-center shrink-0">
                <AlertCircle className="size-6 text-blue-200" />
              </div>
              <div className="space-y-4">
                <h3 className="text-lg font-black">Instruções de Importação</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-blue-100/80">
                  <div className="space-y-2">
                    <p className="flex items-center gap-2">
                      <ChevronRight className="size-4 text-blue-400" />
                      Certifique-se de que as colunas Cidade e Uf estão preenchidas.
                    </p>
                    <p className="flex items-center gap-2">
                      <ChevronRight className="size-4 text-blue-400" />
                      O sistema utiliza a combinação Cidade + UF para evitar duplicidade.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="flex items-center gap-2">
                      <ChevronRight className="size-4 text-blue-400" />
                      Valores numéricos (População, Km2) serão convertidos automaticamente.
                    </p>
                    <p className="flex items-center gap-2">
                      <ChevronRight className="size-4 text-blue-400" />
                      A região deve ser uma das 5 regiões oficiais do Brasil (Norte, Sul, etc).
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
