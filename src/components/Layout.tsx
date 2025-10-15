import { ReactNode, useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Factory, MessageSquare, LayoutDashboard, LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Session } from "@supabase/supabase-js";
import { useIsMobile } from "@/hooks/use-mobile";

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [session, setSession] = useState<Session | null>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (!session && location.pathname !== "/auth") {
        navigate("/auth");
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session && location.pathname !== "/auth") {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, location.pathname]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Logout realizado",
      description: "Até logo!",
    });
    navigate("/auth");
  };

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background pb-20 md:pb-0 overflow-x-hidden">
      {/* Header - Compacto em mobile */}
      <nav className="bg-card border-b border-border shadow-soft sticky top-0 z-50 backdrop-blur-sm bg-card/95">
        <div className="container mx-auto px-3 md:px-4">
          <div className="flex items-center justify-between h-14 md:h-16">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-xl gradient-primary shadow-soft">
                <Factory className="w-4 h-4 md:w-5 md:h-5 text-primary-foreground" />
              </div>
              <span className="text-lg md:text-xl font-bold">Gestor Home</span>
            </div>

            {/* Desktop Navigation */}
            {!isMobile && (
              <div className="flex items-center gap-2">
                <Button
                  variant={location.pathname === "/" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => navigate("/")}
                  className="transition-smooth"
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Chat IA
                </Button>
                <Button
                  variant={location.pathname === "/kanban" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => navigate("/kanban")}
                  className="transition-smooth"
                >
                  <LayoutDashboard className="w-4 h-4 mr-2" />
                  Kanban
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSignOut}
                  className="transition-smooth text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sair
                </Button>
              </div>
            )}

            {/* Mobile - Only logout button */}
            {isMobile && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="transition-smooth text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-3 md:px-4 py-4 md:py-6 max-w-full">
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      {isMobile && (
        <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border shadow-strong z-50 backdrop-blur-sm bg-card/95">
          <div className="grid grid-cols-2 gap-1 p-2">
            <Button
              variant={location.pathname === "/" ? "default" : "ghost"}
              size="lg"
              onClick={() => navigate("/")}
              className="h-14 flex-col gap-1 transition-smooth"
            >
              <MessageSquare className="w-5 h-5" />
              <span className="text-xs">Chat IA</span>
            </Button>
            <Button
              variant={location.pathname === "/kanban" ? "default" : "ghost"}
              size="lg"
              onClick={() => navigate("/kanban")}
              className="h-14 flex-col gap-1 transition-smooth"
            >
              <LayoutDashboard className="w-5 h-5" />
              <span className="text-xs">Kanban</span>
            </Button>
          </div>
        </nav>
      )}
    </div>
  );
};

export default Layout;
