import { useSeoMeta } from '@unhead/react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ExternalLink, Zap, Loader2, AlertCircle } from 'lucide-react';
import { getPageTitle, getPageDescription } from '@/lib/siteConfig';
import { useResources } from '@/hooks/useResources';
import { categoryColors } from '@/lib/parseResources';

export default function ResourcesPage() {
  const { resources, loading, error } = useResources();

  useSeoMeta({
    title: getPageTitle('Nostr Resources'),
    description: getPageDescription('Discover essential Nostr resources, tools, and services to enhance your decentralized social experience.'),
  });

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Zap className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Nostr Resources
            </h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Essential tools, services, and gateways to enhance your Nostr experience.
          </p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Loading resources...</span>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="flex items-center justify-center py-12">
            <Card className="bg-destructive/5 border-destructive/20">
              <CardContent className="py-6">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-5 w-5" />
                  <span>Failed to load resources: {error}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Resources Grid */}
        {!loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {resources.map((resource) => (
              <Card
                key={resource.name}
                className="group transition-all duration-300 border-primary/20 hover:border-accent/60 bg-card shadow-sm hover:shadow-lg cursor-pointer"
                onClick={() => window.open(resource.url, '_blank', 'noopener,noreferrer')}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-accent/20 group-hover:text-accent transition-colors">
                        {resource.icon}
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-lg group-hover:text-accent transition-colors">
                          {resource.name}
                        </CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-xs px-2 py-1 rounded-full border ${categoryColors[resource.category]}`}>
                            {resource.category}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4 leading-relaxed">
                    {resource.description}
                  </p>
                  <a
                    href={resource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-2 text-sm text-white hover:text-accent transition-colors font-medium"
                  >
                    Visit Resource
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Footer Info */}
        <div className="mt-16 text-center">
          <Card className="bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20">
            <CardContent className="py-8">
              <div className="flex items-center justify-center gap-2 mb-3">
                <Zap className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">Community Powered</h3>
              </div>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                These resources are maintained by the Nostr community to help users discover and navigate the ecosystem.
                Each service operates independently and may have its own terms of service.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}