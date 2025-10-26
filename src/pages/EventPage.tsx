import { useParams } from 'react-router-dom';
import { nip19 } from 'nostr-tools';
import { useSeoMeta } from '@unhead/react';
import { getPageTitle, getPageDescription } from '@/lib/siteConfig';

import { Layout } from '@/components/Layout';
import { EventViewer } from '@/components/EventViewer';
import { useEvent } from '@/hooks/useEvent';
import { useAddressableEvent } from '@/hooks/useAddressableEvent';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RelaySelector } from '@/components/RelaySelector';
import { AlertTriangle } from 'lucide-react';

interface EventPageProps {
  nip19?: string;
}

export default function EventPage({ nip19: propNip19 }: EventPageProps) {
  const { nip19: paramNip19 } = useParams<{ nip19: string }>();
  const nip19Identifier = propNip19 || paramNip19;

  useSeoMeta({
    title: getPageTitle('Nostr Event'),
    description: getPageDescription('event'),
  });

  if (!nip19Identifier) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              No event identifier provided.
            </AlertDescription>
          </Alert>
        </div>
      </Layout>
    );
  }

  let decoded;
  try {
    decoded = nip19.decode(nip19Identifier);
  } catch (error) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Invalid Nostr identifier: {error instanceof Error ? error.message : 'Unknown error'}
            </AlertDescription>
          </Alert>
        </div>
      </Layout>
    );
  }

  // Handle different types of Nostr identifiers
  if (decoded.type === 'nevent' || decoded.type === 'note') {
    const eventId = decoded.type === 'nevent' ? decoded.data.id : decoded.data;
    return <RegularEventView eventId={eventId} />;
  } else if (decoded.type === 'naddr') {
    return <AddressableEventView naddr={decoded.data} />;
  } else {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Unsupported identifier type: {decoded.type}
            </AlertDescription>
          </Alert>
        </div>
      </Layout>
    );
  }
}

function RegularEventView({ eventId }: { eventId: string }) {
  const { data: event, isLoading, error } = useEvent(eventId);

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <EventSkeleton />
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <EventNotFound error={error} />
        </div>
      </Layout>
    );
  }

  if (!event) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <EventNotFound error={new Error('Event not found')} />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <EventViewer event={event} />
      </div>
    </Layout>
  );
}

function AddressableEventView({ naddr }: { naddr: { kind: number; pubkey: string; identifier: string } }) {
  const { data: event, isLoading, error } = useAddressableEvent(naddr);

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <EventSkeleton />
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <EventNotFound error={error} />
        </div>
      </Layout>
    );
  }

  if (!event) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <EventNotFound error={new Error('Event not found')} />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <EventViewer event={event} />
      </div>
    </Layout>
  );
}

function EventSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <div className="flex items-center space-x-2">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-3 w-3 rounded-full" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-4 w-3/5" />
        </div>
        <Skeleton className="h-10 w-full" />
      </CardContent>
    </Card>
  );
}

function EventNotFound({ error }: { error: Error }) {
  return (
    <Card className="border-dashed">
      <CardContent className="py-12 px-8 text-center">
        <div className="max-w-sm mx-auto space-y-6">
          <div className="space-y-2">
            <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground" />
            <h3 className="text-lg font-semibold">Event Not Found</h3>
            <p className="text-muted-foreground">
              {error.message || 'The requested event could not be found.'}
            </p>
          </div>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Try switching to a different relay to find this event.
            </p>
            <RelaySelector className="w-full" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}