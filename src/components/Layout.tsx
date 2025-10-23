import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LoginArea } from "@/components/auth/LoginArea";
import { Footer } from "@/components/Footer";
import { Plus, Zap, Menu, Smartphone, GitBranch, Moon, Sun, Bot } from "lucide-react";
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

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const isMobile = useIsMobile();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-background cyber-grid flex flex-col">
      <header className="glass border-b border-white/10 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2 sm:space-x-3 group flex-shrink-0">
            <div className="relative">
              <Zap className="h-6 w-6 sm:h-8 sm:w-8 text-accent transition-colors duration-300" />
              <div className="absolute inset-0 bg-accent/20 rounded-full blur-xl group-hover:bg-primary/20 transition-colors duration-300"></div>
            </div>
            <div className="flex flex-col">
              <span className="text-lg sm:text-xl font-bold gradient-text">NostrHub</span>
            </div>
          </Link>
          
          {/* Desktop Navigation */}
          {!isMobile && (
            <nav className="flex items-center space-x-2">
              <Button variant="ghost" asChild className="text-foreground hover:bg-primary/10 hover:text-primary transition-all duration-300">
                <Link to="/nips">
                  <Zap className="h-4 w-4 mr-2" />
                  NIPs
                </Link>
              </Button>
              <Button variant="ghost" asChild className="text-foreground hover:bg-primary/10 hover:text-primary transition-all duration-300">
                <Link to="/apps">
                  <Smartphone className="h-4 w-4 mr-2" />
                  Apps
                </Link>
              </Button>
              <Button variant="ghost" asChild className="text-foreground hover:bg-primary/10 hover:text-primary transition-all duration-300">
                <Link to="/repositories">
                  <GitBranch className="h-4 w-4 mr-2" />
                  Repositories
                </Link>
              </Button>
              <Button variant="ghost" asChild className="text-foreground hover:bg-primary/10 hover:text-primary transition-all duration-300">
                <Link to="/dvm">
                  <Bot className="h-4 w-4 mr-2" />
                  DVM
                </Link>
              </Button>
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
                    <SheetTitle className="gradient-text">Navigation</SheetTitle>
                  </SheetHeader>
                  <div className="flex flex-col space-y-6 mt-6">
                    {/* Navigation Links */}
                    <nav className="flex flex-col space-y-4">
                      <Button variant="ghost" asChild className="justify-start text-foreground hover:bg-primary/10 hover:text-primary transition-all duration-300">
                        <Link to="/nips">
                          <Zap className="h-4 w-4 mr-3" />
                          NIPs
                        </Link>
                      </Button>
                      <Button variant="ghost" asChild className="justify-start text-foreground hover:bg-primary/10 hover:text-primary transition-all duration-300">
                        <Link to="/create">
                          <Plus className="h-4 w-4 mr-3" />
                          Create NIP
                        </Link>
                      </Button>
                      <Button variant="ghost" asChild className="justify-start text-foreground hover:bg-primary/10 hover:text-primary transition-all duration-300">
                        <Link to="/apps">
                          <Smartphone className="h-4 w-4 mr-3" />
                          Apps
                        </Link>
                      </Button>
                      <Button variant="ghost" asChild className="justify-start text-foreground hover:bg-primary/10 hover:text-primary transition-all duration-300">
                        <Link to="/repositories">
                          <GitBranch className="h-4 w-4 mr-3" />
                          Repositories
                        </Link>
                      </Button>
                      <Button variant="ghost" asChild className="justify-start text-foreground hover:bg-primary/10 hover:text-primary transition-all duration-300">
                        <Link to="/dvm">
                          <Bot className="h-4 w-4 mr-3" />
                          DVM Marketplace
                        </Link>
                      </Button>
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
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none"></div>
        <div className="container px-0 sm:px-4 py-4 sm:py-8 relative z-10 min-w-0">
          {children}
        </div>
      </main>
      
      <Footer />
      
      {/* Floating particles effect */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-primary/30 rounded-full float"></div>
        <div className="absolute top-3/4 right-1/4 w-1 h-1 bg-accent/40 rounded-full float" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/2 left-3/4 w-1.5 h-1.5 bg-primary/20 rounded-full float" style={{ animationDelay: '4s' }}></div>
        <div className="absolute top-1/3 right-1/3 w-1 h-1 bg-accent/30 rounded-full float" style={{ animationDelay: '1s' }}></div>
      </div>
    </div>
  );
}