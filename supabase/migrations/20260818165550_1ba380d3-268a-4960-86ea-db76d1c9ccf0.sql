
-- roles
CREATE TYPE public.app_role AS ENUM ('manager','seller');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles read all" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles update own" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "profiles insert own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "roles read all" ON public.user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "managers manage roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'manager')) WITH CHECK (public.has_role(auth.uid(),'manager'));

-- new user handler: first user becomes manager
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), NEW.raw_user_meta_data->>'phone')
  ON CONFLICT (id) DO NOTHING;

  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'manager') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'manager');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'seller');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- parties
CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "customers all auth" ON public.customers FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.suppliers TO authenticated;
GRANT ALL ON public.suppliers TO service_role;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "suppliers all auth" ON public.suppliers FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  unit text NOT NULL DEFAULT 'كجم',
  cost_price numeric(12,2) NOT NULL DEFAULT 0,
  sale_price numeric(12,2) NOT NULL DEFAULT 0,
  stock_qty numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products read" ON public.products FOR SELECT TO authenticated USING (true);
CREATE POLICY "products write manager" ON public.products FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'manager')) WITH CHECK (public.has_role(auth.uid(),'manager'));
CREATE TRIGGER products_updated BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- invoices (sales)
CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_no text NOT NULL UNIQUE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  customer_phone text,
  sale_type text NOT NULL DEFAULT 'تجزئة',
  payment_type text NOT NULL DEFAULT 'نقدي',
  total numeric(12,2) NOT NULL DEFAULT 0,
  paid numeric(12,2) NOT NULL DEFAULT 0,
  notes text,
  invoice_date timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO authenticated;
GRANT ALL ON public.invoices TO service_role;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "invoices all auth" ON public.invoices FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER invoices_updated BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  item_name text NOT NULL,
  sale_kind text NOT NULL DEFAULT 'تجزئة',
  unit text NOT NULL DEFAULT 'كجم',
  quantity numeric(12,2) NOT NULL DEFAULT 0,
  unit_price numeric(12,2) NOT NULL DEFAULT 0,
  line_total numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoice_items TO authenticated;
GRANT ALL ON public.invoice_items TO service_role;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "invoice_items all auth" ON public.invoice_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- purchases
CREATE TABLE public.purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_no text NOT NULL UNIQUE,
  supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  supplier_name text NOT NULL,
  supplier_phone text,
  payment_type text NOT NULL DEFAULT 'نقدي',
  total numeric(12,2) NOT NULL DEFAULT 0,
  paid numeric(12,2) NOT NULL DEFAULT 0,
  notes text,
  purchase_date timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchases TO authenticated;
GRANT ALL ON public.purchases TO service_role;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "purchases read" ON public.purchases FOR SELECT TO authenticated USING (true);
CREATE POLICY "purchases write manager" ON public.purchases FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'manager')) WITH CHECK (public.has_role(auth.uid(),'manager'));
CREATE TRIGGER purchases_updated BEFORE UPDATE ON public.purchases FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.purchase_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id uuid NOT NULL REFERENCES public.purchases(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  item_name text NOT NULL,
  unit text NOT NULL DEFAULT 'كجم',
  quantity numeric(12,2) NOT NULL DEFAULT 0,
  unit_cost numeric(12,2) NOT NULL DEFAULT 0,
  line_total numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_items TO authenticated;
GRANT ALL ON public.purchase_items TO service_role;
ALTER TABLE public.purchase_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "purchase_items read" ON public.purchase_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "purchase_items write manager" ON public.purchase_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'manager')) WITH CHECK (public.has_role(auth.uid(),'manager'));

-- payments (against invoices or purchases)
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_type text NOT NULL,
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE CASCADE,
  purchase_id uuid REFERENCES public.purchases(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  paid_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payments all auth" ON public.payments FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- expenses
CREATE TABLE public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  description text,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  is_recurring boolean NOT NULL DEFAULT false,
  expense_date date NOT NULL DEFAULT (now()::date),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO authenticated;
GRANT ALL ON public.expenses TO service_role;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "expenses manager only" ON public.expenses FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'manager')) WITH CHECK (public.has_role(auth.uid(),'manager'));

-- waste
CREATE TABLE public.waste (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  item_name text NOT NULL,
  quantity numeric(12,2) NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'كجم',
  unit_cost numeric(12,2) NOT NULL DEFAULT 0,
  loss_amount numeric(12,2) NOT NULL DEFAULT 0,
  reason text,
  waste_date date NOT NULL DEFAULT (now()::date),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.waste TO authenticated;
GRANT ALL ON public.waste TO service_role;
ALTER TABLE public.waste ENABLE ROW LEVEL SECURITY;
CREATE POLICY "waste manager only" ON public.waste FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'manager')) WITH CHECK (public.has_role(auth.uid(),'manager'));

-- stock counts
CREATE TABLE public.stock_counts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  item_name text NOT NULL,
  system_qty numeric(12,2) NOT NULL DEFAULT 0,
  counted_qty numeric(12,2) NOT NULL DEFAULT 0,
  difference numeric(12,2) NOT NULL DEFAULT 0,
  count_date date NOT NULL DEFAULT (now()::date),
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_counts TO authenticated;
GRANT ALL ON public.stock_counts TO service_role;
ALTER TABLE public.stock_counts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stock_counts manager only" ON public.stock_counts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'manager')) WITH CHECK (public.has_role(auth.uid(),'manager'));

-- advances (worker loans) and owner withdrawals
CREATE TABLE public.advances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_name text NOT NULL,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  deducted numeric(12,2) NOT NULL DEFAULT 0,
  notes text,
  advance_date date NOT NULL DEFAULT (now()::date),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.advances TO authenticated;
GRANT ALL ON public.advances TO service_role;
ALTER TABLE public.advances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "advances manager only" ON public.advances FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'manager')) WITH CHECK (public.has_role(auth.uid(),'manager'));

CREATE TABLE public.owner_withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  amount numeric(12,2) NOT NULL DEFAULT 0,
  reason text,
  withdrawal_date date NOT NULL DEFAULT (now()::date),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.owner_withdrawals TO authenticated;
GRANT ALL ON public.owner_withdrawals TO service_role;
ALTER TABLE public.owner_withdrawals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "withdrawals manager only" ON public.owner_withdrawals FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'manager')) WITH CHECK (public.has_role(auth.uid(),'manager'));

-- settings (single row)
CREATE TABLE public.settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name text NOT NULL DEFAULT 'منشأتي',
  currency text NOT NULL DEFAULT 'ريال',
  phone text,
  address text,
  debt_message_template text NOT NULL DEFAULT 'السلام عليكم {name} 👋
لديكم مبلغ مستحق بقيمة {amount} {currency} عن الفاتورة {invoice} بتاريخ {date}.
نرجو التكرم بالسداد، شكراً لتعاملكم معنا - {business}',
  statement_message_template text NOT NULL DEFAULT 'السلام عليكم {name}
كشف حسابكم لدى {business}: الإجمالي {total} {currency}، المدفوع {paid} {currency}، المتبقي {amount} {currency}.',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.settings TO authenticated;
GRANT ALL ON public.settings TO service_role;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings read" ON public.settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "settings write manager" ON public.settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'manager')) WITH CHECK (public.has_role(auth.uid(),'manager'));
CREATE TRIGGER settings_updated BEFORE UPDATE ON public.settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.settings (business_name, currency) VALUES ('سوق الخضار والفواكه', 'ريال');
