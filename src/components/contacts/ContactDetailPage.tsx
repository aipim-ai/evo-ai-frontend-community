import { useSearchParams } from 'react-router-dom';
import { Button, Tabs, TabsContent, TabsList, TabsTrigger } from '@evoapi/design-system';
import { ArrowLeft, MessageSquare, Users, X } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import EmptyState from '@/components/base/EmptyState';
import ContactDetailsCard from './ContactDetailsCard';
import ContactPipelineItem from '@/components/pipelines/ContactPipelineItem';
import ContactEventsTab from './ContactEventsTab';
import ContactEventsErrorBoundary from './ContactEventsErrorBoundary';
import ContactHistoryTab from './history/ContactHistoryTab';
import type { Contact, ContactFormData } from '@/types/contacts';

const TABS = ['details', 'history', 'events'] as const;
type DetailTab = (typeof TABS)[number];

interface ContactDetailPageProps {
  contact: Contact | null;
  loading: boolean;
  notFound: boolean;
  formSaving?: boolean;
  onClose: () => void;
  onSave: (data: ContactFormData) => void | Promise<void>;
  onStartConversation: (contact: Contact) => void;
  onContactUpdated?: () => void;
}

export default function ContactDetailPage({
  contact,
  loading,
  notFound,
  formSaving,
  onClose,
  onSave,
  onStartConversation,
  onContactUpdated,
}: ContactDetailPageProps) {
  const { t } = useLanguage('contacts');
  // The tab lives in the URL (?tab=history) so the priority list can link
  // straight to a contact's history and the back button keeps the tab.
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get('tab') as DetailTab | null;
  const tab: DetailTab = requested && TABS.includes(requested) ? requested : 'details';
  const changeTab = (next: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('tab', next);
    setSearchParams(params, { replace: true });
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Button variant="ghost" size="sm" onClick={onClose} className="shrink-0">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('details.page.back')}
          </Button>
          {contact && (
            <h1 className="text-base font-semibold truncate">{contact.name}</h1>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {contact && (
            <Button
              size="sm"
              onClick={() => onStartConversation(contact)}
              disabled={contact.blocked}
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              {t('details.actions.startConversation')}
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onClose} aria-label={t('details.page.close')}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto pt-4">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-muted-foreground">{t('loading.contacts')}</div>
          </div>
        ) : notFound || !contact ? (
          <EmptyState
            icon={Users}
            title={t('details.page.notFound.title')}
            description={t('details.page.notFound.description')}
            action={{
              label: t('details.page.back'),
              onClick: onClose,
            }}
            className="h-full"
          />
        ) : (
          <Tabs value={tab} onValueChange={changeTab} className="flex flex-col">
            <TabsList className="mb-4 w-full justify-start">
              <TabsTrigger value="details">{t('details.tabs.profile')}</TabsTrigger>
              <TabsTrigger value="history">{t('details.tabs.history')}</TabsTrigger>
              <TabsTrigger value="events">{t('details.tabs.events')}</TabsTrigger>
            </TabsList>
            <TabsContent value="details" className="mt-0">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pb-4">
                <ContactDetailsCard contact={contact} loading={formSaving} onSave={onSave} />
                <div className="rounded-xl border border-border p-4 self-start">
                  <h3 className="text-sm font-semibold mb-3">{t('details.tabs.pipeline')}</h3>
                  <ContactPipelineItem contactId={contact.id} onPipelineUpdated={onContactUpdated} />
                </div>
              </div>
            </TabsContent>
            <TabsContent value="history" className="mt-0">
              <ContactHistoryTab contactId={contact.id} />
            </TabsContent>
            <TabsContent value="events" className="mt-0">
              <ContactEventsErrorBoundary
                fallbackTitle={t('events.timeline.crashed.title')}
                fallbackReload={t('events.timeline.crashed.reload')}
              >
                <ContactEventsTab contactId={contact.id} />
              </ContactEventsErrorBoundary>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
