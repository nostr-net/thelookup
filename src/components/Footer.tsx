import { ExternalLink } from "lucide-react";
import { getSiteFullName } from '@/lib/siteConfig';

export function Footer() {
  return (
    <footer className="glass border-t border-white/10 mt-auto">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col items-center justify-center gap-4">
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 sm:gap-x-6 text-sm">
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors duration-300"
            >
              {getSiteFullName()}
            </a>
            <a
              href="https://nostrbook.dev/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors duration-300"
            >
              Nostrbook
              <ExternalLink className="h-3 w-3" />
            </a>
            <a href="https://nostrhub.io/naddr1qvzqqqrcvypzqprpljlvcnpnw3pejvkkhrc3y6wvmd7vjuad0fg2ud3dky66gaxaqqxku6tswvkk7m3ddehhxarjqk4nmy"
              className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors duration-300"
              target="_blank"
              rel="noopener noreferrer"
            >
              NostrHub Spec 
             <ExternalLink className="h-3 w-3" />
            </a>
            <a
              href="https://github.com/bitkarrot/thelookup"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors duration-300"
            >
              Source Code
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}