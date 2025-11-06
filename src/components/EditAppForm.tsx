import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { nip19 } from 'nostr-tools';
import { useAppConfig } from '@/components/AppProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useToast } from '@/hooks/useToast';
import { TagInput } from '@/components/TagInput';
import { Plus, X, Globe, Smartphone, Monitor, Edit, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import type { AppInfo } from '@/hooks/useApps';

interface AppFormData {
  name: string;
  about: string;
  picture: string;
  website: string;
  lud16: string;
  supportedKinds: number[];
  webHandlers: Array<{ url: string; type?: string }>;
  iosHandlers: string[];
  androidHandlers: string[];
  tags: string[];
}

const POPULAR_KINDS = [
  { kind: 1, name: 'Text Notes', description: 'Short text posts and messages' },
  { kind: 6, name: 'Reposts', description: 'Sharing other users\' content' },
  { kind: 7, name: 'Reactions', description: 'Likes, hearts, and emoji reactions' },
  { kind: 9, name: 'Chat Messages', description: 'Direct messages and group chats' },
  { kind: 30023, name: 'Articles', description: 'Long-form content and blog posts' },
  { kind: 31922, name: 'Calendar Events (Date)', description: 'Date-based calendar events' },
  { kind: 31923, name: 'Calendar Events (Time)', description: 'Time-based calendar events' },
  { kind: 30402, name: 'Classified Listings', description: 'Marketplace and classified ads' },
  { kind: 1063, name: 'File Metadata', description: 'File sharing and metadata' },
  { kind: 30078, name: 'App Data', description: 'Application-specific data storage' },
];

interface EditAppFormProps {
  app: AppInfo;
  naddr: string;
}

export function EditAppForm({ app }: EditAppFormProps) {
  const { user } = useCurrentUser();
  const { mutate: publishEvent, isPending } = useNostrPublish();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { config } = useAppConfig();

  const [customKind, setCustomKind] = useState('');
  const [newWebHandler, setNewWebHandler] = useState({ url: '', type: '' });
  const [newIosHandler, setNewIosHandler] = useState('');
  const [newAndroidHandler, setNewAndroidHandler] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors }
  } = useForm<AppFormData>({
    defaultValues: {
      name: '',
      about: '',
      picture: '',
      website: '',
      lud16: '',
      supportedKinds: [],
      webHandlers: [],
      iosHandlers: [],
      androidHandlers: [],
      tags: [],
    }
  });

  // Populate form with existing app data
  useEffect(() => {
    if (app) {
      setValue('name', app.name || '');
      setValue('about', app.about || '');
      setValue('picture', app.picture || '');
      setValue('website', app.website || '');
      setValue('lud16', app.lud16 || '');
      setValue('supportedKinds', app.supportedKinds);
      setValue('webHandlers', app.webHandlers);
      setValue('iosHandlers', app.iosHandlers);
      setValue('androidHandlers', app.androidHandlers);
      setValue('tags', app.tags || []);
    }
  }, [app, setValue]);

  const watchedKinds = watch('supportedKinds');
  const watchedWebHandlers = watch('webHandlers');
  const watchedIosHandlers = watch('iosHandlers');
  const watchedAndroidHandlers = watch('androidHandlers');
  const watchedTags = watch('tags');

  const addKind = (kind: number) => {
    if (!watchedKinds.includes(kind)) {
      setValue('supportedKinds', [...watchedKinds, kind]);
    }
  };

  const removeKind = (kind: number) => {
    setValue('supportedKinds', watchedKinds.filter(k => k !== kind));
  };

  const addCustomKind = () => {
    const kind = parseInt(customKind);
    if (!isNaN(kind) && kind > 0 && !watchedKinds.includes(kind)) {
      addKind(kind);
      setCustomKind('');
    }
  };

  const addWebHandler = () => {
    if (newWebHandler.url.trim()) {
      const handler = {
        url: newWebHandler.url.trim(),
        type: newWebHandler.type.trim() || undefined
      };
      setValue('webHandlers', [...watchedWebHandlers, handler]);
      setNewWebHandler({ url: '', type: '' });
    }
  };

  const removeWebHandler = (index: number) => {
    setValue('webHandlers', watchedWebHandlers.filter((_, i) => i !== index));
  };

  const addIosHandler = () => {
    if (newIosHandler.trim() && !watchedIosHandlers.includes(newIosHandler.trim())) {
      setValue('iosHandlers', [...watchedIosHandlers, newIosHandler.trim()]);
      setNewIosHandler('');
    }
  };

  const removeIosHandler = (index: number) => {
    setValue('iosHandlers', watchedIosHandlers.filter((_, i) => i !== index));
  };

  const addAndroidHandler = () => {
    if (newAndroidHandler.trim() && !watchedAndroidHandlers.includes(newAndroidHandler.trim())) {
      setValue('androidHandlers', [...watchedAndroidHandlers, newAndroidHandler.trim()]);
      setNewAndroidHandler('');
    }
  };

  const removeAndroidHandler = (index: number) => {
    setValue('androidHandlers', watchedAndroidHandlers.filter((_, i) => i !== index));
  };

  const onSubmit = (data: AppFormData) => {
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please log in to edit this app.',
        variant: 'destructive',
      });
      return;
    }

    if (data.supportedKinds.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'Please select at least one supported event kind.',
        variant: 'destructive',
      });
      return;
    }

    // Build tags (keep the same d tag)
    const tags: string[][] = [
      ['d', app.dTag],
      ...data.supportedKinds.map(kind => ['k', kind.toString()]),
      ...data.webHandlers.map(handler =>
        handler.type
          ? ['web', handler.url, handler.type]
          : ['web', handler.url]
      ),
      ...data.iosHandlers.map(url => ['ios', url]),
      ...data.androidHandlers.map(url => ['android', url]),
      ...data.tags.map(tag => ['t', tag]),
    ];

    // Build content (metadata)
    const content = JSON.stringify({
      name: data.name || undefined,
      about: data.about || undefined,
      picture: data.picture || undefined,
      website: data.website || undefined,
      lud16: data.lud16 || undefined,
    });

    publishEvent(
      {
        kind: 31990,
        content,
        tags,
      },
      {
        onSuccess: (event) => {
          toast({
            title: 'App Updated Successfully!',
            description: 'Your app changes have been published to the Nostr network.',
          });

          // Navigate to the updated app
          const dTag = event.tags.find(([name]) => name === 'd')?.[1];
          if (dTag) {
            const naddr = nip19.naddrEncode({
              kind: event.kind,
              pubkey: event.pubkey,
              identifier: dTag,
              relays: [config.relayUrl],
            });
            navigate(`/${naddr}`);
          }
        },
        onError: (error) => {
          toast({
            title: 'Update Failed',
            description: error instanceof Error ? error.message : 'Failed to update app.',
            variant: 'destructive',
          });
        },
      }
    );
  };

  const handleDelete = () => {
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please log in to delete this app.',
        variant: 'destructive',
      });
      return;
    }

    setIsDeleting(true);

    // Publish a deletion event (kind 5)
    publishEvent(
      {
        kind: 5,
        content: 'Deleted app',
        tags: [
          ['e', app.id],
          ['a', `31990:${app.pubkey}:${app.dTag}`],
        ],
      },
      {
        onSuccess: () => {
          toast({
            title: 'App Deleted Successfully!',
            description: 'Your app has been removed from the directory.',
          });
          navigate('/apps');
        },
        onError: (error) => {
          toast({
            title: 'Deletion Failed',
            description: error instanceof Error ? error.message : 'Failed to delete app.',
            variant: 'destructive',
          });
          setIsDeleting(false);
        },
      }
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Edit className="h-5 w-5" />
            <span>Edit App</span>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" disabled={isDeleting}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete App
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete your app
                  "{app.name || 'Unnamed App'}" from the directory.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete App
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Update your app's information and settings. Changes will be published to the Nostr network.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Basic Information</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">App Name *</Label>
                <Input
                  id="name"
                  {...register('name', { required: 'App name is required' })}
                  placeholder="My Awesome Nostr App"
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">Website URL *</Label>
                <Input
                  id="website"
                  {...register('website', { required: 'Website URL is required' })}
                  placeholder="https://myapp.com"
                  type="url"
                />
                {errors.website && (
                  <p className="text-sm text-destructive">{errors.website.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="about">Description *</Label>
              <Textarea
                id="about"
                {...register('about', { required: 'Description is required' })}
                placeholder="Describe what your app does and what makes it special..."
                rows={3}
              />
              {errors.about && (
                <p className="text-sm text-destructive">{errors.about.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="picture">App Icon URL *</Label>
              <Input
                id="picture"
                {...register('picture', { required: 'App icon URL is required' })}
                placeholder="https://myapp.com/icon.png"
                type="url"
              />
              {errors.picture && (
                <p className="text-sm text-destructive">{errors.picture.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Recommended: Square image, at least 256x256 pixels
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="lud16">Lightning Address (optional)</Label>
              <Input
                id="lud16"
                {...register('lud16')}
                placeholder="you@getalby.com"
                type="text"
              />
              <p className="text-xs text-muted-foreground">
                Add a lightning address to receive zaps (tips) from users. Supports NIP-57 zaps or regular lightning payments.
              </p>
            </div>
          </div>

          <Separator />

          {/* Tags */}
          <div className="space-y-4">
            <TagInput
              tags={watchedTags}
              onTagsChange={(tags) => setValue('tags', tags)}
              label="Tags (optional)"
              placeholder="e.g., social, messaging, tools"
              description="Add tags to help users discover your app. Press Enter, comma, Tab, or space to add."
            />
          </div>

          <Separator />

          {/* Supported Event Kinds */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium">Supported Event Types *</h3>
              <p className="text-sm text-muted-foreground">
                Select the types of Nostr events your app can handle
              </p>
            </div>

            {/* Popular Kinds */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Popular Event Types</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {POPULAR_KINDS.map(({ kind, name, description }) => {
                  const isSelected = watchedKinds.includes(kind);
                  return (
                    <div
                      key={kind}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        isSelected
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => isSelected ? removeKind(kind) : addKind(kind)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-sm">{name}</span>
                            <Badge variant="outline" className="text-xs">
                              {kind}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {description}
                          </p>
                        </div>
                        {isSelected && (
                          <div className="ml-2 h-4 w-4 rounded-full bg-primary flex items-center justify-center">
                            <div className="h-2 w-2 rounded-full bg-white" />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Custom Kind Input */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Add Custom Event Kind</h4>
              <div className="flex space-x-2">
                <Input
                  value={customKind}
                  onChange={(e) => setCustomKind(e.target.value)}
                  placeholder="Enter kind number..."
                  className="flex-1"
                  type="number"
                  min="0"
                />
                <Button
                  type="button"
                  onClick={addCustomKind}
                  disabled={!customKind || isNaN(parseInt(customKind))}
                  size="sm"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Selected Kinds */}
            {watchedKinds.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Selected Event Types</h4>
                <div className="flex flex-wrap gap-2">
                  {watchedKinds.map((kind) => {
                    const popularKind = POPULAR_KINDS.find(k => k.kind === kind);
                    return (
                      <Badge
                        key={kind}
                        variant="secondary"
                        className="flex items-center space-x-1"
                      >
                        <span>{popularKind?.name || `Kind ${kind}`}</span>
                        <button
                          type="button"
                          onClick={() => removeKind(kind)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Platform Handlers */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium">Platform Handlers</h3>
              <p className="text-sm text-muted-foreground">
                Specify how users can access your app on different platforms. Use &lt;bech32&gt; as a placeholder for Nostr identifiers.
              </p>
            </div>

            {/* Web Handlers */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium flex items-center space-x-2">
                <Globe className="h-4 w-4" />
                <span>Web Handlers</span>
              </h4>

              <div className="flex space-x-2">
                <Input
                  placeholder="https://myapp.com/view/<bech32>"
                  value={newWebHandler.url}
                  onChange={(e) => setNewWebHandler({ ...newWebHandler, url: e.target.value })}
                  className="flex-1"
                />
                <Input
                  placeholder="Entity type (optional)"
                  value={newWebHandler.type}
                  onChange={(e) => setNewWebHandler({ ...newWebHandler, type: e.target.value })}
                  className="w-32"
                />
                <Button
                  type="button"
                  onClick={addWebHandler}
                  disabled={!newWebHandler.url.trim()}
                  size="sm"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {watchedWebHandlers.length > 0 && (
                <div className="space-y-2">
                  {watchedWebHandlers.map((handler, index) => (
                    <div key={index} className="flex items-center space-x-2 p-2 border rounded">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      <span className="flex-1 text-sm font-mono">{handler.url}</span>
                      {handler.type && (
                        <Badge variant="outline" className="text-xs">{handler.type}</Badge>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeWebHandler(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* iOS Handlers */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium flex items-center space-x-2">
                <Smartphone className="h-4 w-4" />
                <span>iOS Handlers</span>
              </h4>

              <div className="flex space-x-2">
                <Input
                  placeholder="myapp://<bech32>"
                  value={newIosHandler}
                  onChange={(e) => setNewIosHandler(e.target.value)}
                  className="flex-1"
                />
                <Button
                  type="button"
                  onClick={addIosHandler}
                  disabled={!newIosHandler.trim()}
                  size="sm"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {watchedIosHandlers.length > 0 && (
                <div className="space-y-2">
                  {watchedIosHandlers.map((handler, index) => (
                    <div key={index} className="flex items-center space-x-2 p-2 border rounded">
                      <Smartphone className="h-4 w-4 text-muted-foreground" />
                      <span className="flex-1 text-sm font-mono">{handler}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeIosHandler(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Android Handlers */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium flex items-center space-x-2">
                <Monitor className="h-4 w-4" />
                <span>Android Handlers</span>
              </h4>

              <div className="flex space-x-2">
                <Input
                  placeholder="intent://<bech32>#Intent;scheme=myapp;end"
                  value={newAndroidHandler}
                  onChange={(e) => setNewAndroidHandler(e.target.value)}
                  className="flex-1"
                />
                <Button
                  type="button"
                  onClick={addAndroidHandler}
                  disabled={!newAndroidHandler.trim()}
                  size="sm"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {watchedAndroidHandlers.length > 0 && (
                <div className="space-y-2">
                  {watchedAndroidHandlers.map((handler, index) => (
                    <div key={index} className="flex items-center space-x-2 p-2 border rounded">
                      <Monitor className="h-4 w-4 text-muted-foreground" />
                      <span className="flex-1 text-sm font-mono">{handler}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAndroidHandler(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Submit Buttons */}
          <div className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/apps')}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending} className="min-w-32">
              {isPending ? 'Updating...' : 'Update App'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}