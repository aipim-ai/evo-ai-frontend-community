import { describe, expect, it } from 'vitest';
import type { ContactCost } from '@/types/contacts';
import { buildLatest, formatPackage, formatPrice, sortCosts } from '../costsUtils';

const t = (key: string) => (key === 'costs.units.un' ? 'un' : key);

let seq = 0;
const cost = (over: Partial<ContactCost>): ContactCost => ({
  id: `c${++seq}`,
  contact_id: 'contact',
  sent_on: '2026-11-20',
  product_code: 'BD 11300',
  color: 'Pérola champagne',
  package_size: 5,
  unit: 'kg',
  unit_price: 242.5,
  currency: 'BRL',
  recipient: null,
  notes: null,
  user: null,
  created_at: `2026-11-20T10:00:0${seq % 10}Z`,
  updated_at: '2026-11-20T10:00:00Z',
  ...over,
});

describe('costsUtils', () => {
  it('formats price per unit and packaging in the given currency', () => {
    const c = cost({ unit_price: 1.5, currency: 'USD', unit: 'g', package_size: 200 });
    expect(formatPrice(c, 'pt-BR', t).replace(/\s/g, ' ')).toBe('US$ 1,50/g');
    expect(formatPackage(c, 'pt-BR', t)).toBe('200 g');
    expect(formatPrice(cost({}), 'pt-BR', t).replace(/\s/g, ' ')).toBe('R$ 242,50/kg');
    expect(formatPackage(cost({ unit: 'un', package_size: 1 }), 'pt-BR', t)).toBe('1 un');
  });

  it('sorts newest send first, then product and packaging', () => {
    const rows = sortCosts([
      cost({ sent_on: '2026-10-01', product_code: 'A' }),
      cost({ sent_on: '2026-11-01', product_code: 'B', package_size: 10 }),
      cost({ sent_on: '2026-11-01', product_code: 'B', package_size: 1 }),
      cost({ sent_on: '2026-11-01', product_code: 'A' }),
    ]);
    expect(rows.map(r => `${r.sent_on} ${r.product_code} ${r.package_size}`)).toEqual([
      '2026-11-01 A 5',
      '2026-11-01 B 1',
      '2026-11-01 B 10',
      '2026-10-01 A 5',
    ]);
  });

  it('keeps the latest cost per product and packaging, with the previous one when it changed', () => {
    const matrix = buildLatest([
      cost({ sent_on: '2026-09-01', unit_price: 313 }),
      cost({ sent_on: '2026-10-01', unit_price: 261.9 }),
      cost({ sent_on: '2026-11-20', unit_price: 242.5 }),
      cost({ sent_on: '2026-11-20', package_size: 10, unit_price: 228.4 }),
      cost({ sent_on: '2026-10-01', product_code: 'DP 4020', package_size: 5, unit: 'L', unit_price: 96 }),
      cost({ sent_on: '2026-09-01', product_code: 'FL PINK', unit_price: 61.5, currency: 'USD' }),
      cost({ sent_on: '2026-10-01', product_code: 'FL PINK', unit_price: 61.5, currency: 'USD' }),
    ]);

    expect(matrix.packages.map(p => p.key)).toEqual(['5 kg', '10 kg', '5 L']);
    expect(matrix.products.map(p => p.code)).toEqual(['BD 11300', 'DP 4020', 'FL PINK']);

    const bd = matrix.products[0].cells;
    expect(bd['5 kg'].last.unit_price).toBe(242.5);
    expect(bd['5 kg'].before?.unit_price).toBe(261.9);
    expect(bd['5 kg'].fresh).toBe(true);
    expect(bd['10 kg'].before).toBeNull();
    expect(bd['5 L']).toBeUndefined();

    // Same price as before: nothing to compare against.
    expect(matrix.products[2].cells['5 kg'].before).toBeNull();
    expect(matrix.products[2].cells['5 kg'].fresh).toBe(false);
  });

  it('shows the previous cost when only the currency changed', () => {
    const matrix = buildLatest([
      cost({ sent_on: '2026-10-01', unit_price: 50, currency: 'USD' }),
      cost({ sent_on: '2026-11-01', unit_price: 50, currency: 'BRL' }),
    ]);
    expect(matrix.products[0].cells['5 kg'].before?.currency).toBe('USD');
  });
});
