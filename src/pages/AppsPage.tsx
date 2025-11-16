import { useSeoMeta } from '@unhead/react';
import { useState, useMemo } from 'react';
import { Layout } from '@/components/Layout';
import { FeaturedApps } from '@/components/FeaturedApps';
import { useApps } from '@/hooks/useApps';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { AppCard } from '@/components/AppCard';
import { AppCardSkeleton } from '@/components/AppCardSkeleton';
import { AppListItem } from '@/components/AppListItem';
import { RelaySelector } from '@/components/RelaySelector';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Smartphone, Globe, Zap, Plus, Grid3x3, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { getPageTitle, getPageDescription } from '@/lib/siteConfig';

const POPULAR_KINDS = [
  { kind: 1, name: 'Text Notes', icon: '📝' },
  { kind: 6, name: 'Reposts', icon: '🔄' },
  { kind: 7, name: 'Reactions', icon: '❤️' },
  { kind: 30023, name: 'Articles', icon: '📄' },
  { kind: 31922, name: 'Calendar Events', icon: '📅' },
  { kind: 30402, name: 'Classified Listings', icon: '🏪' },
  { kind: 1063, name: 'File Metadata', icon: '📁' },
];

export default function AppsPage() {
  useSeoMeta({
    title: getPageTitle('Nostr Apps'),
    description: getPageDescription('Discover applications that can handle different types of Nostr events. Find the perfect app for your needs.'),
  });

  const { data: apps, isLoading, error } = useApps();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedKind, setSelectedKind] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('list');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Get all unique tags from apps
  const allTags = useMemo(() => {
    const tags = apps?.flatMap(app => app.tags || []) || [];
    return Array.from(new Set(tags)).sort();
  }, [apps]);

  // Filter apps based on search term, selected kind, and selected tag
  const filteredApps = apps?.filter(app => {
    const matchesSearch = !searchTerm ||
      app.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.about?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesKind = !selectedKind || app.supportedKinds.includes(selectedKind);
    const matchesTag = !selectedTag || app.tags?.includes(selectedTag);

    if (!app.name || !app.picture || !app.about || !app.website) {
      // If app is missing essential fields, skip it
      return false;
    }

    return matchesSearch && matchesKind && matchesTag;
  }) || [];

  const totalApps = filteredApps.length;
  const totalKinds = new Set(filteredApps.flatMap(app => app.supportedKinds)).size;

  // Infinite scroll for smooth rendering
  const { displayCount, observerTarget, hasMore } = useInfiniteScroll({
    totalItems: filteredApps.length,
    initialItems: 20,
    itemsPerBatch: 20,
  });

  const displayedApps = filteredApps.slice(0, displayCount);

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="px-4 sm:px-0 space-y-6">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center space-x-3">
              <div className="relative">
                <Smartphone className="h-8 w-8 text-primary" />
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl"></div>
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold title-shadow">Nostr Apps</h1>
            </div>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Discover applications that can handle different types of Nostr events. 
            </p>
            
            {/* Stats and Submit Button */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <div className="flex items-center space-x-6 text-sm text-muted-foreground">
                <div className="flex items-center space-x-2">
                  <Smartphone className="h-4 w-4" />
                  <span>{totalApps} Apps</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Zap className="h-4 w-4" />
                  <span>{totalKinds} Event Types</span>
                </div>
              </div>
              <Button asChild className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70">
                <Link to="/apps/submit">
                  <Plus className="h-4 w-4 mr-2" />
                  Submit Your App
                </Link>
              </Button>
            </div>
          </div>

          {/* Featured Apps Section */}
          <div className="mt-8">
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
              <CardTitle className="text-lg">Find Apps</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search apps by name or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              {/* Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Popular Event Types Filter */}
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Filter by Event Type</h3>
                  <Select
                    value={selectedKind?.toString() || "all"}
                    onValueChange={(value) => setSelectedKind(value === "all" ? null : parseInt(value))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select event type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        <div className="flex items-center gap-2">
                          <span>All Types</span>
                          <Badge variant="secondary" className="ml-auto text-xs">
                            {filteredApps.length}
                          </Badge>
                        </div>
                      </SelectItem>
                      {POPULAR_KINDS.map(({ kind, name, icon }) => {
                        const appCount = filteredApps.filter(app => app.supportedKinds.includes(kind)).length || 0;
                        if (appCount === 0) return null;

                        return (
                          <SelectItem key={kind} value={kind.toString()}>
                            <div className="flex items-center gap-2">
                              <span>{icon}</span>
                              <span>{name}</span>
                              <Badge variant="secondary" className="ml-auto text-xs">
                                {appCount}
                              </Badge>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                {/* Filter by Tags */}
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Filter by Tags</h3>
                  <Select
                    value={selectedTag || "all"}
                    onValueChange={(value) => setSelectedTag(value === "all" ? null : value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select tag" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        <div className="flex items-center gap-2">
                          <span>All Tags</span>
                          <Badge variant="secondary" className="ml-auto text-xs">
                            {filteredApps.length}
                          </Badge>
                        </div>
                      </SelectItem>
                      {allTags.map(tag => {
                        const appCount = filteredApps.filter(app => app.tags?.includes(tag)).length || 0;
                        if (appCount === 0) return null;

                        return (
                          <SelectItem key={tag} value={tag}>
                            <div className="flex items-center gap-2">
                              <span>{tag}</span>
                              <Badge variant="secondary" className="ml-auto text-xs">
                                {appCount}
                              </Badge>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6 mt-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <AppCardSkeleton key={i} className="sm:rounded-lg rounded-none" />
            ))}
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="mt-6">
            <Card className="border-dashed sm:rounded-lg rounded-none mx-4 sm:mx-0">
              <CardContent className="py-12 px-8 text-center">
                <div className="max-w-sm mx-auto space-y-6">
                  <p className="text-muted-foreground">
                    Failed to load apps. Try switching to a different relay?
                  </p>
                  <RelaySelector className="w-full" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Apps Display */}
        {!isLoading && !error && (
          <>
            {filteredApps.length > 0 ? (
              <>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-6 px-4 sm:px-0">
                  <div>
                    <h2 className="text-xl font-semibold">
                      {selectedKind ? (
                        <>Apps for {POPULAR_KINDS.find(k => k.kind === selectedKind)?.name || `Kind ${selectedKind}`}</>
                      ) : (
                        'All Apps'
                      )}
                    </h2>
                    <span className="text-sm text-muted-foreground mt-1">
                      {filteredApps.length} {filteredApps.length === 1 ? 'app' : 'apps'}
                    </span>
                  </div>

                  {/* View Mode Toggle */}
                  <ToggleGroup
                    type="single"
                    value={viewMode}
                    onValueChange={(value) => setViewMode(value as 'cards' | 'list')}
                    variant="outline"
                    size="sm"
                  >
                    <ToggleGroupItem value="list" aria-label="List view">
                      <List className="h-4 w-4" />
                    </ToggleGroupItem>
                    <ToggleGroupItem value="cards" aria-label="Card view">
                      <Grid3x3 className="h-4 w-4" />
                    </ToggleGroupItem>
                  </ToggleGroup>
                </div>

                {/* Conditional Rendering based on viewMode */}
                <>
                  {viewMode === 'cards' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6 mt-6">
                      {displayedApps.map((app) => (
                        <AppCard key={app.id} app={app} className="sm:rounded-lg rounded-none" />
                      ))}
                    </div>
                  ) : (
                    <Card className="sm:rounded-lg rounded-none mt-6">
                      <div className="divide-y">
                        {displayedApps.map((app) => (
                          <AppListItem key={app.id} app={app} />
                        ))}
                      </div>
                    </Card>
                  )}

                  {/* Infinite scroll sentinel */}
                  {hasMore && (
                    <div ref={observerTarget} className="py-8 flex justify-center">
                      <div className="text-sm text-muted-foreground">
                        Loading more apps...
                      </div>
                    </div>
                  )}
                </>
              </>
            ) : (
              <div className="mt-6">
                <Card className="border-dashed sm:rounded-lg rounded-none mx-4 sm:mx-0">
                  <CardContent className="py-12 px-8 text-center">
                    <div className="max-w-sm mx-auto space-y-6">
                      <div className="space-y-2">
                        <Globe className="h-12 w-12 text-muted-foreground mx-auto" />
                        <h3 className="text-lg font-medium">No Apps Found</h3>
                        <p className="text-muted-foreground">
                          {searchTerm || selectedKind
                            ? 'No apps match your current filters. Try adjusting your search or filters.'
                            : 'No apps found on this relay. Try switching to a different relay to discover apps.'
                          }
                        </p>
                      </div>
                      {!searchTerm && !selectedKind && (
                        <RelaySelector className="w-full" />
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}