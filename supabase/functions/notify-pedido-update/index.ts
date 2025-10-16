import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PedidoUpdate {
  old_record: any;
  new_record: any;
  type: 'UPDATE' | 'INSERT';
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const payload: PedidoUpdate = await req.json();
    console.log('Received pedido update:', payload);

    const { old_record, new_record } = payload;
    const numeroPedido = new_record.numero_pedido || new_record.id;

    // Detectar qual campo mudou e criar mensagem apropriada
    let title = '';
    let body = '';
    let hasRelevantChange = false;

    if (old_record.insumos !== new_record.insumos && new_record.insumos) {
      title = `Pedido #${numeroPedido}`;
      body = 'Insumos foram pedidos! 📦';
      hasRelevantChange = true;
    } else if (old_record.em_producao !== new_record.em_producao && new_record.em_producao) {
      title = `Pedido #${numeroPedido}`;
      body = 'Entrou em produção! 🏭';
      hasRelevantChange = true;
    } else if (old_record.envio_expedicao !== new_record.envio_expedicao && new_record.envio_expedicao) {
      title = `Pedido #${numeroPedido}`;
      body = 'Enviado para expedição! 📮';
      hasRelevantChange = true;
    } else if (old_record.despachado !== new_record.despachado && new_record.despachado) {
      title = `Pedido #${numeroPedido}`;
      body = 'Foi despachado! 🚚';
      hasRelevantChange = true;
    } else if (old_record['nota/rastreio'] !== new_record['nota/rastreio'] && new_record['nota/rastreio']) {
      title = `Pedido #${numeroPedido}`;
      body = `Código de rastreio disponível: ${new_record['nota/rastreio']}`;
      hasRelevantChange = true;
    }

    if (!hasRelevantChange) {
      console.log('No relevant changes detected, skipping notification');
      return new Response(
        JSON.stringify({ message: 'No relevant changes' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    console.log(`Sending notification: ${title} - ${body}`);

    // Buscar todos os tokens ativos
    const { data: tokens, error: tokensError } = await supabase
      .from('notification_tokens')
      .select('token, user_id');

    if (tokensError) {
      console.error('Error fetching tokens:', tokensError);
      throw tokensError;
    }

    if (!tokens || tokens.length === 0) {
      console.log('No tokens found, skipping notification');
      return new Response(
        JSON.stringify({ message: 'No tokens to notify' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    console.log(`Found ${tokens.length} tokens to notify`);

    // Enviar notificação via FCM para cada token
    const FIREBASE_SERVER_KEY = Deno.env.get('FIREBASE_SERVER_KEY');
    if (!FIREBASE_SERVER_KEY) {
      throw new Error('FIREBASE_SERVER_KEY not configured');
    }

    const results = await Promise.all(
      tokens.map(async ({ token }) => {
        try {
          const response = await fetch('https://fcm.googleapis.com/fcm/send', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `key=${FIREBASE_SERVER_KEY}`,
            },
            body: JSON.stringify({
              to: token,
              notification: {
                title,
                body,
                icon: '/pwa-192x192.png',
                badge: '/favicon.ico',
              },
              data: {
                url: '/kanban',
                pedido_id: new_record.id,
                numero_pedido: numeroPedido,
              },
            }),
          });

          const result = await response.json();
          
          if (!response.ok) {
            console.error(`FCM error for token ${token.substring(0, 20)}:`, result);
            return { success: false, token, error: result };
          }

          console.log(`Notification sent successfully to token ${token.substring(0, 20)}`);
          return { success: true, token };
        } catch (error) {
          console.error(`Error sending to token ${token.substring(0, 20)}:`, error);
          return { success: false, token, error };
        }
      })
    );

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    console.log(`Notifications sent: ${successCount} success, ${failCount} failed`);

    // Remover tokens inválidos
    const invalidTokens = results
      .filter(r => !r.success && r.error?.error === 'InvalidRegistration')
      .map(r => r.token);

    if (invalidTokens.length > 0) {
      console.log(`Removing ${invalidTokens.length} invalid tokens`);
      await supabase
        .from('notification_tokens')
        .delete()
        .in('token', invalidTokens);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: successCount, 
        failed: failCount,
        message: `${title} - ${body}`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Error in notify-pedido-update:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
