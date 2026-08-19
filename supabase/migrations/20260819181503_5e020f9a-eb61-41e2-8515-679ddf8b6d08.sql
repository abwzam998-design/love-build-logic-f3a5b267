DROP POLICY IF EXISTS "purchases write manager" ON public.purchases;
DROP POLICY IF EXISTS "purchases read" ON public.purchases;
CREATE POLICY "purchases all auth" ON public.purchases FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "purchase_items write manager" ON public.purchase_items;
DROP POLICY IF EXISTS "purchase_items read" ON public.purchase_items;
CREATE POLICY "purchase_items all auth" ON public.purchase_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "suppliers all auth" ON public.suppliers;
CREATE POLICY "suppliers all auth" ON public.suppliers FOR ALL TO authenticated USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchases TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.suppliers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoice_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO authenticated;
GRANT SELECT ON public.products TO authenticated;
GRANT ALL ON public.purchases TO service_role;
GRANT ALL ON public.purchase_items TO service_role;
GRANT ALL ON public.suppliers TO service_role;