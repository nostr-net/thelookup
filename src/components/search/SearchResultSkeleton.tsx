import { Card, CardContent, CardHeader } from '@/components/ui/card';

interface SearchResultSkeletonProps {
  mode: 'cards' | 'list';
  className?: string;
}

export function SearchResultSkeleton({ mode, className }: SearchResultSkeletonProps) {
  if (mode === 'cards') {
    return (
      <Card className={`${className || ''}`}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 bg-muted rounded animate-pulse" />
                <div className="h-5 w-16 bg-muted rounded animate-pulse" />
              </div>
              <div className="h-6 w-3/4 bg-muted rounded animate-pulse" />
            </div>
            <div className="h-12 w-12 bg-muted rounded-full animate-pulse" />
          </div>
          <div className="h-4 w-full bg-muted rounded animate-pulse mt-2" />
          <div className="h-4 w-2/3 bg-muted rounded animate-pulse" />
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 bg-muted rounded-full animate-pulse" />
            <div className="h-4 w-24 bg-muted rounded animate-pulse" />
          </div>
          <div className="flex flex-wrap gap-1">
            <div className="h-6 w-16 bg-muted rounded animate-pulse" />
            <div className="h-6 w-20 bg-muted rounded animate-pulse" />
            <div className="h-6 w-14 bg-muted rounded animate-pulse" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // List mode skeleton
  return (
    <Card className={className}>
      <CardContent className="py-4">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 bg-muted rounded-full animate-pulse flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 bg-muted rounded animate-pulse" />
              <div className="h-5 w-16 bg-muted rounded animate-pulse" />
              <div className="h-6 w-32 bg-muted rounded animate-pulse" />
            </div>
            <div className="h-4 w-full max-w-md bg-muted rounded animate-pulse" />
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 bg-muted rounded-full animate-pulse" />
              <div className="h-4 w-24 bg-muted rounded animate-pulse" />
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <div className="h-6 w-16 bg-muted rounded animate-pulse" />
            <div className="h-6 w-16 bg-muted rounded animate-pulse" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
