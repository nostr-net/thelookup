import { useParams, Link } from 'react-router-dom';
import { nip19 } from 'nostr-tools';
import { useSeoMeta } from '@unhead/react';
import { useAppConfig } from '@/components/AppProvider';
import { Layout } from '@/components/Layout';
import { getPageTitle, getPageDescription } from '@/lib/siteConfig';
import { CreateIssueForm } from '@/components/CreateIssueForm';
import { useRepository } from '@/hooks/useRepositories';
import { parseRepositoryEvent, getRepositoryDisplayName } from '@/lib/repository';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { AlertCircle, GitBranch } from 'lucide-react';

export default function CreateIssuePage() {
  const params = useParams<{ naddr: string }>();
  const { config } = useAppConfig();

  useSeoMeta({
    title: getPageTitle('Create Issue'),
    description: getPageDescription('create-issue'),
  });

  // Decode naddr to get pubkey and identifier
  const decoded = params.naddr ? (() => {
    try {
      const result = nip19.decode(params.naddr);
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

  if (!decoded) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto">
          <Card className="border-destructive/50">
            <CardContent className="py-12 text-center">
              <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
              <p className="text-destructive">Invalid repository address</p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-4 w-2/3" />
          </div>
          <Card>
            <CardContent className="p-6 space-y-4">
              <Skeleton className="h-6 w-1/4" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-6 w-1/4" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-10 w-32" />
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  if (error || !repository) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto">
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">
                {error ? 'Failed to load repository' : 'Repository not found'}
              </p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  const repo = parseRepositoryEvent(repository);
  const displayName = getRepositoryDisplayName(repo);

  // Create naddr for the repository
  const repositoryNaddr = nip19.naddrEncode({
    identifier: repo.id,
    pubkey: repository.pubkey,
    kind: 30617,
    relays: [config.relayUrl],
  });

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/repositories" className="flex items-center">
                    <GitBranch className="h-4 w-4" />
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to={`/${repositoryNaddr}`}>{displayName}</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>New Issue</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <h1 className="text-3xl font-bold gradient-text">
            Create New Issue
          </h1>
          <p className="text-muted-foreground">
            Report a bug, request a feature, or ask a question about {displayName}.
          </p>
        </div>

        {/* Create Issue Form */}
        <CreateIssueForm
          repositoryPubkey={repository.pubkey}
          repositoryId={repo.id}
        />
      </div>
    </Layout>
  );
}