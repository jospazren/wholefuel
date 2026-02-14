import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { Leaf } from 'lucide-react';

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
            <Leaf className="h-5 w-5 text-primary" strokeWidth={2.5} />
            <span className="font-semibold text-base text-primary">WholeFuel</span>
          </button>

          {/* Nav Tabs - text only */}
          <nav className="flex items-center gap-0.5">
            {navItems.map((item) => (
              <button
                key={item.title}
                onClick={() => navigate(item.url)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-sm font-medium transition-all',
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
          <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-gradient-to-br from-emerald-200 via-teal-200 to-cyan-200 blur-3xl opacity-40" />
          <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full bg-gradient-to-br from-teal-400/40 to-emerald-400/50 blur-3xl" />
          <div className="absolute top-1/3 right-1/4 w-72 h-72 rounded-full bg-gradient-to-br from-cyan-400/50 to-blue-400/50 blur-3xl" />
        </div>
        <div className="relative z-10">
          {children}
        </div>
      </main>
    </div>
  );
}
