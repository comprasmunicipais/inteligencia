import type { SupabaseClient } from '@supabase/supabase-js';

export type OpportunityItemSource = 'pncp' | 'pdf_parser' | 'gemini' | 'manual';

export type OpportunityItemInput = {
  source: OpportunityItemSource;
  source_item_id?: string | null;
  item_original: string;
  item_normalizado?: string | null;
  quantity?: number | null;
  unit?: string | null;
  estimated_value?: number | null;
  category?: string | null;
  confidence?: number | null;
};

export type PersistOpportunityItemsRecord = {
  opportunity_id: string;
  items: OpportunityItemInput[] | null | undefined;
};

export type PersistOpportunityItemsInput = {
  records: PersistOpportunityItemsRecord[];
  mode?: 'upsert' | 'replace_by_source';
  request_source: OpportunityItemSource;
};

export type PersistOpportunityItemsError = {
  opportunity_id?: string;
  source?: OpportunityItemSource;
  source_item_id?: string | null;
  item_original?: string;
  message: string;
  details?: string | null;
  hint?: string | null;
};

export type PersistOpportunityItemsResult = {
  processed_opportunities: number;
  received_items: number;
  persisted_items: number;
  skipped_items: number;
  errors: PersistOpportunityItemsError[];
};

type SanitizedOpportunityItem = {
  opportunity_id: string;
  source: OpportunityItemSource;
  source_item_id: string | null;
  item_original: string;
  item_normalizado: string | null;
  quantity: number | null;
  unit: string | null;
  estimated_value: number | null;
  category: string | null;
  confidence: number | null;
};

const VALID_SOURCES: OpportunityItemSource[] = ['pncp', 'pdf_parser', 'gemini', 'manual'];

function isValidSource(value: unknown): value is OpportunityItemSource {
  return typeof value === 'string' && VALID_SOURCES.includes(value as OpportunityItemSource);
}

function normalizeNullableText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return value;
}

function normalizeConfidence(value: unknown): number | null {
  const normalized = normalizeNullableNumber(value);
  if (normalized === null) return null;
  return normalized >= 0 && normalized <= 1 ? normalized : null;
}

function createSystemError(message: string): Error {
  return new Error(`persistOpportunityItems: ${message}`);
}

function sanitizeItem(
  opportunityId: string,
  requestSource: OpportunityItemSource,
  item: OpportunityItemInput,
  errors: PersistOpportunityItemsError[]
): SanitizedOpportunityItem | null {
  if (!isValidSource(item?.source)) {
    errors.push({
      opportunity_id: opportunityId,
      message: 'Item com source inválido.',
      source: requestSource,
      item_original: typeof item?.item_original === 'string' ? item.item_original : undefined,
    });
    return null;
  }

  if (item.source !== requestSource) {
    errors.push({
      opportunity_id: opportunityId,
      message: 'Item com source diferente de request_source.',
      source: item.source,
      source_item_id: normalizeNullableText(item.source_item_id),
      item_original: typeof item.item_original === 'string' ? item.item_original : undefined,
    });
    return null;
  }

  const itemOriginal = normalizeNullableText(item.item_original);
  if (!itemOriginal) {
    return null;
  }

  return {
    opportunity_id: opportunityId,
    source: item.source,
    source_item_id: normalizeNullableText(item.source_item_id),
    item_original: itemOriginal,
    item_normalizado: normalizeNullableText(item.item_normalizado),
    quantity: normalizeNullableNumber(item.quantity),
    unit: normalizeNullableText(item.unit),
    estimated_value: normalizeNullableNumber(item.estimated_value),
    category: normalizeNullableText(item.category),
    confidence: normalizeConfidence(item.confidence),
  };
}

export async function persistOpportunityItems(
  supabase: SupabaseClient,
  input: PersistOpportunityItemsInput
): Promise<PersistOpportunityItemsResult> {
  if (!supabase) {
    throw createSystemError('SupabaseClient é obrigatório.');
  }

  if (!input || typeof input !== 'object') {
    throw createSystemError('Input inválido.');
  }

  if (!isValidSource(input.request_source)) {
    throw createSystemError('request_source inválido.');
  }

  const mode = input.mode ?? 'replace_by_source';
  if (mode !== 'replace_by_source') {
    throw createSystemError('Apenas o modo replace_by_source é suportado.');
  }

  if (!Array.isArray(input.records)) {
    throw createSystemError('records deve ser um array.');
  }

  const result: PersistOpportunityItemsResult = {
    processed_opportunities: 0,
    received_items: 0,
    persisted_items: 0,
    skipped_items: 0,
    errors: [],
  };

  for (const record of input.records) {
    const opportunityId =
      record && typeof record.opportunity_id === 'string' ? record.opportunity_id.trim() : '';

    if (!opportunityId) {
      result.errors.push({
        message: 'Registro com opportunity_id inválido.',
        source: input.request_source,
      });
      continue;
    }

    const items = Array.isArray(record.items) ? record.items : [];
    result.received_items += items.length;

    const sanitizedItems: SanitizedOpportunityItem[] = [];

    for (const item of items) {
      const sanitized = sanitizeItem(opportunityId, input.request_source, item, result.errors);
      if (!sanitized) {
        result.skipped_items += 1;
        continue;
      }
      sanitizedItems.push(sanitized);
    }

    try {
      const { error: deleteError } = await supabase
        .from('opportunity_items')
        .delete()
        .eq('opportunity_id', opportunityId)
        .eq('source', input.request_source);

      if (deleteError) {
        result.errors.push({
          opportunity_id: opportunityId,
          source: input.request_source,
          message: 'Erro ao remover itens antigos da oportunidade.',
          details: deleteError.details,
          hint: deleteError.hint,
        });
        continue;
      }

      if (sanitizedItems.length === 0) {
        result.processed_opportunities += 1;
        continue;
      }

      const { error: insertError } = await supabase
        .from('opportunity_items')
        .insert(sanitizedItems);

      if (insertError) {
        result.errors.push({
          opportunity_id: opportunityId,
          source: input.request_source,
          message: 'Erro ao inserir itens da oportunidade.',
          details: insertError.details,
          hint: insertError.hint,
        });
        continue;
      }

      result.processed_opportunities += 1;
      result.persisted_items += sanitizedItems.length;
    } catch (error) {
      result.errors.push({
        opportunity_id: opportunityId,
        source: input.request_source,
        message: error instanceof Error ? error.message : 'Erro desconhecido ao persistir oportunidade.',
      });
    }
  }

  return result;
}
