import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const kind = z.enum(["booth", "table", "door"]);

export const myManagedVenues = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("venue_managers")
      .select("place_id, venue_name")
      .order("venue_name");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listManagedEvents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ placeId: z.string().min(3) }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("venue_events")
      .select("*")
      .eq("place_id", data.placeId)
      .order("starts_at", { ascending: true });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const saveEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        placeId: z.string().min(3).max(300),
        venueName: z.string().min(1).max(160),
        title: z.string().min(2).max(140),
        description: z.string().max(1000).optional(),
        lineup: z.string().max(400).optional(),
        startsAt: z.string().min(8).max(40),
        endsAt: z.string().max(40).optional(),
        coverCharge: z.number().min(0).max(10000).optional(),
        isPublished: z.boolean().default(true),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const payload = {
      place_id: data.placeId,
      venue_name: data.venueName,
      title: data.title,
      description: data.description ?? null,
      lineup: data.lineup ?? null,
      starts_at: new Date(data.startsAt).toISOString(),
      ends_at: data.endsAt ? new Date(data.endsAt).toISOString() : null,
      cover_charge: data.coverCharge ?? null,
      is_published: data.isPublished,
      created_by: context.userId,
    };
    const query = data.id
      ? context.supabase.from("venue_events").update(payload).eq("id", data.id)
      : context.supabase.from("venue_events").insert(payload);
    const { error } = await query;
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("venue_events").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listAvailability = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        placeId: z.string().min(3),
        serviceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase.rpc("venue_availability_status", {
      _place_id: data.placeId,
      _service_date: data.serviceDate,
    });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const setCapacity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        placeId: z.string().min(3),
        serviceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        kind,
        totalCapacity: z.number().int().min(0).max(500),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("venue_availability").upsert(
      {
        place_id: data.placeId,
        service_date: data.serviceDate,
        kind: data.kind,
        total_capacity: data.totalCapacity,
        created_by: context.userId,
      },
      { onConflict: "place_id,service_date,kind" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listVenueReservations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        placeId: z.string().min(3),
        serviceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const start = new Date(`${data.serviceDate}T00:00:00.000Z`).toISOString();
    const end = new Date(`${data.serviceDate}T23:59:59.999Z`).toISOString();
    const { data: rows, error } = await context.supabase
      .from("reservations")
      .select("*")
      .eq("place_id", data.placeId)
      .gte("reserved_for", start)
      .lte("reserved_for", end)
      .order("reserved_for", { ascending: true });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const checkInReservation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        placeId: z.string().min(3),
        code: z.string().min(4).max(12).optional(),
        id: z.string().uuid().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    let query = context.supabase
      .from("reservations")
      .update({ status: "checked_in", checked_in_at: new Date().toISOString() })
      .eq("place_id", data.placeId)
      .neq("status", "cancelled");
    query = data.id
      ? query.eq("id", data.id)
      : query.eq("confirmation_code", (data.code ?? "").toUpperCase());
    const { data: rows, error } = await query.select("id, guest_name, party_size, kind");
    if (error) throw new Error(error.message);
    if (!rows || rows.length === 0) throw new Error("No matching reservation at this venue");
    return rows[0];
  });
