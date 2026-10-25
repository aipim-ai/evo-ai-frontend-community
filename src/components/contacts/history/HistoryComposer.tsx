import { useState, type FormEvent, type KeyboardEvent, type RefObject } from 'react';
import { Button, Input, Textarea } from '@evoapi/design-system';
import { AlarmClock, CalendarDays } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { HISTORY_KINDS, type HistoryKind } from '@/types/contacts';
import type { PublishEntryInput } from '@/hooks/contacts/useContactHistory';
import {
  KIND_ICONS,
  dayKey,
  daysAgo,
  formatDayShort,
  parseDayKey,
  toLocalInput,
  tomorrowAt,
} from './historyUtils';

interface HistoryComposerProps {
  day: string;
  onDayChange: (day: string) => void;
  canFollowUp: boolean;
  onPublish: (input: PublishEntryInput) => Promise<void>;
  textareaRef?: RefObject<HTMLTextAreaElement | null>;
}

// An entry logged for a past day is placed at 18:00 of that day, so it sorts
// after anything that day already holds.
const PAST_DAY_HOUR = 18;

function occurredAt(day: string): Date {
  if (day === dayKey(new Date())) return new Date();
  const date = parseDayKey(day);
  date.setHours(PAST_DAY_HOUR, 0, 0, 0);
  return date;
}

export default function HistoryComposer({
  day,
  onDayChange,
  canFollowUp,
  onPublish,
  textareaRef,
}: HistoryComposerProps) {
  const { t, currentLanguage } = useLanguage('contacts');
  const [content, setContent] = useState('');
  const [kind, setKind] = useState<HistoryKind>('call');
  const [followUpOn, setFollowUpOn] = useState(false);
  const [followUpTitle, setFollowUpTitle] = useState('');
  const [followUpDue, setFollowUpDue] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const today = dayKey(new Date());
  const isPast = day !== today;
  const dayLabel =
    daysAgo(day) === 0
      ? t('history.feed.today')
      : daysAgo(day) === 1
        ? t('history.feed.yesterday')
        : formatDayShort(day, currentLanguage);
  const canSubmit = !!content.trim() && (!followUpOn || !!followUpTitle.trim()) && !submitting;

  const toggleFollowUp = () => {
    if (!followUpOn && !followUpDue) setFollowUpDue(toLocalInput(tomorrowAt(9)));
    setFollowUpOn(on => !on);
  };

  const handleSubmit = async (event?: FormEvent) => {
    event?.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await onPublish({
        content: content.trim(),
        kind,
        occurredAt: occurredAt(day),
        followUp: followUpOn
          ? {
              title: followUpTitle.trim(),
              due: followUpDue ? new Date(followUpDue) : tomorrowAt(9),
            }
          : undefined,
      });
      setContent('');
      setFollowUpTitle('');
      setFollowUpOn(false);
      onDayChange(today);
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') void handleSubmit();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-border p-3 focus-within:border-primary/60"
    >
      <Textarea
        ref={textareaRef}
        value={content}
        onChange={event => setContent(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={t('history.composer.placeholder')}
        aria-label={t('history.composer.placeholder')}
        className="min-h-[72px] resize-y border-0 p-1 shadow-none focus-visible:ring-0"
      />

      {followUpOn && (
        <div className="mt-2 flex flex-wrap gap-2 border-t border-border pt-2">
          <Input
            className="min-w-[12rem] flex-1"
            value={followUpTitle}
            onChange={event => setFollowUpTitle(event.target.value)}
            placeholder={t('history.followUp.titlePlaceholder')}
            aria-label={t('history.followUp.titlePlaceholder')}
            autoFocus
          />
          <Input
            type="datetime-local"
            className="w-auto"
            value={followUpDue}
            onChange={event => setFollowUpDue(event.target.value)}
            aria-label={t('history.followUp.due')}
          />
        </div>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-1">
        <div role="radiogroup" aria-label={t('history.composer.type')} className="flex gap-1">
          {HISTORY_KINDS.map(option => {
            const Icon = KIND_ICONS[option];
            const selected = option === kind;
            return (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={t(`history.types.${option}`)}
                title={t(`history.types.${option}`)}
                onClick={() => setKind(option)}
                className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
                  selected
                    ? 'bg-primary/15 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <Icon className="h-4 w-4" />
              </button>
            );
          })}
        </div>

        <span className="mx-1 h-5 w-px bg-border" aria-hidden="true" />

        <label className="relative flex h-8 cursor-pointer items-center gap-1.5 rounded-md px-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground">
          <CalendarDays className="h-4 w-4" />
          <span>{dayLabel}</span>
          <input
            type="date"
            value={day}
            max={today}
            onChange={event => onDayChange(event.target.value || today)}
            aria-label={t('history.composer.date')}
            className="absolute inset-0 cursor-pointer opacity-0"
          />
        </label>

        {canFollowUp && (
          <button
            type="button"
            aria-pressed={followUpOn}
            aria-label={t('history.followUp.toggle')}
            title={t('history.followUp.toggle')}
            onClick={toggleFollowUp}
            className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
              followUpOn
                ? 'bg-primary/15 text-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <AlarmClock className="h-4 w-4" />
          </button>
        )}

        <div className="flex-1" />
        <Button type="submit" size="sm" disabled={!canSubmit}>
          {isPast
            ? t('history.composer.publishOn', { date: formatDayShort(day, currentLanguage) })
            : t('history.composer.publish')}
        </Button>
      </div>
    </form>
  );
}
