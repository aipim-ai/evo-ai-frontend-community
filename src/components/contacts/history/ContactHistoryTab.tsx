import { useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@evoapi/design-system';
import { AlertCircle } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { usePermissions } from '@/contexts/PermissionsContext';
import { useContactHistory, type PublishEntryInput } from '@/hooks/contacts/useContactHistory';
import type { ContactTask } from '@/types/contacts';
import ContactTasksCard from './ContactTasksCard';
import HistoryComposer from './HistoryComposer';
import HistoryFeed from './HistoryFeed';
import { buildFeed, dayKey } from './historyUtils';

interface ContactHistoryTabProps {
  contactId: string;
}

// Tasks on top, then the composer, then the feed grouped by day.
export default function ContactHistoryTab({ contactId }: ContactHistoryTabProps) {
  const { t } = useLanguage('contacts');
  const { can, isReady } = usePermissions();
  const canUpdate = isReady && can('contacts', 'update');
  const canDelete = isReady && can('contacts', 'delete');
  const history = useContactHistory(contactId);
  const [day, setDay] = useState(() => dayKey(new Date()));
  const [freshId, setFreshId] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const feed = useMemo(
    () => buildFeed(history.entries, history.completedTasks),
    [history.entries, history.completedTasks],
  );

  const handlePublish = async (input: PublishEntryInput) => {
    try {
      const created = await history.publish(input);
      setFreshId(`note-${created.id}`);
      toast.success(
        t(input.followUp ? 'history.messages.publishedWithTask' : 'history.messages.published'),
      );
    } catch (error) {
      console.error('Error publishing history entry:', error);
      toast.error(t('history.messages.error'));
      throw error;
    }
  };

  const handleCreateTask = async (title: string, due: Date) => {
    try {
      await history.createTask(title, due);
      toast.success(t('history.messages.taskScheduled'));
    } catch (error) {
      console.error('Error creating task:', error);
      toast.error(t('history.messages.error'));
      throw error;
    }
  };

  const handleCompleteTask = async (task: ContactTask) => {
    try {
      await history.completeTask(task);
      toast.success(t('history.messages.taskCompleted'));
    } catch (error) {
      console.error('Error completing task:', error);
      toast.error(t('history.messages.error'));
    }
  };

  const handleEditEntry = async (noteId: string, content: string) => {
    try {
      await history.updateEntry(noteId, content);
      toast.success(t('history.messages.updated'));
    } catch (error) {
      console.error('Error updating history entry:', error);
      toast.error(t('history.messages.error'));
      throw error;
    }
  };

  const handleDeleteEntry = async (noteId: string) => {
    try {
      await history.deleteEntry(noteId);
      toast.success(t('history.messages.deleted'));
    } catch (error) {
      console.error('Error deleting history entry:', error);
      toast.error(t('history.messages.error'));
    }
  };

  const logOnDay = (target: string) => {
    setDay(target);
    textareaRef.current?.focus();
    textareaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  if (history.loading) {
    return (
      <div role="status" className="py-16 text-center text-sm text-muted-foreground">
        {t('history.loading')}
      </div>
    );
  }

  if (history.error) {
    return (
      <div
        role="alert"
        className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
      >
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <p className="flex-1">{t('history.messages.loadError')}</p>
        <Button size="sm" variant="outline" onClick={() => void history.reload()}>
          {t('history.actions.retry')}
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 pb-4" data-testid="contact-history-tab">
      <ContactTasksCard
        tasks={history.openTasks}
        canCreate={!!history.taskTarget}
        canEdit={canUpdate}
        onCreate={handleCreateTask}
        onComplete={handleCompleteTask}
      />
      {canUpdate && (
        <HistoryComposer
          day={day}
          onDayChange={setDay}
          canFollowUp={!!history.taskTarget}
          onPublish={handlePublish}
          textareaRef={textareaRef}
        />
      )}
      <HistoryFeed
        feed={feed}
        freshId={freshId}
        canLog={canUpdate}
        canDelete={canDelete}
        onLogOnDay={logOnDay}
        onEdit={handleEditEntry}
        onDelete={handleDeleteEntry}
      />
    </div>
  );
}
