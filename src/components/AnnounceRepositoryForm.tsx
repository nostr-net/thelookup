import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { nip19 } from 'nostr-tools';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useAppConfig } from '@/components/AppProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/useToast';
import { GitBranch, Plus, X, Globe, Copy, Users, Zap } from 'lucide-react';
import { parseRepositoryEvent } from '@/lib/repository';
import type { NostrEvent } from '@nostrify/nostrify';

interface FormData {
  id: string;
  name: string;
  description: string;
  web: string[];
  clone: string[];
  relays: string[];
  maintainers: string[];
  tags: string[];
  earliestCommit: string;
}

interface RepositoryData {
  event: NostrEvent;
  data: ReturnType<typeof parseRepositoryEvent>;
}

interface AnnounceRepositoryFormProps {
  repository?: RepositoryData;
}

export function AnnounceRepositoryForm({ repository }: AnnounceRepositoryFormProps = {}) {
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const { mutate: publishEvent, isPending } = useNostrPublish();
  const { toast } = useToast();
  const { config } = useAppConfig();

  const [formData, setFormData] = useState<FormData>(() => {
    if (repository && repository.data) {
      const repo = repository.data;
      return {
        id: repo.id || '',
        name: repo.name || '',
        description: repo.description || '',
        web: repo.web || [],
        clone: repo.clone || [],
        relays: repo.relays || [],
        maintainers: repo.maintainers || [],
        tags: repo.tags || [],
        earliestCommit: repo.earliest_commit || '',
      };
    }

    return {
      id: '',
      name: '',
      description: '',
      web: [],
      clone: [],
      relays: [],
      maintainers: [],
      tags: [],
      earliestCommit: '',
    };
  });

  // Update form data when repository data loads
  useEffect(() => {
    if (repository && repository.data) {
      const repo = repository.data;
      setFormData({
        id: repo.id || '',
        name: repo.name || '',
        description: repo.description || '',
        web: repo.web || [],
        clone: repo.clone || [],
        relays: repo.relays || [],
        maintainers: repo.maintainers || [],
        tags: repo.tags || [],
        earliestCommit: repo.earliest_commit || '',
      });
    }
  }, [repository]);

  const [newInputs, setNewInputs] = useState({
    web: '',
    clone: '',
    relay: '',
    maintainer: '',
    tag: '',
  });

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleArrayAdd = (field: keyof Pick<FormData, 'web' | 'clone' | 'relays' | 'maintainers' | 'tags'>, value: string) => {
    if (!value.trim()) return;

    setFormData(prev => ({
      ...prev,
      [field]: [...prev[field], value.trim()]
    }));

    setNewInputs(prev => ({ ...prev, [field === 'relays' ? 'relay' : field === 'maintainers' ? 'maintainer' : field]: '' }));
  };

  const handleArrayRemove = (field: keyof Pick<FormData, 'web' | 'clone' | 'relays' | 'maintainers' | 'tags'>, index: number) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to add a repository",
        variant: "destructive",
      });
      return;
    }

    if (!formData.id.trim()) {
      toast({
        title: "Repository ID required",
        description: "Please provide a repository identifier",
        variant: "destructive",
      });
      return;
    }

    // Build tags array
    const tags: string[][] = [
      ['d', formData.id.trim()],
    ];

    if (formData.name.trim()) {
      tags.push(['name', formData.name.trim()]);
    }

    if (formData.description.trim()) {
      tags.push(['description', formData.description.trim()]);
    }

    formData.web.forEach(url => {
      if (url.trim()) tags.push(['web', url.trim()]);
    });

    formData.clone.forEach(url => {
      if (url.trim()) tags.push(['clone', url.trim()]);
    });

    formData.relays.forEach(relay => {
      if (relay.trim()) tags.push(['relays', relay.trim()]);
    });

    formData.maintainers.forEach(maintainer => {
      if (maintainer.trim()) tags.push(['maintainers', maintainer.trim()]);
    });

    if (formData.earliestCommit.trim()) {
      tags.push(['r', formData.earliestCommit.trim(), 'euc']);
    }

    formData.tags.forEach(tag => {
      if (tag.trim()) tags.push(['t', tag.trim()]);
    });

    publishEvent(
      {
        kind: 30617,
        content: '',
        tags,
      },
      {
        onSuccess: () => {
          toast({
            title: "Repository added!",
            description: "Your repository has been added on Nostr",
          });

          // Navigate to the repository page
          const naddr = nip19.naddrEncode({
            identifier: formData.id.trim(),
            pubkey: user.pubkey,
            kind: 30617,
            relays: [config.relayUrl],
          });
          navigate(`/${naddr}`);
        },
        onError: (error) => {
          toast({
            title: "Failed to add repository",
            description: error.message,
            variant: "destructive",
          });
        },
      }
    );
  };

  if (!user) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="space-y-4">
            <Zap className="h-12 w-12 text-muted-foreground mx-auto" />
            <div>
              <h3 className="text-lg font-semibold">Authentication Required</h3>
              <p className="text-muted-foreground">
                Please log in to add a repository on Nostr
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GitBranch className="h-5 w-5" />
          {repository ? 'Edit Repository' : 'Add Repository'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Required fields */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="id">Repository ID *</Label>
              <Input
                id="id"
                value={formData.id}
                onChange={(e) => handleInputChange('id', e.target.value)}
                placeholder="my-awesome-project"
                required
              />
              <p className="text-sm text-muted-foreground">
                A unique identifier for your repository (usually kebab-case)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Repository Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="My Awesome Project"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="A brief description of your project..."
                rows={3}
              />
            </div>
          </div>

          {/* Clone URLs */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Copy className="h-4 w-4" />
              Clone URLs
            </Label>
            <div className="flex gap-2">
              <Input
                value={newInputs.clone}
                onChange={(e) => setNewInputs(prev => ({ ...prev, clone: e.target.value }))}
                placeholder="https://github.com/user/repo.git"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleArrayAdd('clone', newInputs.clone);
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => handleArrayAdd('clone', newInputs.clone)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {formData.clone.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.clone.map((url, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center gap-1">
                    {url}
                    <button
                      type="button"
                      onClick={() => handleArrayRemove('clone', index)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Web URLs */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Web URLs
            </Label>
            <div className="flex gap-2">
              <Input
                value={newInputs.web}
                onChange={(e) => setNewInputs(prev => ({ ...prev, web: e.target.value }))}
                placeholder="https://github.com/user/repo"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleArrayAdd('web', newInputs.web);
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => handleArrayAdd('web', newInputs.web)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {formData.web.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.web.map((url, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center gap-1">
                    {url}
                    <button
                      type="button"
                      onClick={() => handleArrayRemove('web', index)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Tags */}
          <div className="space-y-3">
            <Label>Tags</Label>
            <div className="flex gap-2">
              <Input
                value={newInputs.tag}
                onChange={(e) => setNewInputs(prev => ({ ...prev, tag: e.target.value }))}
                placeholder="javascript, react, nostr"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleArrayAdd('tags', newInputs.tag);
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => handleArrayAdd('tags', newInputs.tag)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.tags.map((tag, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center gap-1">
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleArrayRemove('tags', index)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Advanced fields */}
          <details className="space-y-4">
            <summary className="cursor-pointer font-medium">Advanced Options</summary>

            <div className="space-y-4 pl-4">
              <div className="space-y-2">
                <Label htmlFor="earliestCommit">Earliest Unique Commit</Label>
                <Input
                  id="earliestCommit"
                  value={formData.earliestCommit}
                  onChange={(e) => handleInputChange('earliestCommit', e.target.value)}
                  placeholder="abc123def456..."
                />
                <p className="text-sm text-muted-foreground">
                  The commit ID of the earliest unique commit (usually the root commit)
                </p>
              </div>

              {/* Relays */}
              <div className="space-y-3">
                <Label>Monitor Relays</Label>
                <div className="flex gap-2">
                  <Input
                    value={newInputs.relay}
                    onChange={(e) => setNewInputs(prev => ({ ...prev, relay: e.target.value }))}
                    placeholder="wss://relay.example.com"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleArrayAdd('relays', newInputs.relay);
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleArrayAdd('relays', newInputs.relay)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {formData.relays.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.relays.map((relay, index) => (
                      <Badge key={index} variant="secondary" className="flex items-center gap-1">
                        {relay}
                        <button
                          type="button"
                          onClick={() => handleArrayRemove('relays', index)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Maintainers */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Additional Maintainers
                </Label>
                <div className="flex gap-2">
                  <Input
                    value={newInputs.maintainer}
                    onChange={(e) => setNewInputs(prev => ({ ...prev, maintainer: e.target.value }))}
                    placeholder="npub1... or user@domain.com"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleArrayAdd('maintainers', newInputs.maintainer);
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleArrayAdd('maintainers', newInputs.maintainer)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {formData.maintainers.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.maintainers.map((maintainer, index) => (
                      <Badge key={index} variant="secondary" className="flex items-center gap-1">
                        {maintainer}
                        <button
                          type="button"
                          onClick={() => handleArrayRemove('maintainers', index)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </details>

          <Button type="submit" disabled={isPending || !formData.id.trim()} className="w-full">
            {isPending ? (repository ? 'Updating...' : 'Adding...') : (repository ? 'Update Repository' : 'Add Repository')}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}