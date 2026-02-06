import { CalendarDays, UtensilsCrossed, Apple, ShoppingCart, Settings, LogOut, Leaf } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

const navItems = [
  { title: 'Meal Planner', url: '/', icon: CalendarDays },
  { title: 'Recipes', url: '/recipes', icon: UtensilsCrossed },
  { title: 'Ingredients', url: '/ingredients', icon: Apple },
  { title: 'Shopping List', url: '/shopping', icon: ShoppingCart },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const isCollapsed = state === 'collapsed';

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-border/60">
      <SidebarHeader className="border-b border-border/60 h-14 flex items-center justify-center">
        <div className={cn(
          'flex items-center gap-2.5 px-2',
          isCollapsed && 'justify-center'
        )}>
          <Leaf className="h-5 w-5 text-primary shrink-0" strokeWidth={1.5} />
          {!isCollapsed && (
            <h1 className="font-serif font-medium text-lg tracking-tight text-foreground">Whole</h1>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="py-1">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title} className="h-8">
                    <NavLink 
                      to={item.url} 
                      end={item.url === '/'}
                      className="hover:bg-muted/50 text-xs" 
                      activeClassName="bg-primary/10 text-primary font-medium"
                    >
                      <item.icon className="h-3.5 w-3.5" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t py-1">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Settings" className="h-8">
              <NavLink 
                to="/settings" 
                className="hover:bg-muted/50 text-xs" 
                activeClassName="bg-primary/10 text-primary font-medium"
              >
                <Settings className="h-3.5 w-3.5" />
                <span>Settings</span>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton 
              tooltip="Sign Out" 
              className="h-8 hover:bg-destructive/10 hover:text-destructive text-xs"
              onClick={handleSignOut}
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Sign Out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
