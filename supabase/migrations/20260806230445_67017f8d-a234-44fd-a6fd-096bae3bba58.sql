CREATE TYPE public.reservation_kind AS ENUM ('booth', 'table', 'door');

CREATE TABLE public.reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  place_id text NOT NULL,
  venue_name text NOT NULL,
  venue_address text,
  kind public.reservation_kind NOT NULL DEFAULT 'table',
  party_size integer NOT NULL DEFAULT 2,
  reserved_for timestamptz NOT NULL,
  guest_name text NOT NULL,
  phone text,
  notes text,
  status text NOT NULL DEFAULT 'confirmed',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.reservations TO authenticated;
GRANT ALL ON public.reservations TO service_role;

ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own reservations"
  ON public.reservations FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$
LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER reservations_updated_at BEFORE UPDATE ON public.reservations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();