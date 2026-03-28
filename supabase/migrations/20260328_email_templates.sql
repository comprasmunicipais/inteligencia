-- Migration: tabela email_templates
-- Templates de email gerados por IA por empresa (1 por tipo, unique company_id + type)

CREATE TABLE IF NOT EXISTS public.email_templates (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    uuid        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  type          text        NOT NULL CHECK (type IN ('prospeccao', 'relacionamento', 'apresentacao', 'followup')),
  subject       text        NOT NULL,
  body          text        NOT NULL,
  profile_hash  text,
  generated_at  timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, type)
);

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Isolamento por empresa email_templates"
  ON email_templates FOR ALL
  USING  (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));
