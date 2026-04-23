CREATE TABLE public.opportunity_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  opportunity_id uuid NOT NULL
    REFERENCES public.opportunities(id)
    ON DELETE CASCADE,

  source text NOT NULL,
  source_item_id text NULL,

  item_original text NOT NULL,
  item_normalizado text NULL,

  quantity numeric(18,4) NULL,
  unit text NULL,
  estimated_value numeric(18,2) NULL,
  category text NULL,
  confidence numeric(5,4) NULL,

  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT opportunity_items_source_check
    CHECK (source IN ('pncp', 'pdf_parser', 'gemini', 'manual')),

  CONSTRAINT opportunity_items_confidence_check
    CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),

  CONSTRAINT opportunity_items_quantity_check
    CHECK (quantity IS NULL OR quantity >= 0),

  CONSTRAINT opportunity_items_estimated_value_check
    CHECK (estimated_value IS NULL OR estimated_value >= 0)
);

CREATE INDEX opportunity_items_opportunity_id_idx
  ON public.opportunity_items (opportunity_id);

CREATE INDEX opportunity_items_source_idx
  ON public.opportunity_items (source);

CREATE INDEX opportunity_items_category_idx
  ON public.opportunity_items (category);

CREATE INDEX opportunity_items_opportunity_category_idx
  ON public.opportunity_items (opportunity_id, category);

CREATE INDEX opportunity_items_opportunity_created_at_idx
  ON public.opportunity_items (opportunity_id, created_at DESC);

CREATE INDEX opportunity_items_item_normalizado_idx
  ON public.opportunity_items (item_normalizado);

CREATE INDEX opportunity_items_dedupe_aux_idx
  ON public.opportunity_items (opportunity_id, source, item_normalizado);

CREATE UNIQUE INDEX opportunity_items_unique_source_item_id_idx
  ON public.opportunity_items (opportunity_id, source, source_item_id)
  WHERE source_item_id IS NOT NULL;
