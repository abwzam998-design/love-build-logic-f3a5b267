
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_approved boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS entity_id uuid REFERENCES public.entities(id) ON DELETE SET NULL;

UPDATE public.profiles SET is_approved = true WHERE created_at < now();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  is_first boolean;
  is_super boolean;
BEGIN
  is_super := lower(COALESCE(NEW.email, '')) = 'math77@gmail.com';
  is_first := NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'manager');

  INSERT INTO public.profiles (id, full_name, phone, email, is_approved)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'phone',
    NEW.email,
    (is_super OR is_first)
  )
  ON CONFLICT (id) DO NOTHING;

  IF is_super OR is_first THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'manager')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;

DROP POLICY IF EXISTS "managers update profiles" ON public.profiles;
CREATE POLICY "managers update profiles" ON public.profiles
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'manager'))
  WITH CHECK (public.has_role(auth.uid(), 'manager'));

CREATE OR REPLACE FUNCTION public.my_entity_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT entity_id FROM public.profiles WHERE id = auth.uid() AND is_approved
$function$;

DROP POLICY IF EXISTS "customer reads own entity" ON public.entities;
CREATE POLICY "customer reads own entity" ON public.entities
  FOR SELECT TO authenticated USING (id = public.my_entity_id());

DROP POLICY IF EXISTS "customer reads own invoices" ON public.invoices;
CREATE POLICY "customer reads own invoices" ON public.invoices
  FOR SELECT TO authenticated USING (entity_id = public.my_entity_id());

DROP POLICY IF EXISTS "customer reads own invoice items" ON public.invoice_items;
CREATE POLICY "customer reads own invoice items" ON public.invoice_items
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_id AND i.entity_id = public.my_entity_id())
  );

DROP POLICY IF EXISTS "customer reads own payments" ON public.payments;
CREATE POLICY "customer reads own payments" ON public.payments
  FOR SELECT TO authenticated USING (entity_id = public.my_entity_id());
