import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  fetchVenueDetail,
  geocodeQuery,
  reverseGeocode,
  searchNearbyVenues,
} from "./nightlife.server";

export const searchVenues = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180),
        radius: z.number().min(200).max(50000).default(3000),
        types: z.array(z.string().max(40)).min(1).max(6).default(["night_club", "bar"]),
      })
      .parse(input),
  )
  .handler(async ({ data }) => searchNearbyVenues(data));

export const lookupLocation = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ query: z.string().min(2).max(120) }).parse(input),
  )
  .handler(async ({ data }) => geocodeQuery(data.query));

export const describeCoords = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ lat: z.number(), lng: z.number() }).parse(input),
  )
  .handler(async ({ data }) => reverseGeocode(data.lat, data.lng));

export const getVenue = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ placeId: z.string().min(3).max(300) }).parse(input),
  )
  .handler(async ({ data }) => fetchVenueDetail(data.placeId));
