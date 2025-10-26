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

export function getPageDescription(description: string): string {
  const siteName = getSiteFullName();
  return description.includes(siteName) ? description : `${description} on ${siteName}.`;
}