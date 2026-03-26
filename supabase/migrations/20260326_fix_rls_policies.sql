-- Migration: fix RLS policies — replace USING (true) with company_id scoping
-- Affects: contacts, contracts, deals, tasks, proposals, timeline_events,
--          municipality_documents, email_job_queue

-- ─────────────────────────────────────────────────────────────────────────────
-- Helper: reusable expression for company isolation
-- USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()))
-- ─────────────────────────────────────────────────────────────────────────────

-- contacts
DROP POLICY IF EXISTS "Acesso total contatos" ON contacts;
CREATE POLICY "Isolamento por empresa contatos"
  ON contacts FOR ALL
  USING  (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- contracts
DROP POLICY IF EXISTS "Acesso total contratos" ON contracts;
CREATE POLICY "Isolamento por empresa contratos"
  ON contracts FOR ALL
  USING  (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- deals
DROP POLICY IF EXISTS "Acesso total deals" ON deals;
CREATE POLICY "Isolamento por empresa deals"
  ON deals FOR ALL
  USING  (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- tasks
DROP POLICY IF EXISTS "Acesso total tasks" ON tasks;
CREATE POLICY "Isolamento por empresa tasks"
  ON tasks FOR ALL
  USING  (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- proposals
DROP POLICY IF EXISTS "Acesso total proposals" ON proposals;
CREATE POLICY "Isolamento por empresa proposals"
  ON proposals FOR ALL
  USING  (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- timeline_events
DROP POLICY IF EXISTS "Acesso total timeline_events" ON timeline_events;
CREATE POLICY "Isolamento por empresa timeline_events"
  ON timeline_events FOR ALL
  USING  (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- municipality_documents
DROP POLICY IF EXISTS "Acesso total municipality_documents" ON municipality_documents;
CREATE POLICY "Isolamento por empresa municipality_documents"
  ON municipality_documents FOR ALL
  USING  (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- ─────────────────────────────────────────────────────────────────────────────
-- email_job_queue — add missing policies
-- SELECT/INSERT/UPDATE by company users; full access for service role (admin)
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Isolamento por empresa email_job_queue" ON email_job_queue;
CREATE POLICY "Isolamento por empresa email_job_queue"
  ON email_job_queue FOR ALL
  USING  (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));
