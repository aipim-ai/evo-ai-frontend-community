// Costs sent to a customer (the contact's "Costs sent" tab): one row per
// product, packaging and date. Prices are per `unit`, and the packaging size
// is in the same unit.
export const COST_UNITS = ['kg', 'g', 'L', 'mL', 'un'] as const;
export type CostUnit = (typeof COST_UNITS)[number];

export const COST_CURRENCIES = ['BRL', 'USD', 'EUR'] as const;
export type CostCurrency = (typeof COST_CURRENCIES)[number];

export const DEFAULT_COST_UNIT: CostUnit = 'kg';
export const DEFAULT_COST_CURRENCY: CostCurrency = 'BRL';

export interface ContactCost {
  id: string;
  contact_id: string;
  sent_on: string; // YYYY-MM-DD
  product_code: string;
  color: string | null;
  package_size: number;
  unit: CostUnit;
  unit_price: number;
  currency: CostCurrency;
  recipient: string | null;
  notes: string | null;
  user: { id: string; name: string } | null;
  created_at: string;
  updated_at: string;
}

export interface ContactCostInput {
  sent_on: string;
  product_code: string;
  color?: string;
  package_size: number;
  unit: CostUnit;
  unit_price: number;
  currency: CostCurrency;
  recipient?: string;
  notes?: string;
}
