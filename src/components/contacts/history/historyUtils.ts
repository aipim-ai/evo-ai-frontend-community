import {
  CheckCircle2,
  Mail,
  MessageSquare,
  Phone,
  StickyNote,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { ContactNote, ContactTask, HistoryKind } from '@/types/contacts';

// Days younger than this stay open in the feed; older ones start collapsed.
export const OPEN_DAYS = 3;

export type FeedKind = HistoryKind | 'taskDone';

export const KIND_ICONS: Record<FeedKind, LucideIcon> = {
  call: Phone,
  message: MessageSquare,
  meeting: Users,
  email: Mail,
  note: StickyNote,
  taskDone: CheckCircle2,
};

const pad = (n: number) => String(n).padStart(2, '0');

// Local calendar day, YYYY-MM-DD: the feed groups by the viewer's day, not UTC.
export function dayKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function parseDayKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// Whole days between `key` and today (0 = today, 1 = yesterday).
export function daysAgo(key: string, now = new Date()): number {
  return Math.round((parseDayKey(dayKey(now)).getTime() - parseDayKey(key).getTime()) / 864e5);
}

// Value for <input type="datetime-local">, in local time.
export function toLocalInput(date: Date): string {
  return `${dayKey(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function tomorrowAt(hour: number, now = new Date()): Date {
  const d = new Date(now);
  d.setDate(d.getDate() + 1);
  d.setHours(hour, 0, 0, 0);
  return d;
}

// "3 days ago", "yesterday", "in 2 hours" in the active language.
export function relativeTime(date: Date, locale: string, now = new Date()): string {
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  const mins = Math.round((date.getTime() - now.getTime()) / 6e4);
  if (Math.abs(mins) < 60) return rtf.format(mins, 'minute');
  const days = -daysAgo(dayKey(date), now);
  if (days === 0) return rtf.format(Math.round(mins / 60), 'hour');
  return rtf.format(days, 'day');
}

export function formatDue(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatTime(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(date);
}

export function formatDayLong(key: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long' }).format(
    parseDayKey(key),
  );
}

export function formatDayShort(key: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(parseDayKey(key));
}

export interface FeedEntry {
  id: string;
  // Set for notes, which can be edited or deleted; completed tasks cannot.
  noteId?: string;
  kind: FeedKind;
  text: string;
  author?: string;
  at: Date;
}

// Notes and completed tasks share the feed; a completed task reads as an entry
// on the day it was done.
export function buildFeed(entries: ContactNote[], completedTasks: ContactTask[]): FeedEntry[] {
  const notes = entries.map<FeedEntry>(note => ({
    id: `note-${note.id}`,
    noteId: note.id,
    kind: note.kind ?? 'note',
    text: note.content,
    author: note.user?.name,
    at: new Date(note.occurred_at ?? note.created_at),
  }));
  const done = completedTasks.map<FeedEntry>(task => ({
    id: `task-${task.id}`,
    kind: 'taskDone',
    text: task.title,
    author: task.assigned_to?.name ?? task.created_by?.name,
    at: new Date(task.completed_at as string),
  }));
  return [...notes, ...done].sort((a, b) => b.at.getTime() - a.at.getTime());
}
