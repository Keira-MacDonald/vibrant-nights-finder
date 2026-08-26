REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.manages_venue(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_confirmation_code() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_reservation_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.venue_availability_status(text, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.venue_availability_status(text, date) TO anon, authenticated;