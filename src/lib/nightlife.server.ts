import type { Venue, VenueDetail } from "./nightlife";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";

const LIST_FIELDS = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.location",
  "places.rating",
  "places.userRatingCount",
  "places.priceLevel",
  "places.primaryTypeDisplayName",
  "places.currentOpeningHours.openNow",
  "places.photos",
].join(",");

const DETAIL_FIELDS = [
  "id",
  "displayName",
  "formattedAddress",
  "location",
  "rating",
  "userRatingCount",
  "priceLevel",
  "primaryTypeDisplayName",
  "currentOpeningHours.openNow",
  "regularOpeningHours.weekdayDescriptions",
  "nationalPhoneNumber",
  "websiteUri",
  "editorialSummary",
  "googleMapsUri",
  "reservable",
  "liveMusic",
  "goodForGroups",
  "outdoorSeating",
  "servesCocktails",
  "photos",
  "reviews",
].join(",");

function headers(extra: Record<string, string> = {}) {
  const lovableKey = process.env['LOVABLE_API_KEY'];
  const mapsKey = process.env['GOOGLE_MAPS_API_KEY'];
  if (!lovableKey || !mapsKey) {
    throw new Error("Google Maps connector credentials are not configured");
  }
  return {
    Authorization: `Bearer ${lovableKey}`,
    "X-Connection-Api-Key": mapsKey,
    "Content-Type": "application/json",
    ...extra,
  };
}

async function readError(response: Response, label: string): Promise<never> {
  const body = await response.text();
  console.error(`${label} failed [${response.status}]: ${body}`);
  throw new Error(`${label} failed [${response.status}]: ${body}`);
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapVenue(place: any): Venue {
  return {
    id: place.id,
    name: place.displayName?.text ?? "Unnamed venue",
    address: place.formattedAddress ?? "",
    lat: place.location?.latitude ?? 0,
    lng: place.location?.longitude ?? 0,
    rating: place.rating ?? null,
    ratingCount: place.userRatingCount ?? null,
    priceLevel: place.priceLevel ?? null,
    category: place.primaryTypeDisplayName?.text ?? null,
    openNow: place.currentOpeningHours?.openNow ?? null,
    photoName: place.photos?.[0]?.name ?? null,
  };
}

export async function searchNearbyVenues(input: {
  lat: number;
  lng: number;
  radius: number;
  types: string[];
}): Promise<Venue[]> {
  const response = await fetch(`${GATEWAY_URL}/places/v1/places:searchNearby`, {
    method: "POST",
    headers: headers({ "X-Goog-FieldMask": LIST_FIELDS }),
    body: JSON.stringify({
      includedTypes: input.types,
      maxResultCount: 20,
      rankPreference: "DISTANCE",
      locationRestriction: {
        circle: {
          center: { latitude: input.lat, longitude: input.lng },
          radius: input.radius,
        },
      },
    }),
  });
  if (!response.ok) await readError(response, "Nearby nightlife search");
  const data = (await response.json()) as { places?: any[] };
  return (data.places ?? []).map(mapVenue);
}

export async function geocodeQuery(query: string): Promise<{ lat: number; lng: number; label: string } | null> {
  const response = await fetch(
    `${GATEWAY_URL}/maps/api/geocode/json?address=${encodeURIComponent(query)}`,
    { headers: headers() },
  );
  if (!response.ok) await readError(response, "Location lookup");
  const data = (await response.json()) as any;
  const first = data.results?.[0];
  if (!first) return null;
  return {
    lat: first.geometry.location.lat,
    lng: first.geometry.location.lng,
    label: first.formatted_address,
  };
}

export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  const response = await fetch(
    `${GATEWAY_URL}/maps/api/geocode/json?latlng=${lat},${lng}&result_type=locality|neighborhood`,
    { headers: headers() },
  );
  if (!response.ok) return null;
  const data = (await response.json()) as any;
  return data.results?.[0]?.formatted_address ?? null;
}

export async function fetchVenueDetail(placeId: string): Promise<VenueDetail> {
  const response = await fetch(`${GATEWAY_URL}/places/v1/places/${encodeURIComponent(placeId)}`, {
    headers: headers({ "X-Goog-FieldMask": DETAIL_FIELDS }),
  });
  if (!response.ok) await readError(response, "Venue lookup");
  const place = (await response.json()) as any;
  return {
    ...mapVenue(place),
    phone: place.nationalPhoneNumber ?? null,
    website: place.websiteUri ?? null,
    summary: place.editorialSummary?.text ?? null,
    mapsUri: place.googleMapsUri ?? null,
    reservable: place.reservable ?? null,
    liveMusic: place.liveMusic ?? null,
    goodForGroups: place.goodForGroups ?? null,
    outdoorSeating: place.outdoorSeating ?? null,
    servesCocktails: place.servesCocktails ?? null,
    weekdayHours: place.regularOpeningHours?.weekdayDescriptions ?? [],
    photoNames: (place.photos ?? []).slice(0, 6).map((p: any) => p.name),
    reviews: (place.reviews ?? []).slice(0, 4).map((r: any) => ({
      author: r.authorAttribution?.displayName ?? "Guest",
      text: r.text?.text ?? "",
      rating: r.rating ?? null,
    })),
  };
}
