import { Link } from 'react-router-dom';
import { nip19 } from 'nostr-tools';
import type { NostrEvent } from '@nostrify/nostrify';
import { useAppConfig } from '@/components/AppProvider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { GitBranch, Globe, Users } from 'lucide-react';
import { useAuthor } from '@/hooks/useAuthor';
import { parseRepositoryEvent, getRepositoryDisplayName } from '@/lib/repository';
import { genUserName } from '@/lib/genUserName';

interface RepositoryListItemProps {
  event: NostrEvent;
}

export function RepositoryListItem({ event }: RepositoryListItemProps) {
  const author = useAuthor(event.pubkey);
  const repo = parseRepositoryEvent(event);
  const { config } = useAppConfig();

  const displayName = getRepositoryDisplayName(repo);
  const authorName = author.data?.metadata?.name ?? genUserName(event.pubkey);
  const authorAvatar = author.data?.metadata?.picture;

  // Generate naddr for the repository
  const naddr = nip19.naddrEncode({
    identifier: repo.id,
    pubkey: event.pubkey,
    kind: 30617,
    relays: [config.relayUrl],
  });

  return (
    <div className="flex items-center gap-4 p-4 bg-background border border-b rounded-lg hover:bg-muted/50 hover:shadow-sm transition-all duration-200 mb-2 last:mb-0">
      {/* Repository Icon */}
      <div className="flex-shrink-0">
        <Avatar className="h-12 w-12">
          <AvatarFallback className="bg-primary/10 text-primary">
            <GitBranch className="h-6 w-6" />
          </AvatarFallback>
        </Avatar>
      </div>

      {/* Repository Info */}
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
            {repo.description && (
              <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                {repo.description}
              </p>
            )}
          </div>

          {/* Repository Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* View Details Button */}
            <Button variant="outline" size="sm" asChild>
              <Link to={`/${naddr}`}>
                <Globe className="h-4 w-4 mr-1" />
                Details
              </Link>
            </Button>
          </div>
        </div>

        {/* Repository Metadata */}
        <div className="flex items-center gap-4 mt-2">
          {/* Tags */}
          {repo.tags && repo.tags.length > 0 && (
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">Tags:</span>
              <div className="flex flex-wrap gap-1">
                {repo.tags.slice(0, 3).map((tag, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
                {repo.tags.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{repo.tags.length - 3}
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Web Info */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {repo.web && repo.web.length > 0 && (
              <div className="flex items-center gap-1">
                <Globe className="h-3 w-3" />
                <span>Web</span>
              </div>
            )}
          </div>
        </div>

        {/* Author Info */}
        <div className="flex items-center gap-2 mt-2">
          <Link
            to={`/${nip19.npubEncode(event.pubkey)}`}
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
