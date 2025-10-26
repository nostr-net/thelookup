import { createRoot } from 'react-dom/client';

// Import polyfills first
import './lib/polyfills.ts';

import App from './App.tsx';
import './index.css';
import { getSiteName } from './lib/siteConfig';

// Client-side redirect from nostrnips.com and nostrproto.com to configured site
if (window.location.hostname === 'nostrnips.com' || window.location.hostname === 'nostrproto.com') {
  const siteName = getSiteName();
  const newUrl = window.location.href.replace(window.location.hostname, siteName);
  window.location.replace(newUrl);
}

createRoot(document.getElementById("root")!).render(<App />);
