import { CalendarDays, UtensilsCrossed, Apple, ShoppingCart, Settings } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import { ChefHat } from 'lucide-react';

const navItems = [
  { title: 'Meal Planner', url: '/', icon: CalendarDays },
  { title: 'Recipes', url: '/recipes', icon: UtensilsCrossed },
  { title: 'Ingredients', url: '/ingredients', icon: Apple },
  { title: 'Shopping List', url: '/shopping', icon: ShoppingCart },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader className="border-b">
        <div className={cn(
          'flex items-center gap-3 px-2 py-3',
          isCollapsed && 'justify-center'
        )}>
          <div className="p-2 bg-primary rounded-xl shadow-glow shrink-0">
            <ChefHat className="h-5 w-5 text-primary-foreground" />
          </div>
          {!isCollapsed && (
            <div className="min-w-0">
              <h1 className="font-display font-bold text-lg text-foreground truncate">NutriPlan</h1>
              <p className="text-[10px] text-muted-foreground truncate">Meal Planning Made Simple</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink 
                      to={item.url} 
                      end={item.url === '/'}
                      className="hover:bg-muted/50" 
                      activeClassName="bg-primary/10 text-primary font-medium"
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Settings">
              <NavLink 
                to="/settings" 
                className="hover:bg-muted/50" 
                activeClassName="bg-primary/10 text-primary font-medium"
              >
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
