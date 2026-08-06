import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getVenue } from "@/lib/nightlife.functions";
import { createReservation } from "@/lib/reservations.functions";
import { RESERVATION_KINDS, photoUrl, priceLabel, type ReservationKind } from "@/lib/nightlife";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export const Route = createFileRoute("/venue/$placeId")({
  head: () => ({
    meta: [
      { title: "Venue details & reservations — NOCTA Nightlife" },
      {
        name: "description",
        content:
          "Hours, vibe, reviews and photos for this club — plus booth, table and at-door reservation booking.",
      },
      { property: "og:title", content: "Venue details & reservations — NOCTA" },
      {
        property: "og:description",
        content: "See the full picture on this club and reserve a booth, table or door entry.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: VenuePage,
});

function defaultDateTime() {
  const d = new Date();
  d.setDate(d.getDate() + (d.getHours() >= 22 ? 1 : 0));
  d.setHours(22, 30, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function VenuePage() {
  const { placeId } = Route.useParams();
  const navigate = useNavigate();
  const fetchVenue = useServerFn(getVenue);
  const book = useServerFn(createReservation);

  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [kind, setKind] = useState<ReservationKind>("booth");
  const [partySize, setPartySize] = useState(4);
  const [reservedFor, setReservedFor] = useState(defaultDateTime);
  const [guestName, setGuestName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) =>
      setSignedIn(!!session),
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  const { data: venue, isLoading } = useQuery({
    queryKey: ["venue", placeId],
    queryFn: () => fetchVenue({ data: { placeId } }),
  });

  const mutation = useMutation({
    mutationFn: () =>
      book({
        data: {
          placeId,
          venueName: venue?.name ?? "Venue",
          venueAddress: venue?.address ?? "",
          kind,
          partySize,
          reservedFor,
          guestName,
          phone,
          notes,
        },
      }),
    onSuccess: () => {
      toast.success("Reservation confirmed — see you at the door");
      navigate({ to: "/reservations" });
    },
    onError: () => toast.error("Couldn't complete that reservation"),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <div className="mx-auto max-w-5xl px-5 py-12">
          <Skeleton className="h-80 w-full rounded-xl" />
          <Skeleton className="mt-6 h-10 w-1/2" />
        </div>
      </div>
    );
  }

  if (!venue) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <div className="mx-auto max-w-xl px-5 py-24 text-center">
          <h1 className="text-2xl font-semibold">Venue not found</h1>
          <Button asChild className="mt-6">
            <Link to="/">Back to discovery</Link>
          </Button>
        </div>
      </div>
    );
  }

  const hero = photoUrl(venue.photoNames[0] ?? venue.photoName, 1200);
  const gallery = venue.photoNames.slice(1, 5);
  const price = priceLabel(venue.priceLevel);

  const tags = [
    venue.liveMusic && "Live music",
    venue.goodForGroups && "Good for groups",
    venue.outdoorSeating && "Outdoor seating",
    venue.servesCocktails && "Cocktails",
    venue.reservable && "Takes reservations",
  ].filter(Boolean) as string[];

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <div className="mx-auto max-w-6xl px-5 py-10">
        <Link to="/" className="text-eyebrow hover:text-foreground">
          ← Back to nearby
        </Link>

        <div className="mt-6 overflow-hidden rounded-xl border border-border bg-muted">
          {hero ? (
            <img
              src={hero}
              alt={`${venue.name} venue`}
              className="h-[380px] w-full object-cover"
            />
          ) : (
            <div className="flex h-[240px] items-center justify-center text-eyebrow">
              No photo available
            </div>
          )}
        </div>

        <div className="mt-8 grid gap-10 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-4xl font-semibold">{venue.name}</h1>
              {venue.openNow !== null && (
                <Badge variant={venue.openNow ? "default" : "secondary"}>
                  {venue.openNow ? "Open now" : "Closed"}
                </Badge>
              )}
            </div>
            <p className="mt-2 text-muted-foreground">{venue.address}</p>
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {venue.category && <span>{venue.category}</span>}
              {venue.rating && (
                <span className="text-primary">
                  ★ {venue.rating.toFixed(1)}
                  {venue.ratingCount ? ` · ${venue.ratingCount} reviews` : ""}
                </span>
              )}
              {price && <span>{price}</span>}
              {venue.phone && <span>{venue.phone}</span>}
            </div>

            {venue.summary && <p className="mt-6 leading-relaxed">{venue.summary}</p>}

            {tags.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            {venue.weekdayHours.length > 0 && (
              <section className="mt-10">
                <h2 className="text-eyebrow">Opening hours</h2>
                <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                  {venue.weekdayHours.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </section>
            )}

            {gallery.length > 0 && (
              <section className="mt-10">
                <h2 className="text-eyebrow">Inside</h2>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {gallery.map((name) => {
                    const url = photoUrl(name, 400);
                    return url ? (
                      <img
                        key={name}
                        src={url}
                        alt={`${venue.name} atmosphere`}
                        loading="lazy"
                        className="aspect-square w-full rounded-lg object-cover"
                      />
                    ) : null;
                  })}
                </div>
              </section>
            )}

            {venue.reviews.length > 0 && (
              <section className="mt-10">
                <h2 className="text-eyebrow">What people say</h2>
                <ul className="mt-3 space-y-4">
                  {venue.reviews.map((review, i) => (
                    <li key={i} className="surface-panel p-5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{review.author}</span>
                        {review.rating && (
                          <span className="text-primary">★ {review.rating}</span>
                        )}
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">{review.text}</p>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {(venue.website || venue.mapsUri) && (
              <div className="mt-10 flex gap-3">
                {venue.website && (
                  <Button asChild variant="outline">
                    <a href={venue.website} target="_blank" rel="noreferrer">
                      Website
                    </a>
                  </Button>
                )}
                {venue.mapsUri && (
                  <Button asChild variant="ghost">
                    <a href={venue.mapsUri} target="_blank" rel="noreferrer">
                      Directions
                    </a>
                  </Button>
                )}
              </div>
            )}
          </div>

          <aside className="lg:sticky lg:top-6 lg:self-start">
            <div className="surface-panel p-6">
              <p className="text-eyebrow">Reserve instead of queuing</p>
              <h2 className="mt-2 text-2xl font-semibold">Book your spot</h2>

              <div className="mt-5 space-y-2">
                {RESERVATION_KINDS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setKind(option.id)}
                    className={`w-full rounded-lg border p-3 text-left transition-colors ${
                      kind === option.id
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-muted-foreground"
                    }`}
                  >
                    <span className="block text-sm font-medium">{option.label}</span>
                    <span className="block text-xs text-muted-foreground">
                      {option.blurb}
                    </span>
                  </button>
                ))}
              </div>

              <form
                className="mt-6 space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!signedIn) {
                    navigate({ to: "/auth" });
                    return;
                  }
                  mutation.mutate();
                }}
              >
                <div className="space-y-2">
                  <Label htmlFor="when">Date & time</Label>
                  <Input
                    id="when"
                    type="datetime-local"
                    required
                    value={reservedFor}
                    onChange={(e) => setReservedFor(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="party">Party size</Label>
                  <Input
                    id="party"
                    type="number"
                    min={1}
                    max={40}
                    required
                    value={partySize}
                    onChange={(e) => setPartySize(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Name on the list</Label>
                  <Input
                    id="name"
                    required
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="Alex Rivera"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone (optional)</Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 555 010 4477"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Requests (optional)</Label>
                  <Textarea
                    id="notes"
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Birthday, bottle preference, arrival time…"
                  />
                </div>

                <Button type="submit" className="w-full" disabled={mutation.isPending}>
                  {signedIn === false
                    ? "Sign in to reserve"
                    : mutation.isPending
                      ? "Confirming…"
                      : "Confirm reservation"}
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  Free to hold. Cancel any time from your reservations.
                </p>
              </form>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
