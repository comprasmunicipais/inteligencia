-- Migration: Plano Consultoria — tabelas isoladas
-- Data: 2026-04-16
-- Camada totalmente paralela ao MVP atual. Nenhuma tabela existente é alterada.

-- ============================================================
-- 1. consultant_profiles
-- ============================================================

CREATE TABLE consultant_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id),
  name text NOT NULL,
  cnpj text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, cnpj)
);

ALTER TABLE consultant_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "consultant_profiles_select" ON consultant_profiles
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM company_users WHERE company_id = consultant_profiles.company_id
    )
  );

CREATE POLICY "consultant_profiles_insert" ON consultant_profiles
  FOR INSERT WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM company_users WHERE company_id = consultant_profiles.company_id
    )
  );

CREATE POLICY "consultant_profiles_update" ON consultant_profiles
  FOR UPDATE USING (
    auth.uid() IN (
      SELECT user_id FROM company_users WHERE company_id = consultant_profiles.company_id
    )
  ) WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM company_users WHERE company_id = consultant_profiles.company_id
    )
  );

CREATE POLICY "consultant_profiles_delete" ON consultant_profiles
  FOR DELETE USING (
    auth.uid() IN (
      SELECT user_id FROM company_users WHERE company_id = consultant_profiles.company_id
    )
  );

-- ============================================================
-- 2. consultant_profile_configs
-- ============================================================

CREATE TABLE consultant_profile_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consultant_profile_id uuid NOT NULL UNIQUE REFERENCES consultant_profiles(id),
  config jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE consultant_profile_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "consultant_profile_configs_select" ON consultant_profile_configs
  FOR SELECT USING (
    consultant_profile_id IN (
      SELECT id FROM consultant_profiles
      WHERE company_id IN (
        SELECT company_id FROM company_users WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "consultant_profile_configs_insert" ON consultant_profile_configs
  FOR INSERT WITH CHECK (
    consultant_profile_id IN (
      SELECT id FROM consultant_profiles
      WHERE company_id IN (
        SELECT company_id FROM company_users WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "consultant_profile_configs_update" ON consultant_profile_configs
  FOR UPDATE USING (
    consultant_profile_id IN (
      SELECT id FROM consultant_profiles
      WHERE company_id IN (
        SELECT company_id FROM company_users WHERE user_id = auth.uid()
      )
    )
  ) WITH CHECK (
    consultant_profile_id IN (
      SELECT id FROM consultant_profiles
      WHERE company_id IN (
        SELECT company_id FROM company_users WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "consultant_profile_configs_delete" ON consultant_profile_configs
  FOR DELETE USING (
    consultant_profile_id IN (
      SELECT id FROM consultant_profiles
      WHERE company_id IN (
        SELECT company_id FROM company_users WHERE user_id = auth.uid()
      )
    )
  );

-- ============================================================
-- 3. consultant_opportunity_scores
-- ============================================================

CREATE TABLE consultant_opportunity_scores (
  consultant_profile_id uuid NOT NULL REFERENCES consultant_profiles(id),
  opportunity_id uuid NOT NULL REFERENCES opportunities(id),
  score numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (consultant_profile_id, opportunity_id)
);

CREATE INDEX consultant_opportunity_scores_profile_idx
  ON consultant_opportunity_scores (consultant_profile_id);

ALTER TABLE consultant_opportunity_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "consultant_opportunity_scores_select" ON consultant_opportunity_scores
  FOR SELECT USING (
    consultant_profile_id IN (
      SELECT id FROM consultant_profiles
      WHERE company_id IN (
        SELECT company_id FROM company_users WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "consultant_opportunity_scores_insert" ON consultant_opportunity_scores
  FOR INSERT WITH CHECK (
    consultant_profile_id IN (
      SELECT id FROM consultant_profiles
      WHERE company_id IN (
        SELECT company_id FROM company_users WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "consultant_opportunity_scores_update" ON consultant_opportunity_scores
  FOR UPDATE USING (
    consultant_profile_id IN (
      SELECT id FROM consultant_profiles
      WHERE company_id IN (
        SELECT company_id FROM company_users WHERE user_id = auth.uid()
      )
    )
  ) WITH CHECK (
    consultant_profile_id IN (
      SELECT id FROM consultant_profiles
      WHERE company_id IN (
        SELECT company_id FROM company_users WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "consultant_opportunity_scores_delete" ON consultant_opportunity_scores
  FOR DELETE USING (
    consultant_profile_id IN (
      SELECT id FROM consultant_profiles
      WHERE company_id IN (
        SELECT company_id FROM company_users WHERE user_id = auth.uid()
      )
    )
  );

-- ============================================================
-- 4. consultant_campaigns
-- ============================================================

CREATE TABLE consultant_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consultant_profile_id uuid NOT NULL REFERENCES consultant_profiles(id),
  company_id uuid NOT NULL REFERENCES companies(id),
  name text NOT NULL,
  objective text,
  description text,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE consultant_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "consultant_campaigns_select" ON consultant_campaigns
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM company_users WHERE company_id = consultant_campaigns.company_id
    )
  );

CREATE POLICY "consultant_campaigns_insert" ON consultant_campaigns
  FOR INSERT WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM company_users WHERE company_id = consultant_campaigns.company_id
    )
  );

CREATE POLICY "consultant_campaigns_update" ON consultant_campaigns
  FOR UPDATE USING (
    auth.uid() IN (
      SELECT user_id FROM company_users WHERE company_id = consultant_campaigns.company_id
    )
  ) WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM company_users WHERE company_id = consultant_campaigns.company_id
    )
  );

CREATE POLICY "consultant_campaigns_delete" ON consultant_campaigns
  FOR DELETE USING (
    auth.uid() IN (
      SELECT user_id FROM company_users WHERE company_id = consultant_campaigns.company_id
    )
  );
