-- Update only the Elite plan user limit for existing MVP data.
UPDATE public.plans
SET max_users = 5
WHERE name = 'Elite';
