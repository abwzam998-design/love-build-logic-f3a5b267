CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.profiles p ON p.id = ur.user_id
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('manager','seller')
      AND p.is_active
  )
$$;

DROP POLICY IF EXISTS "customers all auth" ON public.customers;
CREATE POLICY "customers staff" ON public.customers FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "suppliers all auth" ON public.suppliers;
CREATE POLICY "suppliers staff" ON public.suppliers FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "entities all auth" ON public.entities;
CREATE POLICY "entities staff" ON public.entities FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "invoices all auth" ON public.invoices;
CREATE POLICY "invoices staff" ON public.invoices FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "invoice_items all auth" ON public.invoice_items;
CREATE POLICY "invoice_items staff" ON public.invoice_items FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "purchases all auth" ON public.purchases;
CREATE POLICY "purchases staff" ON public.purchases FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "purchase_items all auth" ON public.purchase_items;
CREATE POLICY "purchase_items staff" ON public.purchase_items FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "payments all auth" ON public.payments;
CREATE POLICY "payments staff" ON public.payments FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "products read" ON public.products;
CREATE POLICY "products read staff" ON public.products FOR SELECT TO authenticated USING (public.is_staff());