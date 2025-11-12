import { useParams, Link } from 'react-router-dom';
import { nip19 } from 'nostr-tools';
import { useSeoMeta } from '@unhead/react';
import { Layout } from '@/components/Layout';
import { getPageTitle, getPageDescription } from '@/lib/siteConfig';
import { usePatch, usePatchComments } from '@/hooks/useRepositories';
import { useAuthor } from '@/hooks/useAuthor';
import { genUserName } from '@/lib/genUserName';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { PatchViewer } from '@/components/PatchViewer';
import { CommentsSection } from '@/components/CommentsSection';
import { ArrowLeft, GitPullRequest, Calendar, User, Hash } from 'lucide-react';
import { useToast } from '@/hooks/useToast';

export default function PatchPage() {
  const params = useParams<{ nip19: string; patchId: string }>();
  const { toast } = useToast();

  // Decode repository naddr
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

  const { data: patch, isLoading: patchLoading } = usePatch(params.patchId || '');
  const { data: _comments } = usePatchComments(params.patchId || '');
  const author = useAuthor(patch?.pubkey || '');

  const authorName = author.data?.metadata?.name ?? genUserName(patch?.pubkey || '');
  const authorAvatar = author.data?.metadata?.picture;

  // Extract patch metadata
  const subject = patch?.tags.find(tag => tag[0] === 'subject')?.[1];
  const commitId = patch?.tags.find(tag => tag[0] === 'commit')?.[1];
  const parentCommitId = patch?.tags.find(tag => tag[0] === 'parent-commit')?.[1];
  const isRootPatch = patch?.tags.some(tag => tag[0] === 't' && tag[1] === 'root');

  useSeoMeta({
    title: subject ? getPageTitle(`${subject} | Patch`) : getPageTitle('Patch'),
    description: getPageDescription(`${subject} - Patch by ${authorName}`),
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

  if (patchLoading) {
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

  if (!patch) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto">
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Patch not found</p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  const handleCopyPatchId = () => {
    navigator.clipboard.writeText(patch.id);
    toast({
      title: "Copied to clipboard",
      description: "Patch ID copied to clipboard",
    });
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Back to repository button */}
        <div>
          <Button variant="ghost" asChild className="mb-4">
            <Link to={`/repositories/${params.nip19}`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to repository
            </Link>
          </Button>
        </div>

        {/* Patch Header */}
        <Card>
          <CardHeader className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="flex items-center gap-3">
                <GitPullRequest className="h-6 w-6 text-green-600 dark:text-green-400" />
                {isRootPatch && (
                  <Badge variant="outline" className="text-xs">
                    Root Patch
                  </Badge>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold mb-2">
                  {subject || `Patch #${patch.id.slice(0, 8)}`}
                </h1>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Hash className="h-4 w-4" />
                    <button
                      onClick={handleCopyPatchId}
                      className="font-mono hover:text-foreground transition-colors"
                      title="Click to copy patch ID"
                    >
                      {patch.id.slice(0, 8)}
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>{new Date(patch.created_at * 1000).toLocaleDateString()}</span>
                  </div>
                  {commitId && (
                    <div className="flex items-center gap-2">
                      <span>Commit:</span>
                      <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">
                        {commitId.slice(0, 8)}
                      </code>
                    </div>
                  )}
                  {parentCommitId && (
                    <div className="flex items-center gap-2">
                      <span>Parent:</span>
                      <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">
                        {parentCommitId.slice(0, 8)}
                      </code>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            {/* Author info */}
            <div className="flex items-center gap-3">
              <Link to={`/${nip19.npubEncode(patch.pubkey)}`}>
                <Avatar className="h-8 w-8 hover:ring-2 hover:ring-primary/20 transition-all cursor-pointer">
                  <AvatarImage src={authorAvatar} alt={authorName} />
                  <AvatarFallback>
                    {authorName.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Link>
              <div>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <Link
                    to={`/${nip19.npubEncode(patch.pubkey)}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {authorName}
                  </Link>
                </div>
                <div className="text-sm text-muted-foreground">
                  Submitted this patch
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Patch Content */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">Changes</h2>
          </CardHeader>
          <CardContent>
            <PatchViewer patchContent={patch.content} />
          </CardContent>
        </Card>

        {/* Comments Section */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">Discussion</h2>
          </CardHeader>
          <CardContent>
            <CommentsSection
              root={patch}
              title=""
              emptyStateMessage="No comments yet"
              emptyStateSubtitle="Start a discussion about this patch!"
              className="border-none p-0"
            />
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}