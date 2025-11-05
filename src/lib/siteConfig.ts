/**
 * Site configuration utility
 * Returns site-specific values from environment variables with sensible defaults
 */

export function getSiteName(): string {
  return import.meta.env.VITE_SITE_NAME || 'nostrhub.io';
}

export function getSiteUrl(): string {
  return import.meta.env.VITE_SITE_URL || 'https://nostrhub.io';
}

export function getClientTag(): string {
  return getSiteName();
}

export function getSiteDisplayName(): string {
  // Check if VITE_SITE_DISPLAY_NAME is set first
  if (import.meta.env.VITE_SITE_DISPLAY_NAME) {
    return import.meta.env.VITE_SITE_DISPLAY_NAME;
  }

  const siteName = getSiteName();
  // Convert domain name to display name (e.g., lookup.hivetalk.org -> HiveTalk)
  if (siteName.includes('.')) {
    const parts = siteName.split('.');
    const mainName = parts[0];
    // Capitalize and clean up the name
    return mainName.charAt(0).toUpperCase() + mainName.slice(1).replace(/[-_]/g, ' ');
  }
  return siteName.charAt(0).toUpperCase() + siteName.slice(1);
}

export function getSiteFullName(): string {
  const displayName = getSiteDisplayName();
  return displayName;
}

export function getPageTitle(pageTitle: string): string {
  const siteName = getSiteFullName();
  return `${pageTitle} | ${siteName}`;
}

type DescriptionContext = Record<string, string | number | undefined>;

export function getPageDescription(keyOrDescription: string, ctx?: DescriptionContext): string {
  const siteName = getSiteFullName();

  if (!ctx) {
    const description = keyOrDescription;
    return description.includes(siteName) ? description : `${description} on ${siteName}.`;
  }

  const templates: Record<string, (c: DescriptionContext) => string> = {
    app: ({ appName }) => `Discover features and supported kinds for ${appName}.`,
    repository: ({ repoName }) => `Explore repository ${repoName} and its issues and patches.`,
    'apps-by-tag': ({ tag }) => `Browse apps tagged with ${tag}.`,
    patch: ({ subject, authorName }) => `Patch "${subject}" by ${authorName}.`,
    kind: ({ kind }) => `Apps that support Nostr kind ${kind}.`,
    'official-nip': ({ title, nipNumber }) => `Official NIP-${nipNumber}: ${title}.`,
    'custom-nip': ({ title }) => `Custom NIP: ${title}.`,
    author: ({ name }) => `Apps and repos by ${name}.`,
    edit: () => `Edit details.`,
  };

  const template = templates[keyOrDescription];
  const base = template ? template(ctx) : keyOrDescription;
  return base.includes(siteName) ? base : `${base} on ${siteName}.`;
}
