import React from 'react';
import { useParams } from 'react-router-dom';
import { nip19 } from 'nostr-tools';
import type { NostrEvent } from '@nostrify/nostrify';
import { useSeoMeta } from '@unhead/react';
import { Layout } from '@/components/Layout';
import { getPageTitle, getPageDescription } from '@/lib/siteConfig';
import { useRepository, useRepositoryState, useRepositoryPatches, useRepositoryIssues } from '@/hooks/useRepositories';
import { useIssueStatus } from '@/hooks/useIssueStatus';
import { useGitRepository } from '@/hooks/useGitRepository';
import { useAuthor } from '@/hooks/useAuthor';
import { parseRepositoryEvent, parseRepositoryState, getRepositoryDisplayName, getIssueSubject, getIssueLabels, isRootPatch } from '@/lib/repository';
import { genUserName } from '@/lib/genUserName';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';

import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { GitBranch, Globe, Copy, GitPullRequest, AlertCircle, Plus, Code, BookOpen, ChevronDown, MoreHorizontal, CheckCircle, XCircle, FileText } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/useToast';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { Link } from 'react-router-dom';
import { SubmitPatchDialog } from '@/components/SubmitPatchDialog';
import { GitFileBrowser } from '@/components/GitFileBrowser';
import { GitHubReadmeDisplay } from '@/components/GitHubReadmeDisplay';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

// Component for displaying a single contributor
function ContributorAvatar({ pubkey }: { pubkey: string }) {
  const author = useAuthor(pubkey);
  const authorName = author.data?.metadata?.name ?? genUserName(pubkey);
  const authorAvatar = author.data?.metadata?.picture;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link to={`/${nip19.npubEncode(pubkey)}`}>
            <Avatar className="h-8 w-8 hover:ring-2 hover:ring-primary/20 transition-all cursor-pointer">
              <AvatarImage src={authorAvatar} alt={authorName} />
              <AvatarFallback className="text-xs">
                {authorName.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </Link>
        </TooltipTrigger>
        <TooltipContent>
          <p>{authorName}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Component for displaying a single issue with status
function IssueItem({ issue, repositoryNaddr }: { issue: NostrEvent; repositoryNaddr: string }) {
  const { data: issueStatus } = useIssueStatus(issue.id);
  const subject = getIssueSubject(issue);
  const labels = getIssueLabels(issue);
  const status = issueStatus?.status || 'open';

  // Get appropriate icon and color for status (matching GitHub's design)
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return { Icon: AlertCircle, className: 'text-green-600 dark:text-green-400' };
      case 'resolved':
        return { Icon: CheckCircle, className: 'text-purple-600 dark:text-purple-400' };
      case 'closed':
        return { Icon: XCircle, className: 'text-red-600 dark:text-red-400' };
      case 'draft':
        return { Icon: FileText, className: 'text-gray-600 dark:text-gray-400' };
      default:
        return { Icon: AlertCircle, className: 'text-green-600 dark:text-green-400' };
    }
  };

  const { Icon: StatusIcon, className: statusIconClass } = getStatusIcon(status);

  return (
    <div className="border-b border-border last:border-b-0 transition-colors duration-100 hover:bg-muted/30">
      <Link
        to={`/repositories/${repositoryNaddr}/issues/${issue.id}`}
        className="block"
      >
        <div className="p-4">
          <div className="flex items-start gap-3">
            <StatusIcon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${statusIconClass}`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-medium text-foreground hover:text-primary">
                  {subject || `Issue ${issue.id.slice(0, 8)}`}
                </h3>
                {labels.map((label) => (
                  <Badge key={label} variant="outline" className="text-xs">
                    {label}
                  </Badge>
                ))}
              </div>
              <div className="text-sm text-muted-foreground">
                opened {formatDistanceToNow(new Date(issue.created_at * 1000), { addSuffix: true })}
              </div>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}

export default function RepositoryPage() {
  const params = useParams<{ nip19: string }>();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = React.useState("code");

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

  const { data: repository, isLoading: repoLoading } = useRepository(
    decoded?.pubkey || '',
    decoded?.identifier || ''
  );
  const { data: repoState } = useRepositoryState(
    decoded?.pubkey || '',
    decoded?.identifier || ''
  );
  const { data: patches } = useRepositoryPatches(
    decoded?.pubkey || '',
    decoded?.identifier || ''
  );
  const { data: issues } = useRepositoryIssues(
    decoded?.pubkey || '',
    decoded?.identifier || ''
  );

  // Get git repository access for README
  const { useFileContent, isCloned } = useGitRepository(
    decoded?.identifier || '',
    repository ? parseRepositoryEvent(repository)?.clone?.[0] : undefined
  );

  // Try to find README file (common variations)
  const readme1 = useFileContent('README.md');
  const readme2 = useFileContent('readme.md');
  const readme3 = useFileContent('README.txt');
  const readme4 = useFileContent('readme.txt');
  const readme5 = useFileContent('README');
  const readme6 = useFileContent('readme');

  const readmeQueries = [readme1, readme2, readme3, readme4, readme5, readme6];
  const readmeFiles = ['README.md', 'readme.md', 'README.txt', 'readme.txt', 'README', 'readme'];

  // Find the first successful README
  const readmeIndex = readmeQueries.findIndex(query => query.data && !query.error);
  const readmeData = readmeIndex >= 0 ? readmeQueries[readmeIndex].data : null;
  const readmeFileName = readmeIndex >= 0 ? readmeFiles[readmeIndex] : 'README.md';
  const readmeLoading = readmeQueries.some(query => query.isLoading);
  const readmeError = readmeQueries.every(query => query.error || (!query.data && !query.isLoading));

  const author = useAuthor(repository?.pubkey);
  const { user } = useCurrentUser();

  const repoData = repository ? parseRepositoryEvent(repository) : null;
  const cloneUrl = repoData?.clone?.[0];
  const isGitHubRepo = cloneUrl?.includes('github.com');
  const authorName = author.data?.metadata?.name ?? genUserName(repository?.pubkey || '');

  // Debug logging to understand repository data
  console.log('Repository Debug Info:', {
    repoName: repoData?.id || decoded?.identifier,
    cloneUrls: repoData?.clone,
    isGitHubRepo,
    cloneUrl
  });

  useSeoMeta({
    title: repoData ? getPageTitle(`${getRepositoryDisplayName(repoData)} | Repository`) : getPageTitle('Repository'),
    description: getPageDescription(`${repoData ? getRepositoryDisplayName(repoData) : 'Repository'} by ${authorName}${repoData?.description ? ` - ${repoData.description}` : ''}`),
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

  if (repoLoading) {
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

  if (!repository) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto">
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Repository not found</p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  const state = repoState ? parseRepositoryState(repoState) : null;
  const authorAvatar = author.data?.metadata?.picture;

  const handleCopyClone = (url: string) => {
    navigator.clipboard.writeText(url);
    toast({
      title: "Copied to clipboard",
      description: "Clone URL copied to clipboard",
    });
  };

  const rootPatches = patches?.filter(isRootPatch) || [];

  // Pre-parse and categorize clone URLs by protocol
  const cloneUrlsByProtocol: Record<string, string[]> = {};

  // Add Nostr URL first
  if (decoded) {
    cloneUrlsByProtocol['Nostr'] = [`nostr://${author.data?.metadata?.nip05 ?? nip19.npubEncode(decoded.pubkey)}/${decoded.identifier}`];
  }

  // Categorize other clone URLs
  if (repoData?.clone) {
    repoData.clone.forEach((url) => {
      let protocol: string;
      if (url.startsWith('https://')) {
        protocol = 'HTTPS';
      } else if (url.startsWith('git@')) {
        protocol = 'SSH';
      } else if (url.startsWith('http://')) {
        protocol = 'HTTP';
      } else if (url.startsWith('git://')) {
        protocol = 'Git';
      } else {
        protocol = 'Other';
      }

      if (!cloneUrlsByProtocol[protocol]) {
        cloneUrlsByProtocol[protocol] = [];
      }
      cloneUrlsByProtocol[protocol].push(url);
    });
  }

  return (
    <Layout>
      <Card className="max-w-[1400px] mx-auto p-6 space-y-6 rounded-none sm:rounded-lg border">
        {/* Repository Header */}
        <div>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* Repository Title and Owner */}
            <div className="flex items-center gap-3">
              <Link to={`/${nip19.npubEncode(repository.pubkey)}`}>
                <Avatar className="h-8 w-8 hover:ring-2 hover:ring-primary/20 transition-all cursor-pointer">
                  <AvatarImage src={authorAvatar} alt={authorName} />
                  <AvatarFallback>
                    {authorName.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Link>
              <div className="flex items-center gap-1 text-xl font-semibold">
                <Link
                  to={`/${nip19.npubEncode(repository.pubkey)}`}
                  className="text-primary hover:underline"
                >
                  {authorName}
                </Link>
                <span className="text-muted-foreground">/</span>
                <span className="text-foreground">
                  {repoData ? getRepositoryDisplayName(repoData) : 'Repository'}
                </span>
              </div>
              <Badge variant="outline" className="ml-2">
                Public
              </Badge>
            </div>

            {/* Action Buttons */}
            {/* <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Eye className="h-4 w-4 mr-2" />
                Watch
              </Button>
              <Button variant="outline" size="sm">
                <GitFork className="h-4 w-4 mr-2" />
                Fork
              </Button>
              <Button variant="outline" size="sm">
                <Star className="h-4 w-4 mr-2" />
                Star
              </Button>
            </div> */}
          </div>
        </div>

        {/* Navigation Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="border-b border-border">
            <div className="flex items-center justify-between">
              <TabsList className="h-12 bg-transparent border-0 p-0 space-x-8">
                <TabsTrigger
                  value="code"
                  className="relative h-12 bg-transparent border-0 border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground hover:text-foreground rounded-none px-0 font-medium transition-all duration-200"
                >
                  <Code className="h-4 w-4 mr-2" />
                  Code
                </TabsTrigger>
                <TabsTrigger
                  value="issues"
                  className="relative h-12 bg-transparent border-0 border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground hover:text-foreground rounded-none px-0 font-medium transition-all duration-200"
                >
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Issues
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {issues?.length || 0}
                  </Badge>
                </TabsTrigger>
                {/* Desktop-only tabs */}
                <TabsTrigger
                  value="pull-requests"
                  className="relative h-12 bg-transparent border-0 border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground hover:text-foreground rounded-none px-0 font-medium transition-all duration-200 hidden md:flex"
                >
                  <GitPullRequest className="h-4 w-4 mr-2" />
                  Pull requests
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {rootPatches.length}
                  </Badge>
                </TabsTrigger>
                              </TabsList>

              {/* Mobile dropdown for additional tabs */}
              <div className="md:hidden">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-12 px-3">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setActiveTab("pull-requests")}>
                      <GitPullRequest className="h-4 w-4 mr-2" />
                      Pull requests
                      <Badge variant="secondary" className="ml-2 text-xs">
                        {rootPatches.length}
                      </Badge>
                    </DropdownMenuItem>
                                      </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>

          {/* Code Tab Content */}
          <TabsContent value="code" className="mt-0 space-y-4">
            {/* Repository Stats and Clone Section */}
            <div className="flex flex-col xl:flex-row gap-6 py-6">
              {/* Main Content Area */}
              <div className="flex-1 min-w-0 space-y-4">
                {/* Branch Selector and Clone Button */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="font-mono">
                      <GitBranch className="h-4 w-4 mr-2" />
                      {state?.head || 'main'}
                    </Button>
                    {state && state.refs.length > 1 && (
                      <span className="text-sm text-muted-foreground">
                        {state.refs.length} branches
                      </span>
                    )}
                  </div>

                  {repoData?.clone && repoData.clone.length > 0 && (
                    <div className="flex items-center gap-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button className="space-x-1" variant="default" size="sm">
                            <Code className="h-4 w-4" />
                            <span>Code</span>
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-80">
                          <div className="p-3">
                            <h4 className="font-medium mb-3">Clone this repository</h4>
                            <div className="space-y-3">
                              {Object.entries(cloneUrlsByProtocol).map(([protocol, urls]) => (
                                <div key={protocol} className="space-y-2">
                                  <div className="text-xs text-muted-foreground font-medium uppercase">
                                    {protocol}
                                  </div>
                                  {urls.map((url, index) => (
                                    <div key={index} className="flex items-center gap-2">
                                      <Input
                                        value={url}
                                        readOnly
                                        className="font-mono text-xs h-8"
                                        onClick={(e) => e.currentTarget.select()}
                                      />
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleCopyClone(url)}
                                        className="h-8 w-8 p-0 flex-shrink-0"
                                      >
                                        <Copy className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              ))}
                            </div>
                          </div>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                </div>

                {/* File Browser - Only for accessible repositories */}
                {(() => {
                  // Check if this repository has accessible clone URLs
                  const hasValidCloneUrl = cloneUrl && (
                    cloneUrl.includes('github.com') ||
                    cloneUrl.includes('gitlab.com') ||
                    cloneUrl.includes('codeberg.org') ||
                    cloneUrl.startsWith('https://') ||
                    cloneUrl.startsWith('http://')
                  );

                  if (isGitHubRepo) {
                    // GitHub repository - show simple info
                    return (
                      <div className="border border-border rounded-lg p-4">
                        <div className="text-center py-4">
                          <h3 className="font-medium mb-2">GitHub Repository</h3>
                          <p className="text-sm text-muted-foreground mb-4">
                            This is a GitHub repository. The README is displayed below.
                          </p>
                          <a
                            href={cloneUrl?.replace('.git', '')}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                          >
                            <Globe className="h-4 w-4" />
                            View repository on GitHub
                          </a>
                        </div>
                      </div>
                    );
                  } else if (hasValidCloneUrl) {
                    // Try to use GitFileBrowser for other repositories
                    return (
                      <GitFileBrowser
                        repoId={repoData?.id || decoded?.identifier || ''}
                        cloneUrl={cloneUrl}
                        repositoryNaddr={params.nip19}
                        repositoryOwnerPubkey={repository.pubkey}
                      />
                    );
                  } else {
                    // Repository without accessible clone URLs
                    return (
                      <div className="border border-border rounded-lg p-4">
                        <div className="text-center py-4">
                          <h3 className="font-medium mb-2">Repository Access Limited</h3>
                          <p className="text-sm text-muted-foreground mb-4">
                            This repository doesn't have accessible clone URLs or may have access restrictions.
                          </p>
                          {repoData?.web && repoData.web.length > 0 && (
                            <div className="flex flex-col gap-2">
                              {repoData.web.map((url, index) => (
                                <a
                                  key={index}
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-2 text-sm text-primary hover:underline mx-auto"
                                >
                                  <Globe className="h-4 w-4" />
                                  {new URL(url).hostname}
                                </a>
                              ))}
                            </div>
                          )}
                          <p className="text-xs text-muted-foreground mt-2">
                            Clone URLs: {repoData?.clone?.length || 0} available
                          </p>
                        </div>
                      </div>
                    );
                  }
                })()}

                {/* README Section */}
                {isGitHubRepo ? (
                  <GitHubReadmeDisplay
                    repositoryUrl={cloneUrl || ''}
                    repositoryNaddr={params.nip19 || ''}
                    repositoryOwnerPubkey={repository.pubkey}
                  />
                ) : cloneUrl && (cloneUrl.includes('github.com') || cloneUrl.includes('gitlab.com') || cloneUrl.includes('codeberg.org') || cloneUrl.startsWith('https://') || cloneUrl.startsWith('http://')) ? (
                  <div className="border border-border rounded-lg">
                    <div className="px-4 py-3 border-b border-border bg-muted/30">
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4" />
                        <span className="font-medium">{readmeFileName}</span>
                      </div>
                    </div>
                    <div className="p-6">
                      {!isCloned ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p>Loading repository content...</p>
                          <p className="text-sm mt-2">
                            If this takes too long, the repository may have access restrictions.
                            Try refreshing the page or check the repository access.
                          </p>
                        </div>
                      ) : readmeLoading ? (
                        <div className="space-y-3">
                          <Skeleton className="h-6 w-3/4" />
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-4 w-5/6" />
                          <Skeleton className="h-4 w-4/5" />
                        </div>
                      ) : readmeError || !readmeData ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p>No README file found</p>
                          <p className="text-sm mt-1">
                            Add a README.md file to help others understand your project
                          </p>
                        </div>
                      ) : (
                        <div className="prose prose-sm max-w-none dark:prose-invert">
                          {readmeFileName.toLowerCase().endsWith('.md') ? (
                            <MarkdownRenderer content={readmeData} />
                          ) : (
                            <pre className="whitespace-pre-wrap text-sm font-mono bg-muted p-4 rounded-lg overflow-x-auto">
                              {readmeData}
                            </pre>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  // Repository without accessible clone URLs - no README section
                  null
                )}
              </div>

              {/* Sidebar */}
              <div className="xl:w-80 xl:flex-shrink-0 space-y-4">
                {/* About Section */}
                <div className="border border-border rounded-lg p-4">
                  <h3 className="font-semibold mb-3">About</h3>
                  {repoData?.description && (
                    <p className="text-sm text-muted-foreground mb-3">
                      {repoData.description}
                    </p>
                  )}

                  {repoData?.web && repoData.web.length > 0 && (
                    <div className="space-y-2">
                      {repoData.web.map((url, index) => (
                        <a
                          key={index}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm text-primary hover:underline"
                        >
                          <Globe className="h-4 w-4" />
                          {new URL(url).hostname}
                        </a>
                      ))}
                    </div>
                  )}

                  {repoData?.tags && repoData.tags.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium mb-2">Topics</h4>
                      <div className="flex flex-wrap gap-1">
                        {repoData.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>



                {/* Contributors */}
                {repoData?.maintainers && repoData.maintainers.length > 0 && (
                  <div className="border border-border rounded-lg p-4">
                    <h3 className="font-semibold mb-3">Contributors</h3>
                    <div className="flex flex-wrap gap-2">
                      {repoData.maintainers.map((maintainer, index) => {
                        // Try to parse as hex pubkey, fallback to display as text
                        try {
                          // Check if it's a valid hex pubkey (64 characters)
                          if (maintainer.length === 64 && /^[0-9a-fA-F]+$/.test(maintainer)) {
                            return <ContributorAvatar key={index} pubkey={maintainer} />;
                          }
                        } catch {
                          // Not a valid pubkey, display as text
                        }

                        // Fallback for non-pubkey maintainers (emails, usernames, etc.)
                        return (
                          <div key={index} className="text-sm bg-muted px-2 py-1 rounded truncate max-w-full">
                            {maintainer}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Issues Tab Content */}
          <TabsContent value="issues" className="mt-0 py-6 px-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Issues</h2>
              {user && (
                <Button asChild>
                  <Link to={`/repositories/${params.nip19}/issues/create`}>
                    <Plus className="h-4 w-4 mr-2" />
                    New issue
                  </Link>
                </Button>
              )}
            </div>

            {!issues || issues.length === 0 ? (
              <div className="text-center py-12">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No issues yet</h3>
                <p className="text-muted-foreground mb-4">
                  Issues are used to track bugs, feature requests, and other tasks.
                </p>
                {user && (
                  <Button asChild>
                    <Link to={`/repositories/${params.nip19}/issues/create`}>
                      <Plus className="h-4 w-4 mr-2" />
                      New issue
                    </Link>
                  </Button>
                )}
              </div>
            ) : (
              <div className="border border-border rounded-lg overflow-hidden">
                {issues.map((issue) => (
                  <IssueItem
                    key={issue.id}
                    issue={issue}
                    repositoryNaddr={params.nip19!}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Pull Requests Tab Content */}
          <TabsContent value="pull-requests" className="mt-0 py-6 px-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Pull requests</h2>
              <SubmitPatchDialog>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New pull request
                </Button>
              </SubmitPatchDialog>
            </div>

            {rootPatches.length === 0 ? (
              <div className="text-center py-12">
                <GitPullRequest className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No pull requests yet</h3>
                <p className="text-muted-foreground mb-4">
                  Pull requests let you tell others about changes you've pushed to a repository.
                </p>
                <SubmitPatchDialog>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    New pull request
                  </Button>
                </SubmitPatchDialog>
              </div>
            ) : (
              <div className="border border-border rounded-lg overflow-hidden">
                {rootPatches.map((patch, index) => {
                  const subject = patch.tags.find(tag => tag[0] === 'subject')?.[1];
                  const commitId = patch.tags.find(tag => tag[0] === 'commit')?.[1];

                  return (
                    <div key={patch.id} className="border-b border-border last:border-b-0 transition-colors duration-100 hover:bg-muted/30">
                      <Link
                        to={`/repositories/${params.nip19}/patches/${patch.id}`}
                        className="block"
                      >
                        <div className="p-4">
                          <div className="flex items-start gap-3">
                            <GitPullRequest className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-medium text-foreground hover:text-primary">
                                  {subject || `Patch #${patch.id.slice(0, 8)}`}
                                </h3>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <span>#{patch.id.slice(0, 8)}</span>
                                <span>•</span>
                                <span>opened {new Date(patch.created_at * 1000).toLocaleDateString()}</span>
                                <span>•</span>
                                <span>by {genUserName(patch.pubkey)}</span>
                                {commitId && (
                                  <>
                                    <span>•</span>
                                    <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">
                                      {commitId.slice(0, 8)}
                                    </code>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </Link>
                      {index < rootPatches.length - 1 && <Separator />}
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </Card>
    </Layout>
  );
}