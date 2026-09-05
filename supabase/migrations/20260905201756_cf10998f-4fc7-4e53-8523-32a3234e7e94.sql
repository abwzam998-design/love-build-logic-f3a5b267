
REVOKE EXECUTE ON FUNCTION public.is_owner_user(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_system_owner() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_staff() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.my_entity_id() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_super_admin() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.is_owner_user(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_system_owner() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_staff() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.my_entity_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated, service_role;
