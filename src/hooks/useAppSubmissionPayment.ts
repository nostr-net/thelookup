import { useState, useCallback, useContext } from 'react';
import { useMutation, QueryClientContext } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useToast } from '@/hooks/useToast';
import type { NostrEvent } from '@nostrify/nostrify';

interface PaymentConfig {
  lightningAddress: string;
  feeAmount: number;
}

interface PaymentResult {
  invoice: string;
  zapRequest: NostrEvent;
}

interface LightningAddressProfile {
  pubkey: string;
  callback: string;
  minSendable: number;
  maxSendable: number;
  metadata: string;
}

export function useAppSubmissionPayment() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const { toast } = useToast();
  const [paymentState, setPaymentState] = useState<{
    invoice: string | null;
    zapRequest: NostrEvent | null;
    paid: boolean;
    verifying: boolean;
    invoiceCreatedAt: number | null;
  }>({
    invoice: null,
    zapRequest: null,
    paid: false,
    verifying: false,
    invoiceCreatedAt: null,
  });

  // Get payment configuration from environment
  const getPaymentConfig = useCallback((): PaymentConfig | null => {
    // If explicitly disabled, respect that; otherwise enable when address + fee are present
    if (import.meta.env.VITE_SUBMIT_APP_PAYMENT_ENABLED === 'false') {
      return null;
    }

    const lightningAddress = import.meta.env.VITE_SUBMIT_APP_LIGHTNING_ADDRESS;
    const feeAmount = parseInt(import.meta.env.VITE_SUBMIT_APP_FEE || '0', 10);
    console.log('Payment env', {
      enabled: import.meta.env.VITE_SUBMIT_APP_PAYMENT_ENABLED,
      lightningAddress,
      feeAmount,
    });

    if (!lightningAddress || !feeAmount || feeAmount <= 0) {
      console.warn('Payment enabled but missing Lightning address or fee amount');
      return null;
    }
    
    return {
      lightningAddress,
      feeAmount,
    };
  }, []);

  // Check if payment is required (only for users without existing apps)
  const isPaymentRequired = useCallback(() => {
    const config = getPaymentConfig();
    return config !== null;
  }, [getPaymentConfig]);

  const queryClient = useContext(QueryClientContext);

  // Create payment invoice (fallback to no-op when no QueryClientProvider)
  const createPaymentMutation = queryClient ? useMutation({
    mutationFn: async (): Promise<PaymentResult> => {
      if (!user) {
        throw new Error('User not authenticated');
      }

      const config = getPaymentConfig();
      if (!config) {
        throw new Error('Payment not configured');
      }

      toast({
        title: 'Creating Payment Invoice',
        description: 'Connecting to lightning address and generating invoice...',
      });

      // Get lightning address profile
      const lightningProfile = await fetchLightningAddressProfile(config.lightningAddress);
      console.log('Lightning profile:', lightningProfile);
      
      const amountMsats = config.feeAmount * 1000;

      // Create LNURL for the lightning address (bech32 encoded)
      const [name, domain] = config.lightningAddress.split('@');
      const lnurlPayUrl = `https://${domain}/.well-known/lnurlp/${name}`;
      const lnurl = encodeLnurl(lnurlPayUrl);

      // Define relays where zap receipt should be published
      // Include both our relay AND Primal's relay to ensure we can find the receipt
      const zapRelays = [
        import.meta.env.VITE_RELAY_URL || 'wss://relay.nostr.net',
        'wss://relay.primal.net', // Primal's relay for zap receipts
      ];

      // Create zap request manually for profile zap (kind 9734)
      // Following NIP-57 specification exactly
      const zapRequestEvent: NostrEvent = {
        kind: 9734,
        content: `App submission payment via ${window.location.hostname}`,
        tags: [
          ['relays', ...zapRelays], // NIP-57: relays should not be nested in additional list
          ['amount', amountMsats.toString()],
          ['lnurl', lnurl], // NIP-57: MUST include lnurl tag
          ['p', lightningProfile.pubkey],
        ],
        created_at: Math.floor(Date.now() / 1000),
        pubkey: user.pubkey,
        id: '',
        sig: '',
      };

      console.log('Manual zap request event:', zapRequestEvent);
      
      // Sign the zap request
      const signedZapRequest = await user.signer.signEvent(zapRequestEvent);
      console.log('Signed zap request:', signedZapRequest);

      // Use the callback URL directly from the lightning address profile
      const zapEndpoint = lightningProfile.callback;
      if (!zapEndpoint) {
        throw new Error('Lightning address does not support zaps (NIP-57)');
      }

      // Request invoice from the zap endpoint (NIP-57 Appendix B)
      // Include lnurl parameter as required by spec
      const invoiceUrl = `${zapEndpoint}?amount=${amountMsats}&nostr=${encodeURIComponent(JSON.stringify(signedZapRequest))}&lnurl=${encodeURIComponent(lnurl)}`;
      console.log('Requesting invoice from:', zapEndpoint);
      console.log('Invoice URL:', invoiceUrl);
      
      const invoiceResponse = await fetch(invoiceUrl);
      
      if (!invoiceResponse.ok) {
        throw new Error(`Failed to create invoice: ${invoiceResponse.status}`);
      }

      const invoiceData = await invoiceResponse.json();
      
      if (!invoiceData.pr) {
        throw new Error('No payment request in response');
      }

      toast({
        title: 'Invoice Created',
        description: `Payment invoice for ${config.feeAmount} sats created successfully. You can pay with any Lightning wallet.`,
      });

      return {
        invoice: invoiceData.pr,
        zapRequest: signedZapRequest,
      };
    },
    onSuccess: (result) => {
      setPaymentState({
        invoice: result.invoice,
        zapRequest: result.zapRequest,
        paid: false,
        verifying: false,
        invoiceCreatedAt: Date.now(),
      });
    },
    onError: (error) => {
      console.error('Payment creation error:', error);
      toast({
        title: 'Payment Creation Failed',
        description: error instanceof Error ? error.message : 'Failed to create payment invoice',
        variant: 'destructive',
      });
    },
  }) : {
    mutate: () => undefined,
    isPending: false,
  } as unknown as ReturnType<typeof useMutation<PaymentResult, Error, void>>;

  // Verify payment by checking for zap receipts across multiple relays
  const verifyPaymentMutation = queryClient ? useMutation({
    mutationFn: async (): Promise<boolean> => {
      if (!paymentState.zapRequest || !user) {
        throw new Error('No zap request to verify');
      }

      setPaymentState(prev => ({ ...prev, verifying: true }));

      toast({
        title: 'Verifying Payment',
        description: 'Checking multiple relays for payment confirmation...',
      });

      // Wait longer for the payment to be processed and propagated to relays
      await new Promise(resolve => setTimeout(resolve, 5000));

      console.log('Looking for zap receipts for request:', paymentState.zapRequest.id);
      
      // Get config and lightning profile
      const config = getPaymentConfig();
      const lightningProfile = await fetchLightningAddressProfile(config!.lightningAddress);
      
      console.log('Lightning profile pubkey:', lightningProfile.pubkey);
      console.log('User pubkey:', user?.pubkey);
      
      // Check the relays we specified in the zap request first
      // According to NIP-57, zap receipts MUST be published to these relays
      const zapRequestRelays = paymentState.zapRequest.tags
        .find(tag => tag[0] === 'relays')
        ?.slice(1) || [];
      
      const relaysToCheck = [
        ...zapRequestRelays, // Check our specified relays first
        'wss://relay.primal.net', // Primal's main relay (in case they ignore our relays tag)
        'wss://nos.lol',
        'wss://relay.damus.io',
      ];

      console.log('🔍 Checking multiple relays for zap receipts:', relaysToCheck);

      // Try multiple approaches to find zap receipts
      const queries = [
        // 1. Receipts referencing our zap request
        {
          kinds: [9735],
          '#e': [paymentState.zapRequest.id],
          limit: 10,
        },
        // 2. Receipts to the lightning address pubkey from our user
        {
          kinds: [9735],
          '#p': [lightningProfile.pubkey],
          authors: [user?.pubkey || ''],
          since: Math.floor(Date.now() / 1000) - 600, // Last 10 minutes
          limit: 20,
        },
        // 3. Any recent receipts to the lightning address
        {
          kinds: [9735],
          '#p': [lightningProfile.pubkey],
          since: Math.floor(Date.now() / 1000) - 600, // Last 10 minutes
          limit: 100,
        },
        // 4. Receipts from our user (any recipient)
        {
          kinds: [9735],
          authors: [user?.pubkey || ''],
          since: Math.floor(Date.now() / 1000) - 600, // Last 10 minutes
          limit: 30,
        }
      ];

      let allReceipts: NostrEvent[] = [];
      
      // Check each relay individually with proper WebSocket connections
      for (const relayUrl of relaysToCheck) {
        console.log(`📡 Checking relay: ${relayUrl}`);
        
        try {
          if (relayUrl === (import.meta.env.VITE_RELAY_URL || 'wss://relay.nostr.net')) {
            // Use the existing nostr client for the main relay
            for (const query of queries) {
              try {
                const receipts = await nostr.query([query]);
                console.log(`  Query returned ${receipts.length} receipts from ${relayUrl}`);
                allReceipts = [...allReceipts, ...receipts];
              } catch (error) {
                console.log(`  Query failed on ${relayUrl}:`, error);
              }
            }
          } else {
            // Create temporary WebSocket connection for other relays
            const receipts = await queryRelayForReceipts(relayUrl, queries);
            console.log(`  Query returned ${receipts.length} receipts from ${relayUrl}`);
            allReceipts = [...allReceipts, ...receipts];
          }
        } catch (error) {
          console.log(`Failed to connect to ${relayUrl}:`, error);
        }
      }

      // Remove duplicates
      const uniqueReceipts = allReceipts.filter((receipt, index, self) => 
        index === self.findIndex(r => r.id === receipt.id)
      );
      
      console.log('Total unique receipts found:', uniqueReceipts.length, uniqueReceipts);

      // Validate zap receipts - match what we found in the test results
      const validReceipt = allReceipts.find(receipt => {
        try {
          console.log('🔍 Checking receipt:', {
            id: receipt.id?.substring(0, 32) + '...',
            created_at: new Date(receipt.created_at * 1000).toLocaleString(),
            pubkey: receipt.pubkey?.substring(0, 16) + '...'
          });
          
          // Check required tags
          const bolt11Tag = receipt.tags?.find(tag => tag[0] === 'bolt11');
          const descriptionTag = receipt.tags?.find(tag => tag[0] === 'description');
          const pTag = receipt.tags?.find(tag => tag[0] === 'p');
          
          if (!bolt11Tag || !descriptionTag || !pTag) {
            console.log('❌ Missing required tags (bolt11, description, or p)');
            return false;
          }

          // Verify this receipt is for the correct recipient (bitkarrot@primal.net)
          if (pTag[1] !== lightningProfile.pubkey) {
            console.log('❌ Receipt not for correct recipient');
            return false;
          }

          // CRITICAL: Verify this receipt is for the current invoice
          if (bolt11Tag[1] !== paymentState.invoice) {
            console.log('❌ Receipt not for current invoice');
            console.log('  Expected invoice:', paymentState.invoice?.substring(0, 30) + '...');
            console.log('  Receipt invoice:', bolt11Tag[1]?.substring(0, 30) + '...');
            return false;
          }

          // Parse the zap request from the description
          let zapRequestFromReceipt;
          try {
            zapRequestFromReceipt = JSON.parse(descriptionTag[1]);
          } catch {
            console.log('❌ Failed to parse zap request from description');
            return false;
          }
          
          console.log('📋 Zap request from receipt:', {
            pubkey: zapRequestFromReceipt.pubkey?.substring(0, 16) + '...',
            kind: zapRequestFromReceipt.kind,
            tags: zapRequestFromReceipt.tags?.map((tag: string[]) => `${tag[0]}:${tag[1]?.substring(0, 10)}...`)
          });
          
          // Check if this zap request is from our user
          if (zapRequestFromReceipt.pubkey !== user.pubkey) {
            console.log('❌ Zap request not from our user');
            return false;
          }

          // CRITICAL: Verify this is the exact zap request for this submission
          if (zapRequestFromReceipt.id !== paymentState.zapRequest?.id) {
            console.log('❌ Receipt not for current zap request');
            console.log('  Expected zap request ID:', paymentState.zapRequest?.id?.substring(0, 16) + '...');
            console.log('  Receipt zap request ID:', zapRequestFromReceipt.id?.substring(0, 16) + '...');
            return false;
          }
          
          // Check amount (be lenient - accept any payment >= expected amount)
          const amountTag = zapRequestFromReceipt.tags?.find((tag: string[]) => tag[0] === 'amount');
          if (amountTag) {
            const receiptAmount = parseInt(amountTag[1]) / 1000; // Convert msats to sats
            const expectedAmount = getPaymentConfig()?.feeAmount || 0;
            
            console.log('💰 Receipt amount:', receiptAmount, 'sats, Expected:', expectedAmount, 'sats');
            
            if (receiptAmount >= expectedAmount) {
              console.log('✅ Valid payment found! Amount matches.');
              return true;
            } else {
              console.log('❌ Amount too low');
              return false;
            }
          } else {
            console.log('❌ No amount tag found in zap request');
            return false;
          }
        } catch (error) {
          console.error('❌ Error validating zap receipt:', error);
          return false;
        }
      });

      if (validReceipt) {
        toast({
          title: 'Payment Confirmed!',
          description: 'Your payment has been verified. Proceeding with app submission...',
        });
        return true;
      }

      // Check if 5 minutes have passed since invoice creation
      const fiveMinutesInMs = 5 * 60 * 1000;
      const invoiceAge = paymentState.invoiceCreatedAt ? Date.now() - paymentState.invoiceCreatedAt : 0;
      
      if (invoiceAge > fiveMinutesInMs) {
        throw new Error('Payment timeout: Invoice has expired after 5 minutes. Please create a new invoice.');
      }

      // Don't throw an error if we're still within the 5-minute window
      // Just return false to indicate payment not yet confirmed
      return false;
    },
    onSuccess: (verified) => {
      if (verified) {
        setPaymentState(prev => ({ ...prev, paid: true, verifying: false }));
      } else {
        // Payment not yet confirmed but still within timeout window
        setPaymentState(prev => ({ ...prev, verifying: false }));
      }
    },
    onError: (error) => {
      setPaymentState(prev => ({ ...prev, verifying: false }));
      toast({
        title: 'Payment Verification Failed',
        description: error instanceof Error ? error.message : 'Could not verify payment',
        variant: 'destructive',
      });
    },
  }) : {
    mutate: () => undefined,
    isPending: false,
  } as unknown as ReturnType<typeof useMutation<boolean, Error, void>>;

  // Reset payment state
  const resetPayment = useCallback(() => {
    setPaymentState({
      invoice: null,
      zapRequest: null,
      paid: false,
      verifying: false,
      invoiceCreatedAt: null,
    });
  }, []);

  // Debug function to investigate zap receipts across multiple relays
  const debugZapReceipts = useCallback(async () => {
    if (!user) return;
    
    console.log('🔍 DEBUG: Starting multi-relay zap receipt investigation');
    
    const config = getPaymentConfig();
    if (!config) {
      console.log('❌ No payment config found');
      return;
    }
    
    const lightningProfile = await fetchLightningAddressProfile(config.lightningAddress);
    console.log('⚡ Lightning profile:', lightningProfile);
    console.log('👤 Your pubkey:', user.pubkey);
    console.log('🔗 Current relay:', import.meta.env.VITE_RELAY_URL || 'wss://relay.nostr.net');
    
    // Test the current relay first
    console.log('\n📡 Checking current relay for recent zap receipts...');
    
    const recentReceipts = await nostr.query([{
      kinds: [9735],
      since: Math.floor(Date.now() / 1000) - 3600, // Last hour
      limit: 100,
    }]);
    
    console.log(`Found ${recentReceipts.length} recent zap receipts on current relay`);
    
    if (recentReceipts.length > 0) {
      console.log('📋 Sample receipts:');
      recentReceipts.slice(0, 5).forEach((receipt, i) => {
        const pTag = receipt.tags.find(tag => tag[0] === 'p');
        const bolt11Tag = receipt.tags.find(tag => tag[0] === 'bolt11');
        const descriptionTag = receipt.tags.find(tag => tag[0] === 'description');
        
        console.log(`  Receipt ${i + 1}:`, {
          id: receipt.id.substring(0, 16) + '...',
          author: receipt.pubkey.substring(0, 16) + '...',
          recipient: pTag?.[1]?.substring(0, 16) + '...',
          created: new Date(receipt.created_at * 1000).toLocaleString(),
          has_bolt11: !!bolt11Tag,
          has_description: !!descriptionTag
        });
        
        // Check if this receipt is for our lightning address
        if (pTag?.[1] === lightningProfile.pubkey) {
          console.log(`    🎯 This receipt is for bitkarrot@primal.net!`);
          
          if (descriptionTag) {
            try {
              const zapRequest = JSON.parse(descriptionTag[1]);
              const amountTag = zapRequest.tags?.find((tag: string[]) => tag[0] === 'amount');
              if (amountTag) {
                const amount = parseInt(amountTag[1]) / 1000;
                console.log(`    💰 Amount: ${amount} sats`);
              }
              console.log(`    👤 Zap request author: ${zapRequest.pubkey?.substring(0, 16)}...`);
              
              if (zapRequest.pubkey === user.pubkey) {
                console.log(`    ✅ This is YOUR payment!`);
              }
            } catch {
              console.log(`    ❌ Failed to parse zap request`);
            }
          }
        }
      });
    } else {
      console.log('❌ No zap receipts found on current relay');
      console.log('💡 This suggests:');
      console.log('   1. Zap receipts are published to different relays');
      console.log('   2. Primal might use their own relays');
      console.log('   3. The payment service publishes elsewhere');
    }
    
    // Check specifically for receipts to our lightning address
    console.log('\n🎯 Checking specifically for payments to bitkarrot@primal.net...');
    const receiptsToTarget = await nostr.query([{
      kinds: [9735],
      '#p': [lightningProfile.pubkey],
      since: Math.floor(Date.now() / 1000) - 21600, // Last 6 hours
      limit: 100,
    }]);
    
    console.log(`Found ${receiptsToTarget.length} receipts to bitkarrot@primal.net in last 6 hours`);
    
    if (receiptsToTarget.length > 0) {
      receiptsToTarget.forEach((receipt, i) => {
        console.log(`  Payment ${i + 1} to bitkarrot:`, {
          id: receipt.id.substring(0, 16) + '...',
          author: receipt.pubkey.substring(0, 16) + '...',
          created: new Date(receipt.created_at * 1000).toLocaleString(),
        });
      });
    }
    
    console.log('\n🏁 Debug investigation complete');
    console.log('💡 Next steps:');
    console.log('   - If no receipts found: Zap receipts are on different relays');
    console.log('   - If receipts found but not yours: Timing or pubkey issue');
    console.log('   - If your receipts found: Validation logic issue');
  }, [user, nostr, getPaymentConfig]);

  return {
    // Configuration
    isPaymentRequired: isPaymentRequired(),
    paymentConfig: getPaymentConfig(),
    
    // State
    paymentState,
    
    // Actions
    createPayment: createPaymentMutation.mutate,
    verifyPayment: verifyPaymentMutation.mutate,
    resetPayment,
    debugZapReceipts, // Add debug function
    
    // Loading states
    isCreatingPayment: createPaymentMutation.isPending,
    isVerifyingPayment: verifyPaymentMutation.isPending || paymentState.verifying,
  };
}

// Helper function to fetch lightning address profile
async function fetchLightningAddressProfile(lightningAddress: string): Promise<LightningAddressProfile> {
  const [name, domain] = lightningAddress.split('@');
  if (!name || !domain) {
    throw new Error('Invalid lightning address format');
  }

  const lnurlpUrl = `https://${domain}/.well-known/lnurlp/${name}`;
  
  try {
    const response = await fetch(lnurlpUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch lightning address profile: ${response.status}`);
    }

    const profile = await response.json();
    
    if (!profile.allowsNostr || !profile.nostrPubkey) {
      throw new Error('Lightning address does not support NIP-57 zaps');
    }

    return {
      pubkey: profile.nostrPubkey,
      callback: profile.callback,
      minSendable: profile.minSendable || 1000,
      maxSendable: profile.maxSendable || 11000000000,
      metadata: profile.metadata || '',
    };
  } catch (error) {
    console.error('Error fetching lightning address profile:', error);
    throw new Error(`Could not fetch lightning address profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Helper function to encode LNURL (bech32 with 'lnurl' prefix)
function encodeLnurl(url: string): string {
  // For now, return a simplified version - in production you'd use proper bech32 encoding
  // This is a placeholder that follows the general format
  const words = Buffer.from(url, 'utf8');
  return `lnurl1${words.toString('hex')}`;
}

// Helper function to query a relay for zap receipts using WebSocket
async function queryRelayForReceipts(relayUrl: string, queries: object[]): Promise<NostrEvent[]> {
  return new Promise((resolve, _reject) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const WebSocket = (window as any)?.WebSocket || (global as any)?.WebSocket;
    if (!WebSocket) {
      console.log(`WebSocket not available for ${relayUrl}`);
      resolve([]);
      return;
    }

    const ws = new WebSocket(relayUrl);
    const subId = 'zap-receipt-' + Math.random().toString(36).substring(7);
    const allReceipts: NostrEvent[] = [];
    let queryCount = 0;
    let completedQueries = 0;

    const timeout = setTimeout(() => {
      ws.close();
      resolve(allReceipts);
    }, 10000); // 10 second timeout

    ws.onopen = () => {
      // Send all queries
      queries.forEach((query, index) => {
        const message = JSON.stringify(['REQ', `${subId}-${index}`, query]);
        ws.send(message);
        queryCount++;
      });
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        const [type, subscriptionId, eventData] = message;

        if (type === 'EVENT' && subscriptionId.startsWith(subId)) {
          allReceipts.push(eventData);
        } else if (type === 'EOSE' && subscriptionId.startsWith(subId)) {
          completedQueries++;
          if (completedQueries >= queryCount) {
            clearTimeout(timeout);
            ws.close();
            resolve(allReceipts);
          }
        }
      } catch (error) {
        console.log(`Error parsing message from ${relayUrl}:`, error);
      }
    };

    ws.onerror = (error) => {
      clearTimeout(timeout);
      console.log(`WebSocket error for ${relayUrl}:`, error);
      resolve([]);
    };

    ws.onclose = () => {
      clearTimeout(timeout);
      resolve(allReceipts);
    };
  });
}
