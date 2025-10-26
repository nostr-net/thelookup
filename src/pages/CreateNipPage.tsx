import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useSeoMeta } from '@unhead/react';
import { Layout } from '@/components/Layout';
import { KindInput } from '@/components/KindInput';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useCustomNip } from '@/hooks/useCustomNip';
import { useOfficialNip } from '@/hooks/useOfficialNip';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useAppConfig } from '@/components/AppProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { ArrowLeft, AlertCircle, Save, GitFork, X } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { nip19 } from 'nostr-tools';
import { slugify } from '@/lib/utils';
import { getPageTitle, getPageDescription } from '@/lib/siteConfig';

export default function CreateNipPage() {
  const { toast } = useToast();
  const { user } = useCurrentUser();
  const { mutate: publishEvent, isPending } = useNostrPublish();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { config } = useAppConfig();

  useSeoMeta({
    title: getPageTitle('Create Custom NIP'),
    description: getPageDescription('Create your own custom Nostr Implementation Possibility (NIP). Define new event kinds, protocols, and specifications for the Nostr ecosystem'),
  });

  // Get fork parameters from URL
  const forkParam = searchParams.get('fork');
  const officialForkParam = searchParams.get('officialFork');

  const [title, setTitle] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [content, setContent] = useState('');
  const [kinds, setKinds] = useState<string[]>([]);
  const [identifierManuallyEdited, setIdentifierManuallyEdited] = useState(false);
  const [forkSource, setForkSource] = useState<string | null>(forkParam);
  const [officialForkSource, setOfficialForkSource] = useState<string | null>(officialForkParam);

  // Load fork source data
  const { data: customForkSource } = useCustomNip(forkParam ?? '');
  const { data: officialForkSourceData } = useOfficialNip(officialForkParam ?? '');

  // Auto-generate identifier from title
  useEffect(() => {
    if (!identifierManuallyEdited && title) {
      setIdentifier(slugify(title));
    }
  }, [title, identifierManuallyEdited]);

  // Initialize fork source when URL params change
  useEffect(() => {
    if (forkParam) {
      setForkSource(forkParam);
    }
    if (officialForkParam) {
      setOfficialForkSource(officialForkParam);
    }
  }, [forkParam, officialForkParam]);

  // Pre-fill form when forking
  useEffect(() => {
    if (forkSource && customForkSource) {
      const titleTag = customForkSource.tags.find(tag => tag[0] === 'title')?.[1] || '';
      const kindTags = customForkSource.tags.filter(tag => tag[0] === 'k').map(tag => tag[1]);

      setTitle(titleTag);
      setContent(customForkSource.content);
      setKinds(kindTags);
    } else if (officialForkSource && officialForkSourceData) {
      // Extract title from the first line of the markdown content
      const lines = officialForkSourceData.content.split('\n');
      const titleLine = lines.find(line => line.startsWith('# '));
      const extractedTitle = titleLine ? titleLine.replace('# ', '').trim() : `NIP-${officialForkSource}`;

      setTitle(extractedTitle);
      setContent(officialForkSourceData.content);
      setKinds([]); // Official NIPs don't have specific kinds in the same way
    }
  }, [forkSource, customForkSource, officialForkSource, officialForkSourceData]);

  if (!user) {
    return (
      <Layout>
        <div className="space-y-4">
          <Button variant="ghost" asChild>
            <Link to="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Back to Home</span>
              <span className="sm:hidden">Back</span>
            </Link>
          </Button>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You must be logged in to create a custom NIP.
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

    const tags = [
      ['d', identifier.trim()],
      ['title', title.trim()],
      ...kinds.map(kind => ['k', kind]),
    ];

    // Add fork tags based on the type of source
    if (forkSource && customForkSource) {
      // For custom NIPs, use "a" tag with kind:pubkey:d format and "fork" marker in position 3
      const dTag = customForkSource.tags.find(tag => tag[0] === 'd')?.[1] || '';
      tags.push(['a', `${customForkSource.kind}:${customForkSource.pubkey}:${dTag}`, '', 'fork']);
      // Add "p" tag to notify the original author of the fork
      tags.push(['p', customForkSource.pubkey]);
    } else if (officialForkSource) {
      // For official NIPs, use "i" tag with GitHub URL and "fork" marker
      const githubUrl = `https://github.com/nostr-protocol/nips/blob/master/${officialForkSource}.md`;
      tags.push(['i', githubUrl, 'fork']);
      // Note: We don't add "p" tags for official NIPs as requested
    }

    console.log('Publishing NIP with tags:', tags);
    console.log('NIP content:', content.trim());

    publishEvent(
      {
        kind: 30817,
        content: content.trim(),
        tags,
      },
      {
        onSuccess: (event) => {
          console.log('NIP published successfully:', event);
          const naddr = nip19.naddrEncode({
            identifier: identifier.trim(),
            pubkey: event.pubkey,
            kind: event.kind,
            relays: [config.relayUrl],
          });
          toast({
            title: 'NIP published successfully!',
          });
          navigate(`/${naddr}`);
        },
        onError: (error) => {
          console.error('Failed to publish NIP:', error);
          toast({
            title: 'Failed to publish NIP',
            description: error.message,
            variant: 'destructive',
          });
        },
      }
    );
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" asChild>
            <Link to="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Create Custom NIP
            </CardTitle>
            {(forkSource || officialForkSource) && (
              <div className="pt-4">
                <Alert className="p-0">
                  <div className="flex items-center space-x-2">
                    <GitFork className="ml-4 h-4 w-4" />
                    <AlertDescription className="flex items-center justify-between space-between w-full">
                      <span>
                        Fork of
                        {forkSource && customForkSource && (
                          <span className="ml-1 font-bold">
                            {customForkSource.tags.find(tag => tag[0] === 'title')?.[1] || 'Untitled'}
                          </span>
                        )}
                        {officialForkSource && (
                          <span className="ml-1 font-bold">
                            NIP-{officialForkSource}
                          </span>
                        )}
                      </span>
                      <Button
                        className="ml-auto"
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setForkSource(null);
                          setOfficialForkSource(null);
                          // Clear the URL params
                          const newUrl = new URL(window.location.href);
                          newUrl.searchParams.delete('fork');
                          newUrl.searchParams.delete('officialFork');
                          window.history.replaceState({}, '', newUrl.toString());
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </AlertDescription>
                  </div>
                </Alert>
              </div>
            )}
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
                    onChange={(e) => {
                      setIdentifier(e.target.value);
                      setIdentifierManuallyEdited(true);
                    }}
                    placeholder="e.g., custom-xyz-events"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Unique identifier for this NIP (used in the naddr). Auto-generated from title, but you can edit it.
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
                      className="min-h-[300px] sm:min-h-[400px] font-mono text-sm"
                      required
                    />
                  </TabsContent>
                  <TabsContent value="preview">
                    <div className="border rounded-md p-3 sm:p-4 min-h-[300px] sm:min-h-[400px] bg-muted/50 overflow-auto">
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

              <div className="flex flex-col sm:flex-row justify-end gap-2 sm:space-x-2">
                <Button type="button" variant="outline" asChild className="w-full sm:w-auto">
                  <Link to="/">Cancel</Link>
                </Button>
                <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
                  {isPending ? (
                    <>Publishing...</>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Publish NIP
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