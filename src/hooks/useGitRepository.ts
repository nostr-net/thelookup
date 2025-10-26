import { useState, useCallback, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import git from 'isomorphic-git';
import http from 'isomorphic-git/http/web';
import FS from '@isomorphic-git/lightning-fs';

export interface GitFileEntry {
  path: string;
  type: 'file' | 'tree';
  oid: string;
  mode: string;
  size?: number;
}

export interface GitCommitInfo {
  oid: string;
  message: string;
  author: {
    name: string;
    email: string;
    timestamp: number;
  };
  committer: {
    name: string;
    email: string;
    timestamp: number;
  };
}

export interface GitRepositoryState {
  isCloning: boolean;
  isCloned: boolean;
  cloneProgress: number;
  error: string | null;
}

// Create a global filesystem instance
const fs = new FS('git-repos');

export function useGitRepository(repoId: string, cloneUrl?: string) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<GitRepositoryState>({
    isCloning: false,
    isCloned: false,
    cloneProgress: 0,
    error: null,
  });

  const dir = `/repos/${repoId}`;

  // Check if repository is already cloned
  const checkIfCloned = useCallback(async () => {
    try {
      const exists = await fs.promises.stat(dir).then(() => true).catch(() => false);
      if (exists) {
        // Check if it's a valid git repository
        try {
          await git.listBranches({ fs, dir });
          return true;
        } catch {
          // Directory exists but not a valid git repo, clean it up
          try {
            const files = await fs.promises.readdir(dir).catch(() => []);
            for (const file of files) {
              try {
                await fs.promises.unlink(`${dir}/${file}`);
              } catch {
                try {
                  await fs.promises.rmdir(`${dir}/${file}`);
                } catch {
                  // Ignore errors
                }
              }
            }
            await fs.promises.rmdir(dir);
          } catch {
            // Ignore cleanup errors
          }
          return false;
        }
      }
      return false;
    } catch {
      return false;
    }
  }, [dir]);

  // Initialize repository state
  const { data: isCloned, refetch: refetchCloneStatus } = useQuery({
    queryKey: ['git-repo-cloned', repoId],
    queryFn: checkIfCloned,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Clone repository
  const cloneRepository = useCallback(async () => {
    if (!cloneUrl) {
      setState(prev => ({ ...prev, error: 'No clone URL provided' }));
      return false;
    }

    // Check if this is a GitHub URL (which often has CORS issues)
    if (cloneUrl.includes('github.com')) {
      console.log('Attempting to clone GitHub repository (may have CORS restrictions):', cloneUrl);
    }

    setState(prev => ({
      ...prev,
      isCloning: true,
      cloneProgress: 0,
      error: null
    }));

    try {
      // Clean up existing directory if it exists
      try {
        // Lightning-fs doesn't support recursive rmdir, so we need to manually clean
        const files = await fs.promises.readdir(dir).catch(() => []);
        for (const file of files) {
          try {
            await fs.promises.unlink(`${dir}/${file}`);
          } catch {
            // Might be a directory, try to remove it
            try {
              await fs.promises.rmdir(`${dir}/${file}`);
            } catch {
              // Ignore errors for now
            }
          }
        }
        await fs.promises.rmdir(dir);
      } catch {
        // Directory doesn't exist, that's fine
      }

      await git.clone({
        fs,
        http,
        dir,
        url: cloneUrl,
        singleBranch: true,
        depth: 1,
        onProgress: (progress) => {
          const percentage = Math.round((progress.loaded / progress.total) * 100);
          setState(prev => ({ ...prev, cloneProgress: percentage }));
        },
      });

      setState(prev => ({
        ...prev,
        isCloning: false,
        isCloned: true,
        cloneProgress: 100
      }));

      // Refetch the clone status to update the query cache
      await refetchCloneStatus();

      // Invalidate all related queries so they can be refetched
      queryClient.invalidateQueries({ queryKey: ['git-files', repoId] });
      queryClient.invalidateQueries({ queryKey: ['git-latest-commit', repoId] });

      return true;
    } catch (error) {
      console.error('Clone error:', error);
      let errorMessage = 'Failed to clone repository';

      if (error instanceof Error) {
        // Check for common GitHub/CORS errors
        if (error.message.includes('CORS') || error.message.includes('cross-origin')) {
          errorMessage = 'GitHub repositories cannot be cloned directly from the browser due to CORS restrictions. Try using a different Git hosting service or check the repository URL.';
        } else if (error.message.includes('404') || error.message.includes('not found')) {
          errorMessage = 'Repository not found. Please check the URL and ensure the repository is accessible.';
        } else if (error.message.includes('403') || error.message.includes('401')) {
          errorMessage = 'Repository access denied. Please check if the repository is public or if authentication is required.';
        } else {
          errorMessage = `Cloning failed: ${error.message}`;
        }
      }

      setState(prev => ({
        ...prev,
        isCloning: false,
        error: errorMessage
      }));
      return false;
    }
  }, [cloneUrl, dir, refetchCloneStatus, queryClient, repoId]);

  // Update state when clone status changes
  useEffect(() => {
    if (isCloned !== undefined) {
      setState(prev => ({ ...prev, isCloned: isCloned || false }));
    }
  }, [isCloned]);

  // Get file listing for a specific path
  const useFileList = (path: string = '.') => {
    return useQuery({
      queryKey: ['git-files', repoId, path, state.isCloned],
      queryFn: async (): Promise<GitFileEntry[]> => {
        if (!state.isCloned) {
          throw new Error('Repository not cloned');
        }

        try {
          const files = await git.listFiles({ fs, dir });
          const entries: GitFileEntry[] = [];

          // Get all files in the specified path
          const pathPrefix = path === '.' ? '' : path + '/';
          const filteredFiles = files.filter(file =>
            file.startsWith(pathPrefix) &&
            file !== path
          );

          // Group by immediate children
          const children = new Set<string>();

          for (const file of filteredFiles) {
            const relativePath = file.slice(pathPrefix.length);
            const parts = relativePath.split('/');
            const immediateChild = parts[0];

            if (immediateChild && !children.has(immediateChild)) {
              children.add(immediateChild);
              const fullPath = pathPrefix + immediateChild;
              const isDirectory = parts.length > 1;

              try {
                const { object } = await git.readObject({
                  fs,
                  dir,
                  oid: 'HEAD',
                  filepath: fullPath
                });

                entries.push({
                  path: immediateChild,
                  type: isDirectory ? 'tree' : 'file',
                  oid: '', // We'd need to get this from git.readTree for proper implementation
                  mode: isDirectory ? '040000' : '100644',
                  size: isDirectory ? undefined : (object instanceof Uint8Array ? object.length : undefined),
                });
              } catch {
                // If we can't read the object, assume it's a directory
                entries.push({
                  path: immediateChild,
                  type: isDirectory ? 'tree' : 'file',
                  oid: '',
                  mode: isDirectory ? '040000' : '100644',
                });
              }
            }
          }

          // Sort: directories first, then files, both alphabetically
          return entries.sort((a, b) => {
            if (a.type !== b.type) {
              return a.type === 'tree' ? -1 : 1;
            }
            return a.path.localeCompare(b.path);
          });
        } catch (error) {
          console.error('Error listing files:', error);
          throw error;
        }
      },
      enabled: state.isCloned === true,
      staleTime: 5 * 60 * 1000, // 5 minutes
    });
  };

  // Get file content
  const useFileContent = (filePath: string) => {
    const latestCommit = useLatestCommit(filePath);
    const oid = latestCommit.data?.oid;

    return useQuery({
      queryKey: ['git-file-content', repoId, oid, filePath, state.isCloned],
      queryFn: async (): Promise<string> => {
        if (!oid) {
          throw new Error('No commit found for the file');
        }
        if (!state.isCloned) {
          throw new Error('Repository not cloned');
        }

        try {
          const { blob } = await git.readBlob({
            fs,
            dir,
            oid,
            filepath: filePath,
          });

          // Convert Uint8Array to string
          const decoder = new TextDecoder('utf-8');
          return decoder.decode(blob);
        } catch (error) {
          console.error('Error reading file:', error);
          throw error;
        }
      },
      enabled: isCloned && !!oid && !!filePath,
      staleTime: 5 * 60 * 1000, // 5 minutes
    });
  };

  // Get latest commit info for a file/directory
  const useLatestCommit = (path: string = '.') => {
    return useQuery({
      queryKey: ['git-latest-commit', repoId, path, state.isCloned],
      queryFn: async (): Promise<GitCommitInfo | null> => {
        if (!state.isCloned) {
          throw new Error('Repository not cloned');
        }

        try {
          const commits = await git.log({
            fs,
            dir,
            depth: 1,
            filepath: path === '.' ? undefined : path,
          });

          if (commits.length === 0) {
            return null;
          }

          const commit = commits[0];
          return {
            oid: commit.oid,
            message: commit.commit.message,
            author: {
              name: commit.commit.author.name,
              email: commit.commit.author.email,
              timestamp: commit.commit.author.timestamp,
            },
            committer: {
              name: commit.commit.committer.name,
              email: commit.commit.committer.email,
              timestamp: commit.commit.committer.timestamp,
            },
          };
        } catch (error) {
          console.error('Error getting latest commit:', error);
          return null;
        }
      },
      enabled: state.isCloned === true,
      staleTime: 5 * 60 * 1000, // 5 minutes
    });
  };

  return {
    state,
    isCloned: state.isCloned, // Use the component state instead of query data
    cloneRepository,
    useFileList,
    useFileContent,
    useLatestCommit,
  };
}