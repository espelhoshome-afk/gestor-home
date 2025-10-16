import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getToken } from 'firebase/messaging';
import { getMessagingInstance, VAPID_KEY } from '@/lib/firebase';

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
      const messaging = getMessagingInstance();
      
      if (!messaging) {
        console.error('Firebase Messaging not supported');
        return;
      }

      // Registra o SW do Firebase com escopo dedicado para não interferir no SW do PWA
      console.log('Registering Firebase service worker...');
      const firebaseSwRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
        scope: '/firebase-push/'
      });

      // Aguarda a ativação do SW registrado
      await navigator.serviceWorker.ready;
      console.log('Firebase SW registered:', firebaseSwRegistration);
      
      // Agora obtém o token usando a registration do SW do Firebase
      const token = await getToken(messaging, { 
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: firebaseSwRegistration
      });
      
      if (!token) {
        console.error('No FCM token received');
        return;
      }

      console.log('FCM Token obtained:', token.substring(0, 20) + '...');
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.error('No user logged in');
        return;
      }

      // Save token to database
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
    } catch (error: any) {
      console.error('Error registering Firebase SW or getting token:', error?.code || error?.message || error);
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
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
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