-- Tabela de planos
CREATE TABLE public.plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  emails_per_month int NOT NULL,
  max_users int NOT NULL DEFAULT 1,
  extra_users_allowed boolean NOT NULL DEFAULT false,
  price_monthly numeric(10,2) NOT NULL,
  price_semiannual numeric(10,2) NOT NULL,
  price_annual numeric(10,2) NOT NULL,
  extra_pack_emails int NOT NULL DEFAULT 5000,
  extra_pack_price numeric(10,2) NOT NULL DEFAULT 80.00,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Inserir os 3 planos
INSERT INTO public.plans (name, emails_per_month, max_users, extra_users_allowed, price_monthly, price_semiannual, price_annual) VALUES
  ('Iniciante',    10000, 1, false, 297.00, 1600.00, 2800.00),
  ('Profissional', 25000, 3, true,  497.00, 2600.00, 4800.00),
  ('Conversão',    50000, 0, true,  797.00, 4200.00, 7800.00);

-- Tabela de assinaturas
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.plans(id),
  status text NOT NULL DEFAULT 'trial' CHECK (status IN ('trial','active','past_due','cancelled','expired')),
  billing_cycle text NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly','semiannual','annual')),
  asaas_subscription_id text NULL,
  asaas_customer_id text NULL,
  current_period_start timestamptz NULL,
  current_period_end timestamptz NULL,
  trial_ends_at timestamptz NULL,
  cancelled_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Tabela de créditos extras
CREATE TABLE public.email_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  credits int NOT NULL,
  price_paid numeric(10,2) NOT NULL,
  asaas_payment_id text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Tabela de eventos de cobrança
CREATE TABLE public.billing_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NULL REFERENCES public.companies(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  asaas_event_id text NULL,
  payload jsonb NULL,
  processed_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_events ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Plans são públicos para leitura" ON public.plans FOR SELECT USING (true);
CREATE POLICY "Subscription isolada por empresa" ON public.subscriptions FOR SELECT USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Credits isolados por empresa" ON public.email_credits FOR SELECT USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));
