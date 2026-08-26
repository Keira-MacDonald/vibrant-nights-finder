-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'venue_manager');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
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

CREATE POLICY "Users read own roles" ON public.user_roles
FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage roles" ON public.user_roles
FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Venue managers
CREATE TABLE public.venue_managers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  place_id text NOT NULL,
  venue_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, place_id)
);
GRANT SELECT ON public.venue_managers TO authenticated;
GRANT ALL ON public.venue_managers TO service_role;
ALTER TABLE public.venue_managers ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.manages_venue(_user_id uuid, _place_id text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.venue_managers WHERE user_id = _user_id AND place_id = _place_id
  ) OR public.has_role(_user_id, 'admin')
$$;

CREATE POLICY "Managers read own assignments" ON public.venue_managers
FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage assignments" ON public.venue_managers
FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- Events
CREATE TABLE public.venue_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id text NOT NULL,
  venue_name text NOT NULL,
  title text NOT NULL,
  description text,
  lineup text,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  cover_charge numeric(10,2),
  is_published boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.venue_events TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.venue_events TO authenticated;
GRANT ALL ON public.venue_events TO service_role;
ALTER TABLE public.venue_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published events are public" ON public.venue_events
FOR SELECT TO anon, authenticated USING (is_published = true);
CREATE POLICY "Managers read own venue events" ON public.venue_events
FOR SELECT TO authenticated USING (public.manages_venue(auth.uid(), place_id));
CREATE POLICY "Managers write own venue events" ON public.venue_events
FOR INSERT TO authenticated WITH CHECK (public.manages_venue(auth.uid(), place_id) AND created_by = auth.uid());
CREATE POLICY "Managers update own venue events" ON public.venue_events
FOR UPDATE TO authenticated USING (public.manages_venue(auth.uid(), place_id))
WITH CHECK (public.manages_venue(auth.uid(), place_id));
CREATE POLICY "Managers delete own venue events" ON public.venue_events
FOR DELETE TO authenticated USING (public.manages_venue(auth.uid(), place_id));

CREATE TRIGGER venue_events_updated_at BEFORE UPDATE ON public.venue_events
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX venue_events_place_start_idx ON public.venue_events (place_id, starts_at);

-- Availability
CREATE TABLE public.venue_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id text NOT NULL,
  service_date date NOT NULL,
  kind public.reservation_kind NOT NULL,
  total_capacity integer NOT NULL DEFAULT 0 CHECK (total_capacity >= 0),
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (place_id, service_date, kind)
);
GRANT SELECT ON public.venue_availability TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.venue_availability TO authenticated;
GRANT ALL ON public.venue_availability TO service_role;
ALTER TABLE public.venue_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Availability is public" ON public.venue_availability
FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Managers write availability" ON public.venue_availability
FOR INSERT TO authenticated WITH CHECK (public.manages_venue(auth.uid(), place_id) AND created_by = auth.uid());
CREATE POLICY "Managers update availability" ON public.venue_availability
FOR UPDATE TO authenticated USING (public.manages_venue(auth.uid(), place_id))
WITH CHECK (public.manages_venue(auth.uid(), place_id));
CREATE POLICY "Managers delete availability" ON public.venue_availability
FOR DELETE TO authenticated USING (public.manages_venue(auth.uid(), place_id));

CREATE TRIGGER venue_availability_updated_at BEFORE UPDATE ON public.venue_availability
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Reservations upgrades
ALTER TABLE public.reservations
  ADD COLUMN event_id uuid REFERENCES public.venue_events(id) ON DELETE SET NULL,
  ADD COLUMN confirmation_code text,
  ADD COLUMN contact_email text,
  ADD COLUMN checked_in_at timestamptz;

CREATE UNIQUE INDEX reservations_confirmation_code_idx ON public.reservations (confirmation_code);
CREATE INDEX reservations_place_date_idx ON public.reservations (place_id, reserved_for);

CREATE OR REPLACE FUNCTION public.set_confirmation_code()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.confirmation_code IS NULL THEN
    NEW.confirmation_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER reservations_confirmation_code BEFORE INSERT ON public.reservations
FOR EACH ROW EXECUTE FUNCTION public.set_confirmation_code();

CREATE POLICY "Managers view venue reservations" ON public.reservations
FOR SELECT TO authenticated USING (public.manages_venue(auth.uid(), place_id));
CREATE POLICY "Managers update venue reservations" ON public.reservations
FOR UPDATE TO authenticated USING (public.manages_venue(auth.uid(), place_id))
WITH CHECK (public.manages_venue(auth.uid(), place_id));

-- Notifications
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  reservation_id uuid REFERENCES public.reservations(id) ON DELETE CASCADE,
  kind text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  email_to text,
  email_status text NOT NULL DEFAULT 'pending',
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own notifications" ON public.notifications
FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users update own notifications" ON public.notifications
FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.notify_reservation_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.notifications (user_id, reservation_id, kind, title, body, email_to)
    VALUES (NEW.user_id, NEW.id, 'confirmation',
      'Reservation confirmed at ' || NEW.venue_name,
      'Your ' || NEW.kind || ' for ' || NEW.party_size || ' is confirmed for ' ||
      to_char(NEW.reserved_for, 'Mon DD, HH24:MI') || '. Confirmation code ' || NEW.confirmation_code || '.',
      NEW.contact_email);
  ELSIF TG_OP = 'UPDATE' AND NEW.checked_in_at IS NOT NULL AND OLD.checked_in_at IS NULL THEN
    INSERT INTO public.notifications (user_id, reservation_id, kind, title, body, email_to)
    VALUES (NEW.user_id, NEW.id, 'checkin', 'Checked in at ' || NEW.venue_name,
      'You are checked in. Enjoy the night.', NEW.contact_email);
  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'cancelled' AND OLD.status <> 'cancelled' THEN
    INSERT INTO public.notifications (user_id, reservation_id, kind, title, body, email_to)
    VALUES (NEW.user_id, NEW.id, 'cancellation', 'Reservation cancelled at ' || NEW.venue_name,
      'Your booking on ' || to_char(NEW.reserved_for, 'Mon DD, HH24:MI') || ' was cancelled.', NEW.contact_email);
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER reservations_notify AFTER INSERT OR UPDATE ON public.reservations
FOR EACH ROW EXECUTE FUNCTION public.notify_reservation_change();

-- Live availability view function
CREATE OR REPLACE FUNCTION public.venue_availability_status(_place_id text, _service_date date)
RETURNS TABLE (kind public.reservation_kind, total_capacity integer, booked integer, remaining integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT a.kind,
         a.total_capacity,
         COALESCE(r.cnt, 0)::int AS booked,
         GREATEST(a.total_capacity - COALESCE(r.cnt, 0), 0)::int AS remaining
  FROM public.venue_availability a
  LEFT JOIN (
    SELECT kind, count(*) AS cnt
    FROM public.reservations
    WHERE place_id = _place_id
      AND status <> 'cancelled'
      AND (reserved_for AT TIME ZONE 'UTC')::date = _service_date
    GROUP BY kind
  ) r ON r.kind = a.kind
  WHERE a.place_id = _place_id AND a.service_date = _service_date
  ORDER BY a.kind;
$$;

GRANT EXECUTE ON FUNCTION public.venue_availability_status(text, date) TO anon, authenticated;