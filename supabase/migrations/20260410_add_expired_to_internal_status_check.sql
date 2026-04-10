-- Migration: adicionar 'expired' ao CHECK constraint de internal_status em opportunities
ALTER TABLE public.opportunities
  DROP CONSTRAINT opportunities_internal_status_check;

ALTER TABLE public.opportunities
  ADD CONSTRAINT opportunities_internal_status_check
  CHECK (internal_status = ANY (ARRAY[
    'new', 'updated', 'under_review', 'relevant',
    'discarded', 'converted_to_task', 'converted_to_deal',
    'converted_to_proposal', 'expired'
  ]));
