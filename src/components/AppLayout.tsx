import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { Menu, X } from 'lucide-react';
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
  { title: 'Recipes', url: '/recipes' },
  { title: 'Ingredients', url: '/ingredients' },
  { title: 'Shopping List', url: '/shopping' },
  { title: 'Targets', url: '/settings' },
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
    <div className="min-h-screen flex flex-col">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 glass-subtle border-b border-white/30">
        <div className="flex items-center h-11 px-4 gap-1">
          {/* Brand */}
          <button 
            onClick={() => navigate('/')}
            className="flex items-center gap-2 mr-6 hover:opacity-80 transition-opacity"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="url(#leaf-grad)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <defs>
                <linearGradient id="leaf-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="rgba(0,188,125,1)" />
                  <stop offset="100%" stopColor="rgba(0,187,167,1)" />
                </linearGradient>
              </defs>
              <path d="M11 20A7 7 0 0 1 9.8 6.9C15.5 4.9 17 3.5 19 1c1 2 2 4.5 1 8-2 3-3 4.5-3 6.5 0 2-1 4-3 5.5" />
              <path d="M10 10c-2 5 .5 10 .5 10" />
            </svg>
            <span className="font-semibold text-base bg-gradient-to-r from-[hsl(160,100%,37%)] to-[hsl(174,100%,37%)] bg-clip-text text-transparent">WholeFuel</span>
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
                      ? 'text-white shadow-md'
                      : 'text-muted-foreground hover:text-foreground hover:bg-white/40'
                  )}
                  style={isActive(item.url) ? {
                    background: 'linear-gradient(135deg, rgba(0,188,125,1), rgba(0,187,167,1))',
                    boxShadow: '0 4px 12px rgba(0,188,125,0.3)',
                  } : undefined}
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
                  <button className="p-1.5 rounded-lg hover:bg-white/40 transition-colors">
                    <Menu className="h-5 w-5 text-foreground" />
                  </button>
                </DrawerTrigger>
                <DrawerContent
                  className="fixed inset-y-0 left-0 right-auto w-[260px] rounded-none rounded-r-2xl h-full"
                  style={{
                    background: 'rgba(255,255,255,0.85)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                  }}
                >
                  <DrawerTitle className="sr-only">Navigation</DrawerTitle>
                  <div className="flex flex-col h-full p-4">
                    {/* Close button */}
                    <div className="flex justify-end mb-4">
                      <DrawerClose asChild>
                        <button className="p-1.5 rounded-lg hover:bg-white/40 transition-colors">
                          <X className="h-5 w-5 text-muted-foreground" />
                        </button>
                      </DrawerClose>
                    </div>

                    {/* Nav Items */}
                    <nav className="flex flex-col gap-1 flex-1">
                      {navItems.map((item) => (
                        <button
                          key={item.title}
                          onClick={() => handleNavClick(item.url)}
                          className={cn(
                            'px-4 py-2.5 rounded-xl text-sm font-medium text-left transition-all',
                            isActive(item.url)
                              ? 'text-white shadow-md'
                              : 'text-muted-foreground hover:text-foreground hover:bg-white/40'
                          )}
                          style={isActive(item.url) ? {
                            background: 'linear-gradient(135deg, rgba(0,188,125,1), rgba(0,187,167,1))',
                            boxShadow: '0 4px 12px rgba(0,188,125,0.3)',
                          } : undefined}
                        >
                          {item.title}
                        </button>
                      ))}
                    </nav>

                    {/* Bottom actions */}
                    <div className="border-t border-white/30 pt-3 space-y-1">
                      <button
                        onClick={() => handleNavClick('/settings')}
                        className="w-full px-4 py-2.5 rounded-xl text-sm text-left text-muted-foreground hover:text-foreground hover:bg-white/40 transition-colors"
                      >
                        Settings
                      </button>
                      <button
                        onClick={() => { setDrawerOpen(false); handleSignOut(); }}
                        className="w-full px-4 py-2.5 rounded-xl text-sm text-left text-muted-foreground hover:text-destructive hover:bg-white/40 transition-colors"
                      >
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
      <main className="flex-1 overflow-auto relative">
        {/* Decorative gradient circles */}
        <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
          <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full blur-[64px]" style={{ background: 'linear-gradient(135deg, rgba(0,212,146,0.5), rgba(0,213,190,0.5))' }} />
          <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full blur-[64px]" style={{ background: 'linear-gradient(135deg, rgba(0,211,243,0.5), rgba(81,162,255,0.5))' }} />
          <div className="absolute top-1/3 right-1/4 w-72 h-72 rounded-full blur-[64px]" style={{ background: 'linear-gradient(135deg, rgba(0,213,190,0.4), rgba(0,212,146,0.4))' }} />
        </div>
        <div className="relative z-10">
          {children}
        </div>
      </main>
    </div>
  );
}
