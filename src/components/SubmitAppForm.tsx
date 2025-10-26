import { useState } from 'react';
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
import { useAppSubmissionPayment } from '@/hooks/useAppSubmissionPayment';
import { LoginArea } from '@/components/auth/LoginArea';
import { TagInput } from '@/components/TagInput';
import { AppSubmissionPaymentDialog } from '@/components/AppSubmissionPaymentDialog';
import { Plus, X, Globe, Smartphone, Monitor, Zap, CreditCard } from 'lucide-react';


interface AppFormData {
  name: string;
  about: string;
  picture: string;
  website: string;
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

export function SubmitAppForm() {
  const { user } = useCurrentUser();
  const { mutate: publishEvent, isPending } = useNostrPublish();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { config } = useAppConfig();

  // SubmitAppForm is always for NEW app submissions, so payment is always required
  // (EditAppForm is used for editing existing apps, which doesn't require payment)

  // Payment functionality
  const { isPaymentRequired, paymentConfig } = useAppSubmissionPayment();
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [pendingFormData, setPendingFormData] = useState<AppFormData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customKind, setCustomKind] = useState('');
  const [newWebHandler, setNewWebHandler] = useState({ url: '', type: '' });
  const [newIosHandler, setNewIosHandler] = useState('');
  const [newAndroidHandler, setNewAndroidHandler] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors }
  } = useForm<AppFormData>({
    defaultValues: {
      name: '',
      about: '',
      picture: '',
      website: '',
      supportedKinds: [],
      webHandlers: [],
      iosHandlers: [],
      androidHandlers: [],
      tags: [],
    }
  });

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

  const submitAppToRelay = (data: AppFormData) => {
    // Prevent duplicate submissions
    if (isSubmitting) {
      console.log('Already submitting, ignoring duplicate call');
      return;
    }
    
    setIsSubmitting(true);
    console.log('Starting app submission...');
    
    // Additional safety: close payment dialog if still open
    setShowPaymentDialog(false);
    
    // Generate a random d tag
    const dTag = Math.random().toString(36).substring(2, 15);

    // Build tags
    const tags: string[][] = [
      ['d', dTag],
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
    });

    toast({
      title: 'Publishing App',
      description: 'Sending your app to the Nostr network...',
    });

    publishEvent(
      {
        kind: 31990,
        content,
        tags,
      },
      {
        onSuccess: (event) => {
          setIsSubmitting(false);
          toast({
            title: 'App Submitted Successfully!',
            description: 'Your app has been published to the Nostr network.',
          });

          // Navigate to the newly created app
          const dTag = event.tags.find(([name]) => name === 'd')?.[1];
          if (dTag) {
            const naddr = nip19.naddrEncode({
              kind: event.kind,
              pubkey: event.pubkey,
              identifier: dTag,
              relays: [config.relayUrl],
            });
            console.log('Navigating to app:', `/${naddr}`);
            console.log('Event details:', { dTag, kind: event.kind, pubkey: event.pubkey });
            
            // For now, navigate to apps list to avoid black screen
            // TODO: Fix app detail page rendering issue
            console.log('App submitted successfully, redirecting to apps list');
            navigate('/apps');
          } else {
            console.log('No dTag found, resetting form');
            reset();
          }
        },
        onError: (error) => {
          setIsSubmitting(false);
          toast({
            title: 'Submission Failed',
            description: error instanceof Error ? error.message : 'Failed to submit app.',
            variant: 'destructive',
          });
        },
      }
    );
  };

  const onSubmit = (data: AppFormData) => {
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please log in to submit an app.',
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

    // Check if payment is required (always required for new app submissions)
    if (isPaymentRequired && paymentConfig) {
      // Store form data and show payment dialog
      setPendingFormData(data);
      setShowPaymentDialog(true);
      toast({
        title: 'Payment Required',
        description: `A payment of ${paymentConfig?.feeAmount || 0} sats is required for all new app submissions.`,
      });
    } else {
      // Submit directly without payment
      submitAppToRelay(data);
    }
  };

  const handlePaymentConfirmed = () => {
    if (pendingFormData && !isSubmitting) {
      console.log('Payment confirmed, closing dialog...');
      
      // Close dialog first
      setShowPaymentDialog(false);
      
      toast({
        title: 'Payment Confirmed',
        description: 'Payment verified! Submitting your app to the network...',
      });
      
      // Submit app after a brief delay to ensure dialog closes
      setTimeout(() => {
        if (pendingFormData) {
          const dataToSubmit = pendingFormData;
          setPendingFormData(null);
          submitAppToRelay(dataToSubmit);
        }
      }, 500);
    } else if (isSubmitting) {
      console.log('Already submitting, ignoring payment confirmation');
    } else if (!pendingFormData) {
      console.log('No pending form data, ignoring payment confirmation');
    }
  };

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Zap className="h-5 w-5" />
            <span>Submit New App</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Please log in to submit a new app to the directory.
            </p>
            <LoginArea className="max-w-60 mx-auto" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Zap className="h-5 w-5" />
          <span>Submit New App</span>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Add your Nostr application to the directory. Fill out the information below to help users discover your app.
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

          {/* Submit Button */}
          <div className="flex justify-end">
            <Button 
              type="submit" 
              disabled={isPending || isSubmitting} 
              className="min-w-32"
            >
              {isPending || isSubmitting ? (
                'Submitting...'
              ) : isPaymentRequired ? (
                <>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Pay & Submit App
                </>
              ) : (
                'Submit App'
              )}
            </Button>
          </div>
        </form>
      </CardContent>

      {/* Payment Dialog */}
      <AppSubmissionPaymentDialog
        open={showPaymentDialog}
        onOpenChange={setShowPaymentDialog}
        onPaymentConfirmed={handlePaymentConfirmed}
      />
    </Card>
  );
}