import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import type { SearchFilters as SearchFiltersType } from '@/lib/search/types';

interface SearchFiltersProps {
  filters: SearchFiltersType;
  onFiltersChange: (filters: SearchFiltersType) => void;
  availableTags: string[];
}

export function SearchFilters({
  filters,
  onFiltersChange,
  availableTags,
}: SearchFiltersProps) {
  const handleTagToggle = (tag: string) => {
    const newTags = filters.tags.includes(tag)
      ? filters.tags.filter(t => t !== tag)
      : [...filters.tags, tag];

    onFiltersChange({ ...filters, tags: newTags });
  };

  const handleClearFilters = () => {
    onFiltersChange({
      types: ['app', 'repository'],
      tags: [],
      kinds: undefined,
      dateRange: undefined,
      author: undefined,
    });
  };

  const hasActiveFilters = filters.tags.length > 0 || filters.kinds || filters.author;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Advanced Filters</CardTitle>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              className="h-8 text-xs"
            >
              Clear All
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Selected Tags */}
        {filters.tags.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium">Selected Tags:</div>
            <div className="flex flex-wrap gap-2">
              {filters.tags.map(tag => (
                <Badge
                  key={tag}
                  variant="default"
                  className="cursor-pointer"
                  onClick={() => handleTagToggle(tag)}
                >
                  {tag}
                  <X className="h-3 w-3 ml-1" />
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Available Tags */}
        {availableTags.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium">Filter by Tags:</div>
            <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
              {availableTags
                .filter(tag => !filters.tags.includes(tag))
                .slice(0, 20)
                .map(tag => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="cursor-pointer hover:bg-muted"
                    onClick={() => handleTagToggle(tag)}
                  >
                    {tag}
                  </Badge>
                ))}
              {availableTags.length > 20 && (
                <span className="text-xs text-muted-foreground">
                  +{availableTags.length - 20} more tags available
                </span>
              )}
            </div>
          </div>
        )}

        {availableTags.length === 0 && (
          <div className="text-sm text-muted-foreground text-center py-4">
            No tags available
          </div>
        )}
      </CardContent>
    </Card>
  );
}
