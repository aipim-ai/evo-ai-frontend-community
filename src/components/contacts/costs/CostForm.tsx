import { useState, type FormEvent } from 'react';
import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@evoapi/design-system';
import { useLanguage } from '@/hooks/useLanguage';
import {
  COST_CURRENCIES,
  COST_UNITS,
  DEFAULT_COST_CURRENCY,
  DEFAULT_COST_UNIT,
  type ContactCost,
  type ContactCostInput,
  type CostCurrency,
  type CostUnit,
} from '@/types/contacts';
import { unitLabel } from './costsUtils';

interface CostFormProps {
  // Costs already sent to this customer: known products fill in color and unit.
  known: ContactCost[];
  defaultRecipient?: string;
  onSubmit: (input: ContactCostInput) => Promise<void>;
  onClose: () => void;
}

const CURRENCY_SYMBOLS: Record<CostCurrency, string> = { BRL: 'R$', USD: 'US$', EUR: '€' };

function todayKey(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

// Stays open after each line: a quote usually lists several products. Date,
// packaging, unit, currency and recipient carry over to the next line.
export default function CostForm({ known, defaultRecipient, onSubmit, onClose }: CostFormProps) {
  const { t } = useLanguage('contacts');
  const today = todayKey();
  const [sentOn, setSentOn] = useState(today);
  const [productCode, setProductCode] = useState('');
  const [color, setColor] = useState('');
  const [packageSize, setPackageSize] = useState('5');
  const [unit, setUnit] = useState<CostUnit>(DEFAULT_COST_UNIT);
  const [currency, setCurrency] = useState<CostCurrency>(DEFAULT_COST_CURRENCY);
  const [unitPrice, setUnitPrice] = useState('');
  const [recipient, setRecipient] = useState(defaultRecipient ?? '');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const codes = [...new Set(known.map(cost => cost.product_code))].sort();
  const size = Number(packageSize);
  const price = Number(unitPrice);
  const canSubmit = !!productCode.trim() && size > 0 && price > 0 && !!sentOn && !submitting;

  const fillFromKnown = () => {
    const code = productCode.trim().replace(/\s+/g, ' ').toUpperCase();
    setProductCode(code);
    const match = known.find(cost => cost.product_code === code);
    if (!match) return;
    if (!color.trim() && match.color) setColor(match.color);
    setUnit(match.unit);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await onSubmit({
        sent_on: sentOn,
        product_code: productCode.trim(),
        color: color.trim() || undefined,
        package_size: size,
        unit,
        unit_price: price,
        currency,
        recipient: recipient.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      setProductCode('');
      setColor('');
      setUnitPrice('');
      setNotes('');
      document.getElementById('cost-product')?.focus();
    } catch {
      // The tab already told the user; keep what they typed.
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      aria-label={t('costs.new')}
      className="grid grid-cols-2 gap-3 rounded-xl border border-border bg-muted/30 p-3 sm:grid-cols-4"
    >
      <div className="grid gap-1">
        <Label htmlFor="cost-date">{t('costs.columns.date')}</Label>
        <Input
          id="cost-date"
          type="date"
          value={sentOn}
          max={today}
          required
          onChange={event => setSentOn(event.target.value)}
        />
      </div>
      <div className="grid gap-1">
        <Label htmlFor="cost-product">{t('costs.columns.product')}</Label>
        <Input
          id="cost-product"
          list="cost-product-codes"
          value={productCode}
          placeholder="BD 11300"
          autoComplete="off"
          required
          autoFocus
          onChange={event => setProductCode(event.target.value)}
          onBlur={fillFromKnown}
        />
        <datalist id="cost-product-codes">
          {codes.map(code => (
            <option key={code} value={code} />
          ))}
        </datalist>
      </div>
      <div className="col-span-2 grid gap-1">
        <Label htmlFor="cost-color">{t('costs.columns.color')}</Label>
        <Input
          id="cost-color"
          value={color}
          autoComplete="off"
          onChange={event => setColor(event.target.value)}
        />
      </div>
      <div className="grid gap-1">
        <Label htmlFor="cost-package">{t('costs.columns.package')}</Label>
        <Input
          id="cost-package"
          type="number"
          inputMode="decimal"
          min="0.001"
          step="any"
          value={packageSize}
          required
          onChange={event => setPackageSize(event.target.value)}
        />
      </div>
      <div className="grid gap-1">
        <Label htmlFor="cost-unit">{t('costs.columns.unit')}</Label>
        <Select value={unit} onValueChange={value => setUnit(value as CostUnit)}>
          <SelectTrigger id="cost-unit" aria-label={t('costs.columns.unit')}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {COST_UNITS.map(option => (
              <SelectItem key={option} value={option}>
                {unitLabel(option, t)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-1">
        <Label htmlFor="cost-currency">{t('costs.columns.currency')}</Label>
        <Select value={currency} onValueChange={value => setCurrency(value as CostCurrency)}>
          <SelectTrigger id="cost-currency" aria-label={t('costs.columns.currency')}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {COST_CURRENCIES.map(option => (
              <SelectItem key={option} value={option}>
                {`${option} (${CURRENCY_SYMBOLS[option]})`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-1">
        <Label htmlFor="cost-price">
          {t('costs.form.pricePer', { unit: unitLabel(unit, t) })}
        </Label>
        <Input
          id="cost-price"
          type="number"
          inputMode="decimal"
          min="0.01"
          step="0.01"
          value={unitPrice}
          required
          onChange={event => setUnitPrice(event.target.value)}
        />
      </div>
      <div className="col-span-2 grid gap-1">
        <Label htmlFor="cost-recipient">{t('costs.columns.recipient')}</Label>
        <Input
          id="cost-recipient"
          value={recipient}
          autoComplete="off"
          onChange={event => setRecipient(event.target.value)}
        />
      </div>
      <div className="col-span-2 grid gap-1">
        <Label htmlFor="cost-notes">{t('costs.columns.notes')}</Label>
        <Input
          id="cost-notes"
          value={notes}
          autoComplete="off"
          onChange={event => setNotes(event.target.value)}
        />
      </div>
      <div className="col-span-2 flex justify-end gap-2 sm:col-span-4">
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          {t('costs.form.close')}
        </Button>
        <Button type="submit" size="sm" disabled={!canSubmit}>
          {t('costs.form.add')}
        </Button>
      </div>
    </form>
  );
}
