import { useSeoMeta } from '@unhead/react';
import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { RepositoryCard } from '@/components/RepositoryCard';
import { RepositoryListItem } from '@/components/RepositoryListItem';
import { RepositoryCardSkeleton } from '@/components/RepositoryCardSkeleton';
import { RelaySelector } from '@/components/RelaySelector';
import { useRepositories } from '@/hooks/useRepositories';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { parseRepositoryEvent, getRepositoryDisplayName } from '@/lib/repository';
import { Search, GitBranch, Plus, Grid, List } from 'lucide-react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { Link } from 'react-router-dom';
import { getPageTitle, getPageDescription } from '@/lib/siteConfig';

export default function RepositoriesPage() {
  useSeoMeta({
    title: getPageTitle('Git Repositories'),
    description: getPageDescription('Discover and collaborate on git repositories shared via Nostr (NIP-34)'),
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('list');
  
  const { data: repositories, isLoading, error } = useRepositories();
  const { user } = useCurrentUser();

  // Parse repository data and collect all tags
  const parsedRepos = repositories?.map(event => ({
    event,
    data: parseRepositoryEvent(event),
  })) || [];

  const allTags = Array.from(
    new Set(
      parsedRepos
        .flatMap(repo => repo.data.tags || [])
        .filter(Boolean)
    )
  ).sort();

  // Filter repositories based on search and tag
  const filteredRepos = parsedRepos.filter(repo => {
    const matchesSearch = !searchQuery ||
      getRepositoryDisplayName(repo.data).toLowerCase().includes(searchQuery.toLowerCase()) ||
      repo.data.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      repo.data.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesTag = !selectedTag || repo.data.tags?.includes(selectedTag);

    return matchesSearch && matchesTag;
  });

  // Infinite scroll for smooth rendering
  const { displayCount, observerTarget, hasMore } = useInfiniteScroll({
    totalItems: filteredRepos.length,
    initialItems: 20,
    itemsPerBatch: 20,
  });

  const displayedRepos = filteredRepos.slice(0, displayCount);

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="px-4 sm:px-0 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <GitBranch className="h-8 w-8 text-primary" />
                <h1 className="text-3xl font-bold gradient-text">
                  Git Repositories
                </h1>
              </div>
              <p className="text-muted-foreground">
                Discover and collaborate on git repositories shared via Nostr (NIP-34)
              </p>
            </div>

  
            {user && (
              <Button asChild className="self-start sm:self-auto">
                <Link to="/repositories/create">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Repository
                </Link>
              </Button>
            )}
          </div>

          {/* Search and Filters */}
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search repositories by name, description, or tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Tag filters */}
            {allTags.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">Filter by tags:</div>
                <Select
                  value={selectedTag || "all"}
                  onValueChange={(value) => setSelectedTag(value === "all" ? null : value)}
                >
                  <SelectTrigger className="w-full sm:w-64">
                    <SelectValue placeholder="Select tag" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      <div className="flex items-center gap-2">
                        <span>All Tags</span>
                        <Badge variant="secondary" className="ml-auto text-xs">
                          {filteredRepos.length}
                        </Badge>
                      </div>
                    </SelectItem>
                    {allTags.map(tag => {
                      const repoCount = filteredRepos.filter(repo => repo.data.tags?.includes(tag)).length || 0;
                      if (repoCount === 0) return null;

                      return (
                        <SelectItem key={tag} value={tag}>
                          <div className="flex items-center gap-2">
                            <span>{tag}</span>
                            <Badge variant="secondary" className="ml-auto text-xs">
                              {repoCount}
                            </Badge>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Results count and view toggle */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {!isLoading && repositories && (
              <div className="text-sm text-muted-foreground">
                {filteredRepos.length} of {repositories.length} repositories
                {searchQuery && ` matching "${searchQuery}"`}
                {selectedTag && ` tagged with "${selectedTag}"`}
              </div>
            )}

            {/* View Mode Toggle */}
            <ToggleGroup
              type="single"
              value={viewMode}
              onValueChange={(value) => value && setViewMode(value as 'cards' | 'list')}
              size="sm"
              variant="outline"
            >
              <ToggleGroupItem value="list" aria-label="List view">
                <List className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="cards" aria-label="Card view">
                <Grid className="h-4 w-4" />
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>

        {/* Repository Display */}
        {isLoading ? (
          <div className={viewMode === 'cards'
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6 mt-6"
            : "mt-6"
          }>
            {viewMode === 'cards'
              ? Array.from({ length: 6 }).map((_, i) => (
                  <RepositoryCardSkeleton key={i} className="sm:rounded-lg rounded-none" />
                ))
              : Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="p-4 border-b">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 bg-muted rounded-full animate-pulse" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-muted rounded animate-pulse w-1/3" />
                        <div className="h-3 bg-muted rounded animate-pulse w-2/3" />
                      </div>
                      <div className="h-8 w-16 bg-muted rounded animate-pulse" />
                      <div className="h-8 w-16 bg-muted rounded animate-pulse" />
                    </div>
                  </div>
                ))
            }
          </div>
        ) : error ? (
          <div className="mt-6">
            <Card className="border-dashed border-destructive/50 sm:rounded-lg rounded-none mx-4 sm:mx-0">
              <CardContent className="py-12 px-8 text-center">
                <div className="max-w-sm mx-auto space-y-4">
                  <p className="text-destructive">
                    Failed to load repositories. Please try again.
                  </p>
                  <RelaySelector className="w-full" />
                </div>
              </CardContent>
            </Card>
          </div>
        ) : filteredRepos.length === 0 ? (
          <div className="mt-6">
            <Card className="border-dashed sm:rounded-lg rounded-none mx-4 sm:mx-0">
              <CardContent className="py-12 px-8 text-center">
                <div className="max-w-sm mx-auto space-y-6">
                  <GitBranch className="h-12 w-12 text-muted-foreground mx-auto" />
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold">
                      {repositories?.length === 0 ? 'No repositories found' : 'No matching repositories'}
                    </h3>
                    <p className="text-muted-foreground">
                      {repositories?.length === 0
                        ? 'No git repositories have been announced on this relay yet.'
                        : 'Try adjusting your search or filters to find repositories.'
                      }
                    </p>
                  </div>
                  {repositories?.length === 0 && (
                    <>
                      <p className="text-muted-foreground">
                        Try another relay?
                      </p>
                      <RelaySelector className="w-full" />
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <>
            <div className={viewMode === 'cards'
              ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6 mt-6"
              : "mt-6"
            }>
              {displayedRepos.map(({ event }) =>
                viewMode === 'cards' ? (
                  <RepositoryCard key={event.id} event={event} className="sm:rounded-lg rounded-none" />
                ) : (
                  <RepositoryListItem key={event.id} event={event} />
                )
              )}
            </div>

            {/* Infinite scroll sentinel */}
            {hasMore && (
              <div ref={observerTarget} className="py-8 flex justify-center">
                <div className="text-sm text-muted-foreground">
                  Loading more repositories...
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}