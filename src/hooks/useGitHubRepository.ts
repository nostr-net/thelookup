import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';

export interface GitHubFileEntry {
  name: string;
  type: 'file' | 'dir';
  path: string;
  sha: string;
  size?: number;
  url: string;
  html_url: string;
  download_url?: string;
}

export interface GitHubRepositoryState {
  isLoading: boolean;
  isLoaded: boolean;
  error: string | null;
}

interface GitHubApiError {
  message: string;
  documentation_url?: string;
}

export function useGitHubRepository(owner: string, repo: string, branch: string = 'main') {
  const [state, _setState] = useState<GitHubRepositoryState>({
    isLoading: false,
    isLoaded: false,
    error: null,
  });

  // Fetch repository info and validate it exists
  const { data: repoInfo, isLoading: repoLoading, error: repoError } = useQuery({
    queryKey: ['github-repo', owner, repo],
    queryFn: async () => {
      const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`);
      if (!response.ok) {
        const error: GitHubApiError = await response.json();
        throw new Error(error.message || 'Repository not found');
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Check if repository is public and accessible
  const isPublicRepository = useCallback(async () => {
    try {
      const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`);
      return response.ok;
    } catch {
      return false;
    }
  }, [owner, repo]);

  // Fetch file content from GitHub API
  const useFileContent = (path: string) => {
    return useQuery({
      queryKey: ['github-file', owner, repo, branch, path],
      queryFn: async () => {
        const response = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`
        );
        if (!response.ok) {
          throw new Error(`Failed to fetch file: ${path}`);
        }
        const data = await response.json();

        if (data.type === 'file') {
          // For files, fetch the actual content
          if (data.encoding === 'base64') {
            // Decode base64 content
            const content = atob(data.content);
            return content;
          } else {
            return data.content;
          }
        }
        return null;
      },
      enabled: !!owner && !!repo && !!path,
      staleTime: 2 * 60 * 1000, // 2 minutes
    });
  };

  // Fetch directory listing
  const useFileList = (path: string = '') => {
    return useQuery({
      queryKey: ['github-files', owner, repo, branch, path],
      queryFn: async () => {
        const response = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`
        );
        if (!response.ok) {
          throw new Error(`Failed to list directory: ${path}`);
        }
        const data = await response.json();

        if (Array.isArray(data)) {
          return data.map((item: GitHubFileEntry) => ({
            name: item.name,
            type: item.type === 'dir' ? 'dir' : 'file',
            path: item.path,
            sha: item.sha,
            size: item.size,
            url: item.url,
            html_url: item.html_url,
            download_url: item.download_url
          }));
        } else if (data.type === 'dir') {
          // Single directory
          return [{
            name: data.name,
            type: 'dir',
            path: data.path,
            sha: data.sha,
            size: data.size,
            url: data.url,
            html_url: data.html_url,
            download_url: data.download_url
          }];
        }
        return [];
      },
      enabled: !!owner && !!repo,
      staleTime: 1 * 60 * 1000, // 1 minute
    });
  };

  // Fetch README file (automatically find common README variations)
  const useReadme = () => {
    const readmeQueries = [
      useFileContent('README.md'),
      useFileContent('readme.md'),
      useFileContent('README.txt'),
      useFileContent('readme.txt'),
      useFileContent('README'),
      useFileContent('readme')
    ];

    const readmeFiles = ['README.md', 'readme.md', 'README.txt', 'readme.txt', 'README', 'readme'];

    // Find the first successful README
    const successfulReadme = readmeQueries.find(query => query.data && !query.isLoading && !query.error);
    const readmeIndex = readmeQueries.findIndex(query => query.data && !query.isLoading && !query.error);

    return {
      data: successfulReadme?.data || null,
      fileName: readmeIndex >= 0 ? readmeFiles[readmeIndex] : 'README.md',
      isLoading: readmeQueries.some(query => query.isLoading),
      error: readmeQueries.every(query => query.error || (!query.data && !query.isLoading)),
      queries: readmeQueries
    };
  };

  return {
    state,
    repoInfo,
    isLoaded: !!repoInfo && !repoError,
    isLoading: repoLoading,
    error: repoError,
    isPublicRepository,
    useFileContent,
    useFileList,
    useReadme
  };
}