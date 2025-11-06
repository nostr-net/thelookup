import { useState } from 'react';
import { nip19 } from 'nostr-tools';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Bot, Zap, Clock, Star, ExternalLink, TrendingUp } from 'lucide-react';
import { useAuthor } from '@/hooks/useAuthor';
import { genUserName } from '@/lib/genUserName';
import { CreateJobDialog } from '@/components/CreateJobDialog';
import { formatDistanceToNow } from 'date-fns';

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

interface DVMServiceCardProps {
  service: DVMService;
}

const CATEGORY_COLORS: Record<string, string> = {
  text: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  image: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  audio: 'bg-green-500/10 text-green-500 border-green-500/20',
  video: 'bg-red-500/10 text-red-500 border-red-500/20',
  translation: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  ai: 'bg-pink-500/10 text-pink-500 border-pink-500/20',
  data: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
  code: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  other: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
};

const KIND_NAMES: Record<number, string> = {
  5000: 'Text Processing',
  5001: 'Image Generation',
  5002: 'Image Enhancement',
  5003: 'Speech to Text',
  5004: 'Text to Speech',
  5005: 'Translation',
  5006: 'Summarization',
  5007: 'Content Moderation',
  5008: 'Sentiment Analysis',
  5009: 'OCR',
  5010: 'Video Processing',
  5011: 'Audio Processing',
  5012: 'Code Analysis',
  5013: 'Data Analysis',
  5014: 'AI Chat',
  5015: 'Content Generation',
};

export function DVMServiceCard({ service }: DVMServiceCardProps) {
  const [showCreateJob, setShowCreateJob] = useState(false);
  const author = useAuthor(service.pubkey);
  const metadata = author.data?.metadata;

  const displayName = service.name || metadata?.name || genUserName(service.pubkey);
  const description = service.about || metadata?.about || 'No description available';
  const avatar = service.picture || metadata?.picture;

  const isOnline = service.lastSeen && (Date.now() - service.lastSeen * 1000) < 5 * 60 * 1000; // 5 minutes

  const formatPricing = () => {
    if (!service.pricing) return 'Pricing not specified';
    
    const { min, max, currency = 'sats' } = service.pricing;
    if (min && max && min !== max) {
      return `${min}-${max} ${currency}`;
    }
    if (min) {
      return `${min}+ ${currency}`;
    }
    if (max) {
      return `Up to ${max} ${currency}`;
    }
    return 'Contact for pricing';
  };

  return (
    <>
      <Card className="glass border-primary/20 hover:border-primary/40 transition-all duration-300 group">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              <div className="relative">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={avatar} alt={displayName} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    <Bot className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
                {isOnline && (
                  <div className="absolute -bottom-1 -right-1 h-3 w-3 bg-green-500 rounded-full border-2 border-background"></div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <CardTitle className="text-lg truncate">{displayName}</CardTitle>
                <CardDescription className="text-sm">
                  {service.stats?.totalJobs ? `${service.stats.totalJobs} jobs completed` : 'New service'}
                </CardDescription>
              </div>
            </div>
            {service.stats?.rating && (
              <div className="flex items-center space-x-1 text-yellow-500">
                <Star className="h-4 w-4 fill-current" />
                <span className="text-sm font-medium">{service.stats.rating.toFixed(1)}</span>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Description */}
          <p className="text-sm text-muted-foreground line-clamp-2">
            {description}
          </p>

          {/* Service Types */}
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Services
            </h4>
            <div className="flex flex-wrap gap-1">
              {service.kinds.slice(0, 3).map((kind) => (
                <Badge 
                  key={kind} 
                  variant="outline" 
                  className="text-xs border-primary/20 text-primary"
                >
                  {KIND_NAMES[kind] || `Kind ${kind}`}
                </Badge>
              ))}
              {service.kinds.length > 3 && (
                <Badge variant="outline" className="text-xs border-primary/20 text-muted-foreground">
                  +{service.kinds.length - 3} more
                </Badge>
              )}
            </div>
          </div>

          {/* Categories */}
          {service.categories && service.categories.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Categories
              </h4>
              <div className="flex flex-wrap gap-1">
                {service.categories.slice(0, 2).map((category) => (
                  <Badge 
                    key={category} 
                    className={`text-xs ${CATEGORY_COLORS[category] || CATEGORY_COLORS.other}`}
                  >
                    {category}
                  </Badge>
                ))}
                {service.categories.length > 2 && (
                  <Badge variant="outline" className="text-xs border-primary/20 text-muted-foreground">
                    +{service.categories.length - 2}
                  </Badge>
                )}
              </div>
            </div>
          )}

          <Separator className="bg-primary/10" />

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-1">
              <div className="flex items-center space-x-1 text-muted-foreground">
                <TrendingUp className="h-3 w-3" />
                <span className="text-xs">Success Rate</span>
              </div>
              <p className="font-medium">
                {service.stats?.successRate ? `${service.stats.successRate}%` : 'N/A'}
              </p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center space-x-1 text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span className="text-xs">Avg Response</span>
              </div>
              <p className="font-medium">
                {service.stats?.avgResponseTime ? `${service.stats.avgResponseTime}s` : 'N/A'}
              </p>
            </div>
          </div>

          {/* Pricing */}
          <div className="space-y-1">
            <div className="flex items-center space-x-1 text-muted-foreground">
              <Zap className="h-3 w-3" />
              <span className="text-xs">Pricing</span>
            </div>
            <p className="font-medium text-sm">{formatPricing()}</p>
          </div>

          <Separator className="bg-primary/10" />

          {/* Actions */}
          <div className="flex space-x-2">
            <Button 
              onClick={() => setShowCreateJob(true)}
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
              size="sm"
            >
              <Zap className="h-4 w-4 mr-2" />
              Create Job
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              className="border-primary/20 hover:bg-primary/10"
              asChild
            >
              <a href={`/${nip19.nprofileEncode({ pubkey: service.pubkey })}`} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          </div>

          {/* Last Seen */}
          {service.lastSeen && (
            <p className="text-xs text-muted-foreground">
              Last seen {formatDistanceToNow(new Date(service.lastSeen * 1000), { addSuffix: true })}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Create Job Dialog */}
      {showCreateJob && (
        <CreateJobDialog 
          open={showCreateJob} 
          onOpenChange={setShowCreateJob}
          preselectedService={service}
        />
      )}
    </>
  );
}