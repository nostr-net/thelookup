import { useParams, Navigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { useSeoMeta } from '@unhead/react';
import { getPageTitle, getPageDescription } from '@/lib/siteConfig';
import { EditAppForm } from '@/components/EditAppForm';
import { useApp } from '@/hooks/useApp';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { LoginArea } from '@/components/auth/LoginArea';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Edit } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function EditAppPage() {
  const { naddr } = useParams<{ naddr: string }>();
  const { user } = useCurrentUser();
  const { data: app, isLoading, error } = useApp(naddr || '');

  useSeoMeta({
    title: app ? getPageTitle(`Edit ${app.name}`) : getPageTitle('Edit App'),
    description: getPageDescription('edit-app'),
  });

  if (!naddr) {
    return <Navigate to="/apps" replace />;
  }

  if (!user) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center space-x-3">
              <div className="relative">
                <Edit className="h-8 w-8 text-primary" />
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl"></div>
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold gradient-text">Edit App</h1>
            </div>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Modify your app's information and settings.
            </p>
          </div>

          <Card>
            <CardContent className="py-12 px-8 text-center">
              <div className="space-y-4">
                <p className="text-muted-foreground">
                  Please log in to edit your app.
                </p>
                <LoginArea className="max-w-60 mx-auto" />
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center space-x-3">
              <div className="relative">
                <Edit className="h-8 w-8 text-primary" />
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl"></div>
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold gradient-text">Edit App</h1>
            </div>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Modify your app's information and settings.
            </p>
          </div>

          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  if (error || !app) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center space-x-3">
              <div className="relative">
                <Edit className="h-8 w-8 text-primary" />
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl"></div>
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold gradient-text">Edit App</h1>
            </div>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Modify your app's information and settings.
            </p>
          </div>

          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error instanceof Error ? error.message : 'App not found or failed to load.'}
            </AlertDescription>
          </Alert>
        </div>
      </Layout>
    );
  }

  // Check if the current user owns this app
  if (app.pubkey !== user.pubkey) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center space-x-3">
              <div className="relative">
                <Edit className="h-8 w-8 text-primary" />
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl"></div>
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold gradient-text">Edit App</h1>
            </div>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Modify your app's information and settings.
            </p>
          </div>

          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You don't have permission to edit this app. You can only edit apps that you created.
            </AlertDescription>
          </Alert>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-3">
            <div className="relative">
              <Edit className="h-8 w-8 text-primary" />
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl"></div>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold gradient-text">Edit App</h1>
          </div>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Modify your app's information and settings.
          </p>
        </div>

        <EditAppForm app={app} naddr={naddr} />
      </div>
    </Layout>
  );
}