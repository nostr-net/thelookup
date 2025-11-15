# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## TheLookup: Project Overview

TheLookup is a comprehensive Nostr ecosystem explorer and directory for discovering NIPs (Nostr Implementation Possibilities), applications, repositories, and resources in the decentralized social network. It functions as both an official NIP browser and a multi-purpose Nostr platform built on the Nostr protocol.

### Technology Stack
- **React 18** with TypeScript for type safety
- **TailwindCSS** with **shadcn/ui** components for styling
- **Vite** for fast development and optimized builds
- **Nostrify** (@nostrify/nostrify, @nostrify/react) for Nostr protocol integration
- **React Router** for client-side routing
- **TanStack Query** for data fetching and caching
- **React Markdown** with remark-gfm for GitHub Flavored Markdown
- **Prism.js** for syntax highlighting
- **tweakcn.com themes** for customizable OKLCH color schemes

## Development Commands

### Essential Commands
```bash
# Install dependencies and start development server
npm run dev

# Run comprehensive tests (includes TypeScript check, ESLint, unit tests, and build)
npm run test

# Build for production
npm run build

# Deploy to surge.sh
npm run deploy
```

### Testing
- The `npm run test` command runs TypeScript compilation, ESLint, unit tests, and production build
- **Always run this command before considering changes complete**
- Tests use Vitest with React Testing Library and jsdom environment
- **Your task is not finished until this test passes without errors**

## Architecture Overview

### Core Structure
```
src/
├── components/          # React components (80+ components)
│   ├── ui/              # shadcn/ui components (54 components)
│   ├── auth/            # Authentication components
│   ├── event-renderers/ # Event type-specific rendering
│   └── search/          # Search-specific components
├── pages/               # React Router page components (39 pages)
├── hooks/               # Custom React hooks (75+ hooks)
├── lib/                 # Utility functions
│   ├── search/          # Search utilities (ranking, transformers, types)
│   ├── siteConfig.ts    # Site configuration utilities
│   └── utils.ts         # General utilities
├── test/                # Testing utilities (TestApp component)
├── contexts/            # React context providers (NWCContext)
└── types/               # TypeScript type definitions
```

### Key Patterns
- **Provider-based**: NostrProvider, NWCProvider, QueryClientProvider, theme provider
- **Hook-driven**: Custom hooks for all Nostr operations and data fetching
- **Component-based**: Reusable UI with shadcn/ui components
- **Route-driven**: React Router with clean URL structure using NIP-19 identifiers
- **Environment-configurable**: Dynamic site configuration via environment variables

## Nostr Protocol Integration

### Core Hooks
- `useNostr`: Core Nostr protocol integration with `.query()` and `.event()` methods
- `useAuthor`: Fetch user profile data by pubkey
- `useCurrentUser`: Get currently logged-in user
- `useNostrPublish`: Publish events to Nostr (automatically adds "client" tag)
- `useUploadFile`: Upload files via Blossom servers (returns NIP-94 tags)
- `useWallet`: Lightning wallet integration for payments
- `useWebLN`: WebLN integration for Lightning payments
- `useZap`: Lightning zap functionality
- `useNWC`: Nostr Wallet Connect integration

### Authentication
- Use `LoginArea` component for login/logout functionality
- Supports NIP-07 login (window.nostr) and multi-account management
- No conditional logic needed around LoginArea - it handles all states
- Multi-account support with account switching

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
- Use `MarkdownRenderer` for markdown content with syntax highlighting
- `SyntaxHighlighter` component for code blocks with Prism.js

## UI Components and Design

### shadcn/ui Components
- 54 unstyled, accessible components built on Radix UI
- Located in `src/components/ui/`
- Follow consistent pattern with `forwardRef` and `cn()` utility
- Customizable with Tailwind CSS classes
- Includes: button, card, dialog, dropdown-menu, form, input, select, toast, etc.

### Loading States
- **Use skeleton loading** for structured content (feeds, profiles, forms)
- **Use spinners** only for buttons or short operations
- Match skeleton structure to component layout
- Examples: `AppCardSkeleton`, `RepositoryCardSkeleton`, `SearchResultSkeleton`

### Empty States
- Display minimalist empty states with `RelaySelector` component
- Allows users to switch relays to discover content from different sources
- Use dashed borders and centered text for visual consistency

## Development Guidelines

### Path Aliases
- Use `@/` prefix for all imports from src directory
- Configured in `tsconfig.json` and `vite.config.ts`
- Example: `import { useNostr } from '@/hooks/useNostr';`

### TypeScript
- **Never use the `any` type** - always use proper TypeScript types
- All code must pass TypeScript compilation before completion
- `noImplicitAny: false` in tsconfig but avoid `any` nonetheless
- Use strict null checks (`strictNullChecks: true`)

### Nostr Implementation Best Practices
- Always prefer existing NIPs over creating custom kinds for interoperability
- Use single-letter tags (like `t`) for categorization to enable relay-level filtering
- Validate custom kind events against required tags and JSON structure
- Document custom kinds in NIP.md file when created

### Theme System
- Complete light/dark theme support with CSS custom properties
- Integration with tweakcn.com themes using OKLCH color spaces
- Control via `useTheme` hook from `AppProvider`
- Access theme with: `const { theme, toggleTheme } = useTheme();`
- Update colors in both `:root` and `.dark` selectors in `src/index.css`
- Theme switcher component available: `ThemeSwitcher`

## Site Configuration

### Environment Variables
The site is highly configurable via environment variables. See `.env.example` for all options:

```bash
# Site Identity
VITE_SITE_NAME=nostrhub.io                    # Domain/identifier
VITE_SITE_URL=https://nostrhub.io              # Full URL
VITE_SITE_DISPLAY_NAME=nostr.net               # Display name in UI

# Navigation (comma-separated list or empty for all)
VITE_SECTIONS=apps,resources,nips,repositories,dvm

# Relay Configuration
VITE_RELAY_URL=wss://relay.nostr.net           # Default relay
VITE_RELAY_NPUB=npub1...                       # Relay npub for ownership

# Lightning Payment for App Submissions
VITE_SUBMIT_APP_PAYMENT_ENABLED=true           # Enable/disable payments
VITE_SUBMIT_APP_LIGHTNING_ADDRESS=pay@example.com  # Lightning address
VITE_SUBMIT_APP_FEE=1000                       # Fee in satoshis
VITE_ZAP_RECEIPT_RELAY=wss://relay.primal.net  # Zap receipt relay
```

### Site Configuration Utilities
Use functions from `@/lib/siteConfig.ts`:
- `getSiteName()`: Get site domain/identifier
- `getSiteUrl()`: Get full site URL
- `getSiteDisplayName()`: Get display name for UI
- `getPageTitle(title)`: Generate page title with site name
- `getPageDescription(description, context?)`: Generate SEO descriptions

### Navigation Configuration
- Control visible sections via `VITE_SECTIONS` environment variable
- Available sections: apps, resources, nips, repositories, dvm
- Leave empty to show all sections (default)
- Example: `VITE_SECTIONS=apps,resources` shows only Apps and Resources

## Key Features and Files

### Homepage & Resources
- **Homepage**: Landing page with featured content (`src/pages/HomePage.tsx`)
- **Resources Hub**: Curated resources from markdown (`src/pages/ResourcesPage.tsx`)
- **Resources Data**: Editable markdown file at `public/RESOURCES.md`
- **Featured Apps**: Auto-rotating carousel from `public/FEATURED_APPS.md`

### Official NIPs Browser
- Browse/search official NIPs with carousel display
- Files: `src/pages/Index.tsx`, `src/hooks/useOfficialNips.ts`
- Routes: `/nips`, `/nip/01`, `/nip/:id`

### Custom NIPs Platform
- Create/edit custom NIPs (kind 30817), comments, reactions
- Files: `src/pages/CreateNipPage.tsx`, `src/pages/EditNipPage.tsx`, `src/pages/NipPage.tsx`
- Routes: `/create`, `/edit/:naddr`, `/nip/:naddr`

### Nostr Apps Directory
- Discover/submit apps by supported event kinds
- Files: `src/pages/AppsPage.tsx`, `src/hooks/useApps.ts`
- Routes: `/apps`, `/apps/t/:tag`, `/apps/submit`, `/apps/edit/:naddr`
- **Lightning Payments**: Optional payment requirement for new submissions
- **Community Moderation**: Flag system using NIP-1984
- **Featured Apps**: Carousel display from markdown configuration

### Git Repositories Hub (NIP-34)
- Announce/discover git repositories with metadata
- Issue tracking and patch management
- Files: `src/pages/RepositoriesPage.tsx`, `src/pages/RepositoryPage.tsx`, `src/components/RepositoryCard.tsx`
- Routes: `/repositories`, `/repositories/:naddr`, `/repositories/:naddr/issues/create`

### Data Vending Machines (DVM)
- Discover and interact with DVM services (kind 31990)
- Submit jobs and view results
- Files: `src/pages/DVMPage.tsx`, `src/hooks/useDVMServices.ts`, `src/hooks/useDVMJobs.ts`
- Routes: `/dvm`

### Universal Search
- Search across apps, repositories, and other content
- Advanced filtering and ranking
- Files: `src/pages/SearchPage.tsx`, `src/hooks/useUniversalSearch.ts`, `src/lib/search/`
- Routes: `/search`
- Supports: type filters, tag filters, kind filters, date ranges, sorting

### Notifications System
- Real-time notifications with read state management
- Files: `src/pages/NotificationsPage.tsx`, `src/hooks/useNotifications.ts`
- Routes: `/notifications`

### Community Flagging (NIP-1984)
- Report inappropriate content using NIP-1984 events
- Flag categories: fraud, spam, scam, duplicate, inappropriate, impersonation
- Files: `src/components/FlagDialog.tsx`, `src/components/FlagStats.tsx`, `src/hooks/useAppFlags.ts`
- One flag per user per app to prevent abuse

## Testing

### Test Setup
- Use `TestApp` component to provide all necessary context providers
- Wrap components in `<TestApp>{children}</TestApp>` for testing
- Tests located alongside components or in `src/test/` directory
- Setup file: `src/test/setup.ts`

### Running Tests
- Always run `npm run test` before considering changes complete
- This includes TypeScript check, ESLint, unit tests, and build validation
- **Your task is not finished until this test passes without errors**

## Routing

### URL Structure
```
Main Sections:
/                                    - Homepage with featured content
/resources                           - Resources hub (tools, relays, etc.)
/nips                                - Official NIPs browser
/apps                                - Apps directory
/repositories                        - Git repositories
/dvm                                 - Data Vending Machines
/search                              - Universal search

NIPs:
/nip/01                              - View official NIP-01
/nip/naddr1...                       - View custom NIP by naddr
/create                              - Create new custom NIP
/edit/naddr1...                      - Edit existing custom NIP

Apps:
/apps/t/:tag                         - Filter apps by tag
/apps/submit                         - Submit new app
/apps/edit/:naddr                    - Edit app

Repositories:
/repositories/create                 - Announce repository
/repositories/:naddr                 - View repository
/repositories/:naddr/edit            - Edit repository
/repositories/:naddr/issues/create   - Create issue
/repositories/:nip19/issues/:issueId - View issue
/repositories/:nip19/patches/:patchId - View patch

Other:
/kind/:k                             - View events by kind
/:nip19                              - Universal NIP-19 resolver
/notifications                       - User notifications
```

### Adding New Routes
1. Create page component in `/src/pages/`
2. Import in `AppRouter.tsx`
3. Add route **above** catch-all `*` route:
```tsx
<Route path="/your-path" element={<YourComponent />} />
```

## Lightning Integration

### Zaps (NIP-57)
- Use `useZap` hook for zapping content
- `ZapButton` component for UI
- `ZapDialog` for custom amount selection
- Support for WebLN and NWC

### Nostr Wallet Connect (NWC)
- Use `useNWC` or `useNWCContext` hooks
- Allows background payments without user interaction
- Context provider: `NWCContext`

### WebLN
- Use `useWebLN` hook for browser extension wallets
- Automatic fallback to QR codes if not available

### Payment Verification
- App submission payments verified via zap receipts (kind 9735)
- Hook: `useAppSubmissionPayment`
- Component: `AppSubmissionPaymentDialog`
- Configurable via environment variables

## File Uploads

### Blossom Integration
- Use `useUploadFile` hook for file uploads
- Returns NIP-94 compatible tags for event attachment
- For kind 1 events: append URL to content, add `imeta` tag
- For kind 0 events: use URL directly in relevant JSON fields

## Content Management

### Resources
- Stored in `public/RESOURCES.md`
- Simple markdown format with metadata
- Parser: `src/lib/parseResources.ts`
- No code changes needed to add/edit resources

### Featured Apps
- Stored in `public/FEATURED_APPS.md`
- Auto-rotating carousel with 4-second intervals
- Responsive layout (2-4 cards based on screen size)
- Parser: `src/lib/parseFeaturedApps.ts`
- Supports remote icon URLs and Lucide icon fallbacks

## Event Kinds Reference

### Standard Events
- **0**: User metadata (profile)
- **1**: Text notes
- **3**: Contacts
- **4**: Encrypted direct messages
- **5**: Event deletion
- **6**: Reposts
- **7**: Reactions
- **1984**: Reporting (flags)
- **9734**: Zap request
- **9735**: Zap receipt

### Replaceable Events
- **10002**: Relay list metadata
- **30000**: Categorized people list
- **30001**: Categorized bookmark list
- **30008**: Profile badges
- **30009**: Badge definition
- **30017**: Marketplace stall
- **30018**: Marketplace product
- **30023**: Long-form content
- **30078**: Application-specific data
- **30311**: Live event
- **30315**: User statuses
- **30402**: Classified listing
- **30617**: Repository announcement (NIP-34)
- **30817**: Custom NIP definition
- **30818**: Wiki article
- **31922**: Date-based calendar event
- **31923**: Time-based calendar event
- **31924**: Calendar
- **31925**: Calendar event RSVP
- **31989**: Handler recommendation
- **31990**: Handler information (apps/DVM)

## Search Implementation

### Universal Search
- Searches across multiple entity types (apps, repositories, etc.)
- Advanced ranking algorithm with relevance scoring
- Filters: types, tags, kinds, date ranges, authors
- Sorting: relevance, date, name
- Debounced input (300ms) for performance
- Timeout: 5000ms for queries

### Search Utilities
- `src/lib/search/ranking.ts`: Ranking and filtering logic
- `src/lib/search/transformers.ts`: Entity-to-search-result transformers
- `src/lib/search/types.ts`: TypeScript types

## Custom Event Validation

### App Events (kind 31990)
- Must have `d` tag (identifier)
- Must have at least one `k` tag (supported kinds)
- Validator: `validateAppEvent()` in `useUniversalSearch.ts`

### Repository Events (kind 30617)
- Must have `d` tag (identifier)
- Must have `clone` tag with valid URL
- Validator: `validateRepositoryEvent()` in `useUniversalSearch.ts`

## Best Practices

### Performance
- Use `AbortSignal.any([c.signal, AbortSignal.timeout(timeout)])` for query timeouts
- Implement debouncing for user input (use `useDebounce` hook)
- Use skeleton loaders to improve perceived performance
- Implement pagination or infinite scroll for large lists

### SEO
- Use `useSeoMeta` from '@unhead/react' for page metadata
- Use `getPageTitle()` and `getPageDescription()` utilities
- Prerender important routes (configured in `vite.config.ts`)

### Accessibility
- All shadcn/ui components are built on Radix UI (accessible by default)
- Use semantic HTML elements
- Include aria-labels where needed
- Ensure keyboard navigation works

### Security
- Validate all user input
- Sanitize markdown/HTML rendering
- Validate NIP-19 identifiers before decoding
- Check event signatures where critical

### Code Quality
- Always run `npm run test` before completing work
- Use TypeScript types instead of `any`
- Follow existing patterns and conventions
- Write tests for new features
- Use ESLint recommendations

## Deployment

### Environment Setup
1. Copy `.env.example` to `.env`
2. Customize site identity variables
3. Configure navigation sections
4. Set relay and payment options
5. Build: `npm run build`
6. Deploy: `npm run deploy` or use your preferred hosting

### Prerendering
- Static routes prerendered for SEO (configured in `vite.config.ts`)
- Includes: main pages, official NIPs, common event kinds
- Plugin: `@prerenderer/rollup-plugin`

### Customization
- **Site Branding**: Update `VITE_SITE_*` variables
- **Navigation**: Control sections via `VITE_SECTIONS`
- **Theme**: Customize colors in `src/index.css`
- **Resources**: Edit `public/RESOURCES.md`
- **Featured Apps**: Edit `public/FEATURED_APPS.md`

## Common Patterns

### Form Handling
```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  title: z.string().min(1),
});

const form = useForm({
  resolver: zodResolver(schema),
});
```

### Event Publishing with Client Tag
```typescript
const { mutate: createEvent } = useNostrPublish();

// Client tag automatically added by useNostrPublish
createEvent({
  kind: 1,
  content: "Hello Nostr!",
  tags: [["t", "greeting"]],
});
```

### Relay Switching
```typescript
// RelaySelector component handles UI and state
<RelaySelector />

// Relay preference persists in localStorage
```

### Debounced Search
```typescript
const [query, setQuery] = useState('');
const debouncedQuery = useDebounce(query, 300);

const { data } = useQuery({
  queryKey: ['search', debouncedQuery],
  queryFn: () => search(debouncedQuery),
});
```

---

**Built with ❤️ for the Nostr community**

TheLookup is an open-source project dedicated to making the Nostr ecosystem more discoverable and accessible to everyone.
