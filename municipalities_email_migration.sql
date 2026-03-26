-- Migration: adiciona coluna email na tabela municipalities
-- Execute no Supabase SQL Editor

ALTER TABLE municipalities
  ADD COLUMN IF NOT EXISTS email TEXT;
