import { useCallback, useEffect, useMemo, useState } from 'react';
import { contactHistoryService, contactsService } from '@/services/contacts';
import { pipelineTasksService } from '@/services/pipelines/pipelineTasksService';
import type { ContactNote, ContactTask, HistoryKind } from '@/types/contacts';

// The deal new tasks go to: tasks live on pipeline items, so a contact with no
// deal cannot get one from the History tab.
export interface TaskTarget {
  pipelineId: string;
  pipelineItemId: string;
}

export interface PublishEntryInput {
  content: string;
  kind: HistoryKind;
  occurredAt: Date;
  followUp?: { title: string; due: Date };
}

export interface UseContactHistoryReturn {
  entries: ContactNote[];
  openTasks: ContactTask[];
  completedTasks: ContactTask[];
  taskTarget: TaskTarget | null;
  loading: boolean;
  error: boolean;
  reload: () => Promise<void>;
  publish: (input: PublishEntryInput) => Promise<ContactNote>;
  updateEntry: (noteId: string, content: string) => Promise<void>;
  deleteEntry: (noteId: string) => Promise<void>;
  createTask: (title: string, due: Date) => Promise<void>;
  completeTask: (task: ContactTask) => Promise<void>;
}

type ContactPipelines = Awaited<ReturnType<typeof contactsService.getContactPipelines>>;

function pickTaskTarget(pipelines: ContactPipelines): TaskTarget | null {
  // stage_type comes as the enum name; older payloads sent the integer.
  const isOpen = (stageType: unknown) => stageType === 'active' || stageType === 0;
  const chosen = pipelines.find(p => isOpen(p.stage?.stage_type)) ?? pipelines[0];
  return chosen ? { pipelineId: chosen.pipeline.id, pipelineItemId: chosen.item.id } : null;
}

export function useContactHistory(contactId: string): UseContactHistoryReturn {
  const [entries, setEntries] = useState<ContactNote[]>([]);
  const [tasks, setTasks] = useState<ContactTask[]>([]);
  const [taskTarget, setTaskTarget] = useState<TaskTarget | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadTasks = useCallback(
    async () => setTasks(await contactHistoryService.listTasks(contactId, 'all')),
    [contactId],
  );

  const reload = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [notes, contactTasks, pipelines] = await Promise.all([
        contactHistoryService.listEntries(contactId),
        contactHistoryService.listTasks(contactId, 'all'),
        contactsService.getContactPipelines(contactId),
      ]);
      setEntries(notes);
      setTasks(contactTasks);
      setTaskTarget(pickTaskTarget(pipelines ?? []));
    } catch (err) {
      console.error('Error loading contact history:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [contactId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const createTask = useCallback(
    async (title: string, due: Date) => {
      if (!taskTarget) throw new Error('Contact has no deal to hold the task');
      await pipelineTasksService.createTask(taskTarget.pipelineId, taskTarget.pipelineItemId, {
        title,
        task_type: 'follow_up',
        due_date: due.toISOString(),
      });
      await loadTasks();
    },
    [taskTarget, loadTasks],
  );

  const publish = useCallback(
    async ({ content, kind, occurredAt, followUp }: PublishEntryInput) => {
      const created = await contactHistoryService.createEntry(contactId, {
        content,
        kind,
        occurred_at: occurredAt.toISOString(),
      });
      setEntries(prev => [created, ...prev]);
      if (followUp) await createTask(followUp.title, followUp.due);
      return created;
    },
    [contactId, createTask],
  );

  const updateEntry = useCallback(
    async (noteId: string, content: string) => {
      const updated = await contactsService.updateContactNote(contactId, noteId, content);
      setEntries(prev => prev.map(note => (note.id === noteId ? updated : note)));
    },
    [contactId],
  );

  const deleteEntry = useCallback(
    async (noteId: string) => {
      await contactsService.deleteContactNote(contactId, noteId);
      setEntries(prev => prev.filter(note => note.id !== noteId));
    },
    [contactId],
  );

  const completeTask = useCallback(
    async (task: ContactTask) => {
      await pipelineTasksService.completeTask(task.pipeline_id, task.id);
      await loadTasks();
    },
    [loadTasks],
  );

  const { openTasks, completedTasks } = useMemo(() => {
    const open = tasks.filter(task => task.status === 'pending' || task.status === 'overdue');
    const done = tasks.filter(task => task.status === 'completed' && task.completed_at);
    return { openTasks: open, completedTasks: done };
  }, [tasks]);

  return {
    entries,
    openTasks,
    completedTasks,
    taskTarget,
    loading,
    error,
    reload,
    publish,
    updateEntry,
    deleteEntry,
    createTask,
    completeTask,
  };
}
