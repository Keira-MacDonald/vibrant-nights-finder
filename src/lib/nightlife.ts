export type Venue = {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  rating: number | null;
  ratingCount: number | null;
  priceLevel: string | null;
  category: string | null;
  openNow: boolean | null;
  photoName: string | null;
  distanceKm?: number;
};

export type VenueDetail = Venue & {
  phone: string | null;
  website: string | null;
  summary: string | null;
  mapsUri: string | null;
  reservable: boolean | null;
  liveMusic: boolean | null;
  goodForGroups: boolean | null;
  outdoorSeating: boolean | null;
  servesCocktails: boolean | null;
  weekdayHours: string[];
  photoNames: string[];
  reviews: { author: string; text: string; rating: number | null }[];
};

export const VENUE_VIBES = [
  { id: "night_club", label: "Clubs" },
  { id: "bar", label: "Bars" },
  { id: "wine_bar", label: "Wine bars" },
  { id: "pub", label: "Pubs" },
  { id: "karaoke", label: "Karaoke" },
  { id: "comedy_club", label: "Comedy" },
] as const;

export const RESERVATION_KINDS = [
  {
    id: "booth",
    label: "VIP Booth",
    blurb: "Private booth, bottle service, dedicated host",
  },
  {
    id: "table",
    label: "Table",
    blurb: "Seated table for your group, held 30 minutes",
  },
  {
    id: "door",
    label: "At-door entry",
    blurb: "Skip the line — walk up to the guest-list door",
  },
] as const;

export type ReservationKind = (typeof RESERVATION_KINDS)[number]["id"];

export function photoUrl(photoName: string | null, maxWidthPx = 800): string | null {
  if (!photoName) return null;
  const key = import.meta.env['VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY'];
  if (!key) return null;
  return `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=${maxWidthPx}&key=${key}`;
}

export function priceLabel(priceLevel: string | null): string | null {
  switch (priceLevel) {
    case "PRICE_LEVEL_INEXPENSIVE":
      return "$";
    case "PRICE_LEVEL_MODERATE":
      return "$$";
    case "PRICE_LEVEL_EXPENSIVE":
      return "$$$";
    case "PRICE_LEVEL_VERY_EXPENSIVE":
      return "$$$$";
    default:
      return null;
  }
}

export function distanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
