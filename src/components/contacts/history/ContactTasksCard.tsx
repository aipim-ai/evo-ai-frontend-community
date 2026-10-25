import { useState, type FormEvent } from 'react';
import { Button, Input } from '@evoapi/design-system';
import { Check, Plus } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import type { ContactTask } from '@/types/contacts';
import { formatDue, toLocalInput, tomorrowAt } from './historyUtils';

interface ContactTasksCardProps {
  tasks: ContactTask[];
  canCreate: boolean;
  canEdit: boolean;
  onCreate: (title: string, due: Date) => Promise<void>;
  onComplete: (task: ContactTask) => Promise<void>;
}

const isLate = (task: ContactTask, now: Date) =>
  task.status === 'overdue' || (!!task.due_date && new Date(task.due_date) < now);

export default function ContactTasksCard({
  tasks,
  canCreate,
  canEdit,
  onCreate,
  onComplete,
}: ContactTasksCardProps) {
  const { t, currentLanguage } = useLanguage('contacts');
  const [formOpen, setFormOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [due, setDue] = useState('');
  const [saving, setSaving] = useState(false);
  const [completingId, setCompletingId] = useState<string | null>(null);

  const now = new Date();
  const lateCount = tasks.filter(task => isLate(task, now)).length;

  const openForm = () => {
    setDue(toLocalInput(tomorrowAt(9)));
    setFormOpen(true);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      await onCreate(title.trim(), due ? new Date(due) : tomorrowAt(9));
      setTitle('');
      setFormOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async (task: ContactTask) => {
    setCompletingId(task.id);
    try {
      await onComplete(task);
    } finally {
      setCompletingId(null);
    }
  };

  return (
    <section className="rounded-xl border border-border p-4" aria-labelledby="contact-tasks-title">
      <div className="flex items-center gap-2">
        <h3 id="contact-tasks-title" className="text-sm font-semibold">
          {t('history.tasks.title')}
        </h3>
        {tasks.length > 0 && (
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              lateCount > 0
                ? 'bg-destructive/15 text-destructive'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            {tasks.length}
          </span>
        )}
        <div className="flex-1" />
        {canEdit && canCreate && !formOpen && (
          <Button variant="ghost" size="sm" onClick={openForm}>
            <Plus className="mr-1 h-4 w-4" />
            {t('history.tasks.new')}
          </Button>
        )}
      </div>

      {formOpen && (
        <form onSubmit={handleSubmit} className="mt-3 flex flex-wrap items-center gap-2">
          <Input
            className="min-w-[12rem] flex-1"
            value={title}
            onChange={event => setTitle(event.target.value)}
            placeholder={t('history.tasks.titlePlaceholder')}
            aria-label={t('history.tasks.titlePlaceholder')}
            autoFocus
            required
          />
          <Input
            type="datetime-local"
            className="w-auto"
            value={due}
            onChange={event => setDue(event.target.value)}
            aria-label={t('history.followUp.due')}
          />
          <div className="flex gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setFormOpen(false)}>
              {t('history.actions.cancel')}
            </Button>
            <Button type="submit" size="sm" disabled={saving || !title.trim()}>
              {t('history.tasks.schedule')}
            </Button>
          </div>
        </form>
      )}

      {!canCreate && canEdit && (
        <p className="mt-2 text-xs text-muted-foreground">{t('history.tasks.needsDeal')}</p>
      )}

      {tasks.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">{t('history.tasks.empty')}</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-1">
          {tasks.map(task => {
            const late = isLate(task, now);
            const dueText = task.due_date ? formatDue(new Date(task.due_date), currentLanguage) : '';
            return (
              <li key={task.id} className="flex items-start gap-3 rounded-lg px-1 py-1.5">
                <button
                  type="button"
                  className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border text-transparent transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
                  onClick={() => handleComplete(task)}
                  disabled={!canEdit || completingId === task.id}
                  aria-label={t('history.tasks.complete', { title: task.title })}
                  title={t('history.tasks.complete', { title: task.title })}
                >
                  <Check className="h-3 w-3" />
                </button>
                <div className="min-w-0">
                  <div className="text-sm">{task.title}</div>
                  <div className={`text-xs ${late ? 'text-destructive' : 'text-muted-foreground'}`}>
                    {late && dueText ? t('history.tasks.overdue', { date: dueText }) : dueText}
                    {task.stage?.name && (
                      <span className="text-muted-foreground"> · {task.stage.name}</span>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
