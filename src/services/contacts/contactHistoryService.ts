import api from '@/services/core/api';
import { extractData, extractResponse } from '@/utils/apiHelpers';
import type {
  ContactNote,
  ContactTask,
  HistoryKind,
  PriorityContact,
  PriorityContactsParams,
  PriorityContactsResponse,
} from '@/types/contacts';

export interface CreateHistoryEntryData {
  content: string;
  kind: HistoryKind;
  occurred_at?: string;
}

// History entries are contact notes with a kind and the moment they happened;
// tasks come from every deal the contact is on.
class ContactHistoryService {
  async listEntries(contactId: string): Promise<ContactNote[]> {
    const response = await api.get(`/contacts/${contactId}/notes`);
    return extractData<ContactNote[]>(response) ?? [];
  }

  async createEntry(contactId: string, data: CreateHistoryEntryData): Promise<ContactNote> {
    const response = await api.post(`/contacts/${contactId}/notes`, data);
    return extractData<ContactNote>(response);
  }

  // status 'all' includes completed tasks, which the feed shows as entries.
  async listTasks(contactId: string, status: 'open' | 'all' = 'open'): Promise<ContactTask[]> {
    const response = await api.get(`/contacts/${contactId}/tasks`, {
      params: status === 'all' ? { status } : undefined,
    });
    return extractData<ContactTask[]>(response) ?? [];
  }

  async listPriority(
    params: PriorityContactsParams,
    options?: { signal?: AbortSignal },
  ): Promise<PriorityContactsResponse> {
    const response = await api.get('/contacts/priority', { params, signal: options?.signal });
    return extractResponse<PriorityContact>(response) as PriorityContactsResponse;
  }
}

export const contactHistoryService = new ContactHistoryService();
