import api from '@/services/core/api';
import { extractData } from '@/utils/apiHelpers';
import type { ContactCost, ContactCostInput } from '@/types/contacts';

// Costs sent to a contact. Amounts come back as numbers.
class ContactCostsService {
  async list(contactId: string): Promise<ContactCost[]> {
    const response = await api.get(`/contacts/${contactId}/costs`);
    return extractData<ContactCost[]>(response) ?? [];
  }

  async create(contactId: string, data: ContactCostInput): Promise<ContactCost> {
    const response = await api.post(`/contacts/${contactId}/costs`, data);
    return extractData<ContactCost>(response);
  }

  async remove(contactId: string, costId: string): Promise<void> {
    await api.delete(`/contacts/${contactId}/costs/${costId}`);
  }
}

export const contactCostsService = new ContactCostsService();
