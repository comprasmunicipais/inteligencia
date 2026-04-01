-- Migration: RLS para tabelas sem proteção
-- Data: 2026-04-01
-- Tabelas críticas (isolamento por empresa) + tabelas globais (somente leitura autenticada)

-- ============================================================
-- TABELAS CRÍTICAS — isolamento por company_id
-- ============================================================

ALTER TABLE company_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_profiles_company_isolation" ON company_profiles
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- ------------------------------------------------------------

ALTER TABLE company_catalogs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_catalogs_company_isolation" ON company_catalogs
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- ------------------------------------------------------------

ALTER TABLE company_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_documents_company_isolation" ON company_documents
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- ------------------------------------------------------------

ALTER TABLE ai_proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_proposals_company_isolation" ON ai_proposals
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- ------------------------------------------------------------

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_company_isolation" ON notifications
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- ------------------------------------------------------------

ALTER TABLE pipeline_stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pipeline_stages_company_isolation" ON pipeline_stages
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- ============================================================
-- TABELAS GLOBAIS — somente leitura autenticada
-- (escrita restrita ao service role via RLS bypass)
-- ============================================================

ALTER TABLE municipalities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "municipalities_read_authenticated" ON municipalities
  FOR SELECT USING (auth.role() = 'authenticated');

-- ------------------------------------------------------------

ALTER TABLE municipality_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "municipality_emails_read_authenticated" ON municipality_emails
  FOR SELECT USING (auth.role() = 'authenticated');

-- ------------------------------------------------------------

ALTER TABLE municipality_emails_import ENABLE ROW LEVEL SECURITY;

CREATE POLICY "municipality_emails_import_read_authenticated" ON municipality_emails_import
  FOR SELECT USING (auth.role() = 'authenticated');

-- ------------------------------------------------------------

ALTER TABLE municipalities_import_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "municipalities_import_log_read_authenticated" ON municipalities_import_log
  FOR SELECT USING (auth.role() = 'authenticated');

-- ------------------------------------------------------------

ALTER TABLE sync_control ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sync_control_read_authenticated" ON sync_control
  FOR SELECT USING (auth.role() = 'authenticated');

-- ------------------------------------------------------------

ALTER TABLE pncp_contratacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pncp_contratacoes_read_authenticated" ON pncp_contratacoes
  FOR SELECT USING (auth.role() = 'authenticated');
