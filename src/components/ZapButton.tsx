import { Zap } from 'lucide-react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAuthor } from '@/hooks/useAuthor';
import { cn } from '@/lib/utils';
import { ZapDialog } from '@/components/ZapDialog';
import type { Event } from 'nostr-tools';

interface ZapButtonProps {
  recipientPubkey: string;
  eventId?: string;
  eventCoordinate?: string;
  className?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showLabel?: boolean;
}

export function ZapButton({
  recipientPubkey,
  eventId,
  eventCoordinate,
  className,
  variant: _variant = 'outline',
  size = 'sm',
  showLabel = true,
}: ZapButtonProps) {
  const { user: _user } = useCurrentUser();
  const { data: _author } = useAuthor(recipientPubkey);

  // Create a minimal Event object for ZapDialog
  // For addressable events (when eventCoordinate exists), use kind 30000 and proper tags
  const targetEvent: Event = {
    id: eventId || '',
    pubkey: recipientPubkey,
    created_at: Math.floor(Date.now() / 1000),
    kind: eventCoordinate ? 30000 : 1, // Use addressable event kind if coordinate provided
    tags: eventCoordinate ? [
      ['d', eventCoordinate.split(':')[2] || ''], // Extract d-tag from coordinate
      ['a', eventCoordinate], // Add a-tag for addressable events
    ] : [],
    content: '',
    sig: '',
  };

  // Don't return null - let the ZapDialog handle authentication

  return (
    <div className={className}>
      <ZapDialog
        target={targetEvent}
        className="cursor-pointer"
      >
        <button
          className={cn(
            'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground text-orange-500 hover:text-orange-600',
            size === 'sm' && 'h-8 px-3',
            size === 'default' && 'h-9 px-4 py-2',
            size === 'lg' && 'h-10 px-8',
            size === 'icon' && 'h-9 w-9',
            className
          )}
        >
          <Zap className="h-4 w-4" />
          {showLabel && size !== 'icon' && <span className="ml-1">Zap</span>}
        </button>
      </ZapDialog>
    </div>
  );
}