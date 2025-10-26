# TheLookup

A comprehensive Nostr ecosystem explorer and directory for discovering NIPs, applications, repositories, and resources in the decentralized social network.

🌐 **Live Site**: [https://nostrlookup.vercel.app/](https://nostrlookup.vercel.app/)

## Features

### 📱 Application Directory
- **Discover Nostr Apps**: Browse a comprehensive directory of Nostr applications
- **Detailed App Profiles**: View screenshots, descriptions, features, and metadata
- **Category Filtering**: Filter apps by type, platform, and functionality
- **Community Submissions**: Submit and edit your own applications
- **Community Moderation**: Report and flag inappropriate content using NIP-1984

### 📖 NIPs (Nostr Implementation Possibilities)
- **Official NIPs**: Browse and search through official NIPs from the [nostr-protocol/nips](https://github.com/nostr-protocol/nips) repository
- **Custom NIPs**: Publish your own custom NIPs on the Nostr network using kind 30817 events
- **Rich Markdown**: Full markdown rendering with syntax highlighting for code blocks
- **NIP-19 Support**: Support for naddr identifiers and direct linking
- **Edit & Update**: Edit and update your published NIPs

### 🗂️ Repository Explorer
- **Git Repository Discovery**: Browse Nostr-related repositories and projects
- **Issue Tracking**: View and create issues for repositories
- **Patch Management**: Submit and review patches
- **Repository Announcements**: Announce new repositories to the community

### 🌐 Resources Hub
- **Essential Tools**: Curated list of Nostr tools, services, and gateways
- **Community Resources**: Discover relays, clients, and development resources
- **Categorized Listings**: Organized by type (Official, Relay, Tools, Gateway, etc.)

### 🔧 Developer Tools
- **DVM Marketplace**: Discover and interact with Data Vending Machines
- **Event Explorer**: View and analyze Nostr events by kind
- **Author Profiles**: Explore user profiles and their contributions

### 🎨 Modern UI/UX
- **Beautiful Themes**: Support for tweakcn.com themes with OKLCH color spaces
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Dark/Light Mode**: Automatic theme switching with system preference detection
- **Smooth Animations**: Polished interactions and transitions

## URL Structure

### Main Sections
- `/` - Application directory (home page)
- `/resources` - Nostr resources and tools hub
- `/nips` - NIPs browser and directory
- `/repositories` - Git repository explorer
- `/dvm` - Data Vending Machine marketplace

### NIPs
- `/nip/01` - View official NIP-01
- `/nip/naddr1...` - View custom NIP by naddr (NIP-19 identifier)
- `/create` - Create a new custom NIP
- `/edit/naddr1...` - Edit an existing custom NIP (owner only)

### Applications
- `/apps` - Browse all applications
- `/apps/t/:tag` - Filter apps by category tag
- `/apps/submit` - Submit a new application
- `/apps/edit/:naddr` - Edit an existing application

### Repositories
- `/repositories` - Browse all repositories
- `/repositories/create` - Announce a new repository
- `/repositories/:naddr` - View repository details
- `/repositories/:naddr/edit` - Edit repository information
- `/repositories/:naddr/issues/create` - Create new issue
- `/repositories/:nip19/issues/:issueId` - View specific issue
- `/repositories/:nip19/patches/:patchId` - View specific patch

### Other
- `/kind/:k` - View events by Nostr event kind
- `/:nip19` - Universal NIP-19 identifier resolver
- `/notifications` - User notifications

## Custom NIP Format

Custom NIPs are published as kind 30817 events with the following structure:

- `content`: The markdown content of the NIP
- `d` tag: Unique identifier for the NIP
- `title` tag: The title of the NIP
- `k` tags: Event kinds that this NIP defines or relates to (optional)

## Technology Stack

### Frontend
- **React 18** with TypeScript for robust component architecture
- **Vite** for fast development and optimized builds
- **React Router** for client-side routing
- **TanStack Query** for efficient data fetching and caching

### Styling & UI
- **TailwindCSS** for utility-first styling
- **shadcn/ui** for beautiful, accessible UI components
- **tweakcn.com themes** for customizable color schemes with OKLCH support
- **Lucide React** for consistent iconography
- **Radix UI** for headless, accessible component primitives

### Nostr Integration
- **Nostrify** for Nostr protocol integration and event handling
- **nostr-tools** for additional Nostr utilities
- **NIP-07** browser extension support for authentication

### Content & Media
- **React Markdown** with **remark-gfm** for GitHub Flavored Markdown
- **Prism.js** for syntax highlighting in code blocks
- **QR Code** generation for sharing
- **Rehype Highlight** for enhanced code highlighting

### Development & Testing
- **ESLint** with TypeScript support for code quality
- **Vitest** for unit testing
- **Testing Library** for component testing
- **SWC** for fast compilation

## Environment Variables

The site can be customized by setting environment variables. Copy `.env.example` to `.env` and customize:

```bash
# Site Configuration
VITE_SITE_NAME=thelookup.app           # Site name used for client tags and redirects
VITE_SITE_URL=https://thelookup.app    # Full site URL
VITE_SITE_DISPLAY_NAME=TheLookup       # Display name shown in UI
```

### Deployment Customization

When deploying your own instance, you can customize:

1. **Site Name**: Changes the client tag in published events and redirect targets
2. **Site URL**: Used for any absolute URLs that reference the site
3. **Display Name**: The name shown in the UI and page titles

Example for a custom deployment:

```bash
# .env
VITE_SITE_NAME=my-nostr-directory.com
VITE_SITE_URL=https://my-nostr-directory.com
VITE_SITE_DISPLAY_NAME=My Nostr Directory
```

## Development

```bash
# Install dependencies and start development server
npm run dev

# Run tests
npm run test

# Build for production
npm run build

# Deploy
npm run deploy
```

### Development Environment Variables

For development, you can create `.env.local` to override settings locally without affecting the repository:

```bash
# .env.local (for development only)
VITE_SITE_NAME=localhost:5173
VITE_SITE_URL=http://localhost:5173
VITE_SITE_DISPLAY_NAME=TheLookup
```

### Theme Customization

TheLookup supports beautiful themes from [tweakcn.com](https://tweakcn.com). To add a new theme:

```bash
# Find a theme on tweakcn.com and use the CLI
npx shadcn@latest add https://tweakcn.com/r/themes/[theme-id]
```

The theme system uses OKLCH color spaces for vibrant, consistent colors across light and dark modes.

### Lightning Payments

TheLookup supports **Lightning payments for app submissions** to prevent spam and maintain directory quality:

- **NIP-57 Integration**: Uses Lightning Zaps for payment verification
- **Configurable Fees**: Set custom satoshi amounts for new submissions
- **Smart Logic**: Only new users pay - existing app authors can edit for free
- **Multiple Wallets**: Supports QR codes, WebLN, and manual invoice copying
- **Anti-Spam**: Helps maintain high-quality app directory

For detailed setup instructions, configuration options, and troubleshooting, see **[LIGHTNING_PAYMENTS.md](./LIGHTNING_PAYMENTS.md)**.

### Resources Management

The `/resources` page displays community resources from a **markdown file** for easy editing:

- **Non-Technical Editing**: Resources are stored in `public/RESOURCES.md` 
- **Simple Format**: Each resource uses standard markdown with metadata
- **No Code Required**: Add, edit, or remove resources without touching code
- **Automatic Icons**: Choose from predefined Lucide icons
- **Categories**: Organize resources by type (Official, Relay, Tools, etc.)

To edit resources, simply modify **[public/RESOURCES.md](./public/RESOURCES.md)** following the documented format.

### Featured Apps Management

The `/apps` page displays **featured Nostr applications** in an auto-rotating carousel from a markdown file for easy curation:

- **Auto-Rotating Carousel**: 4-second intervals with smooth transitions and infinite loop
- **Responsive Layout**: Shows 2-4 cards per row based on screen width (mobile: 2, tablet: 3, desktop: 4)
- **Authentic Icons**: Uses actual website favicons/logos via remote URLs
- **Community Curation**: Featured apps are stored in `public/FEATURED_APPS.md`
- **Rich Metadata**: Each app includes category, platform, description, and icon URL
- **Platform Support**: Tag apps by platform (Web, iOS, Android, Desktop, All)
- **Categories**: Organize by type (Social, Client, Tools, Media, Gaming, etc.)
- **Interactive Features**: Manual navigation, hover effects, and click-to-visit functionality
- **Strategic Placement**: Positioned prominently at the top of `/apps` page above search filters

**Icon Support**: 
- **Remote URLs**: Use `https://website.com/favicon.ico` for actual website icons
- **Fallback Icons**: Lucide icon names for consistent styling when needed

To manage featured apps, edit **[public/FEATURED_APPS.md](./public/FEATURED_APPS.md)** following the documented format.

## App Flagging System

The app directory includes a community-driven content moderation system using NIP-1984 report events:

### Report Categories
- **fraud** - Fake information
- **spam** - Unwanted promotional content
- **scam** - Malicious/deceptive content
- **duplicate** - Duplicate entries
- **inappropriate** - Violates community standards
- **impersonation** - Fake identity/business

### How Flagging Works
1. **Signed-in users** can flag any app from the app detail page
2. **Flag reports** are published as kind 1984 events on Nostr
3. **Flag counts** are displayed prominently on app detail pages
4. **Severity indicators** show warning levels based on flag count
5. **One flag per user** prevents duplicate reports from the same person

### Flag Event Structure
```json
{
  "kind": 1984,
  "pubkey": "flagger_pubkey",
  "content": "This directory entry appears to be fraudulent - fake business information",
  "tags": [
    ["e", "target_event_id", "relay_url"],
    ["p", "target_author_pubkey"],
    ["report", "fraud"],
    ["l", "app-flag", "thelookup.app.flags"],
    ["k", "31990"]
  ]
}
```

### Community Guidelines
- **Only flag apps that violate community standards**
- **Provide detailed descriptions** for your reports
- **False reports may result in account suspension**
- **Flag data is public** and visible to all users

## Contributing

TheLookup welcomes contributions from the Nostr community! Here's how you can help:

### Code Contributions
- **Report bugs** or suggest features via GitHub issues
- **Submit pull requests** for improvements and new features
- **Improve documentation** and help others understand the codebase
- **Add tests** to ensure reliability and prevent regressions

### Content Contributions
- **Submit applications** to the directory
- **Create and share** your own custom NIPs
- **Announce repositories** and projects
- **Curate resources** and help maintain quality listings

### Community Contributions
- **Test new features** and provide feedback
- **Help moderate content** through the flagging system
- **Share TheLookup** with other Nostr users and developers
- **Translate** the interface to other languages (future feature)

### Development Setup

1. **Fork the repository** on GitHub
2. **Clone your fork** locally
3. **Install dependencies**: `npm install`
4. **Start development server**: `npm run dev`
5. **Make your changes** and test thoroughly
6. **Submit a pull request** with a clear description

## License

MIT License - see LICENSE file for details.

---

**Built with ❤️ for the Nostr community**

*TheLookup is an open-source project dedicated to making the Nostr ecosystem more discoverable and accessible to everyone.*