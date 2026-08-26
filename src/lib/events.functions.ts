import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

function publicClient() {
  const key = process.env['SUPABASE_PUBLISHABLE_KEY'] ?? process.env['SUPABASE_ANON_KEY']!;
  return createClient<Database>(process.env['SUPABASE_URL']!, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
          h.delete("Authorization");
        }
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

export const listVenueEvents = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ placeId: z.string().min(3).max(300) }).parse(input),
  )
  .handler(async ({ data }) => {
    const { data: rows, error } = await publicClient()
      .from("venue_events")
      .select("id, title, description, lineup, starts_at, ends_at, cover_charge, venue_name")
      .eq("place_id", data.placeId)
      .eq("is_published", true)
      .gte("starts_at", new Date(Date.now() - 6 * 3600_000).toISOString())
      .order("starts_at", { ascending: true })
      .limit(20);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getAvailability = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        placeId: z.string().min(3).max(300),
        serviceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { data: rows, error } = await publicClient().rpc("venue_availability_status", {
      _place_id: data.placeId,
      _service_date: data.serviceDate,
    });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });
