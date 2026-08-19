CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  requested text;
  final_role public.app_role;
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), NEW.raw_user_meta_data->>'phone')
  ON CONFLICT (id) DO NOTHING;

  requested := NEW.raw_user_meta_data->>'role';

  IF lower(COALESCE(NEW.email, '')) = 'math77@gmail.com' THEN
    final_role := 'manager';
  ELSIF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'manager') THEN
    final_role := 'manager';
  ELSIF requested = 'manager' THEN
    final_role := 'manager';
  ELSE
    final_role := 'seller';
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, final_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$function$;