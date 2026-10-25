import { describe, expect, it } from 'vitest';
import type { ContactNote, ContactTask } from '@/types/contacts';
import { buildFeed, dayKey, daysAgo } from '../historyUtils';

const note = (id: string, occurredAt: string, kind?: ContactNote['kind']): ContactNote => ({
  id,
  content: `note ${id}`,
  kind,
  occurred_at: occurredAt,
  user: { id: 'u1', name: 'Ana', email: 'ana@example.com' },
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
});

describe('historyUtils', () => {
  it('counts whole local days back from today', () => {
    const now = new Date(2026, 9, 23, 10);
    expect(daysAgo('2026-10-23', now)).toBe(0);
    expect(daysAgo('2026-10-22', now)).toBe(1);
    expect(daysAgo('2026-10-13', now)).toBe(10);
  });

  it('keys days in local time', () => {
    expect(dayKey(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });

  it('merges notes and completed tasks, newest first, by when they happened', () => {
    const done = {
      id: 't1',
      title: 'Send proposal',
      status: 'completed',
      completed_at: '2026-10-22T15:00:00Z',
      created_by: { id: 'u2', name: 'Bruno', email: 'b@example.com' },
    } as ContactTask;

    const feed = buildFeed(
      [note('a', '2026-10-21T12:00:00Z', 'call'), note('b', '2026-10-23T09:00:00Z')],
      [done],
    );

    expect(feed.map(entry => entry.id)).toEqual(['note-b', 'task-t1', 'note-a']);
    expect(feed[0]).toMatchObject({ kind: 'note', noteId: 'b', author: 'Ana' });
    expect(feed[1]).toMatchObject({ kind: 'taskDone', text: 'Send proposal', author: 'Bruno' });
    expect(feed[1].noteId).toBeUndefined();
  });
});
