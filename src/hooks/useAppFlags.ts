import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { NostrEvent } from '@nostrify/nostrify';
import { useCurrentUser } from './useCurrentUser';
import { useNostrPublish } from './useNostrPublish';
import { useAppConfig } from '../components/AppProvider';

export interface AppFlag {
  id: string;
  appEventId: string;
  appAuthorPubkey: string;
  reporterPubkey: string;
  reportType: 'fraud' | 'spam' | 'scam' | 'duplicate' | 'inappropriate' | 'impersonation';
  content: string;
  createdAt: number;
  event: NostrEvent;
}

export interface FlagStats {
  total: number;
  byType: Record<string, number>;
}

const REPORT_TYPES = {
  fraud: 'Fake information',
  spam: 'Unwanted promotional content',
  scam: 'Malicious/deceptive content',
  duplicate: 'Duplicate entries',
  inappropriate: 'Violates community standards',
  impersonation: 'Fake identity/business'
} as const;

export function useAppFlags(appEventId: string, appAuthorPubkey: string) {
  const { user } = useCurrentUser();
  const { config } = useAppConfig();
  const queryClient = useQueryClient();
  const publishEvent = useNostrPublish();

  // Query flags for this app
  const {
    data: flags = [],
    isLoading,
    error
  } = useQuery<AppFlag[]>({
    queryKey: ['app-flags', appEventId],
    queryFn: async (): Promise<AppFlag[]> => {
      if (!appEventId || !appAuthorPubkey) return [];

      // For now, return empty array since we're focusing on fixing the publishing issue
      // We can implement proper flag querying later
      return [];
    },
    enabled: !!(appEventId && appAuthorPubkey)
  });

  // Calculate flag statistics
  const flagStats: FlagStats = flags.reduce((stats, flag) => {
    stats.total++;
    stats.byType[flag.reportType] = (stats.byType[flag.reportType] || 0) + 1;
    return stats;
  }, { total: 0, byType: {} });

  // Check if current user has already flagged this app
  const userFlag = flags.find(flag => flag.reporterPubkey === user?.pubkey);

  // Mutation to flag an app
  const flagMutation = useMutation({
    mutationFn: async ({
      reportType,
      content
    }: {
      reportType: keyof typeof REPORT_TYPES;
      content: string;
    }) => {
      if (!user) throw new Error('User must be signed in to flag content');

      const tags = [
        ['e', appEventId], // Target app event
        ['p', appAuthorPubkey], // Target app author
        ['report', reportType], // Report type
        ['l', 'app-flag', 'nostrhub.app.flags'], // Label for app flags
        ['k', '31990'] // App event kind
      ];

      const event = await publishEvent.mutateAsync({
        kind: 1984,
        content,
        tags,
        created_at: Math.floor(Date.now() / 1000),
      });

      return event;
    },
    onSuccess: () => {
      // Invalidate and refetch flags
      queryClient.invalidateQueries({ queryKey: ['app-flags', appEventId] });
    },
    onError: (error) => {
      console.error('Failed to flag app:', error);
      console.error('Error details:', {
        message: error.message,
        name: error.name,
        stack: error.stack
      });
    }
  });

  return {
    flags,
    flagStats,
    userFlag,
    isLoading,
    error,
    canFlag: !!user && !userFlag,
    reportTypes: REPORT_TYPES,
    flagApp: flagMutation.mutateAsync,
    isFlagging: flagMutation.isPending
  };
}
