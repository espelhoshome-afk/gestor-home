import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import { onMessage } from "firebase/messaging";
import { getMessagingInstance } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import Home from "./pages/Home";
import Auth from "./pages/Auth";
import Kanban from "./pages/Kanban";
import NotFound from "./pages/NotFound";
import InstallPWA from "./components/InstallPWA";
import { NotificationPrompt } from "./components/NotificationPrompt";

const queryClient = new QueryClient();

const App = () => {
  const { toast } = useToast();

  useEffect(() => {
    const messaging = getMessagingInstance();
    if (!messaging) return;

    const unsubscribe = onMessage(messaging, (payload) => {
      console.log('Foreground message received:', payload);
      
      toast({
        title: payload.notification?.title || 'Nova Notificação',
        description: payload.notification?.body || '',
      });
      
      // Show native notification even when app is open
      if (Notification.permission === 'granted') {
        new Notification(payload.notification?.title || 'Nova Notificação', {
          body: payload.notification?.body || '',
          icon: '/pwa-192x192.png',
          data: payload.data
        });
      }
    });

    return () => unsubscribe();
  }, [toast]);

  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <InstallPWA />
      <NotificationPrompt />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/kanban" element={<Kanban />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
