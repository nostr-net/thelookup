import path from "node:path";
import process from "node:process";

import prerender from "@prerenderer/rollup-plugin";
import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vitest/config";

// https://vitejs.dev/config/
export default defineConfig(() => ({
  base: process.env.GITHUB_PAGES ? '/thelookup/' : '/',
  server: {
    host: "::",
    port: 8080,
  },
  define: {
    global: 'globalThis',
  },
  optimizeDeps: {
    include: ['buffer', 'process'],
  },
  plugins: [
    react(),
    process.env.PRERENDER ? prerender({
      routes: [
        "/",
        "/nips",
        "/apps",
        "/apps/submit",
        "/repositories",
        "/repositories/create",
        "/create",
        "/notifications",
        "/dvm",
        // Common official NIPs
        "/01", // Basic protocol flow
        "/02", // Contact list and petnames
        "/03", // OpenTimestamps
        "/04", // Encrypted direct messages
        "/05", // Mapping Nostr keys to DNS-based internet identifiers
        "/06", // Basic key derivation from mnemonic seed phrase
        "/07", // window.nostr capability for web browsers
        "/08", // Handling mentions
        "/09", // Event deletion
        "/10", // Conventions for clients' use of e and p tags
        "/11", // Relay information document
        "/12", // Generic tag queries
        "/13", // Proof of work
        "/14", // Subject tag in text events
        "/15", // Nostr marketplace
        "/16", // Event treatment
        "/18", // Reposts
        "/19", // bech32-encoded entities
        "/20", // Command results
        "/21", // nostr: URI scheme
        "/22", // Event created_at limits
        "/23", // Long-form content
        "/24", // Extra metadata fields and tags
        "/25", // Reactions
        "/26", // Delegated event signing
        "/27", // Text note references
        "/28", // Public chat
        "/30", // Custom emoji
        "/31", // Dealing with unknown events
        "/32", // Labeling
        "/33", // Parameterized replaceable events
        "/34", // git stuff
        "/36", // Sensitive content
        "/38", // User statuses
        "/39", // External identities in profiles
        "/40", // Expiration timestamp
        "/42", // Authentication of clients to relays
        "/45", // Counting results
        "/46", // Nostr connect
        "/47", // Wallet connect
        "/50", // Search capability
        "/51", // Lists
        "/52", // Calendar events
        "/53", // Live activities
        "/56", // Reporting
        "/57", // Lightning zaps
        "/58", // Badges
        "/65", // Relay list metadata
        "/72", // Moderated communities
        "/75", // Zap goals
        "/78", // Application-specific data
        "/84", // Highlights
        "/89", // Recommended application handlers
        "/90", // Data vending machines
        "/94", // File metadata
        "/96", // HTTP file storage integration
        "/98", // HTTP auth
        "/99", // Classified listings
        // Common event kinds
        "/kind/0", // User metadata
        "/kind/1", // Text notes
        "/kind/3", // Contacts
        "/kind/4", // Encrypted direct messages
        "/kind/5", // Event deletion
        "/kind/6", // Reposts
        "/kind/7", // Reactions
        "/kind/1984", // Reporting
        "/kind/9734", // Zap request
        "/kind/9735", // Zap
        "/kind/10002", // Relay list metadata
        "/kind/30000", // Categorized people list
        "/kind/30001", // Categorized bookmark list
        "/kind/30008", // Profile badges
        "/kind/30009", // Badge definition
        "/kind/30017", // Create or update a stall
        "/kind/30018", // Create or update a product
        "/kind/30023", // Long-form content
        "/kind/30078", // Application-specific data
        "/kind/30311", // Live event
        "/kind/30315", // User statuses
        "/kind/30402", // Classified listing
        "/kind/30617", // Repository announcement
        "/kind/30818", // Wiki article
        "/kind/31922", // Date-based calendar event
        "/kind/31923", // Time-based calendar event
        "/kind/31924", // Calendar
        "/kind/31925", // Calendar event RSVP
        "/kind/31989", // Handler recommendation
        "/kind/31990", // Handler information
        // Apps
        "/apps/t/mkstack",
      ],
    }) : null,
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    onConsoleLog(log) {
      return !log.includes("React Router Future Flag Warning");
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));