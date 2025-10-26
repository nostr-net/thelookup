import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useSeoMeta } from '@unhead/react';
import { Layout } from '@/components/Layout';
import { getPageTitle, getPageDescription } from '@/lib/siteConfig';
import { KindInput } from '@/components/KindInput';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useCustomNip } from '@/hooks/useCustomNip';
import { useUpdateNip } from '@/hooks/useUpdateNip';
import { useAppConfig } from '@/components/AppProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { ArrowLeft, AlertCircle, Save } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { nip19 } from 'nostr-tools';

export default function EditNipPage() {
  const { toast } = useToast();
  const { naddr } = useParams<{ naddr: string }>();
  const { user } = useCurrentUser();
  const { data: event, isLoading, error } = useCustomNip(naddr!);
  const { mutate: updateNip, isPending } = useUpdateNip();
  const navigate = useNavigate();
  const { config } = useAppConfig();

  const [title, setTitle] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [content, setContent] = useState('');
  const [kinds, setKinds] = useState<string[]>([]);

  useSeoMeta({
    title: title ? getPageTitle(`Edit ${title}`) : getPageTitle('Edit Custom NIP'),
    description: getPageDescription('edit-nip'),
  });

  useEffect(() => {
    if (event) {
      const titleTag = event.tags.find(tag => tag[0] === 'title')?.[1] || '';
      const dTag = event.tags.find(tag => tag[0] === 'd')?.[1] || '';
      const kindTags = event.tags.filter(tag => tag[0] === 'k').map(tag => tag[1]);

      setTitle(titleTag);
      setIdentifier(dTag);
      setContent(event.content);
      setKinds(kindTags);
    }
  }, [event]);

  if (!naddr) {
    return (
      <Layout>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Invalid NIP identifier</AlertDescription>
        </Alert>
      </Layout>
    );
  }

  if (!user) {
    return (
      <Layout>
        <div className="space-y-4">
          <Button variant="ghost" asChild>
            <Link to={`/${naddr}`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to NIP
            </Link>
          </Button>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You must be logged in to edit a NIP.
            </AlertDescription>
          </Alert>
        </div>
      </Layout>
    );
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-6">
          <Button variant="ghost" asChild>
            <Link to={`/${naddr}`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to NIP
            </Link>
          </Button>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  if (error || !event) {
    return (
      <Layout>
        <div className="space-y-4">
          <Button variant="ghost" asChild>
            <Link to={`/${naddr}`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to NIP
            </Link>
          </Button>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load NIP for editing.
            </AlertDescription>
          </Alert>
        </div>
      </Layout>
    );
  }

  if (user.pubkey !== event.pubkey) {
    return (
      <Layout>
        <div className="space-y-4">
          <Button variant="ghost" asChild>
            <Link to={`/${naddr}`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to NIP
            </Link>
          </Button>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You can only edit your own NIPs.
            </AlertDescription>
          </Alert>
        </div>
      </Layout>
    );
  }



  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !identifier.trim() || !content.trim()) {
      toast({
        title: 'Missing required fields',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    
    updateNip(
      {
        identifier: identifier.trim(),
        title: title.trim(),
        content: content.trim(),
        kinds,
        originalEvent: event!, // Use the original event for proper replacement
      },
      {
        onSuccess: (newEvent) => {
          const newNaddr = nip19.naddrEncode({
            identifier: identifier.trim(),
            pubkey: newEvent.pubkey,
            kind: newEvent.kind,
            relays: [config.relayUrl],
          });
          toast({
            title: 'NIP updated successfully!',
          });
          navigate(`/${newNaddr}`);
        },
        onError: (error) => {
          toast({
            title: 'Failed to update NIP',
            description: error.message,
            variant: 'destructive',
          });
        },
      }
    );
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" asChild>
            <Link to={`/${naddr}`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to NIP
            </Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Edit NIP</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Custom Event Kind for XYZ"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="identifier">Identifier *</Label>
                  <Input
                    id="identifier"
                    value={identifier}
                    disabled
                    className="bg-muted/50 cursor-not-allowed"
                  />
                  <p className="text-xs text-muted-foreground">
                    The identifier cannot be changed. To use a different identifier, delete this NIP and create a new one.
                  </p>
                </div>
              </div>

              <KindInput
                kinds={kinds}
                onKindsChange={setKinds}
              />

              <div className="space-y-2">
                <Label htmlFor="content">Content *</Label>
                <Tabs defaultValue="write" className="w-full">
                  <TabsList>
                    <TabsTrigger value="write">Write</TabsTrigger>
                    <TabsTrigger value="preview">Preview</TabsTrigger>
                  </TabsList>
                  <TabsContent value="write">
                    <Textarea
                      id="content"
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="Write your NIP content in Markdown..."
                      className="min-h-[400px] font-mono"
                      required
                    />
                  </TabsContent>
                  <TabsContent value="preview">
                    <div className="border rounded-md p-4 min-h-[400px] bg-muted/50">
                      {content ? (
                        <MarkdownRenderer content={content} />
                      ) : (
                        <p className="text-muted-foreground">Nothing to preview yet...</p>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
                <p className="text-xs text-muted-foreground">
                  Use Markdown formatting. This will be the main content of your NIP.
                </p>
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" asChild>
                  <Link to={`/${naddr}`}>Cancel</Link>
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? (
                    <>Updating...</>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Update NIP
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}