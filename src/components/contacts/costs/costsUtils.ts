import { COST_UNITS, type ContactCost, type CostCurrency, type CostUnit } from '@/types/contacts';

type Translate = (key: string, options?: Record<string, unknown>) => string;

// `un` is translated (un, ud, pz, ...); the metric units read the same everywhere.
export function unitLabel(unit: CostUnit, t: Translate): string {
  return unit === 'un' ? t('costs.units.un') : unit;
}

export function formatMoney(value: number, currency: CostCurrency, locale: string): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(value);
}

// "R$ 242,50/kg"
export function formatPrice(
  cost: Pick<ContactCost, 'unit_price' | 'currency' | 'unit'>,
  locale: string,
  t: Translate,
): string {
  return `${formatMoney(cost.unit_price, cost.currency, locale)}/${unitLabel(cost.unit, t)}`;
}

// "5 kg", "200 g", "1 un"
export function formatPackage(
  cost: Pick<ContactCost, 'package_size' | 'unit'>,
  locale: string,
  t: Translate,
): string {
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 3 }).format(cost.package_size)} ${unitLabel(cost.unit, t)}`;
}

// "28/10/26" from "2026-10-28", without moving the day across time zones.
export function formatSentOn(sentOn: string, locale: string): string {
  const [year, month, day] = sentOn.split('-').map(Number);
  return new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit', year: '2-digit' }).format(
    new Date(year, month - 1, day),
  );
}

export function packageKey(cost: Pick<ContactCost, 'package_size' | 'unit'>): string {
  return `${cost.package_size} ${cost.unit}`;
}

// Newest send first; within a send, by product and packaging.
export function sortCosts(costs: ContactCost[]): ContactCost[] {
  return [...costs].sort(
    (a, b) =>
      b.sent_on.localeCompare(a.sent_on) ||
      a.product_code.localeCompare(b.product_code) ||
      a.unit.localeCompare(b.unit) ||
      a.package_size - b.package_size ||
      b.created_at.localeCompare(a.created_at),
  );
}

export interface LatestCell {
  last: ContactCost;
  // The cost sent before `last` for the same product and packaging, when it
  // differs in price or currency.
  before: ContactCost | null;
  // Sent on the date of the customer's latest quote.
  fresh: boolean;
}

export interface LatestMatrix {
  packages: { key: string; package_size: number; unit: CostUnit }[];
  products: { code: string; color: string | null; cells: Record<string, LatestCell> }[];
}

// Product × packaging grid with the latest cost in each cell. Packagings in
// different units are separate columns, so 5 kg and 5 L never mix; columns
// follow COST_UNITS order (kg, g, L, mL, un), then size.
export function buildLatest(costs: ContactCost[]): LatestMatrix {
  const sorted = sortCosts(costs);
  const latestDate = sorted[0]?.sent_on;
  const packages = new Map<string, { key: string; package_size: number; unit: CostUnit }>();
  const products = new Map<string, LatestMatrix['products'][number]>();
  const seen = new Map<string, ContactCost[]>();

  for (const cost of sorted) {
    const key = packageKey(cost);
    if (!packages.has(key)) packages.set(key, { key, package_size: cost.package_size, unit: cost.unit });
    if (!products.has(cost.product_code)) {
      products.set(cost.product_code, { code: cost.product_code, color: cost.color, cells: {} });
    }
    const cellKey = `${cost.product_code}|${key}`;
    seen.set(cellKey, [...(seen.get(cellKey) ?? []), cost]);
  }

  for (const [cellKey, [last, previous]] of seen) {
    const [code, key] = cellKey.split('|');
    const changed =
      previous && (previous.unit_price !== last.unit_price || previous.currency !== last.currency);
    products.get(code)!.cells[key] = {
      last,
      before: changed ? previous : null,
      fresh: last.sent_on === latestDate,
    };
  }

  return {
    packages: [...packages.values()].sort(
      (a, b) =>
        COST_UNITS.indexOf(a.unit) - COST_UNITS.indexOf(b.unit) || a.package_size - b.package_size,
    ),
    products: [...products.values()].sort((a, b) => a.code.localeCompare(b.code)),
  };
}
