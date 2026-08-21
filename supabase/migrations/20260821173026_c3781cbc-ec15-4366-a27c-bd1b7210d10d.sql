CREATE TABLE public.entities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL DEFAULT 'customer',
  name text NOT NULL,
  phone text,
  notes text,
  opening_balance numeric NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.entities TO authenticated;
GRANT ALL ON public.entities TO service_role;
ALTER TABLE public.entities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "entities all auth" ON public.entities FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER entities_updated BEFORE UPDATE ON public.entities
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX entities_kind_name_idx ON public.entities (kind, name);

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS entity_id uuid REFERENCES public.entities(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS discount numeric NOT NULL DEFAULT 0;

ALTER TABLE public.purchases
  ADD COLUMN IF NOT EXISTS entity_id uuid REFERENCES public.entities(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS discount numeric NOT NULL DEFAULT 0;

ALTER TABLE public.invoice_items ADD COLUMN IF NOT EXISTS discount numeric NOT NULL DEFAULT 0;
ALTER TABLE public.purchase_items ADD COLUMN IF NOT EXISTS discount numeric NOT NULL DEFAULT 0;

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS entity_id uuid REFERENCES public.entities(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS direction text NOT NULL DEFAULT 'in',
  ADD COLUMN IF NOT EXISTS receipt_no text,
  ADD COLUMN IF NOT EXISTS method text NOT NULL DEFAULT 'نقدي';

CREATE INDEX IF NOT EXISTS payments_entity_idx ON public.payments (entity_id);
CREATE INDEX IF NOT EXISTS invoices_entity_idx ON public.invoices (entity_id);
CREATE INDEX IF NOT EXISTS purchases_entity_idx ON public.purchases (entity_id);

INSERT INTO public.entities (kind, name, phone, notes, created_at)
SELECT 'customer', c.name, c.phone, c.notes, c.created_at FROM public.customers c;

INSERT INTO public.entities (kind, name, phone, notes, created_at)
SELECT 'supplier', s.name, s.phone, s.notes, s.created_at FROM public.suppliers s;