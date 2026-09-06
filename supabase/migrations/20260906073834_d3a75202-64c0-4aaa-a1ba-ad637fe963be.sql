-- 1) وحدات الأصناف
CREATE TABLE public.product_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  sale_kind text NOT NULL DEFAULT 'تجزئة',
  name text NOT NULL,
  factor numeric NOT NULL DEFAULT 1,
  cost_price numeric NOT NULL DEFAULT 0,
  sale_price numeric NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, sale_kind, name)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_units TO authenticated;
GRANT ALL ON public.product_units TO service_role;

ALTER TABLE public.product_units ENABLE ROW LEVEL SECURITY;

CREATE POLICY "product_units read staff" ON public.product_units
  FOR SELECT TO authenticated USING (public.is_staff());
CREATE POLICY "product_units write manager" ON public.product_units
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'manager'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'manager'::app_role));

CREATE TRIGGER product_units_updated BEFORE UPDATE ON public.product_units
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2) ترحيلات مبيعات اليوم لكل صنف
CREATE TABLE public.daily_postings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_date date NOT NULL DEFAULT (now())::date,
  item_name text NOT NULL,
  sale_kind text,
  unit text,
  quantity numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  cost numeric NOT NULL DEFAULT 0,
  profit numeric NOT NULL DEFAULT 0,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_date, item_name)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_postings TO authenticated;
GRANT ALL ON public.daily_postings TO service_role;

ALTER TABLE public.daily_postings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "daily_postings staff" ON public.daily_postings
  FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

-- 3) خصوصية بيانات المستخدمين
DROP POLICY IF EXISTS "profiles read all" ON public.profiles;
CREATE POLICY "profiles read own" ON public.profiles
  FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "profiles read staff" ON public.profiles
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'manager'::app_role) OR public.is_system_owner());

-- 4) منع المستخدم من تعديل الحقول الحساسة لنفسه
CREATE OR REPLACE FUNCTION public.protect_profile_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'manager'::app_role) OR public.is_system_owner() THEN
    RETURN NEW;
  END IF;
  NEW.entity_id := OLD.entity_id;
  NEW.is_approved := OLD.is_approved;
  NEW.is_active := OLD.is_active;
  NEW.subscription_status := OLD.subscription_status;
  NEW.trial_ends_at := OLD.trial_ends_at;
  NEW.owner_note := OLD.owner_note;
  NEW.email := OLD.email;
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_protect_fields BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_fields();
