import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ContactCost } from '@/types/contacts';

const list = vi.fn();
const create = vi.fn();
const remove = vi.fn();
const createEntry = vi.fn();

vi.mock('@/services/contacts', () => ({
  contactCostsService: {
    list: (...args: unknown[]) => list(...args),
    create: (...args: unknown[]) => create(...args),
    remove: (...args: unknown[]) => remove(...args),
  },
  contactHistoryService: { createEntry: (...args: unknown[]) => createEntry(...args) },
}));

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({
    t: (key: string, opts?: Record<string, unknown>) =>
      key === 'costs.historyEntry' ? `sent ${opts?.code} ${opts?.package} ${opts?.price}` : key,
    currentLanguage: 'en',
  }),
}));

vi.mock('@/contexts/PermissionsContext', () => ({
  usePermissions: () => ({ isReady: true, can: () => true }),
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import ContactCostsTab from '../ContactCostsTab';

const cost = (over: Partial<ContactCost>): ContactCost => ({
  id: over.id ?? 'c1',
  contact_id: 'contact-1',
  sent_on: '2026-11-20',
  product_code: 'BD 11300',
  color: 'Pérola champagne',
  package_size: 5,
  unit: 'kg',
  unit_price: 242.5,
  currency: 'BRL',
  recipient: 'Helena',
  notes: null,
  user: { id: 'u1', name: 'Matheus' },
  created_at: '2026-11-20T10:00:00Z',
  updated_at: '2026-11-20T10:00:00Z',
  ...over,
});

describe('ContactCostsTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows the empty state when nothing was sent', async () => {
    list.mockResolvedValue([]);
    render(<ContactCostsTab contactId="contact-1" />);
    expect(await screen.findByText('costs.empty')).toBeInTheDocument();
    expect(screen.queryByTestId('costs-log')).not.toBeInTheDocument();
  });

  it('renders the latest matrix and the full log with currency and unit', async () => {
    list.mockResolvedValue([
      cost({ id: 'a', sent_on: '2026-10-01', unit_price: 261.9 }),
      cost({ id: 'b' }),
      cost({ id: 'c', product_code: 'DP 4020', color: null, unit: 'L', unit_price: 96, currency: 'USD' }),
    ]);
    render(<ContactCostsTab contactId="contact-1" />);

    const latest = await screen.findByTestId('costs-latest');
    expect(within(latest).getByText('5 kg')).toBeInTheDocument();
    expect(within(latest).getByText('5 L')).toBeInTheDocument();
    expect(within(latest).getByText('R$242.50/kg')).toBeInTheDocument();
    expect(within(latest).getByText('costs.latest.before')).toBeInTheDocument();
    expect(within(latest).getByText('$96.00/L')).toBeInTheDocument();

    const log = screen.getByTestId('costs-log');
    expect(within(log).getAllByRole('row')).toHaveLength(4);
    expect(within(log).getAllByText('Matheus')).toHaveLength(3);
  });

  it('filters the log by clicking a product in the matrix', async () => {
    list.mockResolvedValue([cost({ id: 'b' }), cost({ id: 'c', product_code: 'DP 4020' })]);
    render(<ContactCostsTab contactId="contact-1" />);

    await userEvent.click(await screen.findByRole('button', { name: /DP 4020/ }));
    const log = screen.getByTestId('costs-log');
    expect(within(log).getAllByRole('row')).toHaveLength(2);
    expect(within(log).queryByText('BD 11300')).not.toBeInTheDocument();
  });

  it('logs a cost in BRL and kg by default, keeps the form open and writes the history entry', async () => {
    list.mockResolvedValue([]);
    create.mockImplementation(async (_id: string, input: Partial<ContactCost>) =>
      cost({ id: 'new', ...input, product_code: 'BD 11500' }),
    );
    createEntry.mockResolvedValue({});
    render(<ContactCostsTab contactId="contact-1" recipient="Helena Prado" />);

    await userEvent.click(await screen.findByRole('button', { name: 'costs.new' }));
    expect(screen.getByLabelText('costs.columns.recipient')).toHaveValue('Helena Prado');
    await userEvent.type(screen.getByLabelText('costs.columns.product'), 'bd 11500');
    await userEvent.type(screen.getByLabelText('costs.form.pricePer'), '275.40');
    await userEvent.click(screen.getByRole('button', { name: 'costs.form.add' }));

    await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
    expect(create.mock.calls[0][0]).toBe('contact-1');
    expect(create.mock.calls[0][1]).toMatchObject({
      product_code: 'BD 11500',
      package_size: 5,
      unit: 'kg',
      currency: 'BRL',
      unit_price: 275.4,
      recipient: 'Helena Prado',
    });
    await waitFor(() =>
      expect(createEntry).toHaveBeenCalledWith(
        'contact-1',
        expect.objectContaining({ kind: 'email', content: 'sent BD 11500 5 kg R$275.40/kg' }),
      ),
    );
    expect(screen.getByLabelText('costs.columns.product')).toHaveValue('');
    expect(await screen.findByTestId('costs-log')).toBeInTheDocument();
  });

  it('asks for confirmation before deleting', async () => {
    list.mockResolvedValue([cost({ id: 'b' })]);
    remove.mockResolvedValue(undefined);
    render(<ContactCostsTab contactId="contact-1" />);

    await userEvent.click(await screen.findByRole('button', { name: 'costs.delete' }));
    expect(remove).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'costs.confirmDelete' }));

    await waitFor(() => expect(remove).toHaveBeenCalledWith('contact-1', 'b'));
    expect(await screen.findByText('costs.empty')).toBeInTheDocument();
  });
});
