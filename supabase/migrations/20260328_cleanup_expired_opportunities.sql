-- Migration: ciclo de vida de licitações vencidas
-- Arquivamento automático (expired) + deleção após 30 dias + pg_cron diário
--
-- Pré-condição verificada:
--   internal_status é coluna TEXT (sem enum/check constraint) — 'expired' é compatível
--   com os valores existentes: 'new', 'under_review', 'relevant', 'discarded', 'converted_*'
--
-- Rodar no Supabase SQL Editor ou via: npx supabase db push

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. RPC: archive_expired_opportunities
--    Marca como 'expired' oportunidades cujo prazo (opening_date) já passou.
--    SECURITY DEFINER → bypassa RLS, opera em todas as empresas.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.archive_expired_opportunities()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rows_affected integer;
BEGIN
  UPDATE opportunities
  SET
    internal_status = 'expired',
    updated_at      = now()
  WHERE
    opening_date    < now()
    AND internal_status != 'expired';

  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  RETURN rows_affected;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. RPC: delete_old_expired_opportunities
--    Remove definitivamente oportunidades expiradas há mais de 30 dias.
--    SECURITY DEFINER → bypassa RLS.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.delete_old_expired_opportunities()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rows_affected integer;
BEGIN
  DELETE FROM opportunities
  WHERE
    internal_status = 'expired'
    AND opening_date < now() - INTERVAL '30 days';

  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  RETURN rows_affected;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. pg_cron: job diário às 06:00 UTC (03:00 BRT)
--    Requer extensão pg_cron habilitada no projeto Supabase.
--    Ativar em: Dashboard → Database → Extensions → pg_cron
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  -- Remove job anterior com o mesmo nome se existir (idempotente)
  IF EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'cleanup_expired_opportunities'
  ) THEN
    PERFORM cron.unschedule('cleanup_expired_opportunities');
  END IF;

  -- Agenda o job: 06:00 UTC = 03:00 BRT
  PERFORM cron.schedule(
    'cleanup_expired_opportunities',
    '0 6 * * *',
    'SELECT public.archive_expired_opportunities(); SELECT public.delete_old_expired_opportunities();'
  );
END;
$$;
