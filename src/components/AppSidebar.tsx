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
      <SidebarHeader className="border-b py-2">
        <div className={cn(
          'flex items-center gap-2 px-2',
          isCollapsed && 'justify-center'
        )}>
          <div className="p-1.5 bg-primary rounded-lg shrink-0">
            <ChefHat className="h-4 w-4 text-primary-foreground" />
          </div>
          {!isCollapsed && (
            <h1 className="font-display font-bold text-sm text-foreground truncate">NutriPlan</h1>
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
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
