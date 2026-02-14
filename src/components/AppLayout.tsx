import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';


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

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const isActive = (url: string) => {
    if (url === '/') return location.pathname === '/';
    return location.pathname.startsWith(url);
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

          {/* Nav Tabs - text only */}
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

          {/* Right side */}
          <div className="ml-auto flex items-center gap-3">
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
