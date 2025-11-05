import { useParams, Navigate } from 'react-router-dom';
import { nip19 } from 'nostr-tools';
import { Layout } from '@/components/Layout';
import { useSeoMeta } from '@unhead/react';
import { getPageTitle, getPageDescription } from '@/lib/siteConfig';
import { EditRepositoryForm } from '@/components/EditRepositoryForm';
import { useRepository } from '@/hooks/useRepositories';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { LoginArea } from '@/components/auth/LoginArea';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Edit, GitBranch } from 'lucide-react';
import { AlertDescription } from '@/components/ui/alert';
import { parseRepositoryEvent } from '@/lib/repository';

export default function EditRepositoryPage() {
  const { naddr } = useParams<{ naddr: string }>();
  const { user } = useCurrentUser();

  // Decode naddr to get pubkey and identifier
  const decoded = naddr ? (() => {
    try {
      const result = nip19.decode(naddr);
      if (result.type === 'naddr' && result.data.kind === 30617) {
        return result.data;
      }
    } catch {
      // Invalid naddr
    }
    return null;
  })() : null;

  const { data: repository, isLoading, error } = useRepository(
    decoded?.pubkey || '',
    decoded?.identifier || ''
  );

  const repoData = repository ? parseRepositoryEvent(repository) : null;

  useSeoMeta({
    title: repoData ? getPageTitle(`Edit ${repoData.name || 'Repository'}`) : getPageTitle('Edit Repository'),
    description: getPageDescription('edit-repository'),
  });

  if (!naddr) {
    return <Navigate to="/repositories" replace />;
  }

  if (!user) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <Edit className="h-6 w-6" />
            <h1 className="text-2xl font-bold">Edit Repository</h1>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 text-muted-foreground">
                <AlertCircle className="h-5 w-5" />
                <span>Authentication Required</span>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                You need to be logged in to edit repositories.
              </p>
              <LoginArea />
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  if (!decoded) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <Edit className="h-6 w-6" />
            <h1 className="text-2xl font-bold">Edit Repository</h1>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                <span>Invalid Repository</span>
              </div>
            </CardHeader>
            <CardContent>
              <AlertDescription>
                The repository link is invalid or malformed. Please check the URL and try again.
              </AlertDescription>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  if (user.pubkey !== decoded.pubkey) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <Edit className="h-6 w-6" />
            <h1 className="text-2xl font-bold">Edit Repository</h1>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                <span>Access Denied</span>
              </div>
            </CardHeader>
            <CardContent>
              <AlertDescription>
                You don't have permission to edit this repository. You can only edit repositories that you created.
              </AlertDescription>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <Edit className="h-6 w-6" />
            <h1 className="text-2xl font-bold">Edit Repository</h1>
          </div>

          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  if (error || !repository || !repoData) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <Edit className="h-6 w-6" />
            <h1 className="text-2xl font-bold">Edit Repository</h1>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                <span>Repository Not Found</span>
              </div>
            </CardHeader>
            <CardContent>
              <AlertDescription>
                The repository could not be found or failed to load. Please try again later.
              </AlertDescription>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <GitBranch className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Edit Repository</h1>
        </div>

        <EditRepositoryForm repository={{ event: repository, data: repoData }} />
      </div>
    </Layout>
  );
}