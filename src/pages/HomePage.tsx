import { useSeoMeta } from '@unhead/react';
import { useState, useMemo } from 'react';
import { Layout } from '@/components/Layout';
import { FeaturedApps } from '@/components/FeaturedApps';
import { SearchResultCard } from '@/components/search/SearchResultCard';
import { SearchResultListItem } from '@/components/search/SearchResultListItem';
import { SearchResultSkeleton } from '@/components/search/SearchResultSkeleton';
import { useUniversalSearch, useAllSearchTags } from '@/hooks/useUniversalSearch';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Grid3x3, List } from 'lucide-react';
import { getPageTitle, getPageDescription } from '@/lib/siteConfig';
import { RelaySelector } from '@/components/RelaySelector';
import { useDebounce } from '@/hooks/useDebounce';
import type { SearchFilters as SearchFiltersType } from '@/lib/search/types';

const POPULAR_KINDS = [
  { kind: 1, name: 'Text Notes', icon: '📝' },
  { kind: 6, name: 'Reposts', icon: '🔄' },
  { kind: 7, name: 'Reactions', icon: '❤️' },
  { kind: 30023, name: 'Articles', icon: '📄' },
  { kind: 31922, name: 'Calendar Events', icon: '📅' },
  { kind: 30402, name: 'Classified Listings', icon: '🏪' },
  { kind: 1063, name: 'File Metadata', icon: '📁' },
];

export default function HomePage() {
  useSeoMeta({
    title: getPageTitle('Universal Search'),
    description: getPageDescription('Search across all apps and repositories in the Nostr ecosystem'),
  });

  // State management
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('list');
  const [filters, setFilters] = useState<SearchFiltersType>({
    types: ['app', 'repository'],
    tags: [],
    kinds: undefined,
    dateRange: undefined,
    author: undefined,
  });
  const [sortBy, setSortBy] = useState<'relevance' | 'date' | 'name'>('relevance');
  const [selectedKind, setSelectedKind] = useState<number | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Debounce search input
  const debouncedQuery = useDebounce(searchQuery, 300);

  // Fetch data
  const { data: results, isLoading, error } = useUniversalSearch({
    query: debouncedQuery,
    filters,
    sortBy,
  });

  const allTags = useAllSearchTags();

  // Count by type
  const typeCounts = useMemo(() => {
    if (!results) return { app: 0, repository: 0 };
    return results.reduce(
      (acc, result) => {
        acc[result.type] = (acc[result.type] || 0) + 1;
        return acc;
      },
      { app: 0, repository: 0 }
    );
  }, [results]);

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        <div className="px-4 sm:px-0 space-y-6">
          {/* Featured Apps Section */}
          <div className="mt-4">
            <FeaturedApps
              title="Featured Apps"
              subtitle=""
              titleAlignment="left"
              className="space-y-4 sm:space-y-6"
            />
          </div>

          {/* Search and Filters */}
          <Card className="sm:rounded-lg rounded-none">
            <CardHeader>
              <CardTitle className="text-lg">Find Apps & Repositories</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, description, or tags..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Event Type Filter */}
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Filter by Event Type</h3>
                  <Select
                    value={selectedKind?.toString() || "all"}
                    onValueChange={(value) => {
                      const kind = value === "all" ? null : parseInt(value);
                      setSelectedKind(kind);
                      setFilters({ ...filters, kinds: kind ? [kind] : undefined });
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select event type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        <div className="flex items-center gap-2">
                          <span>All Types</span>
                        </div>
                      </SelectItem>
                      {POPULAR_KINDS.map(({ kind, name, icon }) => (
                        <SelectItem key={kind} value={kind.toString()}>
                          <div className="flex items-center gap-2">
                            <span>{icon}</span>
                            <span>{name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Filter by Tags */}
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Filter by Tags</h3>
                  <Select
                    value={selectedTag || "all"}
                    onValueChange={(value) => {
                      const tag = value === "all" ? null : value;
                      setSelectedTag(tag);
                      setFilters({ ...filters, tags: tag ? [tag] : [] });
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select tag" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        <div className="flex items-center gap-2">
                          <span>All Tags</span>
                        </div>
                      </SelectItem>
                      {allTags.map(tag => (
                        <SelectItem key={tag} value={tag}>
                          <div className="flex items-center gap-2">
                            <span>{tag}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Type Filter Pills */}
              <div className="flex flex-wrap gap-2 pt-2">
                <Badge
                  variant={filters.types.length === 2 ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() =>
                    setFilters({ ...filters, types: ['app', 'repository'] })
                  }
                >
                  All ({results?.length || 0})
                </Badge>
                <Badge
                  variant={
                    filters.types.includes('app') && filters.types.length === 1
                      ? 'default'
                      : 'outline'
                  }
                  className="cursor-pointer"
                  onClick={() => setFilters({ ...filters, types: ['app'] })}
                >
                  Apps ({typeCounts.app || 0})
                </Badge>
                <Badge
                  variant={
                    filters.types.includes('repository') &&
                    filters.types.length === 1
                      ? 'default'
                      : 'outline'
                  }
                  className="cursor-pointer"
                  onClick={() =>
                    setFilters({ ...filters, types: ['repository'] })
                  }
                >
                  Repositories ({typeCounts.repository || 0})
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Results Header */}
          {!isLoading && results && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="text-sm text-muted-foreground">
                {results.length} result{results.length !== 1 ? 's' : ''}
                {debouncedQuery && ` for "${debouncedQuery}"`}
              </div>

              <div className="flex items-center gap-4">
                {/* Sort Options */}
                <select
                  value={sortBy}
                  onChange={(e) =>
                    setSortBy(e.target.value as 'relevance' | 'date' | 'name')
                  }
                  className="text-sm border rounded px-2 py-1 bg-background"
                >
                  <option value="relevance">Relevance</option>
                  <option value="date">Date</option>
                  <option value="name">Name</option>
                </select>

                {/* View Mode Toggle */}
                <ToggleGroup
                  type="single"
                  value={viewMode}
                  onValueChange={(value) =>
                    value && setViewMode(value as 'cards' | 'list')
                  }
                  size="sm"
                  variant="outline"
                >
                  <ToggleGroupItem value="list" aria-label="List view">
                    <List className="h-4 w-4" />
                  </ToggleGroupItem>
                  <ToggleGroupItem value="cards" aria-label="Card view">
                    <Grid3x3 className="h-4 w-4" />
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
            </div>
          )}

          {/* Results Display */}
          {isLoading ? (
            <div
              className={
                viewMode === 'cards'
                  ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6'
                  : 'space-y-0'
              }
            >
              {Array.from({ length: 6 }).map((_, i) => (
                <SearchResultSkeleton key={i} mode={viewMode} />
              ))}
            </div>
          ) : error ? (
            <Card className="border-dashed sm:rounded-lg rounded-none">
              <CardContent className="py-12 text-center">
                <p className="text-destructive mb-4">Failed to load results</p>
                <RelaySelector className="mx-auto w-64" />
              </CardContent>
            </Card>
          ) : results?.length === 0 ? (
            <Card className="border-dashed sm:rounded-lg rounded-none">
              <CardContent className="py-12 text-center">
                <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No results found</h3>
                <p className="text-muted-foreground">
                  {searchQuery
                    ? 'Try adjusting your search or filters'
                    : 'Start typing to search across apps and repositories'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {viewMode === 'cards' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
                  {results?.map((result) => (
                    <SearchResultCard
                      key={`${result.type}-${result.id}`}
                      result={result}
                    />
                  ))}
                </div>
              ) : (
                <Card className="sm:rounded-lg rounded-none">
                  <div className="divide-y">
                    {results?.map((result) => (
                      <SearchResultListItem
                        key={`${result.type}-${result.id}`}
                        result={result}
                      />
                    ))}
                  </div>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
