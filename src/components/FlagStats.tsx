import { AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { FlagStats } from '@/hooks/useAppFlags';

interface FlagStatsProps {
  flagStats: FlagStats;
  canFlag?: boolean;
  onFlagClick?: () => void;
}

export function FlagStats({ flagStats, canFlag = false, onFlagClick }: FlagStatsProps) {
  if (flagStats.total === 0) {
    return null;
  }

  const getSeverityColor = (count: number) => {
    if (count >= 10) return 'bg-red-500';
    if (count >= 5) return 'bg-orange-500';
    if (count >= 3) return 'bg-yellow-500';
    return 'bg-gray-500';
  };

  const getSeverityText = (count: number) => {
    if (count >= 10) return 'High - Many reports';
    if (count >= 5) return 'Medium - Multiple reports';
    if (count >= 3) return 'Low - Few reports';
    return 'Minimal reports';
  };

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1">
              <AlertTriangle className={`h-4 w-4 ${getSeverityColor(flagStats.total)} text-white p-1 rounded-full`} />
              <Badge variant="secondary" className="text-xs">
                {flagStats.total} {flagStats.total === 1 ? 'flag' : 'flags'}
              </Badge>
              {canFlag && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onFlagClick}
                  className="h-6 px-2 text-xs"
                >
                  Report
                </Button>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <div className="space-y-2">
              <p className="font-medium">{getSeverityText(flagStats.total)}</p>
              {Object.entries(flagStats.byType).length > 0 && (
                <div className="text-xs space-y-1">
                  <p className="font-medium">Breakdown:</p>
                  {Object.entries(flagStats.byType).map(([type, count]) => (
                    <div key={type} className="flex justify-between">
                      <span className="capitalize">{type}:</span>
                      <span>{count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}