import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { ExternalLink, Loader2, AlertCircle } from 'lucide-react';
import { useApps } from '@/hooks/useApps';
import { useEffect, useState } from 'react';
import type { CarouselApi } from '@/components/ui/carousel';
import { Link } from 'react-router-dom';
import { nip19 } from 'nostr-tools';

interface FeaturedAppsProps {
  title?: string;
  subtitle?: string;
  limit?: number;
  className?: string;
  titleAlignment?: 'left' | 'center';
}

export function FeaturedApps({
  title = "Recent Apps",
  subtitle = "Discover the latest applications in the Nostr ecosystem",
  limit = 8,
  className = "",
  titleAlignment = 'center'
}: FeaturedAppsProps) {
  const { data: apps, isLoading, error } = useApps();
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();

  // Get recent apps with all required fields
  const displayApps = apps
    ?.filter(app => app.name && app.picture && app.about && app.website)
    .slice(0, limit) || [];

  // Auto-rotation effect
  useEffect(() => {
    if (!carouselApi || displayApps.length === 0) return;

    const interval = setInterval(() => {
      carouselApi.scrollNext();
    }, 4000); // Rotate every 4 seconds

    return () => clearInterval(interval);
  }, [carouselApi, displayApps.length]);

  if (isLoading) {
    return (
      <div className={`${className}`}>
        <div className={`mb-8 ${titleAlignment === 'center' ? 'text-center' : 'text-left'}`}>
          <div className={`flex items-center gap-2 mb-4 ${titleAlignment === 'center' ? 'justify-center' : 'justify-start'}`}>
            <h2 className="text-2xl font-bold">{title}</h2>
          </div>
          {subtitle && (
            <p className="text-muted-foreground">{subtitle}</p>
          )}
        </div>

        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">Loading apps...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${className}`}>
        <div className={`mb-8 ${titleAlignment === 'center' ? 'text-center' : 'text-left'}`}>
          <div className={`flex items-center gap-2 mb-4 ${titleAlignment === 'center' ? 'justify-center' : 'justify-start'}`}>
            <h2 className="text-2xl font-bold">{title}</h2>
          </div>
          {subtitle && (
            <p className="text-muted-foreground">{subtitle}</p>
          )}
        </div>

        <div className="flex items-center justify-center py-12">
          <Card className="bg-destructive/5 border-destructive/20">
            <CardContent className="py-6">
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                <span>Failed to load apps from relay</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (displayApps.length === 0) {
    return null; // Don't show anything if no apps
  }

  return (
    <div className={`${className}`}>
      {/* Header */}
      <div className={`mb-8 ${titleAlignment === 'center' ? 'text-center' : 'text-left'}`}>
        <div className={`flex items-center gap-2 mb-4 ${titleAlignment === 'center' ? 'justify-center' : 'justify-start'}`}>
          <h2 className="text-2xl font-bold">{title}</h2>
        </div>
        {subtitle && (
          <p className="text-muted-foreground">{subtitle}</p>
        )}
      </div>

      {/* Apps Carousel */}
      <Carousel
        opts={{
          align: 'start',
          loop: true,
          dragFree: false,
          containScroll: 'trimSnaps',
          skipSnaps: false,
        }}
        setApi={setCarouselApi}
        className="w-full"
      >
        <CarouselContent className="-ml-2 md:-ml-4">
          {displayApps.map((app) => {
            // Create naddr for the app
            const naddr = nip19.naddrEncode({
              kind: 31990,
              pubkey: app.pubkey,
              identifier: app.dTag,
            });

            return (
              <CarouselItem
                key={app.id}
                className="pl-2 md:pl-4 basis-1/2 md:basis-1/3 lg:basis-1/4"
              >
                <Link to={`/${naddr}`}>
                  <Card className="group transition-all duration-300 border-primary/20 hover:border-accent/60 bg-card shadow-sm hover:shadow-lg cursor-pointer h-full">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          {app.picture && (
                            <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-accent/20 transition-colors flex-shrink-0">
                              <img
                                src={app.picture}
                                alt={`${app.name} icon`}
                                className="h-6 w-6 rounded-sm object-contain"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                }}
                              />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-lg group-hover:text-accent transition-colors truncate">
                              {app.name}
                            </CardTitle>
                            {app.tags && app.tags.length > 0 && (
                              <div className="flex items-center gap-1 mt-1 flex-wrap">
                                <span className="text-xs px-2 py-1 rounded-full border bg-primary/10 text-primary border-primary/20 truncate">
                                  {app.tags[0]}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground mb-4 leading-relaxed line-clamp-2">
                        {app.about}
                      </p>
                      <span className="inline-flex items-center gap-2 text-sm text-primary group-hover:text-accent transition-colors font-medium">
                        View App
                        <ExternalLink className="h-4 w-4" />
                      </span>
                    </CardContent>
                  </Card>
                </Link>
              </CarouselItem>
            );
          })}
        </CarouselContent>
        <CarouselPrevious className="hidden sm:flex" />
        <CarouselNext className="hidden sm:flex" />
      </Carousel>
    </div>
  );
}
