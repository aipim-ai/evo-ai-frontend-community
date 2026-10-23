import { useMemo, useState } from 'react';
import {
  Button,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@evoapi/design-system';
import { Check, ChevronRight, Pencil, Plus, Trash, X } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { HISTORY_KINDS } from '@/types/contacts';
import {
  KIND_ICONS,
  OPEN_DAYS,
  dayKey,
  daysAgo,
  formatDayLong,
  formatTime,
  type FeedEntry,
  type FeedKind,
} from './historyUtils';

type Filter = 'all' | FeedKind;

interface HistoryFeedProps {
  feed: FeedEntry[];
  freshId?: string | null;
  canLog: boolean;
  canDelete: boolean;
  onLogOnDay: (day: string) => void;
  onEdit: (noteId: string, content: string) => Promise<void>;
  onDelete: (noteId: string) => Promise<void>;
}

export default function HistoryFeed({
  feed,
  freshId,
  canLog,
  canDelete,
  onLogOnDay,
  onEdit,
  onDelete,
}: HistoryFeedProps) {
  const { t, currentLanguage } = useLanguage('contacts');
  const [filter, setFilter] = useState<Filter>('all');
  const [editing, setEditing] = useState<{ noteId: string; content: string } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const saveEdit = async () => {
    if (!editing || !editing.content.trim()) return;
    setBusyId(editing.noteId);
    try {
      await onEdit(editing.noteId, editing.content.trim());
      setEditing(null);
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (noteId: string) => {
    setBusyId(noteId);
    try {
      await onDelete(noteId);
    } finally {
      setBusyId(null);
    }
  };
  // Days the user opened or closed by hand; the rest follow OPEN_DAYS.
  const [toggled, setToggled] = useState<Record<string, boolean>>({});

  const today = dayKey(new Date());
  const { days, byDay } = useMemo(() => {
    const groups: Record<string, FeedEntry[]> = {};
    feed
      .filter(entry => filter === 'all' || entry.kind === filter)
      .forEach(entry => (groups[dayKey(entry.at)] ||= []).push(entry));
    const keys = Object.keys(groups).sort().reverse();
    if (filter === 'all' && !groups[today]) keys.unshift(today);
    return { days: keys, byDay: groups };
  }, [feed, filter, today]);

  const isRecent = (day: string) => daysAgo(day) < OPEN_DAYS;
  const isOpen = (day: string) => (day in toggled ? toggled[day] : isRecent(day));
  const older = days.filter(day => !isRecent(day));
  const anyOlderClosed = older.some(day => !isOpen(day));

  const setOlder = (open: boolean) =>
    setToggled(prev => ({ ...prev, ...Object.fromEntries(older.map(day => [day, open])) }));

  const dayTitle = (day: string) =>
    daysAgo(day) === 0
      ? t('history.feed.today')
      : daysAgo(day) === 1
        ? t('history.feed.yesterday')
        : formatDayLong(day, currentLanguage);

  return (
    <section aria-labelledby="history-feed-title" className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <h3 id="history-feed-title" className="text-sm font-semibold">
          {t('history.feed.title')}
        </h3>
        <Select value={filter} onValueChange={value => setFilter(value as Filter)}>
          <SelectTrigger className="h-8 w-auto min-w-[9rem]" aria-label={t('history.feed.filter')}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('history.feed.all')}</SelectItem>
            {[...HISTORY_KINDS, 'taskDone' as const].map(kind => (
              <SelectItem key={kind} value={kind}>
                {t(`history.types.${kind}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {days.length === 0 && (
        <p className="py-6 text-center text-sm text-muted-foreground">{t('history.feed.empty')}</p>
      )}

      {days.map(day => {
        const dayEntries = byDay[day] ?? [];
        const kinds = [...new Set(dayEntries.map(entry => entry.kind))];
        return (
          <div key={day}>
            {day === older[0] && (
              <div className="mb-1 mt-3 flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t('history.feed.earlier')}
                </h4>
                <Button variant="ghost" size="sm" onClick={() => setOlder(anyOlderClosed)}>
                  {anyOlderClosed ? t('history.feed.expandAll') : t('history.feed.collapseAll')}
                </Button>
              </div>
            )}
            <details
              open={isOpen(day)}
              onToggle={event => {
                const open = (event.currentTarget as HTMLDetailsElement).open;
                if (open !== isOpen(day)) setToggled(prev => ({ ...prev, [day]: open }));
              }}
              className="group rounded-xl border border-border"
            >
              <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 [&::-webkit-details-marker]:hidden">
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90" />
                <span className="text-sm font-medium">{dayTitle(day)}</span>
                {daysAgo(day) <= 1 && (
                  <span className="truncate text-xs text-muted-foreground">
                    {formatDayLong(day, currentLanguage)}
                  </span>
                )}
                <span className="flex-1" />
                {dayEntries.length > 0 && (
                  <span className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="flex gap-0.5" aria-hidden="true">
                      {kinds.map(kind => {
                        const Icon = KIND_ICONS[kind];
                        return <Icon key={kind} className="h-3 w-3" />;
                      })}
                    </span>
                    {t('history.feed.records', { count: dayEntries.length })}
                  </span>
                )}
              </summary>
              <div className="px-3 pb-3">
                {dayEntries.length === 0 ? (
                  <p className="py-2 text-sm text-muted-foreground">{t('history.feed.emptyToday')}</p>
                ) : (
                  <ol className="flex flex-col gap-3">
                    {dayEntries.map(entry => {
                      const Icon = KIND_ICONS[entry.kind];
                      const label = t(`history.types.${entry.kind}`);
                      const done = entry.kind === 'taskDone';
                      const time = formatTime(entry.at, currentLanguage);
                      return (
                        <li
                          key={entry.id}
                          className={`group/entry flex gap-3 rounded-lg ${entry.id === freshId ? 'bg-primary/5' : ''}`}
                        >
                          <span
                            className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                              done ? 'bg-emerald-500/15 text-emerald-600' : 'bg-muted text-muted-foreground'
                            }`}
                            title={label}
                            aria-label={label}
                          >
                            <Icon className="h-3.5 w-3.5" />
                          </span>
                          <div className="min-w-0 flex-1">
                            {editing && editing.noteId === entry.noteId ? (
                              <div className="flex flex-col gap-2">
                                <Textarea
                                  value={editing.content}
                                  onChange={event =>
                                    setEditing({ noteId: editing.noteId, content: event.target.value })
                                  }
                                  aria-label={t('history.actions.edit')}
                                  className="min-h-[60px]"
                                  autoFocus
                                />
                                <div className="flex gap-1">
                                  <Button
                                    size="sm"
                                    onClick={() => void saveEdit()}
                                    disabled={busyId === entry.noteId || !editing.content.trim()}
                                  >
                                    <Check className="mr-1 h-3.5 w-3.5" />
                                    {t('history.actions.save')}
                                  </Button>
                                  <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
                                    <X className="mr-1 h-3.5 w-3.5" />
                                    {t('history.actions.cancel')}
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <p className="whitespace-pre-wrap break-words text-sm">
                                {done ? t('history.entry.completed', { title: entry.text }) : entry.text}
                              </p>
                            )}
                            <div className="text-xs text-muted-foreground">
                              {entry.author
                                ? t('history.entry.meta', { author: entry.author, time })
                                : time}
                            </div>
                          </div>
                          {entry.noteId && editing?.noteId !== entry.noteId && (canLog || canDelete) && (
                            <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover/entry:opacity-100">
                              {canLog && (
                                <button
                                  type="button"
                                  className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                                  onClick={() => setEditing({ noteId: entry.noteId as string, content: entry.text })}
                                  aria-label={t('history.actions.edit')}
                                  title={t('history.actions.edit')}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                              )}
                              {canDelete && (
                                <button
                                  type="button"
                                  className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                                  onClick={() => void remove(entry.noteId as string)}
                                  disabled={busyId === entry.noteId}
                                  aria-label={t('history.actions.delete')}
                                  title={t('history.actions.delete')}
                                >
                                  <Trash className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ol>
                )}
                {canLog && day !== today && (
                  <Button variant="ghost" size="sm" className="mt-2" onClick={() => onLogOnDay(day)}>
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    {t('history.feed.logThisDay')}
                  </Button>
                )}
              </div>
            </details>
          </div>
        );
      })}
    </section>
  );
}
