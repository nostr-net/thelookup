import { Layout } from '@/components/Layout';
import { AnnounceRepositoryForm } from '@/components/AnnounceRepositoryForm';
import { useSeoMeta } from '@unhead/react';
import { GitBranch } from 'lucide-react';
import { getPageTitle } from '@/lib/siteConfig';

export default function AnnounceRepositoryPage() {
  useSeoMeta({
    title: getPageTitle('Add Repository'),
    description: 'Add your git repository on Nostr using NIP-34. Share your code, allow others to discover it, and enable patch submissions and issue reporting.',
  });

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <GitBranch className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold gradient-text">
              Add Repository
            </h1>
          </div>
          <p className="text-muted-foreground">
            Share your git repository on Nostr using NIP-34. This will add your repository's existence and allow others to discover it, submit patches, and report issues.
          </p>
        </div>

        <AnnounceRepositoryForm />
      </div>
    </Layout>
  );
}