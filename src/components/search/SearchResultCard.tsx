import { Link } from 'react-router-dom';
import { nip19 } from 'nostr-tools';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuthor } from '@/hooks/useAuthor';
import { useAppConfig } from '@/components/AppProvider';
import { genUserName } from '@/lib/genUserName';
import { Smartphone, GitBranch, ExternalLink } from 'lucide-react';
import type { UniversalSearchResult } from '@/lib/search/types';

interface SearchResultCardProps {
  result: UniversalSearchResult;
  className?: string;
}

export function SearchResultCard({ result, className }: SearchResultCardProps) {
  const author = useAuthor(result.pubkey);
  const { config } = useAppConfig();

  const authorName = author.data?.metadata?.name || genUserName(result.pubkey);
  const authorAvatar = author.data?.metadata?.picture;

  // Generate appropriate link based on type
  const getResultLink = () => {
    const dTag = result.event.tags.find(([name]) => name === 'd')?.[1] || '';

    if (result.type === 'app') {
      const naddr = nip19.naddrEncode({
        identifier: dTag,
        pubkey: result.pubkey,
        kind: 31990,
        relays: [config.relayUrl],
      });
      return `/apps/detail/${naddr}`;
    } else {
      const naddr = nip19.naddrEncode({
        identifier: dTag,
        pubkey: result.pubkey,
        kind: 30617,
        relays: [config.relayUrl],
      });
      return `/repositories/${naddr}`;
    }
  };

  const TypeIcon = result.type === 'app' ? Smartphone : GitBranch;
  const typeColor = result.type === 'app' ? 'text-blue-500' : 'text-green-500';
  const typeLabel = result.type === 'app' ? 'App' : 'Repository';

  return (
    <Card className={`hover:shadow-lg transition-all duration-300 ${className || ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <TypeIcon className={`h-4 w-4 ${typeColor}`} />
              <Badge variant="outline" className="text-xs">
                {typeLabel}
              </Badge>
            </div>
            <Link
              to={getResultLink()}
              className="text-lg font-semibold hover:text-primary transition-colors truncate block"
            >
              {result.name}
            </Link>
          </div>

          {result.app?.picture && (
            <Avatar className="h-12 w-12">
              <AvatarImage src={result.app.picture} alt={result.name} />
              <AvatarFallback>{result.name.charAt(0)}</AvatarFallback>
            </Avatar>
          )}
        </div>

        {result.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mt-2">
            {result.description}
          </p>
        )}
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Author info */}
        <div className="flex items-center gap-2">
          <Avatar className="h-6 w-6">
            <AvatarImage src={authorAvatar} alt={authorName} />
            <AvatarFallback>{authorName.charAt(0)}</AvatarFallback>
          </Avatar>
          <span className="text-sm text-muted-foreground truncate">
            by {authorName}
          </span>
        </div>

        {/* Tags */}
        {result.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {result.tags.slice(0, 3).map(tag => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
            {result.tags.length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{result.tags.length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* Type-specific info */}
        {result.type === 'app' && result.app?.supportedKinds && (
          <div className="text-xs text-muted-foreground">
            Supports {result.app.supportedKinds.length} event {result.app.supportedKinds.length === 1 ? 'type' : 'types'}
          </div>
        )}

        {result.type === 'repository' && result.repository?.cloneUrls?.[0] && (
          <div className="text-xs text-muted-foreground truncate">
            {result.repository.cloneUrls[0].replace(/^https?:\/\//, '')}
          </div>
        )}

        {/* External link */}
        <div className="pt-2 border-t">
          <Link
            to={getResultLink()}
            className="text-sm text-primary hover:underline inline-flex items-center gap-1"
          >
            View Details
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
