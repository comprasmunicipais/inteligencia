-- Fix company_profiles RLS for secure onboarding inserts
-- Problem:
--   Existing policy "company_profiles_company_isolation" uses FOR ALL with USING only.
--   INSERT paths require WITH CHECK to validate the new row, otherwise onboarding inserts
--   may fail under RLS even for the authenticated user's own company.

ALTER TABLE company_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "company_profiles_company_isolation" ON company_profiles;

CREATE POLICY "company_profiles_company_isolation" ON company_profiles
  FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );
