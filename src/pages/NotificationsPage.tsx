import { Link } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { useSeoMeta } from '@unhead/react';
import { NotificationItem } from '@/components/NotificationItem';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNotifications } from '@/hooks/useNotifications';
import { useNotificationReadState } from '@/hooks/useNotificationReadState';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Bell, AlertCircle, CheckCheck } from 'lucide-react';
import { getPageTitle, getPageDescription } from '@/lib/siteConfig';

export default function NotificationsPage() {
  const { user } = useCurrentUser();
  const { data: notifications, isLoading, error } = useNotifications();
  const { markAllAsRead, getUnreadCount } = useNotificationReadState();

  useSeoMeta({
    title: getPageTitle('Notifications'),
    description: getPageDescription('View your notifications for reactions, comments, and forks on your custom NIPs and other Nostr content'),
  });

  const unreadCount = notifications ? getUnreadCount(notifications.map(n => n.id)) : 0;

  const handleMarkAllAsRead = () => {
    if (notifications) {
      markAllAsRead(notifications.map(n => n.id));
    }
  };

  if (!user) {
    return (
      <Layout>
        <div className="space-y-4">
          <Button variant="ghost" asChild>
            <Link to="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Link>
          </Button>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You must be logged in to view your notifications.
            </AlertDescription>
          </Alert>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" asChild>
            <Link to="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Link>
          </Button>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Bell className="h-6 w-6" />
              <h1 className="text-3xl font-bold">Notifications</h1>
              {unreadCount > 0 && (
                <span className="bg-blue-100 text-blue-800 text-sm font-medium px-2.5 py-0.5 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>
            {notifications && notifications.length > 0 && unreadCount > 0 && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleMarkAllAsRead}
                className="flex items-center space-x-2"
              >
                <CheckCheck className="h-4 w-4" />
                <span>Mark all as read</span>
              </Button>
            )}
          </div>
          <p className="text-muted-foreground">
            Reactions, comments, and forks on your custom NIPs
          </p>

          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center space-x-2">
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-4 w-16" />
                          <Skeleton className="h-4 w-20" />
                        </div>
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Failed to load notifications. Please try again.
              </AlertDescription>
            </Alert>
          ) : notifications && notifications.length > 0 ? (
            <div className="space-y-4">
              {notifications.map((event) => (
                <NotificationItem key={event.id} event={event} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No notifications yet</h3>
                <p className="text-muted-foreground mb-4">
                  When people react to, comment on, or fork your custom NIPs, you'll see those notifications here.
                </p>
                <Button asChild>
                  <Link to="/create">
                    Create Your First NIP
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  );
}