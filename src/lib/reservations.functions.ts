import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const kind = z.enum(["booth", "table", "door"]);

export const createReservation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        placeId: z.string().min(3).max(300),
        venueName: z.string().min(1).max(160),
        venueAddress: z.string().max(300).optional(),
        kind,
        partySize: z.number().int().min(1).max(40),
        reservedFor: z.string().min(8).max(40),
        guestName: z.string().min(2).max(80),
        phone: z.string().max(40).optional(),
        contactEmail: z.string().email().max(160).optional(),
        eventId: z.string().uuid().optional(),
        notes: z.string().max(400).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const reservedFor = new Date(data.reservedFor);
    const serviceDate = reservedFor.toISOString().slice(0, 10);

    const { data: availability } = await context.supabase.rpc("venue_availability_status", {
      _place_id: data.placeId,
      _service_date: serviceDate,
    });
    const slot = (availability ?? []).find((row) => row.kind === data.kind);
    if (slot && slot.remaining <= 0) {
      throw new Error(`No ${data.kind} spots left for that night`);
    }

    const { data: row, error } = await context.supabase
      .from("reservations")
      .insert({
        user_id: context.userId,
        place_id: data.placeId,
        venue_name: data.venueName,
        venue_address: data.venueAddress ?? null,
        kind: data.kind,
        party_size: data.partySize,
        reserved_for: reservedFor.toISOString(),
        guest_name: data.guestName,
        phone: data.phone ?? null,
        contact_email: data.contactEmail ?? (context.claims['email'] as string | undefined) ?? null,
        event_id: data.eventId ?? null,
        notes: data.notes ?? null,
      })
      .select("id, confirmation_code")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const listMyReservations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("reservations")
      .select("*")
      .eq("user_id", context.userId)
      .order("reserved_for", { ascending: true });
    if (error) throw new Error(error.message);
    return data;
  });

export const cancelReservation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("reservations")
      .update({ status: "cancelled" })
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) throw new Error(error.message);
    return data;
  });

export const markNotificationsRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .is("read_at", null)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
