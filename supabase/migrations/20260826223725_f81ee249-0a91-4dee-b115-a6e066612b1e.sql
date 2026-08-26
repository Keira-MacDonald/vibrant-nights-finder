REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.manages_venue(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.set_confirmation_code() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_reservation_change() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated;