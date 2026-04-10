-- Migration: adicionar coluna notes à tabela contacts
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS notes text NULL;
