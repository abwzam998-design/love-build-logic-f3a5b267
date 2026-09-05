
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS subscription_status text NOT NULL DEFAULT 'trial',
  ADD COLUMN IF NOT EXISTS owner_note text;

-- من هو المالك
CREATE OR REPLACE FUNCTION public.is_owner_user(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'system_owner')
      OR EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id AND lower(coalesce(email,'')) = 'math77@gmail.com')
$$;

CREATE OR REPLACE FUNCTION public.is_system_owner()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT lower(coalesce((auth.jwt() ->> 'email'), '')) = 'math77@gmail.com'
      OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'system_owner')
$$;

-- ربط الحساب الشخصي بدور المالك
INSERT INTO public.user_roles (user_id, role)
SELECT p.id, 'system_owner'::app_role FROM public.profiles p
WHERE lower(coalesce(p.email,'')) = 'math77@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
SELECT p.id, 'manager'::app_role FROM public.profiles p
WHERE lower(coalesce(p.email,'')) = 'math77@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

UPDATE public.profiles
SET is_approved = true, is_active = true, subscription_status = 'owner', trial_ends_at = NULL
WHERE lower(coalesce(email,'')) = 'math77@gmail.com';

-- حساب جديد: المالك يُمنح كل الصلاحيات، الباقون فترة تجريبية
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  is_first boolean;
  is_super boolean;
BEGIN
  is_super := lower(COALESCE(NEW.email, '')) = 'math77@gmail.com';
  is_first := NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'manager');

  INSERT INTO public.profiles (id, full_name, phone, email, is_approved, subscription_status, trial_ends_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'phone',
    NEW.email,
    (is_super OR is_first),
    CASE WHEN is_super THEN 'owner' ELSE 'trial' END,
    CASE WHEN is_super THEN NULL ELSE now() + interval '14 days' END
  )
  ON CONFLICT (id) DO NOTHING;

  IF is_super OR is_first THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'manager')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  IF is_super THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'system_owner')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- الاشتراك المنتهي يوقف الوصول
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.profiles p ON p.id = ur.user_id
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('manager','seller','system_owner')
      AND p.is_active
      AND p.is_approved
      AND (p.subscription_status <> 'suspended')
      AND (p.trial_ends_at IS NULL OR p.trial_ends_at > now())
  )
$$;

-- سياسات الحماية
DROP POLICY IF EXISTS "managers update profiles" ON public.profiles;
DROP POLICY IF EXISTS "super admin update profiles" ON public.profiles;
CREATE POLICY "managers update non-owner profiles" ON public.profiles
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'manager') AND NOT public.is_owner_user(id))
  WITH CHECK (has_role(auth.uid(), 'manager') AND NOT public.is_owner_user(id));
CREATE POLICY "owner manages profiles" ON public.profiles
  FOR ALL TO authenticated
  USING (public.is_system_owner()) WITH CHECK (public.is_system_owner());

DROP POLICY IF EXISTS "managers manage roles" ON public.user_roles;
CREATE POLICY "managers manage non-owner roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'manager') AND role <> 'system_owner' AND NOT public.is_owner_user(user_id))
  WITH CHECK (has_role(auth.uid(), 'manager') AND role <> 'system_owner' AND NOT public.is_owner_user(user_id));
CREATE POLICY "owner manages roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.is_system_owner()) WITH CHECK (public.is_system_owner());
