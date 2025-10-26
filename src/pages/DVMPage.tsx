import { useState } from 'react';
import { useSeoMeta } from '@unhead/react';
import { Layout } from '@/components/Layout';
import { getPageTitle, getPageDescription } from '@/lib/siteConfig';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { Search, Zap, Clock, CheckCircle, AlertCircle, Plus, Bot, Cpu, FileText, Image, Globe, Music, Video, Code, Database, Brain } from 'lucide-react';
import { DVMServiceCard } from '@/components/DVMServiceCard';
import { DVMJobCard } from '@/components/DVMJobCard';
import { CreateJobDialog } from '@/components/CreateJobDialog';
import { useDVMServices } from '@/hooks/useDVMServices';
import { useDVMJobs } from '@/hooks/useDVMJobs';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { RelaySelector } from '@/components/RelaySelector';
import { Skeleton } from '@/components/ui/skeleton';

const DVM_CATEGORIES = [
  { id: 'all', name: 'All Services', icon: Bot },
  { id: 'text', name: 'Text Processing', icon: FileText },
  { id: 'image', name: 'Image Processing', icon: Image },
  { id: 'audio', name: 'Audio Processing', icon: Music },
  { id: 'video', name: 'Video Processing', icon: Video },
  { id: 'translation', name: 'Translation', icon: Globe },
  { id: 'ai', name: 'AI & ML', icon: Brain },
  { id: 'data', name: 'Data Analysis', icon: Database },
  { id: 'code', name: 'Code Processing', icon: Code },
  { id: 'other', name: 'Other', icon: Cpu },
];

const JOB_STATUS_FILTERS = [
  { id: 'all', name: 'All Jobs', icon: Clock },
  { id: 'pending', name: 'Pending', icon: Clock },
  { id: 'processing', name: 'Processing', icon: Cpu },
  { id: 'completed', name: 'Completed', icon: CheckCircle },
  { id: 'failed', name: 'Failed', icon: AlertCircle },
];

export default function DVMPage() {
  useSeoMeta({
    title: getPageTitle('DVM Marketplace (Beta)'),
    description: getPageDescription('dvm'),
  });

  const [activeTab, setActiveTab] = useState('services');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [showCreateJob, setShowCreateJob] = useState(false);

  const { user } = useCurrentUser();
  const { data: services, isLoading: servicesLoading } = useDVMServices();
  const { data: jobs, isLoading: jobsLoading } = useDVMJobs();

  const filteredServices = services?.filter(service => {
    const matchesSearch = !searchQuery || 
      service.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.about?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || 
      service.categories?.includes(selectedCategory);
    
    return matchesSearch && matchesCategory;
  }) || [];

  const filteredJobs = jobs?.filter(job => {
    const matchesSearch = !searchQuery || 
      job.content?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = selectedStatus === 'all' || 
      job.status === selectedStatus;
    
    return matchesSearch && matchesStatus;
  }) || [];

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-3">
            <div className="relative">
              <Bot className="h-12 w-12 text-primary" />
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl"></div>
            </div>
            <h1 className="text-4xl font-bold gradient-text">DVM Marketplace <span className="text-2xl text-muted-foreground">beta</span></h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Discover and use Data Vending Machines - AI-powered services that process your data on-demand.
            From text translation to image generation, find the perfect service for your needs.
          </p>
        </div>

        {/* Search and Filters */}
        <Card className="glass border-primary/20">
          <CardContent className="p-6">
            <div className="flex flex-col space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search services and jobs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-background/50 border-primary/20"
                />
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-muted-foreground">Relay:</span>
                  <RelaySelector className="w-48" />
                </div>
                
                {user && (
                  <Button 
                    onClick={() => setShowCreateJob(true)}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Job
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 glass border-primary/20">
            <TabsTrigger value="services" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Bot className="h-4 w-4 mr-2" />
              Services ({filteredServices.length})
            </TabsTrigger>
            <TabsTrigger value="jobs" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Zap className="h-4 w-4 mr-2" />
              Jobs ({filteredJobs.length})
            </TabsTrigger>
          </TabsList>

          {/* Services Tab */}
          <TabsContent value="services" className="space-y-6">
            {/* Category Filters */}
            <Card className="glass border-primary/20">
              <CardHeader>
                <CardTitle className="text-lg">Categories</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {DVM_CATEGORIES.map((category) => {
                    const Icon = category.icon;
                    return (
                      <Button
                        key={category.id}
                        variant={selectedCategory === category.id ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedCategory(category.id)}
                        className={selectedCategory === category.id ? 
                          "bg-primary text-primary-foreground" : 
                          "border-primary/20 hover:bg-primary/10"
                        }
                      >
                        <Icon className="h-4 w-4 mr-2" />
                        {category.name}
                      </Button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Services Grid */}
            {servicesLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i} className="glass border-primary/20">
                    <CardHeader>
                      <div className="flex items-center space-x-3">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="space-y-1">
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-3 w-16" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                        <div className="flex gap-2">
                          <Skeleton className="h-6 w-16" />
                          <Skeleton className="h-6 w-20" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredServices.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredServices.map((service) => (
                  <DVMServiceCard key={service.id} service={service} />
                ))}
              </div>
            ) : (
              <div className="col-span-full">
                <Card className="border-dashed border-primary/20">
                  <CardContent className="py-12 px-8 text-center">
                    <div className="max-w-sm mx-auto space-y-6">
                      <Bot className="h-16 w-16 text-muted-foreground mx-auto" />
                      <div className="space-y-2">
                        <h3 className="text-lg font-semibold">No services found</h3>
                        <p className="text-muted-foreground">
                          {searchQuery || selectedCategory !== 'all' 
                            ? "Try adjusting your search or filters" 
                            : "No DVM services available on this relay"}
                        </p>
                      </div>
                      <RelaySelector className="w-full" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* Jobs Tab */}
          <TabsContent value="jobs" className="space-y-6">
            {/* Status Filters */}
            <Card className="glass border-primary/20">
              <CardHeader>
                <CardTitle className="text-lg">Job Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {JOB_STATUS_FILTERS.map((status) => {
                    const Icon = status.icon;
                    return (
                      <Button
                        key={status.id}
                        variant={selectedStatus === status.id ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedStatus(status.id)}
                        className={selectedStatus === status.id ? 
                          "bg-primary text-primary-foreground" : 
                          "border-primary/20 hover:bg-primary/10"
                        }
                      >
                        <Icon className="h-4 w-4 mr-2" />
                        {status.name}
                      </Button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Jobs List */}
            {jobsLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Card key={i} className="glass border-primary/20">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Skeleton className="h-8 w-8 rounded" />
                          <div className="space-y-1">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-3 w-24" />
                          </div>
                        </div>
                        <Skeleton className="h-6 w-20" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-2/3" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredJobs.length > 0 ? (
              <div className="space-y-4">
                {filteredJobs.map((job) => (
                  <DVMJobCard key={job.id} job={job} />
                ))}
              </div>
            ) : (
              <div className="col-span-full">
                <Card className="border-dashed border-primary/20">
                  <CardContent className="py-12 px-8 text-center">
                    <div className="max-w-sm mx-auto space-y-6">
                      <Zap className="h-16 w-16 text-muted-foreground mx-auto" />
                      <div className="space-y-2">
                        <h3 className="text-lg font-semibold">No jobs found</h3>
                        <p className="text-muted-foreground">
                          {user 
                            ? "Create your first job to get started with DVM services"
                            : "Log in to view and create DVM jobs"
                          }
                        </p>
                      </div>
                      {user ? (
                        <Button 
                          onClick={() => setShowCreateJob(true)}
                          className="bg-primary hover:bg-primary/90 text-primary-foreground"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Create Job
                        </Button>
                      ) : (
                        <RelaySelector className="w-full" />
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Create Job Dialog */}
        {showCreateJob && (
          <CreateJobDialog 
            open={showCreateJob} 
            onOpenChange={setShowCreateJob}
          />
        )}
      </div>
    </Layout>
  );
}