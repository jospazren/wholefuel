import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { Menu, X, LogOut, Settings } from 'lucide-react';
import {
  Drawer,
  DrawerContent,
  DrawerTrigger,
  DrawerClose,
  DrawerTitle,
} from '@/components/ui/drawer';

interface AppLayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { title: 'Meal Planner', url: '/' },
  { title: 'Shopping List', url: '/shopping' },
  { title: 'Targets', url: '/targets' },
  { title: 'Recipes', url: '/recipes' },
  { title: 'Ingredients', url: '/ingredients' },
];

export function AppLayout({ children }: AppLayoutProps) {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const isActive = (url: string) => {
    if (url === '/') return location.pathname === '/';
    return location.pathname.startsWith(url);
  };

  const handleNavClick = (url: string) => {
    navigate(url);
    setDrawerOpen(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="flex items-center h-12 px-4 gap-1">
          {/* Brand */}
          <button 
            onClick={() => navigate('/')}
            className="flex items-center gap-2 mr-6 hover:opacity-80 transition-opacity"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="hsl(174, 100%, 29%)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 20A7 7 0 0 1 9.8 6.9C15.5 4.9 17 3.5 19 1c1 2 2 4.5 1 8-2 3-3 4.5-3 6.5 0 2-1 4-3 5.5" />
              <path d="M10 10c-2 5 .5 10 .5 10" />
            </svg>
            <span className="font-semibold text-base text-primary">WholeFuel</span>
          </button>

          {/* Desktop Nav Tabs */}
          {!isMobile && (
            <nav className="flex items-center gap-0.5">
              {navItems.map((item) => (
                <button
                  key={item.title}
                  onClick={() => navigate(item.url)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-[13px] font-medium transition-all font-sans',
                    isActive(item.url)
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  )}
                >
                  {item.title}
                </button>
              ))}
            </nav>
          )}

          {/* Right side */}
          <div className="ml-auto flex items-center gap-3">
            {!isMobile && (
              <>
                <button
                  onClick={() => navigate('/settings')}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Settings
                </button>
                <button
                  onClick={handleSignOut}
                  className="text-sm text-muted-foreground hover:text-destructive transition-colors"
                >
                  Sign Out
                </button>
              </>
            )}

            {/* Mobile Hamburger */}
            {isMobile && (
              <Drawer open={drawerOpen} onOpenChange={setDrawerOpen} direction="left">
                <DrawerTrigger asChild>
                  <button className="p-1.5 rounded-lg hover:bg-accent transition-colors">
                    <Menu className="h-5 w-5 text-foreground" />
                  </button>
                </DrawerTrigger>
                <DrawerContent
                  className="fixed inset-y-0 left-0 right-auto w-[280px] rounded-none rounded-r-xl h-full bg-card border-r border-border"
                >
                  <DrawerTitle className="sr-only">Navigation</DrawerTitle>
                  <div className="flex flex-col h-full p-4">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                      <span className="font-semibold text-base text-primary">WholeFuel</span>
                      <DrawerClose asChild>
                        <button className="p-1.5 rounded-lg hover:bg-accent transition-colors">
                          <X className="h-5 w-5 text-muted-foreground" />
                        </button>
                      </DrawerClose>
                    </div>

                    {/* Nav Items */}
                    <nav className="flex flex-col gap-0.5 flex-1">
                      {navItems.map((item) => (
                        <button
                          key={item.title}
                          onClick={() => handleNavClick(item.url)}
                          className={cn(
                            'px-3 py-2.5 rounded-lg text-sm font-medium text-left transition-all',
                            isActive(item.url)
                              ? 'bg-primary/10 text-primary'
                              : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                          )}
                        >
                          {item.title}
                        </button>
                      ))}
                    </nav>

                    {/* Bottom actions */}
                    <div className="border-t border-border pt-3 space-y-0.5">
                      <button
                        onClick={() => handleNavClick('/settings')}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-left text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                      >
                        <Settings className="h-4 w-4" />
                        Settings
                      </button>
                      <button
                        onClick={() => { setDrawerOpen(false); handleSignOut(); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-left text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors"
                      >
                        <LogOut className="h-4 w-4" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                </DrawerContent>
              </Drawer>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-background">
        {children}
      </main>
    </div>
  );
}
