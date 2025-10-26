import { Link, useNavigate } from 'react-router-dom';
import { useAuthor } from '@/hooks/useAuthor';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { nip19 } from 'nostr-tools';
import { NostrEvent } from '@/types/nostr';
import { genUserName } from '@/lib/genUserName';
import { GitFork } from 'lucide-react';
import { useAppConfig } from './AppProvider';

/**
 * Extracts the first paragraph from markdown/text content, skipping headers and other elements
 */
function extractFirstParagraph(content: string, maxLength: number = 140): string {
  if (!content) return '';
  
  // Split into lines and filter out empty lines
  const lines = content.split('\n').map(line => line.trim()).filter(Boolean);
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const nextLine = i + 1 < lines.length ? lines[i + 1] : '';
    
    // Skip markdown headers (# ## ### etc)
    if (line.startsWith('#')) continue;
    
    // Skip setext-style headers (underlined with = or -)
    if (nextLine && (nextLine.match(/^=+$/) || nextLine.match(/^-+$/))) {
      i++; // Skip the next line too (the underline)
      continue;
    }
    
    // Skip horizontal rules
    if (line.match(/^[-*_]{3,}$/)) continue;
    
    // Skip code blocks
    if (line.startsWith('```')) continue;
    
    // Skip list items (- * +)
    if (line.match(/^[-*+]\s/)) continue;
    
    // Skip numbered lists
    if (line.match(/^\d+\.\s/)) continue;
    
    // Skip blockquotes
    if (line.startsWith('>')) continue;
    
    // Skip lines that are entirely inline code blocks (with possible whitespace)
    if (line.match(/^\s*(`[^`]*`\s*)+$/)) continue;
    
    // Skip lines that are just punctuation or special chars
    if (line.match(/^[^\w\s]*$/)) continue;
    
    // If we found a substantial line, use it
    if (line.length > 10) {
      // Remove markdown formatting
      let cleaned = line
        .replace(/\*\*(.*?)\*\*/g, '$1') // bold
        .replace(/\*(.*?)\*/g, '$1')     // italic
        .replace(/`(.*?)`/g, '$1')       // inline code
        .replace(/\[(.*?)\]\(.*?\)/g, '$1') // links
        .trim();
      
      // Truncate to maxLength
      if (cleaned.length > maxLength) {
        cleaned = cleaned.substring(0, maxLength).trim();
        // Try to break at a word boundary
        const lastSpace = cleaned.lastIndexOf(' ');
        if (lastSpace > maxLength * 0.7) {
          cleaned = cleaned.substring(0, lastSpace);
        }
        cleaned += '...';
      }
      
      return cleaned;
    }
  }
  
  // Fallback: just take the first maxLength characters
  const fallback = content.replace(/\n/g, ' ').trim();
  if (fallback.length > maxLength) {
    return fallback.substring(0, maxLength).trim() + '...';
  }
  return fallback;
}

interface CustomNipCardProps {
  event: NostrEvent;
  /** Maximum number of kinds to display before showing "+X more" */
  maxKinds?: number;
  /** Additional CSS classes */
  className?: string;
  /** Optional actions slot for additional buttons */
  actions?: React.ReactNode;
}

export function CustomNipCard({ 
  event, 
  maxKinds = 2, 
  className = "",
  actions
}: CustomNipCardProps) {
  const navigate = useNavigate();
  const author = useAuthor(event.pubkey);
  const title = event.tags.find((tag: string[]) => tag[0] === 'title')?.[1] || 'Untitled NIP';
  const kinds = event.tags.filter((tag: string[]) => tag[0] === 'k').map((tag: string[]) => tag[1]);
  const dTag = event.tags.find((tag: string[]) => tag[0] === 'd')?.[1] || '';
  const contentPreview = extractFirstParagraph(event.content, 140);
  const displayName = author.data?.metadata?.name ?? genUserName(event.pubkey);
  const { config } = useAppConfig();
  
  // Check if this is a fork
  const forkATag = event.tags.find((tag: string[]) => tag[0] === 'a' && tag[3] === 'fork')?.[1];
  const forkITag = event.tags.find((tag: string[]) => tag[0] === 'i' && tag[2] === 'fork')?.[1];
  const isForked = !!(forkATag || forkITag);
  
  const naddr = nip19.naddrEncode({
    identifier: dTag,
    pubkey: event.pubkey,
    kind: event.kind,
    relays: [config.relayUrl],
  });

  return (
    <Card className={`glass border-accent/20 hover:border-accent/40 transition-all duration-300 hover:shadow-lg hover:shadow-accent/10 group h-full ${className}`}>
      <Link to={`/${naddr}`} className="block h-full">
        <CardContent className="p-3 sm:p-4 card-content h-full flex flex-col">
          <div className="space-y-2 sm:space-y-3 flex flex-col h-full">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-purple-700 dark:text-accent group-hover:text-primary transition-colors text-sm sm:text-base leading-tight flex-1 min-w-0">
                {title}
              </h3>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Badge variant="outline" className="bg-purple-100 text-purple-700 dark:bg-accent/10 dark:text-accent border-purple-300 dark:border-accent/20 text-xs">
                  Custom
                </Badge>
                {isForked && (
                  <Badge variant="outline" className="bg-orange-500/10 text-orange-500 border-orange-500/20 text-xs">
                    <GitFork className="h-3 w-3 mr-1" />
                    Fork
                  </Badge>
                )}

                {actions && (
                  <div onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}>
                    {actions}
                  </div>
                )}
              </div>
            </div>
            
            {contentPreview && (
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed flex-1">
                {contentPreview}
              </p>
            )}
            
            {kinds.length > 0 && (
              <div className="flex items-center flex-wrap gap-1">
                <span className="text-xs text-muted-foreground flex-shrink-0">Kinds:</span>
                {kinds.slice(0, maxKinds).map(kind => (
                  <Badge 
                    key={kind} 
                    variant="secondary" 
                    className="text-xs bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 transition-colors cursor-pointer"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      navigate(`/kind/${kind}`);
                    }}
                  >
                    {kind}
                  </Badge>
                ))}
                {kinds.length > maxKinds && (
                  <span className="text-xs text-muted-foreground">+{kinds.length - maxKinds} more</span>
                )}
              </div>
            )}
            
            <div className="flex items-center space-x-2 min-w-0 mt-auto">
              <button
                className="flex-shrink-0"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  navigate(`/${nip19.npubEncode(event.pubkey)}`);
                }}
              >
                <Avatar className="h-5 w-5 sm:h-6 sm:w-6 ring-2 ring-accent/20 hover:ring-primary/30 transition-all">
                  <AvatarImage src={author.data?.metadata?.picture} />
                  <AvatarFallback className="text-xs bg-accent/10 text-accent">
                    {displayName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              </button>
              <button 
                className="text-xs text-muted-foreground hover:text-primary transition-colors truncate min-w-0 flex-1 text-left"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  navigate(`/${nip19.npubEncode(event.pubkey)}`);
                }}
              >
                {displayName}
              </button>
              <span className="text-xs text-muted-foreground/60 flex-shrink-0">
                {new Date(event.created_at * 1000).toLocaleDateString()}
              </span>
            </div>
          </div>
        </CardContent>
      </Link>
    </Card>
  );
}

