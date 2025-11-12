import { Link } from "react-router-dom";
//import { ThemeTest } from "@/components/theme-test";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { Button } from "@/components/ui/button";
import { LoginArea } from "@/components/auth/LoginArea";
import { Footer } from "@/components/Footer";
import { Plus, Zap, Menu, Smartphone, GitBranch, Moon, Sun, Globe, Bot } from "lucide-react";
import { useIsMobile } from "@/hooks/useIsMobile";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { RelaySelector } from "@/components/RelaySelector";
import { Separator } from "@/components/ui/separator";
import { useTheme } from "@/components/AppProvider";
import { getSiteFullName } from "@/lib/siteConfig";
import nostrichLight from '/light_nostrich.png';
import nostrichDark from '/nostrich.png';

interface LayoutProps {
  children: React.ReactNode;
}

// Navigation configuration
interface NavSection {
  id: string;
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  special?: boolean; // For special styling like "Create NIP"
}

const ALL_SECTIONS: NavSection[] = [
  { id: 'resources', path: '/resources', label: 'Resources', icon: Globe },
  { id: 'nips', path: '/nips', label: 'NIPs', icon: Zap },
  { id: 'apps', path: '/apps', label: 'Apps', icon: Smartphone },
  { id: 'repositories', path: '/repositories', label: 'Repositories', icon: GitBranch },
  { id: 'dvm', path: '/dvm', label: 'DVM', icon: Bot },
];

// Get visible sections based on environment configuration
function getVisibleSections(): NavSection[] {
  const sectionsConfig = import.meta.env.VITE_SECTIONS;
  
  if (!sectionsConfig || sectionsConfig.trim() === '') {
    // Show all sections by default
    return ALL_SECTIONS;
  }
  
  const enabledSections = sectionsConfig
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);
  
  return ALL_SECTIONS.filter(section => enabledSections.includes(section.id));
}

export function Layout({ children }: LayoutProps) {
  const isMobile = useIsMobile();
  const { theme, toggleTheme } = useTheme();
  const visibleSections = getVisibleSections();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex flex-col">
      {/* Temporary theme test - remove this after confirming theme works */}
      {/* <ThemeTest /> */}

      {/* <header className="glass border-b border-white/10 sticky top-0 z-50"> */}
      <header className="border-b border-white/10 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2 sm:space-x-3 group flex-shrink-0">
            <div className="relative">
              <img
                src={theme === 'dark' ? nostrichLight : nostrichDark}
                alt="Nostrich"
                className={`h-6 w-6 sm:h-8 sm:w-8 transition-all duration-300 relative z-10 ${theme === 'light' ? 'brightness-75 contrast-125' : ''}`}
              />
              <div className="absolute inset-0 bg-accent/20 rounded-full blur-xl group-hover:bg-primary/20 transition-colors duration-300"></div>
            </div>
            <div className="flex flex-col">
              <span className="text-lg sm:text-xl font-bold title-accent">{getSiteFullName()}</span>
            </div>
          </Link>
          
          {/* Desktop Navigation */}
          {!isMobile && (
            <nav className="flex items-center space-x-2">
              {visibleSections.map((section) => {
                const IconComponent = section.icon;
                return (
                  <Button 
                    key={section.id}
                    variant="ghost" 
                    asChild 
                    className="text-foreground hover:bg-primary/10 hover:text-primary transition-all duration-300"
                  >
                    <Link to={section.path}>
                      <IconComponent className="h-4 w-4 mr-2" />
                      {section.label}
                    </Link>
                  </Button>
                );
              })}
              <div className="ml-4 flex">
                <LoginArea />
              </div>
            </nav>
          )}

          {/* Mobile Navigation */}
          {isMobile && (
            <div className="flex items-center space-x-2">
              <div className="flex-shrink-0">
                <LoginArea />
              </div>
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-foreground hover:bg-primary/10 hover:text-primary transition-all duration-300">
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Open menu</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[280px] sm:w-[400px] glass border-primary/20">
                  <SheetHeader>
                    <SheetTitle className="title-accent">Navigation</SheetTitle>
                  </SheetHeader>
                  <div className="flex flex-col space-y-6 mt-6">
                    {/* Navigation Links */}
                    <nav className="flex flex-col space-y-4">
                      {visibleSections.map((section) => {
                        const IconComponent = section.icon;
                        return (
                          <Button 
                            key={section.id}
                            variant="ghost" 
                            asChild 
                            className="justify-start text-foreground hover:bg-primary/10 hover:text-primary transition-all duration-300"
                          >
                            <Link to={section.path}>
                              <IconComponent className="h-4 w-4 mr-3" />
                              {section.label}
                            </Link>
                          </Button>
                        );
                      })}
                      
                      {/* Special Create NIP button - always show if NIPs section is visible */}
                      {visibleSections.some(s => s.id === 'nips') && (
                        <Button variant="ghost" asChild className="justify-start bg-purple-600/10 hover:bg-purple-600/20 text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-all duration-300">
                          <Link to="/create">
                            <Plus className="h-4 w-4 mr-3" />
                            Create NIP
                          </Link>
                        </Button>
                      )}
                    </nav>

                    <Separator />

                    {/* Theme Switcher */}
                    <div className="space-y-3">
                      <h3 className="text-sm font-medium text-muted-foreground">Theme</h3>
                      <Button
                        variant="ghost"
                        onClick={toggleTheme}
                        className="justify-start w-full text-foreground hover:bg-primary/10 hover:text-primary transition-all duration-300"
                      >
                        {theme === 'light' ? (
                          <Moon className="h-4 w-4 mr-3" />
                        ) : (
                          <Sun className="h-4 w-4 mr-3" />
                        )}
                        Switch to {theme === 'light' ? 'dark' : 'light'} theme
                      </Button>
                    </div>

                    <Separator />

                    {/* Relay Selector */}
                    <div className="space-y-3">
                      <h3 className="text-sm font-medium text-muted-foreground">Relay</h3>
                      <RelaySelector className="w-full" />
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          )}
        </div>
      </header>
      
      <main className="relative flex-1">
        {/* <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none"></div> */}
        <div className="absolute inset-0 from-primary/5 via-transparent to-accent/5 pointer-events-none"></div>

        <div className="container px-0 sm:px-4 py-4 sm:py-8 relative z-10 min-w-0">
          {children}
        </div>
      </main>
      
      <Footer />
      
      {/* Floating particles effect */}
      {/* <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-primary/30 rounded-full float"></div>
        <div className="absolute top-3/4 right-1/4 w-1 h-1 bg-accent/40 rounded-full float" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/2 left-3/4 w-1.5 h-1.5 bg-primary/20 rounded-full float" style={{ animationDelay: '4s' }}></div>
        <div className="absolute top-1/3 right-1/3 w-1 h-1 bg-accent/30 rounded-full float" style={{ animationDelay: '1s' }}></div>
      </div> */}
    </div>
  );
}