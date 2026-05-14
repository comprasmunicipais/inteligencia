INSERT INTO public.plans (
  name,
  emails_per_month,
  max_users,
  extra_users_allowed,
  price_monthly,
  price_semiannual,
  price_annual,
  extra_pack_emails,
  extra_pack_price,
  is_active
)
SELECT
  'Implantação',
  5000,
  1,
  false,
  97.00,
  97.00,
  97.00,
  5000,
  80.00,
  true
WHERE NOT EXISTS (
  SELECT 1
  FROM public.plans
  WHERE name = 'Implantação'
);
