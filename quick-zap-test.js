#!/usr/bin/env node

/**
 * Quick Zap Receipt Test - Check if any zap receipts exist for bitkarrot@primal.net
 */

import { WebSocket } from 'ws';

const LIGHTNING_ADDRESS = 'bitkarrot@primal.net';
const RELAYS_TO_CHECK = [
  'wss://hivetalk.nostr1.com', // New default relay for testing
  'wss://relay.nostr.net',
  'wss://relay.primal.net',
  'wss://nos.lol',
  'wss://relay.damus.io',
  'wss://relay.nostr.band'
];

console.log('🔍 Quick Zap Receipt Test for bitkarrot@primal.net');
console.log('=================================================');

async function main() {
  // First, get the Lightning address pubkey
  console.log('1. Fetching Lightning address profile...');
  const profile = await fetchLightningProfile();
  console.log(`   Lightning pubkey: ${profile.pubkey}`);
  console.log('');

  // Check each relay for ANY zap receipts to this pubkey
  console.log('2. Checking relays for zap receipts...');
  
  for (const relay of RELAYS_TO_CHECK) {
    console.log(`\n📡 Checking ${relay}:`);
    try {
      const receipts = await checkRelayForZapReceipts(relay, profile.pubkey);
      console.log(`   Found ${receipts.length} zap receipts`);
      
      if (receipts.length > 0) {
        console.log('   🎉 FOUND ZAP RECEIPTS! Recent ones:');
        receipts.slice(0, 3).forEach((receipt, i) => {
          const bolt11Tag = receipt.tags?.find(tag => tag[0] === 'bolt11');
          const descTag = receipt.tags?.find(tag => tag[0] === 'description');
          
          console.log(`   Receipt ${i + 1}:`);
          console.log(`     ID: ${receipt.id?.substring(0, 32)}...`);
          console.log(`     Created: ${new Date(receipt.created_at * 1000).toLocaleString()}`);
          console.log(`     Has bolt11: ${!!bolt11Tag}`);
          console.log(`     Has description: ${!!descTag}`);
          
          if (descTag) {
            try {
              const zapReq = JSON.parse(descTag[1]);
              const amountTag = zapReq.tags?.find(t => t[0] === 'amount');
              if (amountTag) {
                console.log(`     Amount: ${parseInt(amountTag[1]) / 1000} sats`);
              }
            } catch (e) {
              console.log(`     Description parse failed`);
            }
          }
        });
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }
}

async function fetchLightningProfile() {
  const [name, domain] = LIGHTNING_ADDRESS.split('@');
  const url = `https://${domain}/.well-known/lnurlp/${name}`;
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  
  const data = await response.json();
  return {
    pubkey: data.nostrPubkey,
    callback: data.callback
  };
}

async function checkRelayForZapReceipts(relayUrl, pubkey) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(relayUrl);
    const receipts = [];
    const subId = 'test-' + Date.now();
    
    const timeout = setTimeout(() => {
      ws.close();
      resolve(receipts);
    }, 8000);

    ws.on('open', () => {
      // Look for zap receipts (kind 9735) to this pubkey in last 24 hours
      const filter = {
        kinds: [9735],
        '#p': [pubkey],
        since: Math.floor(Date.now() / 1000) - 86400, // Last 24 hours
        limit: 100
      };
      
      ws.send(JSON.stringify(['REQ', subId, filter]));
    });

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        
        if (msg[0] === 'EVENT' && msg[1] === subId) {
          receipts.push(msg[2]);
        } else if (msg[0] === 'EOSE' && msg[1] === subId) {
          clearTimeout(timeout);
          ws.close();
          resolve(receipts);
        }
      } catch (e) {
        // Ignore parse errors
      }
    });

    ws.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

main().catch(console.error);
