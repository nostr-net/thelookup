#!/usr/bin/env node

/**
 * Standalone NIP-57 Zap Flow Test Script
 * 
 * This script tests the complete NIP-57 zap flow to understand exactly
 * what happens at each step and where zap receipts are published.
 */

import { WebSocket } from 'ws';
import crypto from 'crypto';

// Configuration
const LIGHTNING_ADDRESS = 'bitkarrot@primal.net';
const AMOUNT_SATS = 100;
const AMOUNT_MSATS = AMOUNT_SATS * 1000;

// Test user keypair (generate a random one for testing)
const TEST_PRIVATE_KEY = crypto.randomBytes(32).toString('hex');
const TEST_PUBLIC_KEY = getPublicKey(TEST_PRIVATE_KEY);

// Relays to check for zap receipts (prioritize the ones we know work)
const RELAYS_TO_CHECK = [
  'wss://hivetalk.nostr1.com', // New default relay for testing
  'wss://relay.nostr.net',     // Found 1 receipt in test
  'wss://relay.primal.net',    // Found 4 receipts in test  
  'wss://relay.nostr.band',    // Found 5 receipts in test
  'wss://nos.lol',
  'wss://relay.damus.io'
];

console.log('🧪 NIP-57 Zap Flow Test Script');
console.log('================================');
console.log(`Lightning Address: ${LIGHTNING_ADDRESS}`);
console.log(`Amount: ${AMOUNT_SATS} sats (${AMOUNT_MSATS} msats)`);
console.log(`Test User Pubkey: ${TEST_PUBLIC_KEY}`);
console.log('');

async function main() {
  try {
    console.log('📋 STEP-BY-STEP NIP-57 ZAP FLOW:');
    console.log('');

    // STEP 1: Fetch Lightning Address Profile
    console.log('1️⃣  STEP 1: Fetch Lightning Address Profile');
    console.log('   What happens: Query /.well-known/lnurlp/{name} endpoint');
    console.log('   Purpose: Get Lightning service info and verify NIP-57 support');
    
    const lightningProfile = await fetchLightningAddressProfile(LIGHTNING_ADDRESS);
    console.log('   ✅ Result:', {
      pubkey: lightningProfile.pubkey,
      callback: lightningProfile.callback,
      allowsNostr: lightningProfile.allowsNostr,
      minSendable: lightningProfile.minSendable,
      maxSendable: lightningProfile.maxSendable
    });
    console.log('');

    // STEP 2: Create Zap Request (NIP-57)
    console.log('2️⃣  STEP 2: Create Zap Request (kind 9734)');
    console.log('   What happens: Create and sign a Nostr event requesting a zap');
    console.log('   Purpose: Tell the Lightning service who is paying and how much');
    
    const zapRequest = await createZapRequest(lightningProfile.pubkey, AMOUNT_MSATS);
    console.log('   ✅ Result:', {
      id: zapRequest.id,
      kind: zapRequest.kind,
      pubkey: zapRequest.pubkey,
      tags: zapRequest.tags,
      content: zapRequest.content
    });
    console.log('');

    // STEP 3: Request Lightning Invoice
    console.log('3️⃣  STEP 3: Request Lightning Invoice');
    console.log('   What happens: Send zap request to Lightning service callback URL');
    console.log('   Purpose: Get a Lightning invoice to pay');
    
    const invoice = await requestLightningInvoice(lightningProfile.callback, AMOUNT_MSATS, zapRequest);
    console.log('   ✅ Result:', {
      invoice: invoice.substring(0, 50) + '...',
      length: invoice.length
    });
    console.log('');

    // STEP 4: Payment Simulation
    console.log('4️⃣  STEP 4: Lightning Payment (MANUAL)');
    console.log('   What happens: User pays the Lightning invoice with their wallet');
    console.log('   Purpose: Complete the payment to trigger zap receipt creation');
    console.log('   ⚠️  MANUAL STEP: Pay this invoice with a Lightning wallet');
    console.log('');
    console.log('   📋 INVOICE TO PAY:');
    console.log('   ' + invoice);
    console.log('');
    console.log('   💡 Instructions:');
    console.log('   1. Copy the invoice above');
    console.log('   2. Pay it with any Lightning wallet');
    console.log('   3. Wait for this script to detect the payment...');
    console.log('');

    // STEP 5: Wait for Zap Receipt
    console.log('5️⃣  STEP 5: Waiting for Payment & Zap Receipt Detection');
    console.log('   What happens: Script monitors relays for zap receipt');
    console.log('   Purpose: Detect when payment is confirmed');
    console.log('');

    // Wait for payment and monitor for zap receipt
    const paymentDetected = await waitForPayment(lightningProfile.pubkey, zapRequest.id, TEST_PUBLIC_KEY);
    
    if (paymentDetected) {
      console.log('   ✅ PAYMENT DETECTED! Zap receipt found.');
    } else {
      console.log('   ❌ Payment timeout or not detected.');
    }

    console.log('');
    console.log('🎯 SUMMARY OF NIP-57 FLOW:');
    console.log('1. Fetch Lightning profile → ✅ Working');
    console.log('2. Create zap request → ✅ Working');  
    console.log('3. Get Lightning invoice → ✅ Working');
    console.log('4. Pay invoice → ⚠️  Manual step (use Lightning wallet)');
    console.log('5. Zap receipt created → ❓ Need to verify which relay');
    console.log('6. Find zap receipt → ❓ This is where we need to look');
    console.log('');
    console.log('💡 NEXT STEPS:');
    console.log('1. Pay the invoice above with a Lightning wallet');
    console.log('2. Run this script again to see if zap receipts appear');
    console.log('3. Check which relay receives the zap receipt');

  } catch (error) {
    console.error('❌ Error in NIP-57 flow:', error);
  }
}

// Helper Functions

async function fetchLightningAddressProfile(lightningAddress) {
  const [name, domain] = lightningAddress.split('@');
  const lnurlpUrl = `https://${domain}/.well-known/lnurlp/${name}`;
  
  console.log(`   🔗 Fetching: ${lnurlpUrl}`);
  
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
    allowsNostr: profile.allowsNostr,
    minSendable: profile.minSendable || 1000,
    maxSendable: profile.maxSendable || 11000000000,
    metadata: profile.metadata || '',
  };
}

async function createZapRequest(recipientPubkey, amountMsats) {
  // Create LNURL for the lightning address
  const lnurlPayUrl = `https://primal.net/.well-known/lnurlp/bitkarrot`;
  const lnurl = `lnurl1${Buffer.from(lnurlPayUrl).toString('hex')}`;
  
  const zapRequestEvent = {
    kind: 9734,
    content: `Test zap request from NIP-57 flow test script`,
    tags: [
      ['relays', 'wss://hivetalk.nostr1.com', 'wss://relay.primal.net'], // NIP-57: multiple relays
      ['amount', amountMsats.toString()],
      ['lnurl', lnurl], // NIP-57: required lnurl tag
      ['p', recipientPubkey],
    ],
    created_at: Math.floor(Date.now() / 1000),
    pubkey: TEST_PUBLIC_KEY,
  };

  // Calculate event ID
  const eventData = [
    0,
    zapRequestEvent.pubkey,
    zapRequestEvent.created_at,
    zapRequestEvent.kind,
    zapRequestEvent.tags,
    zapRequestEvent.content
  ];
  
  const eventHash = crypto.createHash('sha256')
    .update(JSON.stringify(eventData))
    .digest('hex');
  
  zapRequestEvent.id = eventHash;

  // Sign the event (simplified - in real implementation use proper Nostr signing)
  zapRequestEvent.sig = signEvent(zapRequestEvent, TEST_PRIVATE_KEY);

  console.log('   🔐 Created and signed zap request');
  
  return zapRequestEvent;
}

async function requestLightningInvoice(callbackUrl, amountMsats, zapRequest) {
  // Create LNURL for the lightning address (simplified version)
  const lnurlPayUrl = `https://primal.net/.well-known/lnurlp/bitkarrot`;
  const lnurl = `lnurl1${Buffer.from(lnurlPayUrl).toString('hex')}`;
  
  const invoiceUrl = `${callbackUrl}?amount=${amountMsats}&nostr=${encodeURIComponent(JSON.stringify(zapRequest))}&lnurl=${encodeURIComponent(lnurl)}`;
  
  console.log(`   🔗 Requesting invoice: ${callbackUrl}`);
  console.log(`   📊 Amount: ${amountMsats} msats`);
  console.log(`   📋 Including lnurl parameter: ${lnurl.substring(0, 50)}...`);
  
  const response = await fetch(invoiceUrl);
  
  if (!response.ok) {
    const errorText = await response.text();
    console.log(`   ❌ Response: ${response.status} - ${errorText}`);
    throw new Error(`Failed to create invoice: ${response.status}`);
  }

  const invoiceData = await response.json();
  
  if (!invoiceData.pr) {
    console.log(`   ❌ Response data:`, invoiceData);
    throw new Error('No payment request in response');
  }

  return invoiceData.pr;
}

async function waitForPayment(lightningPubkey, zapRequestId, userPubkey) {
  console.log('   ⏳ Monitoring relays for payment confirmation...');
  console.log('   📡 Checking: relay.nostr.net, relay.primal.net, relay.nostr.band');
  console.log('   ⏱️  Will check every 10 seconds for up to 5 minutes...');
  console.log('');
  
  const startTime = Date.now();
  const timeoutMs = 5 * 60 * 1000; // 5 minutes
  const checkInterval = 10 * 1000; // 10 seconds
  
  while (Date.now() - startTime < timeoutMs) {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    console.log(`   🔍 Check ${Math.floor(elapsed / 10) + 1} (${elapsed}s elapsed):`);
    
    // Check the top 3 relays that we know have zap receipts
    const relaysToCheck = [
      'wss://hivetalk.nostr1.com',
      'wss://relay.primal.net', 
      'wss://relay.nostr.band'
    ];
    
    for (const relayUrl of relaysToCheck) {
      try {
        const receipts = await queryRelayForZapReceipts(relayUrl, lightningPubkey, zapRequestId, userPubkey);
        console.log(`     ${relayUrl}: ${receipts.length} receipts`);
        
        // Look for a receipt from our user with the right amount
        const ourReceipt = receipts.find(receipt => {
          try {
            const descTag = receipt.tags?.find(tag => tag[0] === 'description');
            if (!descTag) return false;
            
            const zapReq = JSON.parse(descTag[1]);
            if (zapReq.pubkey !== userPubkey) return false;
            
            const amountTag = zapReq.tags?.find(tag => tag[0] === 'amount');
            if (!amountTag) return false;
            
            const amount = parseInt(amountTag[1]) / 1000;
            return amount === AMOUNT_SATS;
          } catch {
            return false;
          }
        });
        
        if (ourReceipt) {
          console.log('     🎉 FOUND OUR PAYMENT!');
          console.log(`     Receipt ID: ${ourReceipt.id?.substring(0, 32)}...`);
          console.log(`     Created: ${new Date(ourReceipt.created_at * 1000).toLocaleString()}`);
          return true;
        }
      } catch (error) {
        console.log(`     ${relayUrl}: Error - ${error.message}`);
      }
    }
    
    console.log('     ⏳ No payment found yet, waiting...');
    console.log('');
    
    // Wait before next check
    await new Promise(resolve => setTimeout(resolve, checkInterval));
  }
  
  console.log('   ⏰ Timeout reached (5 minutes)');
  return false;
}

async function searchForZapReceipts(lightningPubkey, zapRequestId, userPubkey) {
  console.log('   🔍 Searching for zap receipts across multiple relays...');
  
  for (const relayUrl of RELAYS_TO_CHECK) {
    console.log(`   📡 Checking relay: ${relayUrl}`);
    
    try {
      const receipts = await queryRelayForZapReceipts(relayUrl, lightningPubkey, zapRequestId, userPubkey);
      console.log(`   📨 Found ${receipts.length} zap receipts on ${relayUrl}`);
      
      if (receipts.length > 0) {
        console.log('   🎉 FOUND ZAP RECEIPTS! Analyzing...');
        receipts.forEach((receipt, i) => {
          console.log(`   Receipt ${i + 1}:`, {
            id: receipt.id?.substring(0, 16) + '...',
            created_at: new Date(receipt.created_at * 1000).toISOString(),
            tags: receipt.tags?.map(tag => `${tag[0]}:${tag[1]?.substring(0, 20)}...`)
          });
        });
      }
    } catch (error) {
      console.log(`   ❌ Failed to query ${relayUrl}:`, error.message);
    }
  }
}

async function queryRelayForZapReceipts(relayUrl, lightningPubkey, zapRequestId, userPubkey) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(relayUrl);
    const receipts = [];
    let subscriptionId = 'test-' + Math.random().toString(36).substring(7);
    
    const timeout = setTimeout(() => {
      ws.close();
      resolve(receipts);
    }, 5000); // 5 second timeout

    ws.on('open', () => {
      // Query for zap receipts (kind 9735)
      const filter = {
        kinds: [9735],
        '#p': [lightningPubkey],
        since: Math.floor(Date.now() / 1000) - 3600, // Last hour
        limit: 50
      };
      
      const subscription = ['REQ', subscriptionId, filter];
      ws.send(JSON.stringify(subscription));
    });

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        if (message[0] === 'EVENT' && message[1] === subscriptionId) {
          receipts.push(message[2]);
        } else if (message[0] === 'EOSE' && message[1] === subscriptionId) {
          clearTimeout(timeout);
          ws.close();
          resolve(receipts);
        }
      } catch (error) {
        // Ignore parsing errors
      }
    });

    ws.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });

    ws.on('close', () => {
      clearTimeout(timeout);
      resolve(receipts);
    });
  });
}

// Simplified key generation and signing (for testing only)
function getPublicKey(privateKeyHex) {
  // This is a simplified version - use proper secp256k1 library in production
  return crypto.createHash('sha256').update(privateKeyHex).digest('hex');
}

function signEvent(event, privateKeyHex) {
  // This is a simplified version - use proper Nostr signing in production
  return crypto.createHash('sha256').update(JSON.stringify(event) + privateKeyHex).digest('hex');
}

// Run the test
main().catch(console.error);
