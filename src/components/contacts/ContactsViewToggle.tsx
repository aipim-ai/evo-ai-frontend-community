import { List, ListOrdered } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import type { ContactsView } from './contactsView';

interface ContactsViewToggleProps {
  value: ContactsView;
  onChange: (view: ContactsView) => void;
}

const OPTIONS = [
  { view: 'priority', icon: ListOrdered },
  { view: 'all', icon: List },
] as const;

export default function ContactsViewToggle({ value, onChange }: ContactsViewToggleProps) {
  const { t } = useLanguage('contacts');
  return (
    <div
      role="radiogroup"
      aria-label={t('priority.view.label')}
      className="inline-flex rounded-lg border border-border p-0.5"
    >
      {OPTIONS.map(({ view, icon: Icon }) => (
        <button
          key={view}
          type="button"
          role="radio"
          aria-checked={value === view}
          onClick={() => onChange(view)}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-sm transition-colors ${
            value === view
              ? 'bg-primary/10 font-medium text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Icon className="h-4 w-4" />
          {t(`priority.view.${view}`)}
        </button>
      ))}
    </div>
  );
}
