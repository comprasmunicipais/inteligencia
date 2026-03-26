-- Migration: atomic RPC to insert a sending account only if company is under the 5-account limit.
-- Replaces the non-atomic COUNT + INSERT pattern in the API route.

CREATE OR REPLACE FUNCTION public.insert_sending_account_if_under_limit(
  p_company_id          uuid,
  p_name                text,
  p_sender_name         text,
  p_sender_email        text,
  p_reply_to_email      text,
  p_smtp_host           text,
  p_smtp_port           int,
  p_smtp_secure         boolean,
  p_smtp_username       text,
  p_smtp_password_enc   text,
  p_daily_limit         int,
  p_hourly_limit        int,
  p_is_active           boolean,
  p_updated_at          timestamptz
)
RETURNS SETOF email_sending_accounts
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count int;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM email_sending_accounts
  WHERE company_id = p_company_id;

  IF v_count >= 5 THEN
    RAISE EXCEPTION 'LIMIT_EXCEEDED';
  END IF;

  RETURN QUERY
  INSERT INTO email_sending_accounts (
    company_id, name, sender_name, sender_email, reply_to_email,
    smtp_host, smtp_port, smtp_secure, smtp_username, smtp_password_encrypted,
    daily_limit, hourly_limit, is_active, updated_at
  ) VALUES (
    p_company_id, p_name, p_sender_name, p_sender_email, p_reply_to_email,
    p_smtp_host, p_smtp_port, p_smtp_secure, p_smtp_username, p_smtp_password_enc,
    p_daily_limit, p_hourly_limit, p_is_active, p_updated_at
  )
  RETURNING *;
END;
$$;
