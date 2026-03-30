-- Migration: 20260330_fix_rls_complete.sql
-- Complete RLS audit fix — 12 issues identified 2026-03-30
--
-- What this does:
--   1. Enable RLS + create policies on: companies, profiles, contacts, proposals
--   2. Remove conflicting USING(true) policies from: contracts, deals, tasks,
--      timeline_events, municipality_documents
--   3. Add INSERT/UPDATE policies to: email_credits, subscriptions
--   4. Add SELECT policy to: billing_events
--
-- PERMISSIVE policies are OR'd — any single USING(true) policy nullifies isolation.
-- All USING(true) legacy policies must be dropped before isolation takes effect.
--
-- service_role bypasses RLS by default in Supabase (no explicit policy needed).
-- Webhook handlers and admin routes that use createAdminClient() are unaffected.

-- ─────────────────────────────────────────────────────────────────────────────
-- HELPER NOTE
-- Isolation expression used throughout:
--   company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
--
-- For the profiles table itself, the subquery targets a specific PK row
-- (WHERE id = auth.uid()), so it does not recurse through RLS evaluation.
-- ─────────────────────────────────────────────────────────────────────────────


-- ═════════════════════════════════════════════════════════════════════════════
-- 1. companies
-- ═════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Regular users see only their own company row; platform_admin sees all
CREATE POLICY "companies: leitura própria ou admin"
  ON public.companies FOR SELECT
  USING (
    id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'platform_admin'
  );

-- Regular users can update only their own company; platform_admin can update all
CREATE POLICY "companies: edição própria ou admin"
  ON public.companies FOR UPDATE
  USING (
    id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'platform_admin'
  )
  WITH CHECK (
    id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'platform_admin'
  );

-- Only platform_admin can create companies (self-service signup handled via service_role)
CREATE POLICY "companies: criação por platform_admin"
  ON public.companies FOR INSERT
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'platform_admin'
  );

-- Only platform_admin can delete companies
CREATE POLICY "companies: exclusão por platform_admin"
  ON public.companies FOR DELETE
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'platform_admin'
  );


-- ═════════════════════════════════════════════════════════════════════════════
-- 2. profiles
-- ═════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile and profiles of colleagues in the same company
-- Subquery targets PK directly (auth.uid()), no RLS recursion
CREATE POLICY "profiles: leitura por empresa"
  ON public.profiles FOR SELECT
  USING (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'platform_admin'
  );

-- Users can only update their own profile row
CREATE POLICY "profiles: edição própria"
  ON public.profiles FOR UPDATE
  USING  (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- INSERT is handled entirely by service_role (createAdminClient) in admin routes
-- and by Supabase Auth internals — service_role bypasses RLS, no policy needed.


-- ═════════════════════════════════════════════════════════════════════════════
-- 3. contacts — RLS was disabled; policy already exists, just enable
-- ═════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

-- Policy "Isolamento por empresa contatos" already exists from 20260326 migration.
-- No new policy needed — enabling RLS activates it.


-- ═════════════════════════════════════════════════════════════════════════════
-- 4. proposals — RLS was disabled; policy already exists, just enable
-- ═════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;

-- Policy "Isolamento por empresa proposals" already exists from 20260326 migration.
-- No new policy needed — enabling RLS activates it.


-- ═════════════════════════════════════════════════════════════════════════════
-- 5. contracts — remove conflicting USING(true) policies
-- ═════════════════════════════════════════════════════════════════════════════

-- These two policies nullify "Isolamento por empresa contratos" (OR semantics)
DROP POLICY IF EXISTS "Allow all for now" ON public.contracts;
DROP POLICY IF EXISTS "allow all"         ON public.contracts;

-- "Isolamento por empresa contratos" from 20260326 remains and now takes effect.


-- ═════════════════════════════════════════════════════════════════════════════
-- 6. deals — remove conflicting USING(true) policy
-- ═════════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "allow all deals" ON public.deals;

-- "Isolamento por empresa deals" from 20260326 remains and now takes effect.


-- ═════════════════════════════════════════════════════════════════════════════
-- 7. tasks — remove conflicting USING(true) policy
-- ═════════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "allow all tasks" ON public.tasks;

-- "Isolamento por empresa tasks" from 20260326 remains and now takes effect.


-- ═════════════════════════════════════════════════════════════════════════════
-- 8. timeline_events — remove conflicting USING(true) policy
-- ═════════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "allow all timeline_events" ON public.timeline_events;

-- "Isolamento por empresa timeline_events" from 20260326 remains and now takes effect.


-- ═════════════════════════════════════════════════════════════════════════════
-- 9. municipality_documents — remove conflicting USING(true) policy
-- ═════════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "allow all municipality_documents" ON public.municipality_documents;

-- "Isolamento por empresa municipality_documents" from 20260326 remains and now takes effect.


-- ═════════════════════════════════════════════════════════════════════════════
-- 10. email_credits — add INSERT/UPDATE (SELECT policy already exists)
-- ═════════════════════════════════════════════════════════════════════════════

-- INSERT: authenticated users can add credits to their own company
-- (extra-credits API may run under authenticated context)
CREATE POLICY "email_credits: inserção por empresa"
  ON public.email_credits FOR INSERT
  WITH CHECK (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

-- UPDATE: authenticated users can update credits of their own company
CREATE POLICY "email_credits: atualização por empresa"
  ON public.email_credits FOR UPDATE
  USING (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  )
  WITH CHECK (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  );


-- ═════════════════════════════════════════════════════════════════════════════
-- 11. subscriptions — add INSERT/UPDATE (SELECT policy already exists)
-- ═════════════════════════════════════════════════════════════════════════════

-- INSERT: billing routes running under authenticated context can create subscriptions
CREATE POLICY "subscriptions: inserção por empresa"
  ON public.subscriptions FOR INSERT
  WITH CHECK (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

-- UPDATE: billing routes can update own company subscription
CREATE POLICY "subscriptions: atualização por empresa"
  ON public.subscriptions FOR UPDATE
  USING (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  )
  WITH CHECK (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  );


-- ═════════════════════════════════════════════════════════════════════════════
-- 12. billing_events — RLS was on but no policies (table was inaccessible)
-- ═════════════════════════════════════════════════════════════════════════════

-- Webhook inserts via service_role (bypasses RLS — no INSERT policy needed).
-- Authenticated users (e.g. settings page) can read their own company's events.
CREATE POLICY "billing_events: leitura por empresa"
  ON public.billing_events FOR SELECT
  USING (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'platform_admin'
  );
