import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { cancelReservation, listMyReservations } from "@/lib/reservations.functions";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RESERVATION_KINDS } from "@/lib/nightlife";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/reservations")({
  head: () => ({
    meta: [
      { title: "My reservations — NOCTA Nightlife" },
      {
        name: "description",
        content:
          "Every booth, table and at-door entry you've reserved, with times, party sizes and venue details.",
      },
      { property: "og:title", content: "My reservations — NOCTA" },
      {
        property: "og:description",
        content: "Manage your booth, table and skip-the-line door reservations.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReservationsPage,
});

function ReservationsPage() {
  const fetchReservations = useServerFn(listMyReservations);
  const cancelFn = useServerFn(cancelReservation);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["reservations"],
    queryFn: () => fetchReservations(),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => cancelFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Reservation cancelled");
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
    },
    onError: () => toast.error("Could not cancel that reservation"),
  });

  const rows = data ?? [];

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-5 py-12">
        <p className="text-eyebrow">Your night</p>
        <h1 className="mt-2 text-4xl font-semibold">Reservations</h1>
        <div className="accent-rule mt-6 w-32" />

        {isLoading && <p className="mt-10 text-sm text-muted-foreground">Loading…</p>}

        {!isLoading && rows.length === 0 && (
          <div className="surface-panel mt-10 p-10 text-center">
            <h2 className="text-xl font-semibold">Nothing booked yet</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Find a club near you and lock in a booth, table or door entry.
            </p>
            <Button asChild className="mt-6">
              <Link to="/">Find nightlife</Link>
            </Button>
          </div>
        )}

        <ul className="mt-10 space-y-4">
          {rows.map((row) => {
            const kind = RESERVATION_KINDS.find((k) => k.id === row.kind);
            const when = new Date(row.reserved_for);
            const cancelled = row.status === "cancelled";
            return (
              <li
                key={row.id}
                className={`surface-panel flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between ${
                  cancelled ? "opacity-50" : ""
                }`}
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold">{row.venue_name}</h2>
                    <Badge variant="secondary">{kind?.label ?? row.kind}</Badge>
                    {cancelled && <Badge variant="outline">Cancelled</Badge>}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{row.venue_address}</p>
                  <p className="mt-2 text-sm">
                    {when.toLocaleDateString(undefined, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}{" "}
                    at{" "}
                    {when.toLocaleTimeString(undefined, {
                      hour: "numeric",
                      minute: "2-digit",
                    })}{" "}
                    · party of {row.party_size} · {row.guest_name}
                  </p>
                  {row.notes && (
                    <p className="mt-2 text-sm text-muted-foreground">“{row.notes}”</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button asChild variant="outline" size="sm">
                    <Link to="/venue/$placeId" params={{ placeId: row.place_id }}>
                      Venue
                    </Link>
                  </Button>
                  {!cancelled && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => cancelMutation.mutate(row.id)}
                      disabled={cancelMutation.isPending}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </main>
    </div>
  );
}
