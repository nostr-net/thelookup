import React from 'react';
import { useGitHubRepository } from '@/hooks/useGitHubRepository';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import {
  Folder,
  File,
  GitBranch,
  BookOpen,
  ExternalLink,
  AlertCircle
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface GitHubFileBrowserProps {
  cloneUrl?: string;
  className?: string;
}

interface BreadcrumbItem {
  name: string;
  path: string;
}

export function GitHubFileBrowser({ cloneUrl, className }: GitHubFileBrowserProps) {
  const [currentPath, setCurrentPath] = React.useState('');
  const [selectedFile, setSelectedFile] = React.useState<{ path: string; name: string } | null>(null);

  // Parse GitHub URL to get owner/repo/branch
  const parseGitHubUrl = (url: string) => {
    const match = url.match(/https?:\/\/github\.com\/([^/]+)\/([^/?]+)(?:\/tree\/([^/?]+))?/);
    if (match) {
      return {
        owner: match[1],
        repo: match[2],
        branch: match[3] || 'main'
      };
    }
    return null;
  };

  const githubInfo = cloneUrl ? parseGitHubUrl(cloneUrl) : null;

  // Build breadcrumb navigation
  const breadcrumbs: BreadcrumbItem[] = [
    { name: 'Root', path: '' }
  ];
  if (currentPath !== '') {
    const parts = currentPath.split('/').filter(Boolean);
    let buildPath = '';
    for (const part of parts) {
      buildPath += (buildPath ? '/' : '') + part;
      breadcrumbs.push({ name: part, path: buildPath });
    }
  }

  const { useFileContent, useFileList, useReadme, repoInfo, isLoaded: _isLoaded, isLoading, error } = useGitHubRepository(
    githubInfo?.owner || '',
    githubInfo?.repo || '',
    githubInfo?.branch || 'main'
  );

  const { data: files, isLoading: filesLoading } = useFileList(currentPath);
  const { data: readmeData, fileName: readmeFileName, isLoading: readmeLoading } = useReadme();

  // Call hook unconditionally at top level, but only use result when selectedFile exists
  const { data: fileContent, isLoading: fileLoading, error: fileError } = useFileContent(selectedFile?.path || '');

  // Auto-select README if in root directory
  React.useEffect(() => {
    if (currentPath === '' && readmeData && !selectedFile) {
      setSelectedFile({ name: readmeFileName, path: readmeFileName });
    }
  }, [currentPath, readmeData, readmeFileName, selectedFile]);

  if (!githubInfo) {
    return (
      <div className={className}>
        <Card className="border border-border">
          <CardHeader>
            <div className="flex items-center gap-2">
              <GitBranch className="h-5 w-5" />
              <span className="font-medium">Repository Files</span>
            </div>
          </CardHeader>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Not a GitHub repository</p>
            <p className="text-sm text-muted-foreground mt-2">
              GitHub API access is only available for GitHub repositories
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={className}>
        <Card className="border border-border">
          <CardHeader>
            <div className="flex items-center gap-2">
              <GitBranch className="h-5 w-5" />
              <span className="font-medium">Repository Files</span>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <Skeleton className="h-4 w-3/4" />
              <div className="space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-4/5" />
                <Skeleton className="h-8 w-3/5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className={className}>
        <Card className="border border-border">
          <CardHeader>
            <div className="flex items-center gap-2">
              <GitBranch className="h-5 w-5" />
              <span className="font-medium">Repository Files</span>
            </div>
          </CardHeader>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-4" />
            <p className="text-destructive">Failed to load repository</p>
            <p className="text-sm text-muted-foreground mt-2">{error instanceof Error ? error.message : String(error)}</p>
            <div className="mt-4">
              <a
                href={cloneUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline flex items-center gap-1 mx-auto w-fit"
              >
                <ExternalLink className="h-4 w-4" />
                View on GitHub
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleFileClick = (file: { name: string; path: string; type: string }) => {
    if (file.type === 'dir') {
      setCurrentPath(file.path);
    } else {
      setSelectedFile(file);
    }
  };

  const handleBreadcrumbClick = (item: BreadcrumbItem) => {
    setCurrentPath(item.path);
    setSelectedFile(null);
  };

  if (selectedFile) {
    return (
      <div className={className}>
        <Card className="border border-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <File className="h-5 w-5" />
                <span className="font-medium">{selectedFile.name}</span>
              </div>
              <button
                onClick={() => setSelectedFile(null)}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Close
              </button>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {fileLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </div>
            ) : fileError ? (
              <div className="text-center py-8">
                <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-4" />
                <p className="text-destructive">Failed to load file</p>
              </div>
            ) : fileContent ? (
              <div className="prose prose-sm max-w-none dark:prose-invert">
                {selectedFile.name.toLowerCase().endsWith('.md') ? (
                  <MarkdownRenderer content={fileContent} />
                ) : (
                  <pre className="whitespace-pre-wrap text-sm font-mono bg-muted p-4 rounded-lg overflow-x-auto">
                    <code>{fileContent}</code>
                  </pre>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <File className="h-8 w-8 mx-auto mb-4 opacity-50" />
                <p>No content available</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Repository Info */}
      <Card className="border border-border mb-4">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <GitBranch className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{githubInfo.owner}/{githubInfo.repo}</span>
                <span className="text-sm text-muted-foreground">({githubInfo.branch})</span>
              </div>
              {repoInfo?.description && (
                <p className="text-sm text-muted-foreground mt-1">{repoInfo.description}</p>
              )}
            </div>
            <a
              href={cloneUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              <ExternalLink className="h-4 w-4" />
              View on GitHub
            </a>
          </div>
          {repoInfo?.updated_at && (
            <p className="text-xs text-muted-foreground mt-2">
              Last updated {formatDistanceToNow(new Date(repoInfo.updated_at), { addSuffix: true })}
            </p>
          )}
        </CardContent>
      </Card>

      {/* File Browser */}
      <Card className="border border-border">
        <CardHeader>
          <div className="flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            <span className="font-medium">Repository Files</span>
          </div>
          {/* Breadcrumb Navigation */}
          <nav className="flex items-center space-x-1 text-sm text-muted-foreground mt-2">
            {breadcrumbs.map((item, index) => (
              <React.Fragment key={item.path}>
                {index > 0 && <span className="text-muted-foreground">/</span>}
                <button
                  onClick={() => handleBreadcrumbClick(item)}
                  className={cn(
                    "hover:text-foreground transition-colors",
                    item.path === currentPath ? "text-foreground font-medium" : ""
                  )}
                >
                  {item.name}
                </button>
              </React.Fragment>
            ))}
          </nav>
        </CardHeader>
        <CardContent className="p-0">
          {filesLoading ? (
            <div className="p-6 space-y-3">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-8 w-4/5" />
              <Skeleton className="h-8 w-1/2" />
            </div>
          ) : files && files.length > 0 ? (
            <div className="divide-y divide-border">
              {files.map((file) => (
                <div
                  key={file.path}
                  className="flex items-center gap-3 p-3 hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => handleFileClick(file)}
                >
                  <div className="flex-shrink-0">
                    {file.type === 'dir' ? (
                      <Folder className="h-5 w-5 text-blue-500" />
                    ) : (
                      <File className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{file.name}</div>
                    {file.type === 'file' && file.size && (
                      <div className="text-xs text-muted-foreground">
                        {(file.size / 1024).toFixed(1)} KB
                      </div>
                    )}
                  </div>
                  <div className="flex-shrink-0">
                    {file.type === 'dir' ? (
                      <span className="text-xs text-muted-foreground">Directory</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">File</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center text-muted-foreground">
              <Folder className="h-8 w-8 mx-auto mb-4 opacity-50" />
              <p>This directory is empty</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* README Display */}
      {currentPath === '' && readmeData && (
        <Card className="border border-border mt-4">
          <CardHeader>
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              <span className="font-medium">{readmeFileName}</span>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {readmeLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </div>
            ) : (
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <MarkdownRenderer content={readmeData} />
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
