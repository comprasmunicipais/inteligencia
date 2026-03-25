import { createClient } from '@/lib/supabase/server';
import OpportunitySourcesClient from './OpportunitySourcesClient';

export default async function OpportunitySourcesPage() {
  const supabase = await createClient();

  const { data: sources, error } = await supabase
    .from('opportunity_sources')
    .select(`
      id,
      url,
      source_type,
      is_active,
      last_checked_at,
      last_check_status,
      last_check_error,
      notes,
      created_at,
      updated_at,
      municipalities (
        id,
        name,
        state
      )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Erro ao carregar fontes: ${error.message}`);
  }

  return <OpportunitySourcesClient initialSources={sources ?? []} />;
}
