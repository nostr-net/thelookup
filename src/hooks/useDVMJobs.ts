import { useQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { useCurrentUser } from '@/hooks/useCurrentUser';

interface DVMJob {
  id: string;
  kind: number;
  pubkey: string;
  content: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'payment-required';
  created_at: number;
  updated_at?: number;
  input?: {
    type: 'text' | 'url' | 'event' | 'job';
    data: string;
    marker?: string;
  }[];
  output?: {
    type: string;
    data: string;
    size?: number;
  };
  pricing?: {
    amount: number;
    currency: string;
    bolt11?: string;
  };
  service?: {
    pubkey: string;
    name?: string;
  };
  progress?: number;
  error?: string;
  feedback?: string;
}

function validateDVMJobRequest(event: { kind: number }): boolean {
  // Check if it's a DVM job request (kinds 5000-5999)
  return event.kind >= 5000 && event.kind <= 5999;
}

function validateDVMJobResult(event: { kind: number }): boolean {
  // Check if it's a DVM job result (kinds 6000-6999)
  return event.kind >= 6000 && event.kind <= 6999;
}

function validateDVMJobFeedback(event: { kind: number }): boolean {
  // Check if it's a DVM job feedback (kind 7000)
  return event.kind === 7000;
}

function parseDVMJobRequest(event: { id: string; kind: number; pubkey: string; content: string; tags: string[][]; created_at: number }): DVMJob {
  // Parse input tags
  const inputTags = event.tags.filter(([name]: string[]) => name === 'i');
  const input = inputTags.map(([, data, type, , marker]: string[]) => ({
    type: (type as 'text' | 'url' | 'event' | 'job') || 'text',
    data,
    marker: marker || undefined,
  }));

  // Parse pricing from bid tag
  const bidTag = event.tags.find(([name]: string[]) => name === 'bid');
  let pricing: DVMJob['pricing'] = undefined;
  
  if (bidTag) {
    const [, amount] = bidTag;
    pricing = {
      amount: parseInt(amount, 10) / 1000, // Convert from millisats to sats
      currency: 'sats'
    };
  }

  // Check for target service
  const serviceTag = event.tags.find(([name]: string[]) => name === 'p');
  const service = serviceTag ? {
    pubkey: serviceTag[1],
    name: undefined
  } : undefined;

  return {
    id: event.id,
    kind: event.kind,
    pubkey: event.pubkey,
    content: event.content,
    status: 'pending',
    created_at: event.created_at,
    input: input.length > 0 ? input : undefined,
    pricing,
    service,
  };
}

function parseDVMJobResult(event: { id: string; kind: number; pubkey: string; content: string; tags: string[][]; created_at: number }, originalJob?: DVMJob): DVMJob {
  // Parse output from content and tags
  const outputTag = event.tags.find(([name]: string[]) => name === 'output');
  const output = {
    type: outputTag?.[1] || 'text/plain',
    data: event.content,
    size: undefined // Could be parsed from additional tags
  };

  // Parse pricing from amount tag
  const amountTag = event.tags.find(([name]: string[]) => name === 'amount');
  let pricing: DVMJob['pricing'] = undefined;
  
  if (amountTag) {
    const [, amount, bolt11] = amountTag;
    pricing = {
      amount: parseInt(amount, 10) / 1000, // Convert from millisats to sats
      currency: 'sats',
      bolt11: bolt11 || undefined
    };
  }

  const service = {
    pubkey: event.pubkey,
    name: undefined
  };

  return {
    id: originalJob?.id || event.id,
    kind: originalJob?.kind || (event.kind - 1000), // Job result kind is 1000 higher
    pubkey: originalJob?.pubkey || '',
    content: originalJob?.content || '',
    status: 'completed',
    created_at: originalJob?.created_at || event.created_at,
    updated_at: event.created_at,
    input: originalJob?.input,
    output,
    pricing: pricing || originalJob?.pricing,
    service,
  };
}

function parseDVMJobFeedback(event: { id: string; kind: number; pubkey: string; content: string; tags: string[][]; created_at: number }, originalJob?: DVMJob): Partial<DVMJob> {
  // Parse status from status tag
  const statusTag = event.tags.find(([name]: string[]) => name === 'status');
  const status = statusTag?.[1] as DVMJob['status'] || 'processing';
  const feedback = statusTag?.[2] || event.content;

  // Parse pricing from amount tag
  const amountTag = event.tags.find(([name]: string[]) => name === 'amount');
  let pricing: DVMJob['pricing'] = undefined;
  
  if (amountTag) {
    const [, amount, bolt11] = amountTag;
    pricing = {
      amount: parseInt(amount, 10) / 1000,
      currency: 'sats',
      bolt11: bolt11 || undefined
    };
  }

  const service = {
    pubkey: event.pubkey,
    name: undefined
  };

  return {
    status,
    updated_at: event.created_at,
    feedback,
    pricing: pricing || originalJob?.pricing,
    service,
    error: status === 'failed' ? feedback : undefined,
  };
}

export function useDVMJobs() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();

  return useQuery({
    queryKey: ['dvm-jobs', user?.pubkey],
    queryFn: async (context) => {
      const signal = AbortSignal.any([context.signal, AbortSignal.timeout(10000)]);
      
      if (!user) {
        return [];
      }

      try {
        // Query for job requests, results, and feedback
        const [jobRequests, jobResults, jobFeedback] = await Promise.all([
          // Job requests by the current user
          nostr.query([
            {
              kinds: Array.from({ length: 1000 }, (_, i) => 5000 + i), // 5000-5999
              authors: [user.pubkey],
              limit: 200,
            }
          ], { signal }),

          // Job results for the current user's jobs
          nostr.query([
            {
              kinds: Array.from({ length: 1000 }, (_, i) => 6000 + i), // 6000-6999
              '#p': [user.pubkey],
              limit: 500,
            }
          ], { signal }),
          
          // Job feedback for the current user's jobs
          nostr.query([
            {
              kinds: [7000],
              '#p': [user.pubkey],
              limit: 100,
            }
          ], { signal }),
        ]);

        // Parse job requests
        const jobs = new Map<string, DVMJob>();
        
        jobRequests
          .filter(validateDVMJobRequest)
          .forEach(event => {
            const job = parseDVMJobRequest(event);
            jobs.set(job.id, job);
          });

        // Update jobs with results
        jobResults
          .filter(validateDVMJobResult)
          .forEach(event => {
            const requestTag = event.tags.find(([name]: string[]) => name === 'request');
            if (requestTag) {
              try {
                const originalRequest = JSON.parse(requestTag[1]);
                const originalJob = jobs.get(originalRequest.id);
                if (originalJob) {
                  const updatedJob = parseDVMJobResult(event, originalJob);
                  jobs.set(originalJob.id, { ...originalJob, ...updatedJob });
                }
              } catch (error) {
                console.warn('Failed to parse job request from result:', error);
              }
            }
          });

        // Update jobs with feedback
        jobFeedback
          .filter(validateDVMJobFeedback)
          .forEach(event => {
            const jobIdTag = event.tags.find(([name]: string[]) => name === 'e');
            if (jobIdTag) {
              const jobId = jobIdTag[1];
              const existingJob = jobs.get(jobId);
              if (existingJob) {
                const feedback = parseDVMJobFeedback(event, existingJob);
                jobs.set(jobId, { ...existingJob, ...feedback });
              }
            }
          });

        // Convert to array and sort by creation date
        const jobsArray = Array.from(jobs.values()).sort((a, b) => {
          const aTime = a.updated_at || a.created_at;
          const bTime = b.updated_at || b.created_at;
          return bTime - aTime;
        });

        return jobsArray;
      } catch (error) {
        console.error('Failed to fetch DVM jobs:', error);
        return [];
      }
    },
    enabled: !!user,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useDVMJob(jobId: string) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['dvm-job', jobId],
    queryFn: async (context) => {
      const signal = AbortSignal.any([context.signal, AbortSignal.timeout(5000)]);
      
      try {
        // Query for the specific job request
        const jobRequests = await nostr.query([
          {
            ids: [jobId],
            limit: 1,
          }
        ], { signal });

        const jobRequest = jobRequests.find(validateDVMJobRequest);
        if (!jobRequest) {
          return null;
        }

        let job = parseDVMJobRequest(jobRequest);

        // Query for related results and feedback
        const [results, feedback] = await Promise.all([
          nostr.query([
            {
              kinds: Array.from({ length: 1000 }, (_, i) => 6000 + i),
              '#e': [jobId],
              limit: 10,
            }
          ], { signal }),
          
          nostr.query([
            {
              kinds: [7000],
              '#e': [jobId],
              limit: 10,
            }
          ], { signal }),
        ]);

        // Apply latest result
        const latestResult = results
          .filter(validateDVMJobResult)
          .sort((a, b) => b.created_at - a.created_at)[0];
        
        if (latestResult) {
          const resultData = parseDVMJobResult(latestResult, job);
          job = { ...job, ...resultData };
        }

        // Apply latest feedback
        const latestFeedback = feedback
          .filter(validateDVMJobFeedback)
          .sort((a, b) => b.created_at - a.created_at)[0];
        
        if (latestFeedback) {
          const feedbackData = parseDVMJobFeedback(latestFeedback, job);
          job = { ...job, ...feedbackData };
        }

        return job;
      } catch (error) {
        console.error('Failed to fetch DVM job:', error);
        return null;
      }
    },
    enabled: !!jobId,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}