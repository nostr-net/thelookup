import { Link } from 'react-router-dom';
import { nip19 } from 'nostr-tools';
import { type AppInfo } from '@/hooks/useApps';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ExternalLink, Globe } from 'lucide-react';
import { useAuthor } from '@/hooks/useAuthor';
import { genUserName } from '@/lib/genUserName';
import { useAppConfig } from '@/components/AppProvider';

interface AppListItemProps {
  app: AppInfo;
}

export function AppListItem({ app }: AppListItemProps) {
  const author = useAuthor(app.pubkey);
  const authorName = author.data?.metadata?.name || genUserName(app.pubkey);
  const authorAvatar = author.data?.metadata?.picture;
  const { config } = useAppConfig();

  // Generate naddr for the app (same as AppCard)
  const naddr = nip19.naddrEncode({
    kind: 31990,
    pubkey: app.pubkey,
    identifier: app.dTag,
    relays: [config.relayUrl],
  });

  // Use app name, fallback to author name, then generated name (same as AppCard)
  const displayName = app.name || authorName;

  return (
    <div className="flex items-center gap-4 p-4 border-b hover:bg-muted/50 transition-colors">
      {/* App Icon */}
      <div className="flex-shrink-0">
        <Avatar className="h-12 w-12">
          <AvatarImage src={app.picture} alt={displayName} />
          <AvatarFallback className="text-lg">
            {displayName.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </div>

      {/* App Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground hover:text-primary transition-colors truncate">
              <Link
                to={`/${naddr}`}
                className="hover:underline"
              >
                {displayName}
              </Link>
            </h3>
            {app.about && (
              <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                {app.about}
              </p>
            )}
          </div>

          {/* App Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* View Details Button */}
            <Button variant="outline" size="sm" asChild>
              <Link to={`/${naddr}`}>
                <Globe className="h-4 w-4 mr-1" />
                Details
              </Link>
            </Button>

            {/* Open App Button */}
            {app.website && (
              <Button size="sm" asChild className="bg-purple-600 hover:bg-purple-700 text-white">
                <a
                  href={app.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center"
                >
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Open
                </a>
              </Button>
            )}
          </div>
        </div>

        {/* Event Types */}
        <div className="flex items-center gap-2 mt-2">
          <span className="text-xs text-muted-foreground">Supports:</span>
          <div className="flex flex-wrap gap-1">
            {app.supportedKinds.slice(0, 3).map((kind, index) => {
              const kindInfo = [
                { kind: 1, name: 'Notes', icon: '📝' },
                { kind: 6, name: 'Reposts', icon: '🔄' },
                { kind: 7, name: 'Reactions', icon: '❤️' },
                { kind: 30023, name: 'Articles', icon: '📄' },
                { kind: 31922, name: 'Events', icon: '📅' },
                { kind: 30402, name: 'Listings', icon: '🏪' },
              ].find(k => k.kind === kind);

              return (
                <Badge key={index} variant="secondary" className="text-xs">
                  <span className="mr-1">{kindInfo?.icon}</span>
                  {kind}
                </Badge>
              );
            })}
            {app.supportedKinds.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{app.supportedKinds.length - 3} more
              </Badge>
            )}
          </div>
        </div>

        {/* Author Info */}
        <div className="flex items-center gap-2 mt-2">
          <Link
            to={`/${nip19.npubEncode(app.pubkey)}`}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <Avatar className="h-4 w-4">
              <AvatarImage src={authorAvatar} alt={authorName} />
              <AvatarFallback className="text-xs">
                {authorName.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground truncate">
              {authorName}
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
