import { useCallback, useEffect, useState } from 'react';
import { contactCostsService, contactHistoryService } from '@/services/contacts';
import type { ContactCost, ContactCostInput } from '@/types/contacts';

export interface UseContactCostsReturn {
  costs: ContactCost[];
  loading: boolean;
  error: boolean;
  reload: () => Promise<void>;
  create: (input: ContactCostInput, historyText: string) => Promise<ContactCost>;
  remove: (costId: string) => Promise<void>;
}

// An entry logged for a past day sits at 18:00 of that day, as in the History tab.
function occurredAt(sentOn: string): string {
  const [year, month, day] = sentOn.split('-').map(Number);
  const now = new Date();
  const date = new Date(year, month - 1, day, 18, 0, 0, 0);
  const isToday =
    now.getFullYear() === year && now.getMonth() === month - 1 && now.getDate() === day;
  return (isToday ? now : date).toISOString();
}

export function useContactCosts(contactId: string): UseContactCostsReturn {
  const [costs, setCosts] = useState<ContactCost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      setCosts(await contactCostsService.list(contactId));
    } catch (err) {
      console.error('Error loading contact costs:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [contactId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  // The cost also goes to the History tab as an email entry. That entry is a
  // convenience: if it fails, the cost stays logged.
  const create = useCallback(
    async (input: ContactCostInput, historyText: string) => {
      const created = await contactCostsService.create(contactId, input);
      setCosts(current => [created, ...current]);
      try {
        await contactHistoryService.createEntry(contactId, {
          content: historyText,
          kind: 'email',
          occurred_at: occurredAt(input.sent_on),
        });
      } catch (err) {
        console.warn('Cost logged, but its history entry failed:', err);
      }
      return created;
    },
    [contactId],
  );

  const remove = useCallback(
    async (costId: string) => {
      await contactCostsService.remove(contactId, costId);
      setCosts(current => current.filter(cost => cost.id !== costId));
    },
    [contactId],
  );

  return { costs, loading, error, reload, create, remove };
}
