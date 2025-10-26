import { useState, useEffect } from 'react';
import { useGitRepository } from '@/hooks/useGitRepository';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getSiteDisplayName } from '@/lib/siteConfig';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { SyntaxHighlighter } from '@/components/SyntaxHighlighter';
import {
  X,
  Eye,
  Edit3,
  FileText,
  AlertCircle,
  GitCommit,
  Undo2
} from 'lucide-react';

import { useToast } from '@/hooks/useToast';
import { nip19 } from 'nostr-tools';

interface FileEditorProps {
  repoId: string;
  repositoryNaddr: string;
  repositoryOwnerPubkey: string;
  filePath: string;
  fileName: string;
  isOpen: boolean;
  onClose: () => void;
}

// File type detection based on extension
const getFileType = (fileName: string): 'text' | 'binary' => {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';

  const textExtensions = [
    'txt', 'md', 'markdown', 'json', 'js', 'jsx', 'ts', 'tsx', 'html', 'css', 'scss', 'sass',
    'py', 'rb', 'go', 'rs', 'java', 'c', 'cpp', 'h', 'hpp', 'php', 'sh', 'bash', 'zsh',
    'yml', 'yaml', 'toml', 'ini', 'cfg', 'conf', 'xml', 'svg', 'csv', 'log', 'gitignore',
    'dockerfile', 'makefile', 'cmake', 'sql', 'r', 'scala', 'kt', 'swift', 'dart', 'vue',
    'svelte', 'astro', 'elm', 'clj', 'cljs', 'hs', 'ml', 'fs', 'ex', 'exs', 'erl', 'hrl'
  ];

  return textExtensions.includes(ext) ? 'text' : 'binary';
};

// Get language for syntax highlighting
const getLanguage = (fileName: string): string => {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';

  const languageMap: Record<string, string> = {
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'py': 'python',
    'rb': 'ruby',
    'go': 'go',
    'rs': 'rust',
    'java': 'java',
    'c': 'c',
    'cpp': 'cpp',
    'h': 'c',
    'hpp': 'cpp',
    'php': 'php',
    'sh': 'bash',
    'bash': 'bash',
    'zsh': 'bash',
    'yml': 'yaml',
    'yaml': 'yaml',
    'json': 'json',
    'html': 'html',
    'css': 'css',
    'scss': 'scss',
    'sass': 'sass',
    'xml': 'xml',
    'svg': 'xml',
    'sql': 'sql',
    'md': 'markdown',
    'markdown': 'markdown',
    'dockerfile': 'dockerfile',
    'makefile': 'makefile',
    'cmake': 'cmake',
    'toml': 'toml',
    'ini': 'ini',
    'cfg': 'ini',
    'conf': 'ini',
    'r': 'r',
    'scala': 'scala',
    'kt': 'kotlin',
    'swift': 'swift',
    'dart': 'dart',
    'vue': 'vue',
    'svelte': 'svelte'
  };

  return languageMap[ext] || 'text';
};

// Generate git patch format
const generatePatch = (filePath: string, originalContent: string, newContent: string, commitMessage: string): string => {
  const lines1 = originalContent.split('\n');
  const lines2 = newContent.split('\n');

  // Simple unified diff generation
  const patch = [
    `From: ${getSiteDisplayName()} File Editor`,
    `Date: ${new Date().toISOString()}`,
    `Subject: [PATCH] ${commitMessage}`,
    ``,
    `---`,
    ` ${filePath} | ${Math.abs(lines2.length - lines1.length)} ${lines2.length > lines1.length ? '+' : lines2.length < lines1.length ? '-' : ''}`,
    ` 1 file changed, ${lines2.length > lines1.length ? `${lines2.length - lines1.length} insertions(+)` : lines2.length < lines1.length ? `${lines1.length - lines2.length} deletions(-)` : '0 insertions(+), 0 deletions(-)'}`,
    ``,
    `diff --git a/${filePath} b/${filePath}`,
    `index 0000000..1111111 100644`,
    `--- a/${filePath}`,
    `+++ b/${filePath}`,
    `@@ -1,${lines1.length} +1,${lines2.length} @@`
  ];

  // Add context and changes
  for (let i = 0; i < Math.max(lines1.length, lines2.length); i++) {
    const line1 = lines1[i];
    const line2 = lines2[i];

    if (line1 === undefined) {
      patch.push(`+${line2}`);
    } else if (line2 === undefined) {
      patch.push(`-${line1}`);
    } else if (line1 !== line2) {
      patch.push(`-${line1}`);
      patch.push(`+${line2}`);
    } else {
      patch.push(` ${line1}`);
    }
  }

  patch.push(`--`);
  patch.push(`2.39.0`);

  return patch.join('\n');
};

export function FileEditor({
  repoId,
  repositoryNaddr,
  repositoryOwnerPubkey,
  filePath,
  fileName,
  isOpen,
  onClose
}: FileEditorProps) {
  const { useFileContent } = useGitRepository(repoId);
  const { data: originalContent, isLoading, error } = useFileContent(filePath);
  const { user } = useCurrentUser();
  const { mutate: publishEvent, isPending: isPublishing } = useNostrPublish();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [editedContent, setEditedContent] = useState('');
  const [commitMessage, setCommitMessage] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  const fileType = getFileType(fileName);
  const language = getLanguage(fileName);

  // Initialize edited content when original content loads
  useEffect(() => {
    if (originalContent && !editedContent) {
      setEditedContent(originalContent);
    }
  }, [originalContent, editedContent]);

  // Track changes
  useEffect(() => {
    setHasChanges(originalContent !== undefined && editedContent !== originalContent);
  }, [originalContent, editedContent]);

  const handleRevert = () => {
    if (originalContent) {
      setEditedContent(originalContent);
      setCommitMessage('');
    }
  };

  const handleSubmitPatch = () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to submit patches",
        variant: "destructive"
      });
      return;
    }

    if (!originalContent || !hasChanges) {
      toast({
        title: "No changes to submit",
        description: "Make some changes to the file before submitting a patch",
        variant: "destructive"
      });
      return;
    }

    if (!commitMessage.trim()) {
      toast({
        title: "Commit message required",
        description: "Please provide a commit message for your changes",
        variant: "destructive"
      });
      return;
    }

    const patch = generatePatch(filePath, originalContent, editedContent, commitMessage);

    const decoded = nip19.decode(repositoryNaddr);
    if (decoded.type !== 'naddr') {
      throw new Error('Invalid NIP-19 address');
    }
    const { kind, pubkey, identifier } = decoded.data;
    const a = `${kind}:${pubkey}:${identifier}`;

    // Submit as NIP-34 patch event (kind 1617)
    publishEvent({
      kind: 1617,
      content: patch,
      tags: [
        ['a', a],
        ['p', repositoryOwnerPubkey],
        ['t', 'root'], // This is a root patch
        ['subject', commitMessage]
      ]
    }, {
      onSuccess: () => {
        toast({
          title: "Patch submitted successfully",
          description: "Your changes have been submitted as a patch to the repository"
        });
        onClose();
      },
      onError: (error) => {
        toast({
          title: "Failed to submit patch",
          description: error instanceof Error ? error.message : "Unknown error occurred",
          variant: "destructive"
        });
      }
    });
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="space-y-2">
          {Array.from({ length: 20 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <AlertCircle className="h-12 w-12 text-destructive" />
          <div className="text-center space-y-2">
            <p className="text-destructive font-medium">Failed to load file</p>
            <p className="text-sm text-muted-foreground">
              {error instanceof Error ? error.message : 'Unknown error occurred'}
            </p>
          </div>
        </div>
      );
    }

    if (fileType === 'binary') {
      return (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <FileText className="h-12 w-12 text-muted-foreground" />
          <div className="text-center space-y-2">
            <p className="text-muted-foreground">Binary file detected</p>
            <p className="text-sm text-muted-foreground">
              This file type cannot be edited in the browser
            </p>
          </div>
        </div>
      );
    }

    return (
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'edit' | 'preview')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="edit" className="flex items-center gap-2">
            <Edit3 className="h-4 w-4" />
            Edit
          </TabsTrigger>
          <TabsTrigger value="preview" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Preview
          </TabsTrigger>
        </TabsList>

        <TabsContent value="edit" className="mt-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="commit-message">Commit Message</Label>
              <Input
                id="commit-message"
                placeholder="Describe your changes..."
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                disabled={!user}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="file-content">File Content</Label>
              <Textarea
                id="file-content"
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                className="min-h-[50vh] font-mono text-sm"
                placeholder="Loading file content..."
                disabled={!originalContent || !user}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="preview" className="mt-4">
          <div className="border rounded-lg overflow-hidden">
            {language === 'markdown' ? (
              <ScrollArea className="h-[60vh]">
                <div className="p-4">
                  <MarkdownRenderer content={editedContent} />
                </div>
              </ScrollArea>
            ) : (
              <ScrollArea className="h-[60vh]">
                <SyntaxHighlighter
                  code={editedContent}
                  language={language}
                  showLineNumbers={true}
                />
              </ScrollArea>
            )}
          </div>
        </TabsContent>
      </Tabs>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Edit3 className="h-5 w-5" />
              <div>
                <DialogTitle className="text-left">Edit {fileName}</DialogTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    {fileType}
                  </Badge>
                  {language !== 'text' && (
                    <Badge variant="outline" className="text-xs">
                      {language}
                    </Badge>
                  )}
                  {hasChanges && (
                    <Badge variant="secondary" className="text-xs">
                      Modified
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {renderContent()}
        </div>

        {fileType === 'text' && user && (
          <DialogFooter className="flex-shrink-0 gap-2">
            <Button
              variant="outline"
              onClick={handleRevert}
              disabled={!hasChanges}
            >
              <Undo2 className="h-4 w-4 mr-2" />
              Revert
            </Button>
            <Button
              onClick={handleSubmitPatch}
              disabled={!hasChanges || !commitMessage.trim() || isPublishing}
            >
              <GitCommit className="h-4 w-4 mr-2" />
              {isPublishing ? 'Submitting...' : 'Submit Patch'}
            </Button>
          </DialogFooter>
        )}

        {!user && (
          <DialogFooter className="flex-shrink-0">
            <div className="text-sm text-muted-foreground">
              Please log in to edit files and submit patches
            </div>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}