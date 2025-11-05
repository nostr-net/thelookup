import { useParams, Link } from 'react-router-dom';
import { useSeoMeta } from '@unhead/react';
import { nip19 } from 'nostr-tools';
import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { getPageTitle, getPageDescription } from '@/lib/siteConfig';
import { useApp } from '@/hooks/useApp';
import { useAuthor } from '@/hooks/useAuthor';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAppFlags } from '@/hooks/useAppFlags';
import { genUserName } from '@/lib/genUserName';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { RelaySelector } from '@/components/RelaySelector';
import { FlagDialog } from '@/components/FlagDialog';
import { FlagStats } from '@/components/FlagStats';
import {
  ExternalLink,
  Globe,
  Smartphone,
  Monitor,
  User,
  Calendar,
  Edit,
  ArrowLeft,
  Zap,
  Download,
  ChevronDown,
  ChevronUp,
  AlertTriangle
} from 'lucide-react';
import NotFound from './NotFound';

const KIND_NAMES: Record<number, string> = {
  1: 'Text Notes',
  6: 'Reposts',
  7: 'Reactions',
  9: 'Chat Messages',
  30023: 'Articles',
  31922: 'Calendar Events',
  31923: 'Calendar Events',
  30402: 'Classified Listings',
  1063: 'File Metadata',
  30078: 'App Data',
  // Add more as needed
};

function getKindName(kind: number): string {
  return KIND_NAMES[kind] || `Kind ${kind}`;
}

export default function AppDetailPage() {
  const { nip19: nip19Param } = useParams<{ nip19: string }>();
  const { user } = useCurrentUser();
  const [showAllKinds, setShowAllKinds] = useState(false);
  
  // Always call hooks at the top level
  const { data: app, isLoading, error } = useApp(nip19Param || '');
  const author = useAuthor(app?.pubkey || '');
  const authorMetadata = author.data?.metadata;

  // Get flagging data for this app
  const { flagStats, canFlag, userFlag, isLoading: _isFlagsLoading } = useAppFlags(app?.id || '', app?.pubkey || '');

  // Set SEO meta
  useSeoMeta({
    title: app ? getPageTitle(app.name || 'Nostr App') : getPageTitle('App Details'),
    description: getPageDescription('app', { appName: app?.name || 'this app' }),
  });
  
  if (!nip19Param) {
    return <NotFound />;
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto px-4 sm:px-0">
          {/* Back Button Skeleton */}
          <div className="mb-6">
            <Skeleton className="h-10 w-32" />
          </div>

          {/* Header Skeleton */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-start space-x-4">
                <Skeleton className="h-16 w-16 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-8 w-64" />
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Content Skeletons */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-48" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <Skeleton key={i} className="h-8 w-32" />
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-32" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-10 w-full" />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !app) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto px-4 sm:px-0">
          <Button variant="ghost" asChild className="mb-6">
            <Link to="/apps">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Apps
            </Link>
          </Button>

          <Card className="border-dashed">
            <CardContent className="py-12 px-8 text-center">
              <div className="max-w-sm mx-auto space-y-6">
                <div className="space-y-2">
                  <Smartphone className="h-12 w-12 text-muted-foreground mx-auto" />
                  <h3 className="text-lg font-medium">App Not Found</h3>
                  <p className="text-muted-foreground">
                    This app could not be found. It may have been deleted or you may be on the wrong relay.
                  </p>
                </div>
                <RelaySelector className="w-full" />
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  const appName = app.name || authorMetadata?.name || genUserName(app.pubkey);
  const appIcon = app.picture || authorMetadata?.picture;
  const appDescription = app.about || authorMetadata?.about;
  const appWebsite = app.website || authorMetadata?.website;
  const authorName = authorMetadata?.name || genUserName(app.pubkey);
  const isOwner = user?.pubkey === app.pubkey;

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-0">
        {/* Back Button */}
        <Button variant="ghost" asChild className="mb-6">
          <Link to="/apps">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Apps
          </Link>
        </Button>

        {/* App Header */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-4">
                <Avatar className="h-16 w-16 border-2 border-primary/20">
                  <AvatarImage src={appIcon} alt={appName} />
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold text-lg">
                    {appName.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <h1 className="text-2xl font-bold leading-tight">{appName}</h1>
                  <p className="text-muted-foreground mt-1">
                    by{' '}
                    <Link 
                      to={`/${nip19.npubEncode(app.pubkey)}`}
                      className="hover:text-primary transition-colors hover:underline"
                    >
                      {authorName}
                    </Link>
                  </p>
                  {appDescription && (
                    <p className="text-muted-foreground mt-3 leading-relaxed">
                      {appDescription}
                    </p>
                  )}
                  
                  {/* App Metadata */}
                  <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-4 w-4" />
                        <span>Added {new Date(app.createdAt * 1000).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Zap className="h-4 w-4" />
                        <span>{app.supportedKinds.length} event types</span>
                      </div>
                    </div>

                    {/* Flag Button */}
                    <div className="ml-6">
                      <FlagDialog app={app}>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={!canFlag}
                          className="text-xs border-yellow-500 text-yellow-600 hover:bg-yellow-50 hover:text-yellow-700 hover:border-yellow-600 dark:text-yellow-500 dark:border-yellow-600 dark:hover:bg-yellow-950 dark:hover:text-yellow-400 dark:hover:border-yellow-500"
                        >
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          {userFlag ? 'Flagged' : 'Flag'}
                        </Button>
                      </FlagDialog>
                    </div>
                  </div>
                </div>
              </div>

              {/* Edit Button for Owner */}
              {isOwner && (
                <Button variant="outline" asChild>
                  <Link to={`/apps/edit/${nip19Param}`}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Link>
                </Button>
              )}
            </div>
          </CardHeader>
        </Card>

        {/* Flag Stats Section */}
        {flagStats.total > 0 && (
          <Card className="mb-6 border-yellow-200 bg-yellow-50/50">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  <span className="font-medium text-yellow-800">
                    This app has been flagged {flagStats.total} {flagStats.total === 1 ? 'time' : 'times'}
                  </span>
                </div>
                <FlagStats flagStats={flagStats} canFlag={canFlag} />
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:items-stretch">
          {/* Main Content */}
          <div className="lg:col-span-2 flex flex-col space-y-6">
            {/* Supported Event Types */}
            <Card className="flex-1">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Zap className="h-5 w-5" />
                    <span>Supported Event Types</span>
                  </div>
                  {app.supportedKinds.length > 8 && (
                    <Badge variant="outline" className="text-xs">
                      {app.supportedKinds.length} total
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(showAllKinds ? app.supportedKinds : app.supportedKinds.slice(0, 8)).map((kind) => (
                      <Link key={kind} to={`/kind/${kind}`}>
                        <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors cursor-pointer">
                          <span className="font-medium">{getKindName(kind)}</span>
                          <Badge variant="secondary">Kind {kind}</Badge>
                        </div>
                      </Link>
                    ))}
                  </div>
                  
                  {app.supportedKinds.length > 8 && (
                    <div className="flex justify-center pt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowAllKinds(!showAllKinds)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        {showAllKinds ? (
                          <>
                            <ChevronUp className="h-4 w-4 mr-1" />
                            Show Less
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-4 w-4 mr-1" />
                            Show All ({app.supportedKinds.length - 8} more)
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Platform Handlers */}
            {(app.webHandlers.length > 0 || app.iosHandlers.length > 0 || app.androidHandlers.length > 0) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Download className="h-5 w-5" />
                    <span>Platform Handlers</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Web Handlers */}
                  {app.webHandlers.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium flex items-center space-x-2">
                        <Globe className="h-4 w-4" />
                        <span>Web</span>
                      </h4>
                      <div className="space-y-2">
                        {app.webHandlers.map((handler, index) => (
                          <div key={index} className="flex items-center justify-between p-2 rounded border">
                            <span className="text-sm font-mono truncate">{handler.url}</span>
                            {handler.type && (
                              <Badge variant="outline" className="text-xs">
                                {handler.type}
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* iOS Handlers */}
                  {app.iosHandlers.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium flex items-center space-x-2">
                        <Smartphone className="h-4 w-4" />
                        <span>iOS</span>
                      </h4>
                      <div className="space-y-2">
                        {app.iosHandlers.map((handler, index) => (
                          <div key={index} className="p-2 rounded border">
                            <span className="text-sm font-mono">{handler}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Android Handlers */}
                  {app.androidHandlers.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium flex items-center space-x-2">
                        <Monitor className="h-4 w-4" />
                        <span>Android</span>
                      </h4>
                      <div className="space-y-2">
                        {app.androidHandlers.map((handler, index) => (
                          <div key={index} className="p-2 rounded border">
                            <span className="text-sm font-mono">{handler}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="flex flex-col space-y-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {appWebsite && (
                  <Button 
                    onClick={() => window.open(appWebsite, '_blank', 'noopener,noreferrer')}
                    className="w-full"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open App
                  </Button>
                )}
                
                <Button variant="outline" asChild className="w-full">
                  <Link to={`/${nip19.npubEncode(app.pubkey)}`}>
                    <User className="h-4 w-4 mr-2" />
                    View Developer
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* Tags */}
            {app.tags && app.tags.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Tags</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {app.tags.map((tag) => (
                      <Link key={tag} to={`/apps/t/${encodeURIComponent(tag)}`}>
                        <Badge variant="outline" className="hover:bg-accent transition-colors cursor-pointer">
                          {tag}
                        </Badge>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* App Info */}
            <Card>
              <CardHeader>
                <CardTitle>App Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Developer:</span>
                    <span className="font-medium">{authorName}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Added:</span>
                    <span className="font-medium">
                      {new Date(app.createdAt * 1000).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Event Types:</span>
                    <span className="font-medium">{app.supportedKinds.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Platforms:</span>
                    <span className="font-medium">
                      {[
                        app.webHandlers.length > 0 && 'Web',
                        app.iosHandlers.length > 0 && 'iOS', 
                        app.androidHandlers.length > 0 && 'Android'
                      ].filter(Boolean).join(', ') || 'None'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}