import { useParams, Link } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { useSeoMeta } from '@unhead/react';
import { getPageTitle, getPageDescription } from '@/lib/siteConfig';
import { AppCard } from '@/components/AppCard';
import { AppCardSkeleton } from '@/components/AppCardSkeleton';
import { useAppsByTag } from '@/hooks/useAppsByTag';
import { RelaySelector } from '@/components/RelaySelector';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tag, ArrowLeft } from 'lucide-react';

export default function AppsByTagPage() {
  const { tag } = useParams<{ tag: string }>();
  const { data: apps, isLoading, error } = useAppsByTag(tag || '');

  useSeoMeta({
    title: tag ? getPageTitle(`Apps tagged "${tag}"`) : getPageTitle('Apps by Tag'),
    description: getPageDescription('apps-by-tag', { tag }),
  });

  if (!tag) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center space-x-3">
              <div className="relative">
                <Tag className="h-8 w-8 text-primary" />
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl"></div>
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold gradient-text">Apps by Tag</h1>
            </div>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              No tag specified. Please provide a tag to filter apps.
            </p>
          </div>
          
          <div className="flex justify-center">
            <Button asChild variant="outline">
              <Link to="/apps">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to All Apps
              </Link>
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-3">
            <div className="relative">
              <Tag className="h-8 w-8 text-primary" />
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl"></div>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold gradient-text">
              Apps tagged with{' '}
              <Badge variant="secondary" className="text-lg px-3 py-1">
                {tag}
              </Badge>
            </h1>
          </div>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Discover Nostr applications tagged with "{tag}". Browse apps by category and find the perfect tools for your needs.
          </p>
        </div>

        <div className="flex justify-center">
          <Button asChild variant="outline">
            <Link to="/apps">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to All Apps
            </Link>
          </Button>
        </div>

        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <AppCardSkeleton key={i} />
            ))}
          </div>
        )}

        {error && (
          <Card className="border-dashed">
            <CardContent className="py-12 px-8 text-center">
              <div className="max-w-sm mx-auto space-y-6">
                <p className="text-muted-foreground">
                  Failed to load apps with tag "{tag}". Please try again or switch to another relay.
                </p>
                <RelaySelector className="w-full" />
              </div>
            </CardContent>
          </Card>
        )}

        {!isLoading && !error && apps && apps.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="py-12 px-8 text-center">
              <div className="max-w-sm mx-auto space-y-6">
                <p className="text-muted-foreground">
                  No apps found with tag "{tag}". Try another relay or browse all apps.
                </p>
                <RelaySelector className="w-full" />
              </div>
            </CardContent>
          </Card>
        )}

        {!isLoading && !error && apps && apps.length > 0 && (
          <div className="space-y-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Found {apps.length} app{apps.length === 1 ? '' : 's'} tagged with "{tag}"
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {apps.map((app) => (
                <AppCard key={app.id} app={app} />
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}