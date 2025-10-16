import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useNotifications = () => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Check if notifications are supported
    const supported = 'Notification' in window && 'serviceWorker' in navigator;
    setIsSupported(supported);
    
    if (supported) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    if (!isSupported) {
      toast({
        title: "Não suportado",
        description: "Seu navegador não suporta notificações push.",
        variant: "destructive",
      });
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result === 'granted') {
        await registerServiceWorker();
        toast({
          title: "Notificações ativadas!",
          description: "Você receberá notificações sobre atualizações importantes.",
        });
        return true;
      } else {
        toast({
          title: "Permissão negada",
          description: "Você não receberá notificações.",
          variant: "destructive",
        });
        return false;
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      toast({
        title: "Erro",
        description: "Não foi possível ativar notificações.",
        variant: "destructive",
      });
      return false;
    }
  };

  const registerServiceWorker = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Get FCM token (you'll need to configure Firebase)
      // For now, we'll use a placeholder
      const token = `token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.error('No user logged in');
        return;
      }

      // Save token to database
      // Note: notification_tokens table will be created after running the SQL migration
      const { error } = await (supabase as any)
        .from('notification_tokens')
        .upsert({
          user_id: user.id,
          token,
          device_info: {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
          },
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'token'
        });

      if (error) {
        console.error('Error saving notification token:', error);
      } else {
        console.log('Notification token saved successfully');
      }
    } catch (error) {
      console.error('Error registering service worker:', error);
    }
  };

  const sendTestNotification = async () => {
    if (permission !== 'granted') {
      toast({
        title: "Permissão necessária",
        description: "Ative as notificações primeiro.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Não autenticado');
      }

      const { error } = await supabase.functions.invoke('send-notification', {
        body: {
          title: '🎉 Notificação de Teste',
          body: 'As notificações estão funcionando perfeitamente!',
          data: {
            url: '/',
          },
        },
      });

      if (error) throw error;

      toast({
        title: "Enviado!",
        description: "Verifique sua barra de notificações.",
      });
    } catch (error) {
      console.error('Error sending test notification:', error);
      toast({
        title: "Erro",
        description: "Não foi possível enviar a notificação de teste.",
        variant: "destructive",
      });
    }
  };

  return {
    permission,
    isSupported,
    requestPermission,
    sendTestNotification,
  };
};