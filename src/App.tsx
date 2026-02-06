import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { MealPlanProvider } from "@/contexts/MealPlanContext";
import { useAuth } from "@/hooks/useAuth";
import Index from "./pages/Index";
import RecipesPage from "./pages/RecipesPage";
import IngredientsPage from "./pages/IngredientsPage";
import ShoppingPage from "./pages/ShoppingPage";
import SettingsPage from "./pages/SettingsPage";
import AuthPage from "./pages/AuthPage";
import NotFound from "./pages/NotFound";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}

function AuthRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/auth" element={<AuthRoute><AuthPage /></AuthRoute>} />
      <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
      <Route path="/recipes" element={<ProtectedRoute><RecipesPage /></ProtectedRoute>} />
      <Route path="/ingredients" element={<ProtectedRoute><IngredientsPage /></ProtectedRoute>} />
      <Route path="/shopping" element={<ProtectedRoute><ShoppingPage /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        <MealPlanProvider>
          <Toaster />
          <Sonner />
          <AppRoutes />
        </MealPlanProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
