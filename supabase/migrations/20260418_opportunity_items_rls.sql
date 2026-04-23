ALTER TABLE public.opportunity_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "opportunity_items_read_authenticated" ON public.opportunity_items
  FOR SELECT USING (auth.role() = 'authenticated');
