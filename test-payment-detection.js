#!/usr/bin/env node

/**
 * Test Payment Detection - Monitor relays for new zap receipts
 * 
 * This script monitors the relays we know have zap receipts and shows
 * when new payments are detected. Use this to test the detection logic.
 */

import { WebSocket } from 'ws';

const LIGHTNING_ADDRESS = 'bitkarrot@primal.net';
const LIGHTNING_PUBKEY = 'f81611363554b64306467234d7396ec88455707633f54738f6c4683535098cd3';

// Relays that we know have zap receipts
const RELAYS_TO_MONITOR = [
  'wss://hivetalk.nostr1.com',
  'wss://relay.nostr.net',
  'wss://relay.primal.net', 
  'wss://relay.nostr.band'
];

console.log('🔍 Payment Detection Test');
console.log('========================');
console.log(`Monitoring: ${LIGHTNING_ADDRESS}`);
console.log(`Pubkey: ${LIGHTNING_PUBKEY}`);
console.log(`Relays: ${RELAYS_TO_MONITOR.join(', ')}`);
console.log('');
console.log('💡 Instructions:');
console.log('1. Make a payment to bitkarrot@primal.net (any amount)');
console.log('2. Watch this script detect the zap receipt');
console.log('3. Use Ctrl+C to stop monitoring');
console.log('');

async function main() {
  console.log('⏳ Starting monitoring...');
  console.log('');

  // Monitor each relay
  const monitors = RELAYS_TO_MONITOR.map(relayUrl => monitorRelay(relayUrl));
  
  // Wait for all monitors (they run indefinitely)
  await Promise.all(monitors);
}

async function monitorRelay(relayUrl) {
  return new Promise((resolve, reject) => {
    console.log(`📡 Connecting to ${relayUrl}...`);
    
    const ws = new WebSocket(relayUrl);
    const subId = 'monitor-' + Math.random().toString(36).substring(7);
    
    ws.on('open', () => {
      console.log(`✅ Connected to ${relayUrl}`);
      
      // Subscribe to zap receipts for bitkarrot@primal.net
      const filter = {
        kinds: [9735], // Zap receipts
        '#p': [LIGHTNING_PUBKEY],
        since: Math.floor(Date.now() / 1000) - 60, // Last minute
        limit: 10
      };
      
      ws.send(JSON.stringify(['REQ', subId, filter]));
    });

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        if (message[0] === 'EVENT' && message[1] === subId) {
          const receipt = message[2];
          handleZapReceipt(receipt, relayUrl);
        } else if (message[0] === 'EOSE' && message[1] === subId) {
          console.log(`📋 Initial sync complete for ${relayUrl}`);
          
          // Now subscribe to real-time updates
          const realtimeFilter = {
            kinds: [9735],
            '#p': [LIGHTNING_PUBKEY],
            since: Math.floor(Date.now() / 1000),
            limit: 100
          };
          
          const realtimeSubId = 'realtime-' + Math.random().toString(36).substring(7);
          ws.send(JSON.stringify(['REQ', realtimeSubId, realtimeFilter]));
        }
      } catch (error) {
        // Ignore parsing errors
      }
    });

    ws.on('error', (error) => {
      console.log(`❌ Error connecting to ${relayUrl}:`, error.message);
    });

    ws.on('close', () => {
      console.log(`🔌 Disconnected from ${relayUrl}`);
      // Reconnect after a delay
      setTimeout(() => {
        console.log(`🔄 Reconnecting to ${relayUrl}...`);
        monitorRelay(relayUrl);
      }, 5000);
    });
  });
}

function handleZapReceipt(receipt, relayUrl) {
  try {
    console.log('');
    console.log('🎉 NEW ZAP RECEIPT DETECTED!');
    console.log(`📡 Relay: ${relayUrl}`);
    console.log(`🆔 ID: ${receipt.id?.substring(0, 32)}...`);
    console.log(`⏰ Created: ${new Date(receipt.created_at * 1000).toLocaleString()}`);
    console.log(`👤 From: ${receipt.pubkey?.substring(0, 16)}...`);
    
    // Parse the description to get zap request details
    const descTag = receipt.tags?.find(tag => tag[0] === 'description');
    if (descTag) {
      try {
        const zapRequest = JSON.parse(descTag[1]);
        console.log(`💰 Payer: ${zapRequest.pubkey?.substring(0, 16)}...`);
        
        const amountTag = zapRequest.tags?.find(tag => tag[0] === 'amount');
        if (amountTag) {
          const sats = parseInt(amountTag[1]) / 1000;
          console.log(`💸 Amount: ${sats} sats`);
        }
        
        const contentTag = zapRequest.content;
        if (contentTag) {
          console.log(`💬 Message: "${contentTag}"`);
        }
      } catch (e) {
        console.log('❌ Failed to parse zap request from description');
      }
    }
    
    // Check for bolt11 invoice
    const bolt11Tag = receipt.tags?.find(tag => tag[0] === 'bolt11');
    if (bolt11Tag) {
      console.log(`⚡ Invoice: ${bolt11Tag[1]?.substring(0, 50)}...`);
    }
    
    console.log('─'.repeat(60));
  } catch (error) {
    console.error('Error handling zap receipt:', error);
  }
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log('');
  console.log('👋 Stopping monitoring...');
  process.exit(0);
});

main().catch(console.error);
