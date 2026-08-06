import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { describeCoords, lookupLocation, searchVenues } from "@/lib/nightlife.functions";
import {
  VENUE_VIBES,
  distanceKm,
  photoUrl,
  priceLabel,
  type Venue,
} from "@/lib/nightlife";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NOCTA — Nightlife near you, booths and door reservations" },
      {
        name: "description",
        content:
          "Track your location to find clubs, bars and nightlife events nearby — then reserve a booth, a table or skip-the-line door entry in seconds.",
      },
      { property: "og:title", content: "NOCTA — Nightlife near you" },
      {
        property: "og:description",
        content:
          "Find clubs and bars around you and reserve booths, tables or at-door entry instead of waiting in line.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Discover,
});

type Coords = { lat: number; lng: number };

function Discover() {
  const search = useServerFn(searchVenues);
  const geocode = useServerFn(lookupLocation);
  const describe = useServerFn(describeCoords);

  const [coords, setCoords] = useState<Coords | null>(null);
  const [placeLabel, setPlaceLabel] = useState<string>("");
  const [locating, setLocating] = useState(false);
  const [manual, setManual] = useState("");
  const [radius, setRadius] = useState(3000);
  const [types, setTypes] = useState<string[]>(["night_club", "bar"]);

  useEffect(() => {
    locate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function locate() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      toast.error("Location tracking isn't available in this browser");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCoords(next);
        setLocating(false);
        const label = await describe({ data: next });
        setPlaceLabel(label ?? "Your current location");
      },
      () => {
        setLocating(false);
        toast.error("Location blocked — search a city or address instead");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  async function searchManual(event: React.FormEvent) {
    event.preventDefault();
    if (manual.trim().length < 2) return;
    const found = await geocode({ data: { query: manual.trim() } });
    if (!found) {
      toast.error("Couldn't find that place");
      return;
    }
    setCoords({ lat: found.lat, lng: found.lng });
    setPlaceLabel(found.label);
  }

  const { data: venues, isFetching } = useQuery({
    queryKey: ["venues", coords?.lat, coords?.lng, radius, types.join(",")],
    enabled: !!coords,
    queryFn: () =>
      search({ data: { lat: coords!.lat, lng: coords!.lng, radius, types } }),
  });

  const list: Venue[] = (venues ?? []).map((v) => ({
    ...v,
    distanceKm: coords ? distanceKm(coords, { lat: v.lat, lng: v.lng }) : undefined,
  }));

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <section className="border-b border-border">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <p className="text-eyebrow">Live nightlife radar</p>
          <h1 className="mt-3 max-w-3xl text-5xl leading-[1.05] font-semibold sm:text-6xl">
            Find tonight&apos;s room.
            <span className="block text-primary">Skip tonight&apos;s line.</span>
          </h1>
          <p className="mt-5 max-w-xl text-muted-foreground">
            NOCTA tracks where you are, surfaces the clubs and bars actually open around
            you, and lets you lock a booth, a table or at-door entry before you leave the
            house.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button onClick={locate} disabled={locating}>
              {locating ? "Finding you…" : "Use my location"}
            </Button>
            <form onSubmit={searchManual} className="flex flex-1 gap-2">
              <Input
                value={manual}
                onChange={(e) => setManual(e.target.value)}
                placeholder="or search a city, address or neighbourhood"
              />
              <Button type="submit" variant="outline">
                Search
              </Button>
            </form>
          </div>

          {placeLabel && (
            <p className="mt-4 text-sm text-muted-foreground">
              Showing nightlife near <span className="text-foreground">{placeLabel}</span>
            </p>
          )}
        </div>
      </section>

      <section className="border-b border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-5 py-4">
          {VENUE_VIBES.map((vibe) => {
            const active = types.includes(vibe.id);
            return (
              <button
                key={vibe.id}
                type="button"
                onClick={() =>
                  setTypes((prev) => {
                    const next = active
                      ? prev.filter((t) => t !== vibe.id)
                      : [...prev, vibe.id];
                    return next.length ? next : prev;
                  })
                }
                className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {vibe.label}
              </button>
            );
          })}
          <div className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
            <span>Within</span>
            {[1000, 3000, 8000].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRadius(r)}
                className={`rounded-full border px-3 py-1 transition-colors ${
                  radius === r
                    ? "border-primary text-primary"
                    : "border-border hover:text-foreground"
                }`}
              >
                {r / 1000} km
              </button>
            ))}
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-5 py-12">
        {!coords && !locating && (
          <div className="surface-panel p-10 text-center">
            <h2 className="text-xl font-semibold">Turn on location to start</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Allow location access, or search a city above.
            </p>
          </div>
        )}

        {isFetching && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-72 w-full rounded-xl" />
            ))}
          </div>
        )}

        {!isFetching && coords && list.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No venues matched those filters. Widen the radius or pick more vibes.
          </p>
        )}

        {!isFetching && list.length > 0 && (
          <>
            <div className="mb-6 flex items-baseline justify-between">
              <h2 className="text-2xl font-semibold">{list.length} spots near you</h2>
              <p className="text-eyebrow">Sorted by distance</p>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((venue) => (
                <VenueCard key={venue.id} venue={venue} />
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function VenueCard({ venue }: { venue: Venue }) {
  const image = photoUrl(venue.photoName, 640);
  const price = priceLabel(venue.priceLevel);
  return (
    <Link
      to="/venue/$placeId"
      params={{ placeId: venue.id }}
      className="surface-panel group overflow-hidden transition-colors hover:border-primary"
    >
      <div className="aspect-[4/3] w-full overflow-hidden bg-muted">
        {image ? (
          <img
            src={image}
            alt={`${venue.name} interior`}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-eyebrow">
            No photo
          </div>
        )}
      </div>
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg leading-tight font-semibold">{venue.name}</h3>
          {venue.openNow !== null && (
            <Badge variant={venue.openNow ? "default" : "secondary"}>
              {venue.openNow ? "Open now" : "Closed"}
            </Badge>
          )}
        </div>
        <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{venue.address}</p>
        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          {venue.category && <span>{venue.category}</span>}
          {venue.rating && (
            <span className="text-primary">
              ★ {venue.rating.toFixed(1)}
              {venue.ratingCount ? ` (${venue.ratingCount})` : ""}
            </span>
          )}
          {price && <span>{price}</span>}
          {venue.distanceKm !== undefined && (
            <span>{venue.distanceKm.toFixed(1)} km</span>
          )}
        </div>
      </div>
    </Link>
  );
}
