import { Link } from 'react-router-dom';
import { nip19 } from 'nostr-tools';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Smartphone, GitBranch, ExternalLink, Globe } from 'lucide-react';
import { useAuthor } from '@/hooks/useAuthor';
import { genUserName } from '@/lib/genUserName';
import { useAppConfig } from '@/components/AppProvider';
import type { UniversalSearchResult } from '@/lib/search/types';

interface SearchResultListItemProps {
  result: UniversalSearchResult;
}

export function SearchResultListItem({ result }: SearchResultListItemProps) {
  const author = useAuthor(result.pubkey);
  const authorName = author.data?.metadata?.name || genUserName(result.pubkey);
  const authorAvatar = author.data?.metadata?.picture;
  const { config } = useAppConfig();

  // Generate appropriate link based on type
  const dTag = result.event.tags.find(([name]) => name === 'd')?.[1] || '';

  const naddr = nip19.naddrEncode({
    identifier: dTag,
    pubkey: result.pubkey,
    kind: result.type === 'app' ? 31990 : 30617,
    relays: [config.relayUrl],
  });

  const detailLink = `/${naddr}`;

  const TypeIcon = result.type === 'app' ? Smartphone : GitBranch;
  const typeColor = result.type === 'app' ? 'text-blue-500' : 'text-green-500';
  const typeLabel = result.type === 'app' ? 'App' : 'Repository';

  // Get icon/avatar
  const icon = result.type === 'app' ? result.app?.picture : authorAvatar;
  const fallback = result.name.slice(0, 2).toUpperCase();

  return (
    <div className="flex items-center gap-4 p-4 border-b hover:bg-muted/50 transition-colors">
      {/* Icon */}
      <div className="flex-shrink-0">
        <Avatar className="h-12 w-12">
          <AvatarImage src={icon} alt={result.name} />
          <AvatarFallback className="text-lg">{fallback}</AvatarFallback>
        </Avatar>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {/* Type Badge and Name */}
            <div className="flex items-center gap-2 mb-1">
              <TypeIcon className={`h-4 w-4 ${typeColor}`} />
              <Badge variant="outline" className="text-xs">
                {typeLabel}
              </Badge>
              <h3 className="font-semibold text-foreground hover:text-primary transition-colors truncate">
                <Link to={detailLink} className="hover:underline">
                  {result.name}
                </Link>
              </h3>
            </div>

            {/* Description */}
            {result.description && (
              <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                {result.description}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button variant="outline" size="sm" asChild>
              <Link to={detailLink}>
                <Globe className="h-4 w-4 mr-1" />
                Details
              </Link>
            </Button>

            {/* External link for apps with website or repos with web URL */}
            {result.type === 'app' && result.app?.website && (
              <Button
                size="sm"
                asChild
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                <a
                  href={result.app.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center"
                >
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Open
                </a>
              </Button>
            )}

            {result.type === 'repository' && result.repository?.webUrls?.[0] && (
              <Button
                size="sm"
                asChild
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <a
                  href={result.repository.webUrls[0]}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center"
                >
                  <ExternalLink className="h-4 w-4 mr-1" />
                  View
                </a>
              </Button>
            )}
          </div>
        </div>

        {/* Type-specific info and tags */}
        <div className="flex items-center gap-4 mt-2">
          {/* Type-specific details */}
          {result.type === 'app' && result.app?.supportedKinds && (
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">Supports:</span>
              <div className="flex flex-wrap gap-1">
                {result.app.supportedKinds.slice(0, 3).map((kind, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {kind}
                  </Badge>
                ))}
                {result.app.supportedKinds.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{result.app.supportedKinds.length - 3} more
                  </Badge>
                )}
              </div>
            </div>
          )}

          {result.type === 'repository' && result.repository?.cloneUrls?.[0] && (
            <div className="text-xs text-muted-foreground truncate">
              {result.repository.cloneUrls[0].replace(/^https?:\/\//, '')}
            </div>
          )}

          {/* Tags */}
          {result.tags.length > 0 && (
            <div className="flex items-center gap-1">
              {result.tags.slice(0, 2).map(tag => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {result.tags.length > 2 && (
                <Badge variant="outline" className="text-xs">
                  +{result.tags.length - 2}
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Author Info */}
        <div className="flex items-center gap-2 mt-2">
          <Link
            to={`/${nip19.npubEncode(result.pubkey)}`}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <Avatar className="h-4 w-4">
              <AvatarImage src={authorAvatar} alt={authorName} />
              <AvatarFallback className="text-xs">
                {authorName.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground truncate">
              by {authorName}
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
