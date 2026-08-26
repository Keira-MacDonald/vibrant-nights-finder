import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listNotifications, markNotificationsRead } from "@/lib/reservations.functions";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Bell } from "lucide-react";

export function NotificationBell() {
  const fetchNotifications = useServerFn(listNotifications);
  const markRead = useServerFn(markNotificationsRead);
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => fetchNotifications(),
    refetchInterval: 30_000,
  });

  const rows = data ?? [];
  const unread = rows.filter((row) => !row.read_at).length;

  return (
    <Popover
      onOpenChange={async (open) => {
        if (open && unread > 0) {
          await markRead();
          queryClient.invalidateQueries({ queryKey: ["notifications"] });
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative" aria-label="Notifications">
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
              {unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b border-border px-4 py-3">
          <p className="text-eyebrow">Notifications</p>
        </div>
        {rows.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">
            Booking confirmations and check-in updates land here.
          </p>
        ) : (
          <ul className="max-h-80 divide-y divide-border overflow-y-auto">
            {rows.map((row) => (
              <li key={row.id} className="px-4 py-3">
                <p className="text-sm font-medium">{row.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{row.body}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {new Date(row.created_at).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
