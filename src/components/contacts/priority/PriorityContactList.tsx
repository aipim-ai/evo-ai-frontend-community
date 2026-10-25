import { Fragment, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@evoapi/design-system';
import {
  AlarmClock,
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  Clock,
  MessageSquare,
  type LucideIcon,
} from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { useDebounce } from '@/hooks/useDebounce';
import { usePriorityContacts } from '@/hooks/contacts/usePriorityContacts';
import ContactAvatar from '@/components/chat/contact/ContactAvatar';
import {
  PRIORITY_GROUPS,
  type PriorityContact,
  type PriorityGroup,
  type PriorityReason,
  type PrioritySort,
} from '@/types/contacts';
import { formatDue, formatTime, relativeTime } from '@/components/contacts/history/historyUtils';

const SORTS: PrioritySort[] = ['priority', 'recent', 'name'];
// "ok" has no chip: it is what is left once the urgent groups are handled.
const FILTER_GROUPS = PRIORITY_GROUPS.filter(group => group !== 'ok');

const GROUP_DOT: Record<PriorityGroup, string> = {
  overdue: 'bg-red-500',
  today: 'bg-amber-500',
  cooling: 'bg-sky-500',
  ok: 'bg-emerald-500',
};

const REASON_STYLE: Record<PriorityReason, { icon: LucideIcon; className: string }> = {
  overdue: { icon: AlarmClock, className: 'text-red-600 dark:text-red-400' },
  awaiting: { icon: MessageSquare, className: 'text-amber-700 dark:text-amber-400' },
  due_today: { icon: CalendarClock, className: 'text-amber-700 dark:text-amber-400' },
  cooling: { icon: Clock, className: 'text-sky-700 dark:text-sky-400' },
  next: { icon: CalendarClock, className: 'text-muted-foreground' },
  none: { icon: CheckCircle2, className: 'text-muted-foreground' },
};

interface PriorityContactListProps {
  search: string;
  onTotalChange?: (total: number) => void;
}

export default function PriorityContactList({ search, onTotalChange }: PriorityContactListProps) {
  const { t, currentLanguage } = useLanguage('contacts');
  const navigate = useNavigate();
  const [group, setGroup] = useState<PriorityGroup | 'all'>('all');
  const [sort, setSort] = useState<PrioritySort>('priority');
  const debouncedSearch = useDebounce(search, 300);
  const { contacts, counts, hasMore, loading, loadingMore, error, reload, loadMore } =
    usePriorityContacts({ search: debouncedSearch, group, sort });

  useEffect(() => {
    onTotalChange?.(counts.all);
  }, [counts.all, onTotalChange]);

  const reasonText = (contact: PriorityContact): string => {
    const { priority } = contact;
    const due = priority.task?.due_date ? new Date(priority.task.due_date) : null;
    switch (priority.reason) {
      case 'overdue':
        return t('priority.reasons.overdue', {
          task: priority.task?.title,
          ago: due ? relativeTime(due, currentLanguage) : '',
        });
      case 'awaiting':
        return t('priority.reasons.awaiting', {
          ago: relativeTime(new Date(priority.awaiting_since as string), currentLanguage),
        });
      case 'due_today':
        return t('priority.reasons.dueToday', {
          task: priority.task?.title,
          time: due ? formatTime(due, currentLanguage) : '',
        });
      case 'cooling':
        return priority.last_contact_at
          ? t('priority.reasons.cooling', {
              ago: relativeTime(new Date(priority.last_contact_at), currentLanguage),
            })
          : t('priority.reasons.coolingNever');
      case 'next':
        return t('priority.reasons.next', {
          task: priority.task?.title,
          date: due ? formatDue(due, currentLanguage) : '',
        });
      default:
        return t('priority.reasons.none');
    }
  };

  const openContact = (contact: PriorityContact) =>
    navigate(`/contacts/${contact.id}?tab=history`);

  return (
    <div className="flex h-full flex-col gap-3" data-testid="priority-contact-list">
      <p className="text-sm text-muted-foreground">{t('priority.how')}</p>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-2" role="group" aria-label={t('priority.filters.label')}>
          {(['all', ...FILTER_GROUPS] as const).map(option => (
            <button
              key={option}
              type="button"
              aria-pressed={group === option}
              onClick={() => setGroup(option)}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors ${
                group === option
                  ? 'border-primary bg-primary/10 text-foreground'
                  : 'border-border text-muted-foreground hover:bg-muted'
              }`}
            >
              {option !== 'all' && (
                <span className={`h-2 w-2 rounded-full ${GROUP_DOT[option]}`} aria-hidden="true" />
              )}
              {option === 'all' ? t('priority.filters.all') : t(`priority.groups.${option}`)}
              <span className="text-xs text-muted-foreground">{counts[option]}</span>
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <Select value={sort} onValueChange={value => setSort(value as PrioritySort)}>
          <SelectTrigger className="h-8 w-auto min-w-[10rem]" aria-label={t('priority.sort.label')}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORTS.map(option => (
              <SelectItem key={option} value={option}>
                {t(`priority.sort.${option}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 overflow-auto">
        {loading ? (
          <div role="status" className="py-16 text-center text-sm text-muted-foreground">
            {t('loading.contacts')}
          </div>
        ) : error ? (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <p className="flex-1">{t('priority.loadError')}</p>
            <Button size="sm" variant="outline" onClick={() => void reload()}>
              {t('history.actions.retry')}
            </Button>
          </div>
        ) : contacts.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">{t('priority.empty')}</p>
        ) : (
          <div className="flex flex-col">
            <div
              className="hidden grid-cols-[minmax(0,1.3fr)_minmax(0,2fr)_8rem_10rem] gap-4 px-3 pb-2 text-xs font-medium text-muted-foreground md:grid"
              aria-hidden="true"
            >
              <span>{t('priority.columns.contact')}</span>
              <span>{t('priority.columns.why')}</span>
              <span>{t('priority.sort.recent')}</span>
              <span>{t('priority.columns.stage')}</span>
            </div>
            {contacts.map((contact, index) => {
              const previous = contacts[index - 1];
              const showGroup =
                sort === 'priority' &&
                (!previous || previous.priority.group !== contact.priority.group);
              const reason = REASON_STYLE[contact.priority.reason];
              const ReasonIcon = reason.icon;
              const company = contact.additional_attributes?.company_name as string | undefined;
              const lastContact = contact.priority.last_contact_at;
              return (
                <Fragment key={contact.id}>
                  {showGroup && (
                    <div className="mt-3 flex items-center gap-2 px-3 pb-1 first:mt-0">
                      <span
                        className={`h-2 w-2 rounded-full ${GROUP_DOT[contact.priority.group]}`}
                        aria-hidden="true"
                      />
                      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {t(`priority.groups.${contact.priority.group}`)}
                      </h2>
                      <span className="text-xs text-muted-foreground">
                        {counts[contact.priority.group]}
                      </span>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => openContact(contact)}
                    className="flex flex-col gap-1 rounded-lg border-b border-border px-3 py-2.5 text-left transition-colors hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none md:grid md:grid-cols-[minmax(0,1.3fr)_minmax(0,2fr)_8rem_10rem] md:items-center md:gap-4"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <ContactAvatar contact={contact} size="sm" showColoredFallback />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">
                          {contact.name || t('table.noName')}
                        </span>
                        {company && (
                          <span className="block truncate text-xs text-muted-foreground">{company}</span>
                        )}
                      </span>
                    </span>
                    <span
                      className={`flex min-w-0 items-center gap-1.5 pl-11 text-sm md:pl-0 ${reason.className}`}
                    >
                      <ReasonIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
                      <span className="truncate">{reasonText(contact)}</span>
                    </span>
                    <span className="hidden text-xs text-muted-foreground md:block">
                      {lastContact ? relativeTime(new Date(lastContact), currentLanguage) : '—'}
                    </span>
                    <span className="pl-11 md:pl-0">
                      {contact.priority.stage ? (
                        <span
                          className="inline-flex max-w-full items-center gap-1.5 truncate rounded-full border border-border px-2 py-0.5 text-xs"
                          title={contact.priority.stage.pipeline_name}
                        >
                          <span
                            className="h-1.5 w-1.5 shrink-0 rounded-full"
                            style={{ backgroundColor: contact.priority.stage.color }}
                            aria-hidden="true"
                          />
                          <span className="truncate">{contact.priority.stage.name}</span>
                        </span>
                      ) : (
                        <span className="hidden text-xs text-muted-foreground md:inline">—</span>
                      )}
                    </span>
                  </button>
                </Fragment>
              );
            })}
            {hasMore && (
              <div className="flex justify-center py-3">
                <Button variant="outline" size="sm" onClick={() => void loadMore()} disabled={loadingMore}>
                  {t('priority.loadMore')}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
