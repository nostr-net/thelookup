import { useQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';

interface DVMService {
  id: string;
  pubkey: string;
  name?: string;
  about?: string;
  picture?: string;
  kinds: number[];
  categories?: string[];
  pricing?: {
    min?: number;
    max?: number;
    currency?: string;
  };
  stats?: {
    totalJobs?: number;
    successRate?: number;
    avgResponseTime?: number;
    rating?: number;
  };
  lastSeen?: number;
  created_at: number;
}

function validateDVMService(event: { kind: number; tags: string[][] }): boolean {
  // Check if it's a NIP-89 handler information event
  if (event.kind !== 31990) return false;

  // Check for required 'k' tags (supported kinds)
  const kindTags = event.tags.filter(([name]: string[]) => name === 'k');
  if (kindTags.length === 0) return false;

  // Validate that at least one kind is in the DVM range (5000-7000)
  const supportedKinds = kindTags.map(([, kind]: string[]) => parseInt(kind, 10));
  const hasDVMKind = supportedKinds.some(kind => kind >= 5000 && kind <= 7000);
  
  return hasDVMKind;
}

function parseDVMService(event: { id: string; pubkey: string; content: string; tags: string[][]; created_at: number }): DVMService {
  let metadata: Record<string, unknown> = {};
  
  try {
    if (event.content) {
      metadata = JSON.parse(event.content);
    }
  } catch (error) {
    console.warn('Failed to parse DVM service metadata:', error);
  }

  // Extract supported kinds from 'k' tags
  const kindTags = event.tags.filter(([name]: string[]) => name === 'k');
  const kinds = kindTags
    .map(([, kind]: string[]) => parseInt(kind, 10))
    .filter(kind => !isNaN(kind) && kind >= 5000 && kind <= 7000);

  // Extract categories from 't' tags
  const categoryTags = event.tags.filter(([name]: string[]) => name === 't');
  const categories = categoryTags.map(([, category]: string[]) => category);

  // Parse pricing information from metadata or tags
  const pricingTag = event.tags.find(([name]: string[]) => name === 'price');
  let pricing: DVMService['pricing'] = undefined;
  
  if (pricingTag) {
    const [, amount, currency] = pricingTag;
    pricing = {
      min: parseInt(amount, 10),
      currency: currency || 'sats'
    };
  } else if (metadata.pricing) {
    pricing = metadata.pricing;
  }

  // Extract stats from metadata
  const stats: DVMService['stats'] = metadata.stats || {};

  return {
    id: event.id,
    pubkey: event.pubkey,
    name: typeof metadata.name === 'string' ? metadata.name : undefined,
    about: typeof metadata.about === 'string' ? metadata.about : undefined,
    picture: typeof metadata.picture === 'string' ? metadata.picture : undefined,
    kinds,
    categories: categories.length > 0 ? categories : undefined,
    pricing,
    stats: stats && Object.keys(stats).length > 0 ? stats : undefined,
    lastSeen: typeof metadata.lastSeen === 'number' ? metadata.lastSeen : undefined,
    created_at: event.created_at,
  };
}

export function useDVMServices() {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['dvm-services'],
    queryFn: async (context) => {
      const signal = AbortSignal.any([context.signal, AbortSignal.timeout(10000)]);
      
      try {
        // Query for NIP-89 handler information events
        const events = await nostr.query([
          {
            kinds: [31990], // NIP-89 handler information
            limit: 100,
          }
        ], { signal });

        // Filter and parse DVM services
        const services = events
          .filter(validateDVMService)
          .map(parseDVMService)
          .sort((a, b) => {
            // Sort by last seen (if available), then by creation date
            const aTime = a.lastSeen || a.created_at;
            const bTime = b.lastSeen || b.created_at;
            return bTime - aTime;
          });

        return services;
      } catch (error) {
        console.error('Failed to fetch DVM services:', error);
        return [];
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useDVMService(pubkey: string) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['dvm-service', pubkey],
    queryFn: async (context) => {
      const signal = AbortSignal.any([context.signal, AbortSignal.timeout(5000)]);
      
      try {
        // Query for specific service's handler information
        const events = await nostr.query([
          {
            kinds: [31990],
            authors: [pubkey],
            limit: 1,
          }
        ], { signal });

        const event = events.find(validateDVMService);
        return event ? parseDVMService(event) : null;
      } catch (error) {
        console.error('Failed to fetch DVM service:', error);
        return null;
      }
    },
    enabled: !!pubkey,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}