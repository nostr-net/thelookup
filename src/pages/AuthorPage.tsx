import { useParams, Link } from 'react-router-dom';
import { nip19 } from 'nostr-tools';
import { useSeoMeta } from '@unhead/react';
import { useAppConfig } from '@/components/AppProvider';
import { Layout } from '@/components/Layout';
import { getPageTitle, getPageDescription } from '@/lib/siteConfig';
import { CustomNipCard } from '@/components/CustomNipCard';
import { AppCard } from '@/components/AppCard';
import { RepositoryCard } from '@/components/RepositoryCard';
import { RepositoryCardSkeleton } from '@/components/RepositoryCardSkeleton';
import { RelaySelector } from '@/components/RelaySelector';
import { useAuthor } from '@/hooks/useAuthor';
import { useCustomNipsByAuthor } from '@/hooks/useCustomNipsByAuthor';
import { useAppsByAuthor } from '@/hooks/useAppsByAuthor';
import { useRepositoriesByAuthor } from '@/hooks/useRepositories';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useDeleteNip } from '@/hooks/useDeleteNip';
import { useDeleteApp } from '@/hooks/useDeleteApp';
import { useDeleteRepository } from '@/hooks/useDeleteRepository';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ArrowLeft, AlertCircle, ExternalLink, MapPin, Globe, Zap, MoreVertical, Edit, Trash2, Plus, FileText, Smartphone, GitBranch } from 'lucide-react';
import { EditProfileForm } from '@/components/EditProfileForm';
import { genUserName } from '@/lib/genUserName';
import { useToast } from '@/hooks/useToast';
import { useState } from 'react';
import type { NostrEvent } from '@/types/nostr';
import type { AppInfo } from '@/hooks/useApps';
import NotFound from './NotFound';

export default function AuthorPage() {
  const { nip19: nip19Param } = useParams<{ nip19: string }>();

  if (!nip19Param) {
    return <NotFound />;
  }

  // Try to decode as nip19
  try {
    const decoded = nip19.decode(nip19Param);

    if (decoded.type === 'npub') {
      return <AuthorView pubkey={decoded.data} />;
    } else if (decoded.type === 'nprofile') {
      return <AuthorView pubkey={decoded.data.pubkey} />;
    } else {
      // Not a supported author identifier
      return <NotFound />;
    }
  } catch {
    // Not a valid nip19 identifier
    return <NotFound />;
  }
}

function AuthorView({ pubkey }: { pubkey: string }) {
  const author = useAuthor(pubkey);
  const { data: customNips, isLoading: nipsLoading, error: nipsError } = useCustomNipsByAuthor(pubkey);
  const { data: apps, isLoading: appsLoading, error: appsError } = useAppsByAuthor(pubkey);
  const { data: repositories, isLoading: repositoriesLoading, error: repositoriesError } = useRepositoriesByAuthor(pubkey);
  const { user } = useCurrentUser();
  const { mutate: deleteNip } = useDeleteNip();
  const { mutate: deleteApp } = useDeleteApp();
  const { mutate: deleteRepository } = useDeleteRepository();
  const { toast } = useToast();
  const [deletingNipId, setDeletingNipId] = useState<string | null>(null);
  const [deletingAppId, setDeletingAppId] = useState<string | null>(null);
  const [deletingRepositoryId, setDeletingRepositoryId] = useState<string | null>(null);
  const { config } = useAppConfig();

  // Check if this is the current user's profile
  const isOwnProfile = user?.pubkey === pubkey;

  const metadata = author.data?.metadata;
  const displayName = metadata?.display_name || metadata?.name || genUserName(pubkey);
  const about = metadata?.about;

  useSeoMeta({
    title: getPageTitle(displayName),
    description: getPageDescription(`${displayName} - ${about ? about.slice(0, 160) + '...' : 'Nostr user profile'}`),
  });

  const handleDeleteNip = (event: NostrEvent) => {
    setDeletingNipId(event.id);
    deleteNip(
      { event },
      {
        onSuccess: () => {
          toast({
            title: "NIP deleted",
            description: "Your custom NIP has been deleted successfully.",
          });
          setDeletingNipId(null);
        },
        onError: (error) => {
          toast({
            title: "Failed to delete NIP",
            description: error instanceof Error ? error.message : "An error occurred",
            variant: "destructive",
          });
          setDeletingNipId(null);
        },
      }
    );
  };

  const handleDeleteApp = (app: AppInfo) => {
    setDeletingAppId(app.id);
    deleteApp(
      { app },
      {
        onSuccess: () => {
          toast({
            title: "App deleted",
            description: "Your app has been deleted successfully.",
          });
          setDeletingAppId(null);
        },
        onError: (error) => {
          toast({
            title: "Failed to delete app",
            description: error instanceof Error ? error.message : "An error occurred",
            variant: "destructive",
          });
          setDeletingAppId(null);
        },
      }
    );
  };

  const handleDeleteRepository = (event: NostrEvent) => {
    setDeletingRepositoryId(event.id);
    deleteRepository(
      { event },
      {
        onSuccess: () => {
          toast({
            title: "Repository deleted",
            description: "Your repository has been deleted successfully.",
          });
          setDeletingRepositoryId(null);
        },
        onError: (error) => {
          toast({
            title: "Failed to delete repository",
            description: error instanceof Error ? error.message : "An error occurred",
            variant: "destructive",
          });
          setDeletingRepositoryId(null);
        },
      }
    );
  };

  const NipActions = ({ event }: { event: NostrEvent }) => {
    if (!isOwnProfile) return null;

    const dTag = event.tags.find((tag: string[]) => tag[0] === 'd')?.[1] || '';
    const naddr = nip19.naddrEncode({
      identifier: dTag,
      pubkey: event.pubkey,
      kind: event.kind,
      relays: [config.relayUrl],
    });

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link to={`/edit/${naddr}`}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Link>
          </DropdownMenuItem>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Custom NIP</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this custom NIP? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => handleDeleteNip(event)}
                  disabled={deletingNipId === event.id}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {deletingNipId === event.id ? "Deleting..." : "Delete"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  const AppActions = ({ app }: { app: AppInfo }) => {
    if (!isOwnProfile) return null;

    const naddr = nip19.naddrEncode({
      identifier: app.dTag,
      pubkey: app.pubkey,
      kind: 31990,
      relays: [config.relayUrl],
    });

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link to={`/apps/edit/${naddr}`}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Link>
          </DropdownMenuItem>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete App</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this app? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => handleDeleteApp(app)}
                  disabled={deletingAppId === app.id}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {deletingAppId === app.id ? "Deleting..." : "Delete"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  const RepositoryActions = ({ event }: { event: NostrEvent }) => {
    if (!isOwnProfile) return null;

    // Generate naddr for the repository
    const naddr = nip19.naddrEncode({
      identifier: event.tags.find(tag => tag[0] === 'd')?.[1] || '',
      pubkey: event.pubkey,
      kind: 30617,
      relays: [config.relayUrl],
    });

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link to={`/repositories/${naddr}/edit`}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Link>
          </DropdownMenuItem>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Repository</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this repository? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => handleDeleteRepository(event)}
                  disabled={deletingRepositoryId === event.id}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {deletingRepositoryId === event.id ? "Deleting..." : "Delete"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  const userName = metadata?.name || genUserName(pubkey);
  const website = metadata?.website;
  const nip05 = metadata?.nip05;
  const lud16 = metadata?.lud16;
  const profileImage = metadata?.picture;
  const bannerImage = metadata?.banner;

  if (author.isLoading) {
    return (
      <Layout>
        <div className="space-y-6">
          <Button variant="ghost" asChild>
            <Link to="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Link>
          </Button>

          <Card>
            <CardHeader>
              <div className="flex items-start space-x-4">
                <Skeleton className="h-20 w-20 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-8 w-48" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </div>
            </CardHeader>
          </Card>

          <div className="space-y-4">
            <Skeleton className="h-6 w-32" />
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <Skeleton className="h-6 w-24" />
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-64" />
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <Skeleton className="h-6 w-32" />
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <RepositoryCardSkeleton key={i} />
              ))}
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <Button variant="ghost" asChild>
          <Link to="/">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Link>
        </Button>

        {/* Author Profile Card */}
        <Card className="glass border-primary/20 shadow-lg shadow-primary/5 rounded-none md:rounded-lg">
          {bannerImage && (
            <div className="h-32 sm:h-48 bg-gradient-to-r from-primary/20 to-accent/20 rounded-t-lg overflow-hidden">
              <img
                src={bannerImage}
                alt="Profile banner"
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <CardHeader className={bannerImage ? "-mt-16 relative z-10" : ""}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-6">
              <Avatar className="h-20 w-20 sm:h-24 sm:w-24 ring-4 ring-background shadow-lg">
                <AvatarImage src={profileImage} />
                <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                  {displayName[0]?.toUpperCase() || pubkey.slice(0, 2)}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 space-y-3">
                <div>
                  <CardTitle className="text-2xl sm:text-3xl gradient-text">
                    {displayName}
                  </CardTitle>
                  {userName !== displayName && (
                    <p className="text-muted-foreground">@{userName}</p>
                  )}
                </div>

                {about && (
                  <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                    {about}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  {website && (
                    <a
                      href={website.startsWith('http') ? website : `https://${website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 hover:text-primary transition-colors"
                    >
                      <Globe className="h-4 w-4" />
                      <span className="hidden sm:inline">Website</span>
                    </a>
                  )}

                  {nip05 && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      <span className="text-xs sm:text-sm">{nip05}</span>
                      <Badge variant="secondary" className="text-xs">
                        NIP-05
                      </Badge>
                    </div>
                  )}

                  {lud16 && (
                    <div className="flex items-center gap-1">
                      <Zap className="h-4 w-4" />
                      <span className="text-xs sm:text-sm">{lud16}</span>
                      <Badge variant="secondary" className="text-xs">
                        Lightning
                      </Badge>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                    NIP Author
                  </Badge>
                  {isOwnProfile && (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Profile
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Edit Profile</DialogTitle>
                        </DialogHeader>
                        <EditProfileForm />
                      </DialogContent>
                    </Dialog>
                  )}
                  <Button variant="outline" size="sm" asChild>
                    <a
                      href={`https://njump.me/${nip19.npubEncode(pubkey)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View Profile
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Determine if we should show sections or combined empty state */}
        {(() => {
          const hasCustomNips = customNips && customNips.length > 0;
          const hasApps = apps && apps.length > 0;
          const hasRepositories = repositories && repositories.length > 0;
          const showCustomNipsSection = isOwnProfile || hasCustomNips || nipsLoading || nipsError;
          const showAppsSection = isOwnProfile || hasApps || appsLoading || appsError;
          const showRepositoriesSection = isOwnProfile || hasRepositories || repositoriesLoading || repositoriesError;
          const showCombinedEmptyState = !nipsLoading && !appsLoading && !repositoriesLoading && !nipsError && !appsError && !repositoriesError && !hasCustomNips && !hasApps && !hasRepositories && !isOwnProfile;

          if (showCombinedEmptyState) {
            return (
              <Card className="border-dashed rounded-none md:rounded-lg">
                <CardContent className="py-12 px-8 text-center">
                  <div className="max-w-sm mx-auto space-y-6">
                    <div className="flex justify-center">
                      <div className="h-16 w-16 rounded-full bg-muted/20 flex items-center justify-center">
                        <FileText className="h-8 w-8 text-muted-foreground" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h3 className="font-semibold text-lg">No Content Found</h3>
                      <p className="text-muted-foreground">
                        This author hasn't published any Custom NIPs, Apps, or Repositories on this relay. Try switching to another relay to discover more content.
                      </p>
                    </div>
                    <RelaySelector className="w-full" />
                  </div>
                </CardContent>
              </Card>
            );
          }

          return (
            <>
              {/* Custom NIPs Section */}
              {showCustomNipsSection && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl sm:text-2xl font-bold gradient-text pl-2 md:pl-0">
                      Custom NIPs
                    </h2>
                    <div className="flex items-center gap-2 pr-2 md:pr-0">
                      {hasCustomNips && (
                        <Badge variant="secondary" className="bg-accent/10 text-accent border-accent/20">
                          {customNips.length} NIP{customNips.length !== 1 ? 's' : ''}
                        </Badge>
                      )}
                      {isOwnProfile && (
                        <Button size="sm" asChild>
                          <Link to="/create">
                            <Plus className="h-4 w-4 mr-2" />
                            Create NIP
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>

                  {nipsLoading && (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <Skeleton key={i} className="h-32" />
                      ))}
                    </div>
                  )}

                  {nipsError && (
                    <Card className="border-dashed border-destructive/50 rounded-none md:rounded-lg">
                      <CardContent className="py-12 px-8 text-center">
                        <div className="max-w-sm mx-auto space-y-6">
                          <div className="flex justify-center">
                            <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
                              <AlertCircle className="h-8 w-8 text-destructive" />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <h3 className="font-semibold text-lg">Failed to Load Custom NIPs</h3>
                            <p className="text-muted-foreground">
                              Unable to fetch Custom NIPs from this relay. Try switching to another relay or check your connection.
                            </p>
                          </div>
                          <RelaySelector className="w-full" />
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {customNips && customNips.length === 0 && isOwnProfile && (
                    <Card className="border-dashed rounded-none md:rounded-lg">
                      <CardContent className="py-12 px-8 text-center">
                        <div className="max-w-sm mx-auto space-y-6">
                          <div className="flex justify-center">
                            <div className="h-16 w-16 rounded-full bg-muted/20 flex items-center justify-center">
                              <FileText className="h-8 w-8 text-muted-foreground" />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <h3 className="font-semibold text-lg">No Custom NIPs Yet</h3>
                            <p className="text-muted-foreground">
                              You haven't published any Custom NIPs yet. Create your first NIP to get started!
                            </p>
                          </div>
                          <div className="space-y-3">
                            <Button asChild>
                              <Link to="/create">
                                <Plus className="h-4 w-4 mr-2" />
                                Create Your First NIP
                              </Link>
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {hasCustomNips && (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {customNips.map((event) => (
                        <CustomNipCard
                          key={event.id}
                          event={event}
                          actions={<NipActions event={event} />}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Apps Section */}
              {showAppsSection && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl sm:text-2xl font-bold gradient-text pl-2 md:pl-0">
                      Apps
                    </h2>
                    <div className="flex items-center gap-2 pr-2 md:pr-0">
                      {hasApps && (
                        <Badge variant="secondary" className="bg-accent/10 text-accent border-accent/20">
                          {apps.length} App{apps.length !== 1 ? 's' : ''}
                        </Badge>
                      )}
                      {isOwnProfile && (
                        <Button size="sm" asChild>
                          <Link to="/apps/submit">
                            <Plus className="h-4 w-4 mr-2" />
                            Submit App
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>

                  {appsLoading && (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <Skeleton key={i} className="h-64" />
                      ))}
                    </div>
                  )}

                  {appsError && (
                    <Card className="border-dashed border-destructive/50 rounded-none md:rounded-lg">
                      <CardContent className="py-12 px-8 text-center">
                        <div className="max-w-sm mx-auto space-y-6">
                          <div className="flex justify-center">
                            <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
                              <AlertCircle className="h-8 w-8 text-destructive" />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <h3 className="font-semibold text-lg">Failed to Load Apps</h3>
                            <p className="text-muted-foreground">
                              Unable to fetch Apps from this relay. Try switching to another relay or check your connection.
                            </p>
                          </div>
                          <RelaySelector className="w-full" />
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {apps && apps.length === 0 && isOwnProfile && (
                    <Card className="border-dashed rounded-none md:rounded-lg">
                      <CardContent className="py-12 px-8 text-center">
                        <div className="max-w-sm mx-auto space-y-6">
                          <div className="flex justify-center">
                            <div className="h-16 w-16 rounded-full bg-muted/20 flex items-center justify-center">
                              <Smartphone className="h-8 w-8 text-muted-foreground" />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <h3 className="font-semibold text-lg">No Apps Yet</h3>
                            <p className="text-muted-foreground">
                              You haven't published any Apps yet. Submit your first app to showcase your work!
                            </p>
                          </div>
                          <div className="space-y-3">
                            <Button asChild>
                              <Link to="/apps/submit">
                                <Plus className="h-4 w-4 mr-2" />
                                Submit Your First App
                              </Link>
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {hasApps && (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {apps.map((app) => (
                        <div key={app.id} className="relative">
                          <AppCard app={app} />
                          {isOwnProfile && (
                            <div className="absolute top-2 right-2">
                              <AppActions app={app} />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Repositories Section */}
              {showRepositoriesSection && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl sm:text-2xl font-bold gradient-text pl-2 md:pl-0">
                      Repositories
                    </h2>
                    <div className="flex items-center gap-2 pr-2 md:pr-0">
                      {hasRepositories && (
                        <Badge variant="secondary" className="bg-accent/10 text-accent border-accent/20">
                          {repositories.length} Repositor{repositories.length !== 1 ? 'ies' : 'y'}
                        </Badge>
                      )}
                      {isOwnProfile && (
                        <Button size="sm" asChild>
                          <Link to="/repositories/create">
                            <Plus className="h-4 w-4 mr-2" />
                            Add Repository
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>

                  {repositoriesLoading && (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <RepositoryCardSkeleton key={i} />
                      ))}
                    </div>
                  )}

                  {repositoriesError && (
                    <Card className="border-dashed border-destructive/50 rounded-none md:rounded-lg">
                      <CardContent className="py-12 px-8 text-center">
                        <div className="max-w-sm mx-auto space-y-6">
                          <div className="flex justify-center">
                            <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
                              <AlertCircle className="h-8 w-8 text-destructive" />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <h3 className="font-semibold text-lg">Failed to Load Repositories</h3>
                            <p className="text-muted-foreground">
                              Unable to fetch Repositories from this relay. Try switching to another relay or check your connection.
                            </p>
                          </div>
                          <RelaySelector className="w-full" />
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {repositories && repositories.length === 0 && isOwnProfile && (
                    <Card className="border-dashed rounded-none md:rounded-lg">
                      <CardContent className="py-12 px-8 text-center">
                        <div className="max-w-sm mx-auto space-y-6">
                          <div className="flex justify-center">
                            <div className="h-16 w-16 rounded-full bg-muted/20 flex items-center justify-center">
                              <GitBranch className="h-8 w-8 text-muted-foreground" />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <h3 className="font-semibold text-lg">No Repositories Yet</h3>
                            <p className="text-muted-foreground">
                              You haven't added any repositories yet. Add your first repository to showcase your code!
                            </p>
                          </div>
                          <div className="space-y-3">
                            <Button asChild>
                              <Link to="/repositories/create">
                                <Plus className="h-4 w-4 mr-2" />
                                Add Your First Repository
                              </Link>
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {hasRepositories && (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {repositories.map((event) => (
                        <div key={event.id} className="relative">
                          <RepositoryCard event={event} />
                          {isOwnProfile && (
                            <div className="absolute top-2 right-2">
                              <RepositoryActions event={event} />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          );
        })()}
      </div>
    </Layout>
  );
}