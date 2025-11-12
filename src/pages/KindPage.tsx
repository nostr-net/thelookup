import { Link, useParams } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { useSeoMeta } from '@unhead/react';
import { getPageTitle, getPageDescription } from '@/lib/siteConfig';
import { CustomNipCard } from '@/components/CustomNipCard';
import { OfficialNipCard } from '@/components/OfficialNipCard';
import { useAllNipsByKind } from '@/hooks/useAllNipsByKind';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, FileText, AlertCircle, Hash } from 'lucide-react';
import type { NostrEvent } from '@/types/nostr';
import type { OfficialNip } from '@/hooks/useOfficialNips';

export default function KindPage() {
  const { k } = useParams<{ k: string }>();
  const kind = k || '';
  const { data: nips, isLoading, error } = useAllNipsByKind(kind);

  useSeoMeta({
    title: getPageTitle(`Kind ${kind} NIPs`),
    description: getPageDescription(`Explore Nostr event kind ${kind} and its implementations`),
  });

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" asChild>
            <Link to="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Link>
          </Button>
        </div>

        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Hash className="h-6 w-6" />
            <h1 className="text-3xl font-bold">Kind {kind} NIPs</h1>
          </div>
          <p className="text-muted-foreground">
            Official and custom NIPs that define event kind {kind}
          </p>

          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-3/4" />
                    <div className="flex items-center space-x-2">
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-2/3" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Failed to load NIPs for kind {kind}. Please try again.
              </AlertDescription>
            </Alert>
          ) : nips && nips.length > 0 ? (
            <div className="space-y-4">
              {nips.map((nipResult) => {
                if (nipResult.type === 'official') {
                  const officialNip = nipResult.data as OfficialNip;
                  return (
                    <OfficialNipCard 
                      key={`official-${officialNip.number}`} 
                      nip={officialNip} 
                      maxKinds={3} 
                    />
                  );
                } else {
                  const customEvent = nipResult.data as NostrEvent;
                  return (
                    <CustomNipCard 
                      key={`custom-${customEvent.id}`} 
                      event={customEvent} 
                      maxKinds={3} 
                    />
                  );
                }
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Hash className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No NIPs found</h3>
                <p className="text-muted-foreground mb-4">
                  No NIPs have been found for kind {kind} yet.
                </p>
                <Button asChild>
                  <Link to="/create">
                    <FileText className="h-4 w-4 mr-2" />
                    Create a NIP for Kind {kind}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  );
}

