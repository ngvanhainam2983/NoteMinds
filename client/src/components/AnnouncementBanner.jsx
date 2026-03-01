import { useState, useEffect } from 'react';
import { Megaphone, X, Info, AlertTriangle, Bell, ChevronRight } from 'lucide-react';
import { getAnnouncements, markAnnouncementRead } from '../api';

const TYPE_STYLES = {
  info: { bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-400', icon: Info },
  warning: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400', icon: AlertTriangle },
  update: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400', icon: Bell },
  important: { bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-400', icon: Megaphone },
};

export default function AnnouncementBanner({ user }) {
  const [announcements, setAnnouncements] = useState([]);
  const [dismissedIds, setDismissedIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('dismissed_announcements') || '[]');
    } catch { return []; }
  });

  useEffect(() => {
    if (!user) return;
    fetchAnnouncements();
    const interval = setInterval(fetchAnnouncements, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, [user]);

  const fetchAnnouncements = async () => {
    try {
      const data = await getAnnouncements();
      setAnnouncements(data || []);
    } catch { /* ignore */ }
  };

  const handleDismiss = async (id) => {
    const newDismissed = [...dismissedIds, id];
    setDismissedIds(newDismissed);
    localStorage.setItem('dismissed_announcements', JSON.stringify(newDismissed));
    try {
      await markAnnouncementRead(id);
    } catch { /* ignore */ }
  };

  const visibleAnnouncements = announcements.filter(a => !dismissedIds.includes(a.id));

  if (visibleAnnouncements.length === 0) return null;

  return (
    <div className="space-y-2 mb-2">
      {visibleAnnouncements.slice(0, 2).map(announcement => {
        const style = TYPE_STYLES[announcement.type] || TYPE_STYLES.info;
        const Icon = style.icon;
        return (
          <div
            key={announcement.id}
            className={`${style.bg} border ${style.border} rounded-xl px-4 py-3 flex items-start gap-3 animate-fade-in`}
          >
            <Icon size={16} className={`${style.text} mt-0.5 shrink-0`} />
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold ${style.text}`}>{announcement.title}</p>
              {announcement.content && (
                <p className="text-xs text-muted mt-0.5 line-clamp-2">{announcement.content}</p>
              )}
            </div>
            <button
              onClick={() => handleDismiss(announcement.id)}
              className="p-1 rounded-lg hover:bg-surface-2 text-muted hover:text-txt transition-colors shrink-0"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
