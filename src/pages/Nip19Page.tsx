import { useParams } from 'react-router-dom';
import { nip19 } from 'nostr-tools';
import { useSeoMeta } from '@unhead/react';
import { getPageTitle, getPageDescription } from '@/lib/siteConfig';

import NipPage from './NipPage';
import AuthorPage from './AuthorPage';
import NotFound from './NotFound';
import RepositoryPage from './RepositoryPage';
import EventPage from './EventPage';
import AppDetailPage from './AppDetailPage';

export default function Nip19Page() {
  const { nip19: nip19Param } = useParams<{ nip19: string }>();
  
  useSeoMeta({
    title: getPageTitle('Nostr Content'),
    description: getPageDescription('nip19'),
  });
  
  if (!nip19Param) {
    return <NotFound />;
  }

  // Check if it's an official NIP (2-character hex string)
  const isOfficialNip = /^[0-9A-F]{2}$/i.test(nip19Param);
  
  if (isOfficialNip) {
    // It's an official NIP, render directly
    return <NipPage nipId={nip19Param} isOfficialNip={true} />;
  }

  // Try to decode as nip19
  try {
    const decoded = nip19.decode(nip19Param);
    
    // Check if it's a supported nip19 type
    if (decoded.type === 'naddr') {
      switch (decoded.data.kind) {
        case 30817:
          return <NipPage nipId={nip19Param} isOfficialNip={false} />;
        case 30617:
          return <RepositoryPage />;
        case 31990:
          return <AppDetailPage />;
        default:
          // Generic addressable event viewer
          return <EventPage nip19={nip19Param} />;
      }
    } else if (decoded.type === 'nevent' || decoded.type === 'note') {
      // Generic event viewer for regular events
      return <EventPage nip19={nip19Param} />;
    } else if (decoded.type === 'npub' || decoded.type === 'nprofile') {
      // Author page for npub and nprofile identifiers
      return <AuthorPage />;
    } else {
      // Unsupported nip19 type, fall through to 404
      return <NotFound />;
    }
  } catch {
    // Not a valid nip19 identifier, fall through to 404
    return <NotFound />;
  }
}