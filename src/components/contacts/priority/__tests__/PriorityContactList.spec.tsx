import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PriorityContact, PriorityContactsResponse } from '@/types/contacts';

const listPriority = vi.fn();

vi.mock('@/services/contacts', () => ({
  contactHistoryService: { listPriority: (...args: unknown[]) => listPriority(...args) },
}));

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({
    t: (key: string, opts?: Record<string, unknown>) =>
      opts && 'task' in opts ? `${key}|${opts.task}` : key,
    currentLanguage: 'en',
  }),
}));

vi.mock('@/hooks/useDebounce', () => ({ useDebounce: <T,>(value: T) => value }));

import PriorityContactList from '../PriorityContactList';

const contact = (
  id: string,
  name: string,
  priority: Partial<PriorityContact['priority']>,
): PriorityContact =>
  ({
    id,
    name,
    additional_attributes: { company_name: `${name} Co` },
    priority: {
      group: 'ok',
      reason: 'none',
      task: null,
      awaiting_since: null,
      last_contact_at: null,
      open_tasks_count: 0,
      stage: null,
      ...priority,
    },
  }) as unknown as PriorityContact;

function response(data: PriorityContact[]): PriorityContactsResponse {
  return {
    success: true,
    data,
    meta: {
      timestamp: '',
      pagination: { page: 1, page_size: 25, total: data.length, total_pages: 1, has_next_page: false },
      counts: { all: 3, overdue: 1, today: 1, cooling: 0, ok: 1 },
    },
  } as PriorityContactsResponse;
}

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname + location.search}</div>;
}

function renderList() {
  return render(
    <MemoryRouter initialEntries={['/contacts']}>
      <Routes>
        <Route path="/contacts" element={<PriorityContactList search="" />} />
        <Route path="/contacts/:id" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('PriorityContactList', () => {
  beforeEach(() => {
    listPriority.mockReset();
    listPriority.mockResolvedValue(
      response([
        contact('c1', 'Mariana', {
          group: 'overdue',
          reason: 'overdue',
          task: { id: 't1', title: 'Send contract', due_date: '2026-01-01T09:00:00Z', pipeline_id: 'p', pipeline_item_id: 'i' },
          stage: { name: 'Proposal', color: '#f59e0b' },
        }),
        contact('c2', 'Camila', { group: 'today', reason: 'awaiting', awaiting_since: new Date().toISOString() }),
        contact('c3', 'Rafael', { group: 'ok', reason: 'none' }),
      ]),
    );
  });

  it('asks the server with the browser time zone', async () => {
    renderList();

    await screen.findByText('Mariana');
    expect(listPriority).toHaveBeenCalledWith(
      expect.objectContaining({ sort: 'priority', page: 1, timezone: expect.any(String) }),
      expect.anything(),
    );
  });

  it('groups rows and explains why each contact is there', async () => {
    renderList();

    expect(await screen.findByText('priority.reasons.overdue|Send contract')).toBeInTheDocument();
    expect(screen.getByText('priority.reasons.awaiting')).toBeInTheDocument();
    expect(screen.getByText('priority.reasons.none')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'priority.groups.overdue' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'priority.groups.today' })).toBeInTheDocument();
    expect(screen.getByText('Proposal')).toBeInTheDocument();
  });

  it('filters by group through the chips', async () => {
    renderList();
    await screen.findByText('Mariana');

    await userEvent.click(screen.getByRole('button', { name: /priority.groups.overdue/ }));

    await waitFor(() =>
      expect(listPriority).toHaveBeenLastCalledWith(
        expect.objectContaining({ group: 'overdue' }),
        expect.anything(),
      ),
    );
  });

  it('opens the contact on the History tab', async () => {
    renderList();

    await userEvent.click(await screen.findByText('Camila'));

    expect(screen.getByTestId('location')).toHaveTextContent('/contacts/c2?tab=history');
  });

  it('shows the empty state', async () => {
    listPriority.mockResolvedValue(response([]));
    renderList();

    expect(await screen.findByText('priority.empty')).toBeInTheDocument();
  });
});
