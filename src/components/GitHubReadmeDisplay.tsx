import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, BookOpen, ExternalLink } from 'lucide-react';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';

interface GitHubReadmeDisplayProps {
  repositoryUrl: string;
  repositoryNaddr: string;
  repositoryOwnerPubkey: string;
}

interface GitHubRepoInfo {
  owner: string;
  repo: string;
  branch: string;
  html_url: string;
}

// Function to parse GitHub URL and extract owner, repo, branch
function parseGitHubUrl(url: string): GitHubRepoInfo | null {
  try {
    // Handle different GitHub URL formats
    let match: RegExpMatchArray | null;

    // HTTPS format: https://github.com/owner/repo.git or https://github.com/owner/repo
    match = url.match(/^https?:\/\/github\.com\/([^/]+)\/([^/.]+)(?:\.git)?/);
    if (match) {
      return {
        owner: match[1],
        repo: match[2],
        branch: 'main', // Default branch
        html_url: `https://github.com/${match[1]}/${match[2]}`
      };
    }

    // SSH format: git@github.com:owner/repo.git
    match = url.match(/^git@github\.com:([^/]+)\/([^/.]+)\.git$/);
    if (match) {
      return {
        owner: match[1],
        repo: match[2],
        branch: 'main', // Default branch
        html_url: `https://github.com/${match[1]}/${match[2]}`
      };
    }

    return null;
  } catch {
    return null;
  }
}

// Function to get default branch from GitHub API
async function getDefaultBranch(owner: string, repo: string): Promise<string> {
  try {
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`);
    if (response.ok) {
      const data = await response.json();
      return data.default_branch || 'main';
    }
  } catch {
    // If API call fails, fallback to common branch names
  }
  return 'main';
}

// Function to fetch README from GitHub
async function fetchGitHubReadme(owner: string, repo: string, branch: string = 'main'): Promise<{ content: string; fileName: string } | null> {
  const readmeFiles = [
    `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/README.md`,
    `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/readme.md`,
    `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/README`,
    `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/README.txt`,
    `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/readme.txt`,
  ];

  for (const url of readmeFiles) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        const content = await response.text();
        const fileName = url.split('/').pop() || 'README.md';
        return { content, fileName };
      }
    } catch {
      continue;
    }
  }

  return null;
}

export function GitHubReadmeDisplay({ repositoryUrl, repositoryNaddr: _repositoryNaddr, repositoryOwnerPubkey: _repositoryOwnerPubkey }: GitHubReadmeDisplayProps) {
  const parsedUrl = parseGitHubUrl(repositoryUrl);

  const { data: readmeData, isLoading, error } = useQuery({
    queryKey: ['github-readme', parsedUrl?.owner, parsedUrl?.repo, parsedUrl?.branch],
    queryFn: async () => {
      if (!parsedUrl) return null;

      try {
        // First try to get the default branch
        const branch = await getDefaultBranch(parsedUrl.owner, parsedUrl.repo);

        // Then fetch the README
        const readme = await fetchGitHubReadme(parsedUrl.owner, parsedUrl.repo, branch);

        if (!readme) {
          return null;
        }

        return {
          ...readme,
          repoInfo: { ...parsedUrl, branch }
        };
      } catch (err) {
        console.warn('GitHub README fetch failed:', err);
        return null;
      }
    },
    enabled: !!parsedUrl,
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: (failureCount, error) => {
      // Don't retry for 404 errors (README not found)
      if (error?.message?.includes('404') || failureCount >= 2) {
        return false;
      }
      return true;
    },
  });

  if (!parsedUrl) {
    return (
      <Card className="border-destructive/50">
        <CardContent className="py-8 text-center">
          <AlertCircle className="h-8 w-8 mx-auto mb-2 text-destructive" />
          <p className="text-destructive">Invalid GitHub repository URL</p>
          <p className="text-sm text-muted-foreground mt-1">
            Could not parse the GitHub repository URL
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            <span className="font-medium">README.md</span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !readmeData || !readmeData.fileName || !readmeData.content) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              <span className="font-medium">README</span>
            </div>
            <a
              href={parsedUrl.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              <ExternalLink className="h-3 w-3" />
              View on GitHub
            </a>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No README file found</p>
            <p className="text-sm mt-1">
              This repository might not have a README file, or it might be private.
            </p>
            <a
              href={parsedUrl.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-2"
            >
              <ExternalLink className="h-3 w-3" />
              View repository on GitHub
            </a>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            <span className="font-medium">{readmeData.fileName}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
              {readmeData.repoInfo?.branch || 'main'}
            </span>
            <a
              href={readmeData.repoInfo?.html_url || parsedUrl.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              <ExternalLink className="h-3 w-3" />
              View on GitHub
            </a>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="prose prose-sm max-w-none dark:prose-invert">
          {readmeData.fileName.toLowerCase().endsWith('.md') ? (
            <MarkdownRenderer content={readmeData.content} />
          ) : (
            <pre className="whitespace-pre-wrap text-sm font-mono bg-muted p-4 rounded-lg overflow-x-auto">
              {readmeData.content}
            </pre>
          )}
        </div>
      </CardContent>
    </Card>
  );
}