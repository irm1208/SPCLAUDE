import { useState, useEffect } from "react";
import { Bell } from "lucide-react";

interface Notif { id: string; text: string; active: boolean; }

function useSiteAnnouncements() {
  const [notifications, setNotifications] = useState<Notif[]>([]);

  useEffect(() => {
    fetch("/api/public/notifications")
      .then(r => r.json())
      .then(d => setNotifications(Array.isArray(d) ? d.filter((n: Notif) => n.active) : []))
      .catch(() => {});
  }, []);

  return { notifications };
}

export function SiteAnnouncements() {
  const { notifications } = useSiteAnnouncements();

  if (notifications.length === 0) return null;

  return (
    <div className="w-full flex flex-col gap-2 px-4 pt-4">
      {notifications.map(n => (
        <div
          key={n.id}
          className="rounded-xl px-4 py-3 flex items-start gap-2.5"
          style={{ background: "rgba(220,38,38,0.07)", border: "1px solid rgba(220,38,38,0.18)" }}
        >
          <Bell className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "#DC2626" }} />
          <p className="text-[13px] leading-snug font-medium" style={{ color: "#52525B" }}>{n.text}</p>
        </div>
      ))}
    </div>
  );
}
