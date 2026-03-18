import { createClient } from '@/lib/supabase/client';

export const syncService = {
  async syncOpportunities(companyId: string): Promise<{ new: number, updated: number, total: number }> {
    const supabase = createClient();

    const externalData = [
      {
        external_id: `EXT-${Math.floor(Math.random() * 10000)}`,
        organ_name: 'Prefeitura de Belo Horizonte',
        city: 'Belo Horizonte',
        state: 'MG',
        title: 'Software de Gestão de Frotas',
        description: 'Contratação de solução SaaS para monitoramento de veículos oficiais...',
        modality: 'Pregão Eletrônico',
        situation: 'Publicada',
        publication_date: new Date().toISOString(),
        opening_date: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString(),
        estimated_value: 850000,
        official_url: 'https://licitacoes.mg.gov.br/123',
        match_score: 88,
        match_reason: 'Alta aderência ao portfólio da empresa.'
      }
    ];

    let newCount = 0;
    let updatedCount = 0;

    for (const item of externalData) {
      const { data: municipality } = await supabase
        .from('municipalities')
        .select('id')
        .ilike('name', item.city)
        .eq('state', item.state)
        .single();

      const sync_hash = btoa(JSON.stringify(item));

      const { data: existing } = await supabase
        .from('opportunities')
        .select('id, sync_hash')
        .eq('company_id', companyId)
        .eq('external_id', item.external_id)
        .single();

      if (!existing) {
        await supabase.from('opportunities').insert({
          company_id: companyId,
          ...item,
          municipality_id: municipality?.id || null,
          municipality_match_status: municipality ? 'matched' : 'no_match',
          sync_hash,
          internal_status: 'new'
        });
        newCount++;
      } else if (existing.sync_hash !== sync_hash) {
        await supabase.from('opportunities').update({
          ...item,
          sync_hash,
          internal_status: 'updated',
          updated_at: new Date().toISOString()
        }).eq('id', existing.id);
        updatedCount++;
      }
    }

    return { new: newCount, updated: updatedCount, total: externalData.length };
  }
};