import { useParams, Link } from 'react-router-dom';
import { nip19 } from 'nostr-tools';
import { useSeoMeta } from '@unhead/react';
import { Layout } from '@/components/Layout';
import { useRepositoryIssues, useRepository } from '@/hooks/useRepositories';
import { useAuthor } from '@/hooks/useAuthor';
import { useIssueStatus } from '@/hooks/useIssueStatus';
import { getIssueSubject, getIssueLabels } from '@/lib/repository';
import { genUserName } from '@/lib/genUserName';
import { getPageTitle, getPageDescription } from '@/lib/siteConfig';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { NoteContent } from '@/components/NoteContent';
import { IssueActions } from '@/components/IssueActions';
import { IssueStatusBadge } from '@/components/IssueStatusBadge';
import { AlertCircle } from 'lucide-react';
import { CommentsSection } from '@/components/CommentsSection';
import { formatDistanceToNow } from 'date-fns';

export default function IssuePage() {
  const params = useParams<{ nip19: string, issueId: string }>();

  // Decode naddr to get pubkey and identifier
  const decoded = params.nip19 ? (() => {
    try {
      const result = nip19.decode(params.nip19);
      if (result.type === 'naddr' && result.data.kind === 30617) {
        return result.data;
      }
    } catch {
      // Invalid naddr
    }
    return null;
  })() : null;

  const { data: issues, isLoading: issuesLoading } = useRepositoryIssues(
    decoded?.pubkey || '',
    decoded?.identifier || ''
  );

  const { data: repository, isLoading: repositoryLoading } = useRepository(
    decoded?.pubkey || '',
    decoded?.identifier || ''
  );

  const issue = issues?.find(issue => issue.id === params.issueId);

  const { data: issueStatus, isLoading: statusLoading } = useIssueStatus(issue?.id || '');
  const author = useAuthor(issue?.pubkey || '');

  const authorName = author.data?.metadata?.name ?? genUserName(issue?.pubkey || '');
  const subject = issue ? getIssueSubject(issue) : '';
  const labels = issue ? getIssueLabels(issue) : [];

  useSeoMeta({
    title: subject ? getPageTitle(subject) : getPageTitle('Issue'),
    description: getPageDescription('issue'),
  });

  if (!decoded) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto">
          <Card className="border-destructive/50">
            <CardContent className="py-12 text-center">
              <p className="text-destructive">Invalid repository address</p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  if (issuesLoading || repositoryLoading) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <div className="space-y-4">
                <Skeleton className="h-8 w-1/2" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <div className="flex items-center space-x-2">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
            </CardHeader>
          </Card>
        </div>
      </Layout>
    );
  }

  if (!issue) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto">
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Issue not found</p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  const authorAvatar = author.data?.metadata?.picture;

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-8 w-8 text-primary" />
                    <h1 className="text-3xl font-bold gradient-text">
                      {subject}
                    </h1>
                  </div>
                  <div className="flex items-center gap-2">
                    {statusLoading ? (
                      <Skeleton className="h-6 w-16" />
                    ) : (
                      <IssueStatusBadge status={issueStatus?.status || 'open'} />
                    )}
                  </div>
                </div>
                {repository && (
                  <IssueActions
                    issue={issue}
                    repository={repository}
                    currentStatus={issueStatus?.status || 'open'}
                  />
                )}
              </div>

              {/* Author */}
              <div className="flex items-center space-x-3">
                <Link to={`/${nip19.npubEncode(issue.pubkey)}`}>
                  <Avatar className="h-8 w-8 hover:ring-2 hover:ring-primary/20 transition-all cursor-pointer">
                    <AvatarImage src={authorAvatar} alt={authorName} />
                    <AvatarFallback>
                      {authorName.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Link>
                <div>
                  <Link
                    to={`/${nip19.npubEncode(issue.pubkey)}`}
                    className="font-medium hover:text-primary transition-colors"
                  >
                    {authorName}
                  </Link>
                  <p className="text-sm text-muted-foreground">
                    opened {formatDistanceToNow(new Date(issue.created_at * 1000), { addSuffix: true })}
                  </p>
                </div>
              </div>

              {/* Labels */}
              {labels.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {labels.map((label) => (
                    <Badge key={label} variant="secondary">
                      {label}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="prose prose-sm max-w-none">
              <NoteContent event={issue} />
            </div>
          </CardContent>
        </Card>

        <CommentsSection
          root={issue}
          title="Comments"
          emptyStateMessage="No comments yet"
          emptyStateSubtitle="Be the first to comment on this issue."
        />
      </div>
    </Layout>
  );
}
