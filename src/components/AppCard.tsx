import { Link } from 'react-router-dom';
import { nip19 } from 'nostr-tools';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuthor } from '@/hooks/useAuthor';
import { genUserName } from '@/lib/genUserName';
import type { AppInfo } from '@/hooks/useApps';
import { ExternalLink, Globe, Smartphone, Monitor } from 'lucide-react';
import { useAppConfig } from '@/components/AppProvider';

interface AppCardProps {
  app: AppInfo;
  /** Optional actions slot for additional buttons */
  actions?: React.ReactNode;
  className?: string;
}

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

function getAppIcon(app: AppInfo): string {
  // Use app picture if available, otherwise use author picture, otherwise fallback
  return app.picture || '';
}

function getAppName(app: AppInfo, authorName?: string): string {
  return app.name || authorName || genUserName(app.pubkey);
}

export function AppCard({ app, className }: AppCardProps) {
  const author = useAuthor(app.pubkey);
  const authorMetadata = author.data?.metadata;
  const { config } = useAppConfig();

  const appName = getAppName(app, authorMetadata?.name);
  const appIcon = getAppIcon(app) || authorMetadata?.picture;
  const appDescription = app.about || authorMetadata?.about;
  const appWebsite = app.website || authorMetadata?.website;

  return (
    <Card className={`h-full flex flex-col hover:shadow-lg transition-all duration-300 hover:border-primary/50 ${className || ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start space-x-3">
          <Link
            to={`/${nip19.naddrEncode({
              kind: 31990,
              pubkey: app.pubkey,
              identifier: app.dTag,
              relays: [config.relayUrl],
            })}`}
            className="hover:opacity-80 transition-opacity"
          >
            <Avatar className="h-12 w-12 border-2 border-primary/20 cursor-pointer">
              <AvatarImage src={appIcon} alt={appName} />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {appName.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </Link>

          <div className="flex-1 min-w-0">
            <Link
              to={`/${nip19.naddrEncode({
                kind: 31990,
                pubkey: app.pubkey,
                identifier: app.dTag,
                relays: [config.relayUrl],
              })}`}
              className="hover:text-primary transition-colors"
            >
              <h3 className="font-semibold text-lg leading-tight truncate hover:underline">{appName}</h3>
            </Link>
            <p className="text-sm text-muted-foreground mt-1">
              by{' '}
              <Link
                to={`/${nip19.npubEncode(app.pubkey)}`}
                className="hover:text-primary transition-colors hover:underline"
              >
                {authorMetadata?.name || genUserName(app.pubkey)}
              </Link>
            </p>
          </div>
        </div>

        {appDescription && (
          <p className="text-sm text-muted-foreground line-clamp-2 mt-2">
            {appDescription}
          </p>
        )}
      </CardHeader>

      <CardContent className="flex-1 flex flex-col space-y-4">
        {/* Supported Event Types */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">Supports</h4>
          <div className="flex flex-wrap gap-1">
            {app.supportedKinds.slice(0, 3).map((kind) => (
              <Link key={kind} to={`/kind/${kind}`}>
                <Badge variant="secondary" className="text-xs hover:bg-secondary/80 transition-colors cursor-pointer">
                  {getKindName(kind)}
                </Badge>
              </Link>
            ))}
            {app.supportedKinds.length > 3 && (
              <Link to={`/${nip19.naddrEncode({
                kind: 31990,
                pubkey: app.pubkey,
                identifier: app.dTag,
                relays: [config.relayUrl],
              })}`}>
                <Badge variant="outline" className="text-xs hover:bg-accent transition-colors cursor-pointer">
                  +{app.supportedKinds.length - 3} more
                </Badge>
              </Link>
            )}
          </div>
        </div>

        {/* Tags */}
        {app.tags && app.tags.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">Tags</h4>
            <div className="flex flex-wrap gap-1">
              {app.tags.slice(0, 4).map((tag) => (
                <Link key={tag} to={`/apps/t/${encodeURIComponent(tag)}`}>
                  <Badge variant="outline" className="text-xs hover:bg-accent transition-colors cursor-pointer">
                    {tag}
                  </Badge>
                </Link>
              ))}
              {app.tags.length > 4 && (
                <Link to={`/${nip19.naddrEncode({
                  kind: 31990,
                  pubkey: app.pubkey,
                  identifier: app.dTag,
                  relays: [config.relayUrl],
                })}`}>
                  <Badge variant="outline" className="text-xs text-muted-foreground hover:bg-accent transition-colors cursor-pointer">
                    +{app.tags.length - 4} more
                  </Badge>
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Platform Availability */}
        {(app.webHandlers.length > 0 || app.iosHandlers.length > 0 || app.androidHandlers.length > 0) && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">Available on</h4>
            <div className="flex items-center space-x-3 text-sm">
              {app.webHandlers.length > 0 && (
                <div className="flex items-center space-x-1 text-muted-foreground">
                  <Globe className="h-4 w-4" />
                  <span>Web</span>
                </div>
              )}
              {app.iosHandlers.length > 0 && (
                <div className="flex items-center space-x-1 text-muted-foreground">
                  <Smartphone className="h-4 w-4" />
                  <span>iOS</span>
                </div>
              )}
              {app.androidHandlers.length > 0 && (
                <div className="flex items-center space-x-1 text-muted-foreground">
                  <Monitor className="h-4 w-4" />
                  <span>Android</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex-1 flex flex-col justify-end space-y-2 pt-2">
          <Button asChild className="w-full bg-purple-600 hover:bg-purple-700 text-white">
            <Link to={`/${nip19.naddrEncode({
              kind: 31990,
              pubkey: app.pubkey,
              identifier: app.dTag,
              relays: [config.relayUrl],
            })}`}>
              View Details
            </Link>
          </Button>

          {appWebsite && (
            <Button
              onClick={() => window.open(appWebsite, '_blank', 'noopener,noreferrer')}
              variant="outline"
              className="w-full"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open App
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}