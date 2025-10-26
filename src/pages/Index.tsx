import { CustomNipCard } from '@/components/CustomNipCard';
import { Layout } from '@/components/Layout';
import { RelaySelector } from '@/components/RelaySelector';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { CarouselApi } from '@/components/ui/carousel';
import { Carousel, CarouselContent, CarouselItem } from '@/components/ui/carousel';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { OfficialNip, useOfficialNips } from '@/hooks/useOfficialNips';
import { useRecentCustomNips } from '@/hooks/useRecentCustomNips';
import { useSeoMeta } from '@unhead/react';
import { AlertTriangle, BookOpen, Plus, Search, Users } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getPageTitle, getPageDescription } from '@/lib/siteConfig';

const Index = () => {
  useSeoMeta({
    title: getPageTitle('Discover and Publish NIPs'),
    description: getPageDescription('Explore official NIPs and publish your own custom NIPs'),
  });

  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const carouselRef = useRef<HTMLDivElement>(null);
  const { data: recentNips, isLoading: isLoadingRecent } = useRecentCustomNips();
  const {
    data: officialNips,
    isLoading: isLoadingOfficial,
    error: officialNipsError,
  } = useOfficialNips();

  const filteredOfficialNips = ((officialNips || []) as OfficialNip[]).filter((nip) => {
    const nipIdentifier = `NIP-${nip.number}`;
    const normalizedNip = nipIdentifier.toLowerCase().replace('-', '');
    const normalizedSearch = searchTerm.toLowerCase().replace('-', '');

    return (
      normalizedNip.includes(normalizedSearch) ||
      nip.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      nip.eventKinds?.some((eventKind) => eventKind.kind.toLowerCase() === searchTerm.toLowerCase())
    );
  });

  const filteredCustomNips = (recentNips || []).filter((event) => {
    if (!searchTerm) return true;

    const title = event.tags.find((tag: string[]) => tag[0] === 'title')?.[1] || '';
    const kinds = event.tags
      .filter((tag: string[]) => tag[0] === 'k')
      .map((tag: string[]) => tag[1]);
    const content = event.content || '';

    const searchLower = searchTerm.toLowerCase();

    return (
      title.toLowerCase().includes(searchLower) ||
      content.toLowerCase().includes(searchLower) ||
      kinds.some((kind) => kind.includes(searchTerm))
    );
  });

  useEffect(() => {
    const carouselElement = carouselRef.current;
    if (!carouselElement || !carouselApi) return;

    const handleWheel = (e: WheelEvent) => {
      // Handle horizontal scrolling (left/right)
      if (e.deltaX !== 0) {
        e.preventDefault();
        if (e.deltaX > 0) {
          carouselApi.scrollNext();
        } else {
          carouselApi.scrollPrev();
        }
      }
      // Optionally convert vertical scrolling to horizontal when over carousel
      else if (e.deltaY !== 0) {
        e.preventDefault();
        if (e.deltaY > 0) {
          carouselApi.scrollNext();
        } else {
          carouselApi.scrollPrev();
        }
      }
    };

    carouselElement.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      carouselElement.removeEventListener('wheel', handleWheel);
    };
  }, [carouselApi]);

  return (
    <Layout>
      <div className="space-y-8 py-8 px-4 sm:px-0">
        {/* Hero Section */}
        <div className="text-center space-y-6 sm:space-y-8">
          <div className="space-y-4">
            <h1 className="text-3xl sm:text-4xl font-bold gradient-text mb-4 leading-tight">
              Nostr Implementation Possibilities
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed px-4">
              Discover{' '}
              <a
                href="https://github.com/nostr-protocol/nips"
                className="text-primary font-semibold"
                target="_blank"
              >
                NIPs
              </a>{' '}
              and publish your own
              <Link
                to="/naddr1qvzqqqrcvypzqprpljlvcnpnw3pejvkkhrc3y6wvmd7vjuad0fg2ud3dky66gaxaqqxku6tswvkk7m3ddehhxarjqk4nmy"
                className="text-accent font-semibold"
              >
                {' '}
                Custom NIPs
              </Link>{' '}
              on Nostr.
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="max-w-lg mx-auto">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground group-focus-within:text-accent transition-colors z-10" />
            <Input
              placeholder="Search the protocol universe..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 sm:pl-12 pr-4 py-2 sm:py-6 rounded-full glass border-primary/30 focus:border-accent/50 focus:ring-accent/20 md:text-lg text-lg placeholder:text-muted-foreground/60 transition-all duration-300"
            />
          </div>
        </div>

        {/* Official NIPs - Horizontal Slider */}
        <div className="space-y-4 sm:space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-accent/10 border border-accent/20 flex-shrink-0">
                <BookOpen className="h-5 w-5 sm:h-6 sm:w-6 text-accent" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold gradient-text">NIPs</h2>
            </div>
          </div>

          {isLoadingOfficial ? (
            <div className="flex space-x-4 overflow-hidden">
              {Array.from({ length: 5 }).map((_, i) => (
                <Card key={i} className="flex-shrink-0 w-80">
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : officialNipsError ? (
            <Card>
              <CardContent className="p-4 text-center text-muted-foreground">
                <div className="flex items-center justify-center space-x-2 text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Failed to load NIPs</span>
                </div>
              </CardContent>
            </Card>
          ) : filteredOfficialNips.length > 0 ? (
            <div ref={carouselRef} className="overflow-hidden">
              <Carousel
                opts={{
                  align: 'start',
                  loop: false,
                  dragFree: false,
                  containScroll: 'trimSnaps',
                  skipSnaps: false,
                }}
                setApi={setCarouselApi}
                className="w-full"
              >
                <CarouselContent className="-ml-2 md:-ml-4 mr-8">
                  {filteredOfficialNips.map((nip) => (
                    <CarouselItem
                      key={nip.number}
                      className="pl-2 md:pl-4 basis-[85%] sm:basis-[45%] lg:basis-[30%] xl:basis-[23%]"
                    >
                      <Link to={`/${nip.number}`} className="block h-full">
                        <Card className="glass border-primary/20 hover:border-primary/40 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 group h-full">
                          <CardContent className="p-4 flex flex-col justify-between h-full">
                            <div className="flex flex-col justify-between h-full">
                              <div>
                                <h3 className="font-semibold text-purple-600 dark:text-purple-400 group-hover:text-accent transition-colors">
                                  NIP-{nip.number}
                                </h3>
                                <p className="text-sm text-muted-foreground group-hover:text-foreground/80 transition-colors line-clamp-2">
                                  {nip.title}
                                </p>
                                {nip.eventKinds && nip.eventKinds.length > 0 && (
                                  <div className="flex items-center flex-wrap gap-1 mt-2">
                                    <span className="text-xs text-muted-foreground flex-shrink-0">
                                      Kinds:
                                    </span>
                                    {nip.eventKinds.slice(0, 2).map((eventKind) => (
                                      <Badge
                                        key={eventKind.kind}
                                        variant="secondary"
                                        className="text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border-purple-300 dark:border-purple-700 hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors cursor-pointer"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          navigate(`/kind/${eventKind.kind}`);
                                        }}
                                      >
                                        {eventKind.kind}
                                      </Badge>
                                    ))}
                                    {nip.eventKinds.length > 2 && (
                                      <span className="text-xs text-muted-foreground">
                                        +{nip.eventKinds.length - 2} more
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-1 mt-3">
                                <Badge
                                  variant="secondary"
                                  className="bg-primary/10 text-primary border-primary/20 text-xs"
                                >
                                  Official
                                </Badge>
                                {nip.deprecated && (
                                  <Badge variant="destructive" className="text-xs">
                                    Deprecated
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    </CarouselItem>
                  ))}
                </CarouselContent>
              </Carousel>
            </div>
          ) : (
            <Card>
              <CardContent className="p-4 text-center text-muted-foreground">
                No NIPs found matching your search.
              </CardContent>
            </Card>
          )}
        </div>

        {/* Custom NIPs List */}
        <div className="space-y-4 sm:space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-accent/10 border border-accent/20 flex-shrink-0">
                <Users className="h-5 w-5 sm:h-6 sm:w-6 text-accent" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold gradient-text">Custom NIPs</h2>
            </div>
            <Button asChild className="bg-purple-600 hover:bg-purple-700 text-white border-purple-600">
              <Link to="/create">
                <Plus className="h-4 w-4 mr-2" />
                Create NIP
              </Link>
            </Button>
          </div>

          <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
            {isLoadingRecent ? (
              Array.from({ length: 6 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                      <div className="flex items-center space-x-2">
                        <Skeleton className="h-6 w-6 rounded-full" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : filteredCustomNips && filteredCustomNips.length > 0 ? (
              filteredCustomNips.map((event) => <CustomNipCard key={event.id} event={event} />)
            ) : recentNips && recentNips.length > 0 && searchTerm ? (
              <div className="col-span-full">
                <Card className="border-dashed">
                  <CardContent className="py-12 px-8 text-center">
                    <div className="max-w-sm mx-auto space-y-6">
                      <p className="text-muted-foreground">No results found.</p>
                      <RelaySelector className="w-full" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="col-span-full">
                <Card className="border-dashed">
                  <CardContent className="py-12 px-8 text-center">
                    <div className="max-w-sm mx-auto space-y-6">
                      <p className="text-muted-foreground">
                        No custom NIPs found. Try another relay?
                      </p>
                      <RelaySelector className="w-full" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Index;
