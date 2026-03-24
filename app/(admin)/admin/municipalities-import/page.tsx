'use client';

import React, { useRef, useState } from 'react';
import Header from '@/components/shared/Header';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Database,
  ChevronRight,
  Mail,
  Building2,
  Cog,
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
  value: unknown;
  message: string;
}

interface ImportPreview {
  fileName: string;
  totalRows: number;
  validRows: number;
  errorRows: number;
  data: Record<string, unknown>[];
  rowErrors: RowError[];
}

type ImportTarget = 'municipalities' | 'municipality_emails';
type MunicipalityImportMode = 'insert' | 'update' | 'upsert';
type EmailImportMode = 'append' | 'replace';

export default function MunicipalitiesImportPage() {
  const { user } = useCompany();

  const [importTarget, setImportTarget] = useState<ImportTarget>('municipalities');
  const [municipalityImportMode, setMunicipalityImportMode] =
    useState<MunicipalityImportMode>('upsert');
  const [emailImportMode, setEmailImportMode] = useState<EmailImportMode>('append');

  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [processingEmails, setProcessingEmails] = useState(false);
  const [preview, setPreview] = useState<ImportPreview | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const MUNICIPALITY_EXPECTED_COLUMNS = [
    'Prefeitura',
    'Nome do Prefeito',
    'Endereco Prefeitura',
    'Cidade',
    'Uf',
    'CEP',
    'DDD',
    'Tel Prefeitura',
    'E-mail',
    'QUANTIDADE POPULACIONAL',
    'Região',
    'Km2-IBGE',
    'Ano Instal-IBGE',
    'FAIXA_POPULAÇÃO',
    'Site',
  ];

  const EMAIL_EXPECTED_COLUMNS = ['email', 'cidade', 'uf'];

  function normalizeNumber(
    value: unknown,
    type: 'int' | 'decimal'
  ): { value: number | null; error?: string } {
    if (value === undefined || value === null || value === '') {
      return { value: null };
    }

    const strValue = String(value).trim();
    if (strValue === '') {
      return { value: null };
    }

    let clean = strValue.replace(/\s/g, '');

    if (type === 'int') {
      if (clean.includes(',')) {
        const [intPart, decPart] = clean.split(',');
        const decVal = parseInt((decPart || '').replace(/\D/g, '') || '0', 10);

        if (decVal > 0) {
          return { value: null, error: 'Valor decimal não permitido para campo inteiro' };
        }

        clean = intPart;
      }

      const normalized = clean.replace(/\./g, '').replace(/\D/g, '');
      const result = parseInt(normalized, 10);

      return isNaN(result) ? { value: null, error: 'Valor inválido' } : { value: result };
    }

    if (clean.includes(',') && clean.includes('.')) {
      clean = clean.replace(/\./g, '').replace(',', '.');
    } else if (clean.includes(',')) {
      clean = clean.replace(',', '.');
    } else if (clean.includes('.')) {
      const parts = clean.split('.');
      if (parts.length === 2 && parts[1].length === 3) {
        clean = clean.replace(/\./g, '');
      }
    }

    const result = parseFloat(clean);
    return isNaN(result) ? { value: null, error: 'Valor inválido' } : { value: result };
  }

  function normalizeRegion(region: string): Region | undefined {
    if (!region) return undefined;

    const normalized = region.toUpperCase().trim();
    if (['NORTE', 'NORDESTE', 'CENTRO-OESTE', 'SUDESTE', 'SUL'].includes(normalized)) {
      return normalized as Region;
    }

    return undefined;
  }

  function normalizePopulationRange(range: string): string | undefined {
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
      'Maior que Um Milhão',
    ];

    const found = validRanges.find(
      (item) => item.toLowerCase() === range.trim().toLowerCase()
    );

    return found || range.trim();
  }

  function resetImport() {
    setFile(null);
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  function handleImportTargetChange(target: ImportTarget) {
    setImportTarget(target);
    resetImport();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0];

    if (!selectedFile) {
      return;
    }

    if (
      selectedFile.name.endsWith('.xlsx') ||
      selectedFile.name.endsWith('.xls') ||
      selectedFile.name.endsWith('.csv')
    ) {
      setFile(selectedFile);
      generatePreview(selectedFile);
      return;
    }

    toast.error('Por favor, selecione um arquivo Excel (.xlsx, .xls) ou CSV.');
  }

  async function generatePreview(selectedFile: File) {
    setLoading(true);

    try {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
            defval: '',
          });

          if (jsonData.length === 0) {
            toast.error('O arquivo está vazio.');
            setLoading(false);
            return;
          }

          if (importTarget === 'municipalities') {
            generateMunicipalityPreview(selectedFile.name, jsonData);
          } else {
            generateEmailPreview(selectedFile.name, jsonData);
          }
        } catch (error) {
          console.error('Error parsing file:', error);
          toast.error('Erro ao processar o arquivo.');
        } finally {
          setLoading(false);
        }
      };

      reader.readAsArrayBuffer(selectedFile);
    } catch (error) {
      console.error('Error reading file:', error);
      toast.error('Erro ao ler o arquivo.');
      setLoading(false);
    }
  }

  function generateMunicipalityPreview(fileName: string, jsonData: Record<string, unknown>[]) {
    const rowErrors: RowError[] = [];
    let validRowsCount = 0;

    const validatedData = jsonData.map((row, index) => {
      const rowNum = index + 2;
      let hasError = false;

      const pop = normalizeNumber(row['QUANTIDADE POPULACIONAL'], 'int');
      if (pop.error) {
        rowErrors.push({
          row: rowNum,
          column: 'QUANTIDADE POPULACIONAL',
          value: row['QUANTIDADE POPULACIONAL'],
          message: pop.error,
        });
        hasError = true;
      }

      const area = normalizeNumber(row['Km2-IBGE'], 'decimal');
      if (area.error) {
        rowErrors.push({
          row: rowNum,
          column: 'Km2-IBGE',
          value: row['Km2-IBGE'],
          message: area.error,
        });
        hasError = true;
      }

      const year = normalizeNumber(row['Ano Instal-IBGE'], 'int');
      if (year.error) {
        rowErrors.push({
          row: rowNum,
          column: 'Ano Instal-IBGE',
          value: row['Ano Instal-IBGE'],
          message: year.error,
        });
        hasError = true;
      }

      if (!hasError) {
        validRowsCount++;
      }

      return {
        ...row,
        _normalized: {
          population: pop.value,
          area_km2: area.value,
          installation_year: year.value,
          hasError,
        },
      };
    });

    const columns = Object.keys(jsonData[0] || {});
    const missingColumns = MUNICIPALITY_EXPECTED_COLUMNS.filter(
      (col) => !columns.includes(col)
    );

    if (missingColumns.length > 0) {
      toast.warning(
        `Algumas colunas esperadas não foram encontradas: ${missingColumns.join(', ')}`
      );
    }

    setPreview({
      fileName,
      totalRows: jsonData.length,
      validRows: validRowsCount,
      errorRows: jsonData.length - validRowsCount,
      data: validatedData,
      rowErrors,
    });
  }

  function generateEmailPreview(fileName: string, jsonData: Record<string, unknown>[]) {
    const rowErrors: RowError[] = [];
    let validRowsCount = 0;

    const validatedData = jsonData.map((row, index) => {
      const rowNum = index + 2;
      let hasError = false;

      const email = String(row['email'] ?? '').trim();
      const cidade = String(row['cidade'] ?? '').trim();
      const uf = String(row['uf'] ?? '').trim();

      if (!email) {
        rowErrors.push({
          row: rowNum,
          column: 'email',
          value: row['email'],
          message: 'E-mail não informado',
        });
        hasError = true;
      }

      if (!cidade) {
        rowErrors.push({
          row: rowNum,
          column: 'cidade',
          value: row['cidade'],
          message: 'Cidade não informada',
        });
        hasError = true;
      }

      if (!uf) {
        rowErrors.push({
          row: rowNum,
          column: 'uf',
          value: row['uf'],
          message: 'UF não informada',
        });
        hasError = true;
      }

      if (!hasError) {
        validRowsCount++;
      }

      return {
        ...row,
        _normalized: {
          email,
          cidade,
          uf,
          hasError,
        },
      };
    });

    const columns = Object.keys(jsonData[0] || {});
    const missingColumns = EMAIL_EXPECTED_COLUMNS.filter((col) => !columns.includes(col));

    if (missingColumns.length > 0) {
      toast.warning(
        `Algumas colunas esperadas não foram encontradas: ${missingColumns.join(', ')}`
      );
    }

    setPreview({
      fileName,
      totalRows: jsonData.length,
      validRows: validRowsCount,
      errorRows: jsonData.length - validRowsCount,
      data: validatedData,
      rowErrors,
    });
  }

  async function handleMunicipalityImport() {
    if (!preview || !user) {
      return;
    }

    let inserted = 0;
    let updated = 0;
    const errors = preview.errorRows;

    const batchSize = 100;
    const batches: Record<string, unknown>[][] = [];

    for (let i = 0; i < preview.data.length; i += batchSize) {
      batches.push(preview.data.slice(i, i + batchSize));
    }

    for (const batch of batches) {
      const normalizedBatch = batch
        .filter((row: any) => !row._normalized?.hasError)
        .map((row: any) => ({
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
          website: String(row['Site'] || ''),
        }));

      if (normalizedBatch.length === 0) {
        continue;
      }

      if (municipalityImportMode === 'insert') {
        for (const row of normalizedBatch) {
          try {
            await accountService.create(row as any);
            inserted += 1;
          } catch {
            updated += 0;
          }
        }
      } else if (municipalityImportMode === 'update') {
        const existing = await accountService.getAll({ searchTerm: '' }, 1, 100000);

        const existingMap = new Map(
          existing.data.map((item: any) => [`${item.city}__${item.state}`.toLowerCase(), item])
        );

        for (const row of normalizedBatch) {
          const key = `${row.city}__${row.state}`.toLowerCase();
          const found = existingMap.get(key);

          if (found?.id) {
            await accountService.update(found.id, row as any);
            updated += 1;
          }
        }
      } else {
        const result = await accountService.upsertMany(normalizedBatch);
        if (result) {
          inserted += result.length;
        }
      }
    }

    await accountService.logImport({
      file_name: preview.fileName,
      records_total: preview.totalRows,
      records_inserted: inserted,
      records_updated: updated,
      records_errors: errors,
      imported_by: user.id,
    });

    toast.success('Importação de prefeituras concluída com sucesso!');
  }

  async function handleMunicipalityEmailsImport() {
    if (!preview) {
      return;
    }

    const response = await fetch('/api/admin/municipality-emails-import', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        rows: preview.data,
        replaceExisting: emailImportMode === 'replace',
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result?.error || 'Erro ao importar e-mails de prefeituras.');
    }

    toast.success(
      `Importação de e-mails concluída. ${result.inserted} linhas gravadas na base transitória.`
    );
  }

  async function handleProcessMunicipalityEmails() {
    setProcessingEmails(true);

    try {
      const response = await fetch('/api/admin/municipality-emails-process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.details || result?.error || 'Erro ao processar e-mails.');
      }

      toast.success(
        `Processamento concluído. ${Number(result.totalProcessed || 0).toLocaleString('pt-BR')} e-mails vinculados na base final.`
      );
    } catch (error: any) {
      console.error('Process municipality emails error:', error);
      toast.error(`Erro ao processar e-mails: ${error.message}`);
    } finally {
      setProcessingEmails(false);
    }
  }

  async function handleImport() {
    if (!preview) {
      return;
    }

    setImporting(true);

    try {
      if (importTarget === 'municipalities') {
        await handleMunicipalityImport();
      } else {
        await handleMunicipalityEmailsImport();
      }

      setPreview(null);
      setFile(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error: any) {
      console.error('Import error:', error);
      toast.error(`Erro durante a importação: ${error.message}`);
    } finally {
      setImporting(false);
    }
  }

  return (
    <>
      <Header
        title="Importação Administrativa"
        subtitle="Escolha se deseja atualizar a base de prefeituras ou importar nova lista de e-mails."
      />

      <div className="flex-1 overflow-y-auto bg-[#f8fafc] p-8">
        <div className="mx-auto max-w-5xl space-y-8">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <button
              type="button"
              onClick={() => handleImportTargetChange('municipalities')}
              className={cn(
                'rounded-2xl border p-5 text-left transition-all',
                importTarget === 'municipalities'
                  ? 'border-blue-200 bg-blue-50 ring-2 ring-blue-100'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              )}
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="flex size-12 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                  <Building2 className="size-6" />
                </div>
                <div
                  className={cn(
                    'flex size-4 items-center justify-center rounded-full border-2',
                    importTarget === 'municipalities'
                      ? 'border-blue-600 bg-blue-600'
                      : 'border-gray-300'
                  )}
                >
                  {importTarget === 'municipalities' && (
                    <div className="size-1.5 rounded-full bg-white" />
                  )}
                </div>
              </div>
              <h3 className="text-base font-black text-gray-900">Importar Prefeituras</h3>
              <p className="mt-2 text-sm text-gray-500">
                Atualiza a base oficial de municípios com dados completos da prefeitura.
              </p>
            </button>

            <button
              type="button"
              onClick={() => handleImportTargetChange('municipality_emails')}
              className={cn(
                'rounded-2xl border p-5 text-left transition-all',
                importTarget === 'municipality_emails'
                  ? 'border-blue-200 bg-blue-50 ring-2 ring-blue-100'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              )}
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="flex size-12 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                  <Mail className="size-6" />
                </div>
                <div
                  className={cn(
                    'flex size-4 items-center justify-center rounded-full border-2',
                    importTarget === 'municipality_emails'
                      ? 'border-blue-600 bg-blue-600'
                      : 'border-gray-300'
                  )}
                >
                  {importTarget === 'municipality_emails' && (
                    <div className="size-1.5 rounded-full bg-white" />
                  )}
                </div>
              </div>
              <h3 className="text-base font-black text-gray-900">
                Importar E-mails de Prefeituras
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                Envia novas listas de e-mails para a base transitória, com deduplicação automática.
              </p>
            </button>
          </div>

          {importTarget === 'municipality_emails' && (
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="text-base font-black text-gray-900">
                    Processar base transitória de e-mails
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Depois de importar a planilha de e-mails, execute este processamento para
                    vincular os registros à base final de municípios.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleProcessMunicipalityEmails}
                  disabled={processingEmails}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {processingEmails ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    <>
                      <Cog className="size-4" />
                      Processar e-mails importados
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {!preview ? (
            <div
              className={cn(
                'group cursor-pointer rounded-3xl border-2 border-dashed border-gray-200 bg-white p-12 text-center transition-all hover:border-blue-400 hover:bg-blue-50/30',
                loading && 'pointer-events-none opacity-50'
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

              <div className="mx-auto mb-6 flex size-20 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 transition-transform group-hover:scale-110">
                {loading ? (
                  <Loader2 className="size-10 animate-spin" />
                ) : (
                  <Upload className="size-10" />
                )}
              </div>

              <h2 className="mb-2 text-xl font-black text-gray-900">
                {importTarget === 'municipalities'
                  ? 'Selecione a planilha de prefeituras'
                  : 'Selecione a planilha de e-mails'}
              </h2>

              <p className="mx-auto mb-8 max-w-sm text-gray-500">
                Arraste seu arquivo ou clique para buscar. Formatos aceitos:
                <strong> .xlsx, .xls, .csv</strong>
              </p>

              <div className="flex items-center justify-center gap-8 text-xs font-bold uppercase tracking-widest text-gray-400">
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
              <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="flex size-12 items-center justify-center rounded-xl bg-green-50 text-green-600">
                    <FileSpreadsheet className="size-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-gray-900">{preview.fileName}</h3>
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
                      {preview.totalRows} registros detectados
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={resetImport}
                    className="px-4 py-2 text-sm font-bold text-gray-500 transition-colors hover:text-gray-700"
                  >
                    Trocar Arquivo
                  </button>

                  <button
                    type="button"
                    onClick={handleImport}
                    disabled={importing}
                    className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:bg-blue-700 disabled:opacity-50"
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

              {importTarget === 'municipalities' ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  {[
                    {
                      id: 'insert',
                      title: 'Apenas Novos',
                      desc: 'Ignora registros que já existem na base.',
                    },
                    {
                      id: 'update',
                      title: 'Apenas Atualizar',
                      desc: 'Atualiza dados de municípios existentes.',
                    },
                    {
                      id: 'upsert',
                      title: 'Inserir + Atualizar',
                      desc: 'Modo recomendado. Sincroniza toda a base.',
                    },
                  ].map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setMunicipalityImportMode(mode.id as MunicipalityImportMode)}
                      className={cn(
                        'rounded-2xl border p-4 text-left transition-all',
                        municipalityImportMode === mode.id
                          ? 'border-blue-200 bg-blue-50 ring-2 ring-blue-100'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      )}
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-sm font-black text-gray-900">{mode.title}</span>
                        <div
                          className={cn(
                            'flex size-4 items-center justify-center rounded-full border-2',
                            municipalityImportMode === mode.id
                              ? 'border-blue-600 bg-blue-600'
                              : 'border-gray-300'
                          )}
                        >
                          {municipalityImportMode === mode.id && (
                            <div className="size-1.5 rounded-full bg-white" />
                          )}
                        </div>
                      </div>
                      <p className="text-xs leading-relaxed text-gray-500">{mode.desc}</p>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {[
                    {
                      id: 'append',
                      title: 'Acrescentar Base',
                      desc: 'Mantém o conteúdo já importado e adiciona novas linhas deduplicadas.',
                    },
                    {
                      id: 'replace',
                      title: 'Substituir Base Transitória',
                      desc: 'Limpa a tabela transitória de importação e sobe a nova lista completa.',
                    },
                  ].map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setEmailImportMode(mode.id as EmailImportMode)}
                      className={cn(
                        'rounded-2xl border p-4 text-left transition-all',
                        emailImportMode === mode.id
                          ? 'border-blue-200 bg-blue-50 ring-2 ring-blue-100'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      )}
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-sm font-black text-gray-900">{mode.title}</span>
                        <div
                          className={cn(
                            'flex size-4 items-center justify-center rounded-full border-2',
                            emailImportMode === mode.id
                              ? 'border-blue-600 bg-blue-600'
                              : 'border-gray-300'
                          )}
                        >
                          {emailImportMode === mode.id && (
                            <div className="size-1.5 rounded-full bg-white" />
                          )}
                        </div>
                      </div>
                      <p className="text-xs leading-relaxed text-gray-500">{mode.desc}</p>
                    </button>
                  ))}
                </div>
              )}

              {preview.rowErrors.length > 0 && (
                <div className="space-y-4 rounded-2xl border border-red-200 bg-red-50 p-6">
                  <div className="flex items-center gap-3 text-red-600">
                    <AlertCircle className="size-5" />
                    <h4 className="text-sm font-black uppercase tracking-widest">
                      Erros Detectados ({preview.rowErrors.length})
                    </h4>
                  </div>

                  <div className="max-h-48 space-y-2 overflow-y-auto">
                    {preview.rowErrors.slice(0, 50).map((err, idx) => (
                      <p key={idx} className="text-xs text-red-700">
                        Linha {err.row}: Coluna &quot;{err.column}&quot; tem valor inválido &quot;
                        {String(err.value ?? '')}&quot; ({err.message})
                      </p>
                    ))}
                    {preview.rowErrors.length > 50 && (
                      <p className="text-xs italic text-red-500">
                        ...e mais {preview.rowErrors.length - 50} erros.
                      </p>
                    )}
                  </div>

                  <p className="text-xs font-bold text-red-600">
                    As linhas com erro serão ignoradas durante a importação.
                  </p>
                </div>
              )}

              <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                  <h4 className="text-sm font-black uppercase tracking-widest text-gray-900">
                    Prévia dos Dados
                  </h4>
                  <span className="rounded-md bg-gray-50 px-2 py-1 text-[10px] font-bold text-gray-400">
                    Exibindo os primeiros 10 registros
                  </span>
                </div>

                <div className="overflow-x-auto">
                  {importTarget === 'municipalities' ? (
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-50 text-gray-500">
                        <tr className="font-bold uppercase tracking-wider">
                          <th className="px-6 py-3">Prefeitura</th>
                          <th className="px-6 py-3">Cidade</th>
                          <th className="px-6 py-3">UF</th>
                          <th className="px-6 py-3">População</th>
                          <th className="px-6 py-3">Região</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {preview.data.slice(0, 10).map((row, idx) => (
                          <tr key={idx} className="transition-colors hover:bg-gray-50/50">
                            <td className="px-6 py-4 font-bold text-gray-900">
                              {String(row['Prefeitura'] ?? '')}
                            </td>
                            <td className="px-6 py-4 text-gray-600">
                              {String(row['Cidade'] ?? '')}
                            </td>
                            <td className="px-6 py-4">
                              <span className="rounded bg-gray-100 px-2 py-0.5 font-bold text-gray-700">
                                {String(row['Uf'] ?? '')}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-gray-600">
                              {String(row['QUANTIDADE POPULACIONAL'] ?? '')}
                            </td>
                            <td className="px-6 py-4 text-gray-600">
                              {String(row['Região'] ?? '')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-50 text-gray-500">
                        <tr className="font-bold uppercase tracking-wider">
                          <th className="px-6 py-3">E-mail</th>
                          <th className="px-6 py-3">Cidade</th>
                          <th className="px-6 py-3">UF</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {preview.data.slice(0, 10).map((row, idx) => (
                          <tr key={idx} className="transition-colors hover:bg-gray-50/50">
                            <td className="px-6 py-4 font-bold text-gray-900">
                              {String(row['email'] ?? '')}
                            </td>
                            <td className="px-6 py-4 text-gray-600">
                              {String(row['cidade'] ?? '')}
                            </td>
                            <td className="px-6 py-4">
                              <span className="rounded bg-gray-100 px-2 py-0.5 font-bold text-gray-700">
                                {String(row['uf'] ?? '')}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="rounded-3xl bg-blue-900 p-8 text-white shadow-xl">
            <div className="flex items-start gap-6">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white/10">
                <AlertCircle className="size-6 text-blue-200" />
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-black">
                  {importTarget === 'municipalities'
                    ? 'Instruções de Importação de Prefeituras'
                    : 'Instruções de Importação de E-mails'}
                </h3>

                {importTarget === 'municipalities' ? (
                  <div className="grid grid-cols-1 gap-6 text-sm md:grid-cols-2">
                    <div className="space-y-2 text-blue-100/80">
                      <p className="flex items-center gap-2">
                        <ChevronRight className="size-4 text-blue-400" />
                        Certifique-se de que as colunas Cidade e Uf estão preenchidas.
                      </p>
                      <p className="flex items-center gap-2">
                        <ChevronRight className="size-4 text-blue-400" />
                        O sistema utiliza a combinação Cidade + UF para evitar duplicidade.
                      </p>
                    </div>

                    <div className="space-y-2 text-blue-100/80">
                      <p className="flex items-center gap-2">
                        <ChevronRight className="size-4 text-blue-400" />
                        Valores numéricos serão convertidos automaticamente.
                      </p>
                      <p className="flex items-center gap-2">
                        <ChevronRight className="size-4 text-blue-400" />
                        A região deve seguir as 5 regiões oficiais do Brasil.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-6 text-sm md:grid-cols-2">
                    <div className="space-y-2 text-blue-100/80">
                      <p className="flex items-center gap-2">
                        <ChevronRight className="size-4 text-blue-400" />
                        O arquivo deve conter ao menos colunas equivalentes a email, cidade e uf.
                      </p>
                      <p className="flex items-center gap-2">
                        <ChevronRight className="size-4 text-blue-400" />
                        O sistema faz deduplicação automática por e-mail antes de gravar.
                      </p>
                    </div>

                    <div className="space-y-2 text-blue-100/80">
                      <p className="flex items-center gap-2">
                        <ChevronRight className="size-4 text-blue-400" />
                        Depois do upload, use o botão "Processar e-mails importados".
                      </p>
                      <p className="flex items-center gap-2">
                        <ChevronRight className="size-4 text-blue-400" />
                        Use "Substituir Base Transitória" quando quiser enviar uma nova lista completa.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
