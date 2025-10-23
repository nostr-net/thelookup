# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## NostrHub: Project Overview

NostrHub is a comprehensive Nostr client application that serves as a hub for discovering and managing Nostr Implementation Possibilities (NIPs) and related content. It functions as both an official NIP browser and a custom NIP publishing platform built on the Nostr protocol.

### Technology Stack
- **React 18** with TypeScript for type safety
- **TailwindCSS** with **shadcn/ui** components for styling
- **Vite** for fast development and builds
- **Nostrify** for Nostr protocol integration
- **React Router** for client-side routing
- **TanStack Query** for data fetching and caching
- **React Markdown** for content rendering

## Development Commands

### Essential Commands
```bash
# Install dependencies and start development server
npm run dev

# Run comprehensive tests (includes TypeScript check, ESLint, and build)
npm run test

# Build for production
npm run build

# Deploy to surge.sh
npm run deploy
```

### Testing
- The `npm run test` command runs TypeScript compilation, ESLint, unit tests, and production build
- Always run this command before considering changes complete
- Tests use Vitest with React Testing Library and jsdom environment

## Architecture Overview

### Core Structure
```
src/
├── components/          # React components
│   ├── ui/              # shadcn/ui components (48+ components)
│   ├── auth/            # Authentication components
│   └── event-renderers/ # Event type-specific rendering
├── pages/               # React Router page components
├── hooks/               # Custom React hooks (48 hooks total)
├── lib/                 # Utility functions
├── test/                # Testing utilities (TestApp component)
└── contexts/            # React context providers
```

### Key Patterns
- **Provider-based**: AppProvider, NostrProvider, QueryClientProvider
- **Hook-driven**: Custom hooks for all Nostr operations and data fetching
- **Component-based**: Reusable UI with shadcn/ui components
- **Route-driven**: React Router with clean URL structure using NIP-19 identifiers

## Nostr Protocol Integration

### Core Hooks
- `useNostr`: Core Nostr protocol integration with `.query()` and `.event()` methods
- `useAuthor`: Fetch user profile data by pubkey
- `useCurrentUser`: Get currently logged-in user
- `useNostrPublish`: Publish events to Nostr (automatically adds "client" tag)
- `useUploadFile`: Upload files via Blossom servers (returns NIP-94 tags)

### Authentication
- Use `LoginArea` component for login/logout functionality
- Supports NIP-07 login (window.nostr) and multi-account management
- No conditional logic needed around LoginArea - it handles all states

### Event Publishing Pattern
```typescript
const { user } = useCurrentUser();
const { mutate: createEvent } = useNostrPublish();

// Ensure user is logged in before publishing
if (!user) return <span>You must be logged in</span>;

createEvent({ kind: 1, content: data.content });
```

### Event Querying Pattern
```typescript
// Combine useNostr and useQuery for data fetching
const { nostr } = useNostr();

return useQuery({
  queryKey: ['posts'],
  queryFn: async (c) => {
    const signal = AbortSignal.any([c.signal, AbortSignal.timeout(1500)]);
    const events = await nostr.query([{ kinds: [1], limit: 20 }], { signal });
    return events;
  },
});
```

### NIP-19 Identifiers in Routing
- Use NIP-19 identifiers as path parameters for secure, universal links
- Regular events: `/nevent1...` paths
- Replaceable/addressable events: `/naddr1...` paths
- Always decode identifiers and validate types before rendering

### Content Rendering
- Use `NoteContent` component for rich text rendering of Nostr notes
- Handles URLs, hashtags, and Nostr URIs automatically
- Supports markdown rendering for custom NIPs and other content

## UI Components and Design

### shadcn/ui Components
- 48+ unstyled, accessible components built on Radix UI
- Located in `src/components/ui/`
- Follow consistent pattern with `forwardRef` and `cn()` utility
- Customizable with Tailwind CSS classes

### Loading States
- **Use skeleton loading** for structured content (feeds, profiles, forms)
- **Use spinners** only for buttons or short operations
- Match skeleton structure to component layout

### Empty States
- Display minimalist empty states with `RelaySelector` component
- Allows users to switch relays to discover content from different sources
- Use dashed borders and centered text for visual consistency

## Development Guidelines

### Path Aliases
- Use `@/` prefix for all imports from src directory
- Example: `import { useNostr } from '@/hooks/useNostr';`

### TypeScript
- **Never use the `any` type** - always use proper TypeScript types
- All code must pass TypeScript compilation before completion

### Nostr Implementation Best Practices
- Always prefer existing NIPs over creating custom kinds for interoperability
- Use single-letter tags (like `t`) for categorization to enable relay-level filtering
- Validate custom kind events against required tags and JSON structure
- Document custom kinds in NIP.md file when created

### Theme System
- Complete light/dark theme support with CSS custom properties
- Control via `useTheme` hook or automatic dark mode with `.dark` class
- Update colors in both `:root` and `.dark` selectors in `src/index.css`

## Key Features and Files

### Official NIPs Browser
- Browse/search official NIPs with carousel display
- Files: `src/pages/Index.tsx`, `src/hooks/useOfficialNips.ts`

### Custom NIPs Platform
- Create/edit custom NIPs (kind 30817), comments, reactions
- Files: `src/pages/CreateNipPage.tsx`, `src/pages/EditNipPage.tsx`

### Nostr Apps Directory
- Discover/submit apps by supported event kinds
- Files: `src/pages/AppsPage.tsx`, `src/hooks/useApps.ts`

### Git Repositories Hub (NIP-34)
- Announce/discover git repositories with metadata
- Files: `src/pages/RepositoriesPage.tsx`, `src/components/RepositoryCard.tsx`

### Notifications System
- Real-time notifications with read state management
- Files: `src/pages/NotificationsPage.tsx`, `src/hooks/useNotifications.ts`

## Testing

### Test Setup
- Use `TestApp` component to provide all necessary context providers
- Wrap components in `<TestApp>{children}</TestApp>` for testing
- Tests located alongside components or in `src/test/` directory

### Running Tests
- Always run `npm run test` before considering changes complete
- This includes TypeScript check, ESLint, unit tests, and build validation
- Your task is not finished until this test passes without errors

## App Configuration

### Default Configuration
```typescript
const defaultConfig: AppConfig = {
  theme: "light",
  relayUrl: "wss://relay.nostr.band",
};
```

### Relay Options
- Preset relays available: Ditto, Nostr.Band, Damus, Primal
- Users can switch relays via `RelaySelector` component
- Preferences persist in local storage

## Routing

### Adding New Routes
1. Create page component in `/src/pages/`
2. Import in `AppRouter.tsx`
3. Add route above catch-all `*` route:
```tsx
<Route path="/your-path" element={<YourComponent />} />
```

### URL Structure
- `/` - Apps page (default homepage)
- `/nips` - Official NIPs browser with carousel
- `/nip/01` - View official NIP-01
- `/nip/naddr1...` - View custom NIP by naddr
- `/create` - Create new custom NIP
- `/edit/naddr1...` - Edit existing custom NIP
- `/my-nips` - View your published NIPs

## File Uploads

### Blossom Integration
- Use `useUploadFile` hook for file uploads
- Returns NIP-94 compatible tags for event attachment
- For kind 1 events: append URL to content, add `imeta` tag
- For kind 0 events: use URL directly in relevant JSON fields

## Encryption

### NIP-44 Encryption
- Use `user.signer.nip44` for encryption/decryption
- Always prefer signer interface over direct private key access
- Handle cases where nip44 might not be available in older extensions