import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { FeedEntry } from '../historyUtils';

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({
    t: (key: string, opts?: Record<string, unknown>) =>
      opts && 'count' in opts ? `${key}|${opts.count}` : key,
    currentLanguage: 'en',
  }),
}));

import HistoryFeed from '../HistoryFeed';

const daysBack = (n: number, hour = 10) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, 0, 0, 0);
  return d;
};

const entry = (id: string, n: number, kind: FeedEntry['kind'] = 'call'): FeedEntry => ({
  id,
  noteId: kind === 'taskDone' ? undefined : id,
  kind,
  text: `text ${id}`,
  author: 'Ana',
  at: daysBack(n),
});

function renderFeed(feed: FeedEntry[], overrides: Partial<Parameters<typeof HistoryFeed>[0]> = {}) {
  const props = {
    feed,
    canLog: true,
    canDelete: true,
    onLogOnDay: vi.fn(),
    onEdit: vi.fn().mockResolvedValue(undefined),
    onDelete: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  const utils = render(<HistoryFeed {...props} />);
  return { ...utils, props };
}

const dayOf = (text: string) => screen.getByText(text).closest('details') as HTMLDetailsElement;

describe('HistoryFeed', () => {
  it('opens the last three days and collapses older ones under "earlier"', () => {
    renderFeed([entry('today', 0), entry('two', 2), entry('ten', 10)]);

    expect(dayOf('text today').open).toBe(true);
    expect(dayOf('text two').open).toBe(true);
    expect(dayOf('text ten').open).toBe(false);
    expect(screen.getByText('history.feed.earlier')).toBeInTheDocument();
  });

  it('shows an empty today so there is always a place to log', () => {
    renderFeed([entry('old', 5)]);

    expect(screen.getByText('history.feed.today')).toBeInTheDocument();
    expect(screen.getByText('history.feed.emptyToday')).toBeInTheDocument();
  });

  it('expands every older day at once', async () => {
    renderFeed([entry('today', 0), entry('ten', 10), entry('twenty', 20)]);

    await userEvent.click(screen.getByRole('button', { name: 'history.feed.expandAll' }));

    expect(dayOf('text ten').open).toBe(true);
    expect(dayOf('text twenty').open).toBe(true);
    expect(screen.getByRole('button', { name: 'history.feed.collapseAll' })).toBeInTheDocument();
  });

  it('counts the records of each day in its summary', () => {
    renderFeed([entry('a', 10), entry('b', 10, 'email')]);

    const summary = dayOf('text a').querySelector('summary') as HTMLElement;
    expect(within(summary).getByText('history.feed.records|2')).toBeInTheDocument();
  });

  it('offers to log on a past day', async () => {
    const { props } = renderFeed([entry('two', 2)]);
    const day = dayOf('text two');

    await userEvent.click(within(day).getByRole('button', { name: 'history.feed.logThisDay' }));

    expect(props.onLogOnDay).toHaveBeenCalledWith(expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/));
  });

  it('edits a note in place', async () => {
    const { props } = renderFeed([entry('n1', 0)]);

    await userEvent.click(screen.getByRole('button', { name: 'history.actions.edit' }));
    const box = screen.getByRole('textbox', { name: 'history.actions.edit' });
    await userEvent.clear(box);
    await userEvent.type(box, 'fixed text');
    await userEvent.click(screen.getByRole('button', { name: /history.actions.save/ }));

    expect(props.onEdit).toHaveBeenCalledWith('n1', 'fixed text');
  });

  it('does not offer edit or delete on completed tasks', () => {
    renderFeed([entry('t1', 0, 'taskDone')]);

    expect(screen.getByText('history.entry.completed')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'history.actions.edit' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'history.actions.delete' })).not.toBeInTheDocument();
  });
});
