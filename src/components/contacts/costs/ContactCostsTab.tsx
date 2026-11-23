import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@evoapi/design-system';
import { AlertCircle, Plus, Trash2 } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { usePermissions } from '@/contexts/PermissionsContext';
import { useContactCosts } from '@/hooks/contacts/useContactCosts';
import type { ContactCostInput } from '@/types/contacts';
import CostForm from './CostForm';
import {
  buildLatest,
  formatPackage,
  formatPrice,
  formatSentOn,
  sortCosts,
} from './costsUtils';

interface ContactCostsTabProps {
  contactId: string;
  // Who usually receives the costs: the contact itself when it is a person.
  recipient?: string;
}

const ALL = 'all';

// Costs sent to the customer: the latest price per product and packaging on
// top, then every cost sent, like the spreadsheet the sales team kept.
export default function ContactCostsTab({ contactId, recipient }: ContactCostsTabProps) {
  const { t, currentLanguage } = useLanguage('contacts');
  const { can, isReady } = usePermissions();
  const canUpdate = isReady && can('contacts', 'update');
  const { costs, loading, error, reload, create, remove } = useContactCosts(contactId);
  const [formOpen, setFormOpen] = useState(false);
  const [product, setProduct] = useState(ALL);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const sorted = useMemo(() => sortCosts(costs), [costs]);
  const latest = useMemo(() => buildLatest(costs), [costs]);
  const codes = latest.products.map(row => row.code);
  const filter = product !== ALL && codes.includes(product) ? product : ALL;
  const rows = filter === ALL ? sorted : sorted.filter(cost => cost.product_code === filter);

  const handleCreate = async (input: ContactCostInput) => {
    const historyText = t('costs.historyEntry', {
      code: input.product_code.trim().toUpperCase(),
      package: formatPackage(input, currentLanguage, t),
      price: formatPrice(input, currentLanguage, t),
    });
    try {
      await create(input, historyText);
      toast.success(t('costs.messages.created'));
    } catch (err) {
      console.error('Error logging cost:', err);
      toast.error(t('costs.messages.error'));
      throw err;
    }
  };

  const handleRemove = async (costId: string) => {
    setConfirmingId(null);
    try {
      await remove(costId);
      toast.success(t('costs.messages.deleted'));
    } catch (err) {
      console.error('Error deleting cost:', err);
      toast.error(t('costs.messages.error'));
    }
  };

  if (loading) {
    return (
      <div role="status" className="py-16 text-center text-sm text-muted-foreground">
        {t('costs.loading')}
      </div>
    );
  }

  if (error) {
    return (
      <div
        role="alert"
        className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
      >
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <p className="flex-1">{t('costs.messages.loadError')}</p>
        <Button size="sm" variant="outline" onClick={() => void reload()}>
          {t('costs.retry')}
        </Button>
      </div>
    );
  }

  const columns = ['date', 'product', 'color', 'package', 'price', 'recipient', 'seller', 'notes'] as const;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5 pb-4" data-testid="contact-costs-tab">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground tabular-nums">
          {sorted.length > 0
            ? [
                t('costs.summary.count', { count: sorted.length }),
                t('costs.summary.products', { count: codes.length }),
                t('costs.summary.lastSent', {
                  date: formatSentOn(sorted[0].sent_on, currentLanguage),
                }),
              ].join(' · ')
            : null}
        </p>
        {canUpdate && !formOpen && (
          <Button size="sm" onClick={() => setFormOpen(true)}>
            <Plus className="mr-1 h-4 w-4" />
            {t('costs.new')}
          </Button>
        )}
      </div>

      {formOpen && (
        <CostForm
          known={costs}
          defaultRecipient={recipient}
          onSubmit={handleCreate}
          onClose={() => setFormOpen(false)}
        />
      )}

      {sorted.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
          {t('costs.empty')}
        </p>
      ) : (
        <>
          <section aria-labelledby="costs-latest-title" className="grid gap-2">
            <h2
              id="costs-latest-title"
              className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
            >
              {t('costs.latest.title')}
            </h2>
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full border-collapse text-sm" data-testid="costs-latest">
                <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-3 py-2 font-semibold">
                      {t('costs.columns.product')}
                    </th>
                    {latest.packages.map(pack => (
                      <th key={pack.key} scope="col" className="px-3 py-2 font-semibold">
                        {formatPackage(pack, currentLanguage, t)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {latest.products.map(row => (
                    <tr key={row.code} className="border-t border-border align-top">
                      <th scope="row" className="px-3 py-2 text-left font-normal">
                        <button
                          type="button"
                          aria-pressed={filter === row.code}
                          onClick={() => setProduct(filter === row.code ? ALL : row.code)}
                          className="text-left hover:underline"
                        >
                          <span className="block font-semibold">{row.code}</span>
                          {row.color && (
                            <span className="block text-xs text-muted-foreground">{row.color}</span>
                          )}
                        </button>
                      </th>
                      {latest.packages.map(pack => {
                        const cell = row.cells[pack.key];
                        if (!cell) {
                          return (
                            <td key={pack.key} className="px-3 py-2 text-muted-foreground">
                              —
                            </td>
                          );
                        }
                        return (
                          <td
                            key={pack.key}
                            className={`min-w-[8rem] px-3 py-2 ${cell.fresh ? 'bg-primary/10' : ''}`}
                          >
                            <span className="block font-semibold tabular-nums">
                              {formatPrice(cell.last, currentLanguage, t)}
                            </span>
                            <span className="block text-xs text-muted-foreground">
                              {formatSentOn(cell.last.sent_on, currentLanguage)}
                            </span>
                            {cell.before && (
                              <span className="block text-xs text-muted-foreground">
                                {t('costs.latest.before', {
                                  price: formatPrice(cell.before, currentLanguage, t),
                                })}
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground">{t('costs.latest.legend')}</p>
          </section>

          <section aria-labelledby="costs-log-title" className="grid gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2
                id="costs-log-title"
                className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              >
                {t('costs.log.title')}
              </h2>
              <Select value={filter} onValueChange={setProduct}>
                <SelectTrigger className="h-8 w-auto min-w-[10rem]" aria-label={t('costs.log.filter')}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>{t('costs.log.allProducts')}</SelectItem>
                  {codes.map(code => (
                    <SelectItem key={code} value={code}>
                      {code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full border-collapse text-sm" data-testid="costs-log">
                <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                  <tr>
                    {columns.map(column => (
                      <th
                        key={column}
                        scope="col"
                        className={`whitespace-nowrap px-3 py-2 font-semibold ${
                          column === 'package' || column === 'price' ? 'text-right' : ''
                        }`}
                      >
                        {t(`costs.columns.${column}`)}
                      </th>
                    ))}
                    {canUpdate && (
                      <th scope="col" className="w-10 px-2 py-2">
                        <span className="sr-only">{t('costs.actions')}</span>
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((cost, index) => (
                    <tr
                      key={cost.id}
                      className={`border-t ${
                        index > 0 && rows[index - 1].sent_on !== cost.sent_on
                          ? 'border-t-2 border-t-foreground/30'
                          : 'border-border'
                      }`}
                    >
                      <td className="whitespace-nowrap px-3 py-2 tabular-nums">
                        {formatSentOn(cost.sent_on, currentLanguage)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 font-semibold">{cost.product_code}</td>
                      <td className="px-3 py-2">{cost.color}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                        {formatPackage(cost, currentLanguage, t)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                        {formatPrice(cost, currentLanguage, t)}
                      </td>
                      <td className="px-3 py-2">{cost.recipient}</td>
                      <td className="px-3 py-2">{cost.user?.name}</td>
                      <td className="px-3 py-2 text-muted-foreground">{cost.notes}</td>
                      {canUpdate && (
                        <td className="px-2 py-1 text-right">
                          {confirmingId === cost.id ? (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => void handleRemove(cost.id)}
                            >
                              {t('costs.confirmDelete')}
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              aria-label={t('costs.delete')}
                              title={t('costs.delete')}
                              onClick={() => setConfirmingId(cost.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
