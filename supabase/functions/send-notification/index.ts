import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationRequest {
  userId?: string;
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: Record<string, any>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const firebaseServerKey = Deno.env.get('FIREBASE_SERVER_KEY');

    if (!firebaseServerKey) {
      throw new Error('FIREBASE_SERVER_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Verify user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { userId, title, body, icon, badge, data }: NotificationRequest = await req.json();

    // Get target user tokens (defaults to current user if userId not provided)
    const targetUserId = userId || user.id;
    
    const { data: tokens, error: tokensError } = await supabase
      .from('notification_tokens')
      .select('id, token')
      .eq('user_id', targetUserId);

    if (tokensError) {
      throw tokensError;
    }

    if (!tokens || tokens.length === 0) {
      console.log(`No tokens found for user ${targetUserId}`);
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: 'No tokens found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    console.log(`Sending notification to ${tokens.length} device(s)`);

    // Send notification to all user tokens with enhanced payload
    const results = await Promise.allSettled(
      tokens.map(async (tokenRecord) => {
        const response = await fetch('https://fcm.googleapis.com/fcm/send', {
          method: 'POST',
          headers: {
            'Authorization': `key=${firebaseServerKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: tokenRecord.token,
            notification: {
              title,
              body,
              icon: icon || '/pwa-192x192.png',
              badge: badge || '/favicon.ico',
            },
            data: data || {},
            webpush: {
              headers: {
                TTL: '86400'
              },
              notification: {
                title,
                body,
                icon: icon || '/pwa-192x192.png',
                badge: badge || '/favicon.ico',
              }
            }
          }),
        });
        
        const result = await response.json();
        console.log(`FCM response for token ${tokenRecord.token.substring(0, 20)}...:`, result);
        
        return { tokenRecord, result, response };
      })
    );

    // Clean up invalid tokens
    const invalidTokenIds: string[] = [];
    let successCount = 0;
    let failedCount = 0;

    for (const result of results) {
      if (result.status === 'fulfilled') {
        const { tokenRecord, result: fcmResult } = result.value;
        
        if (fcmResult.error === 'InvalidRegistration' || fcmResult.error === 'NotRegistered') {
          console.log(`Invalid token detected: ${tokenRecord.token.substring(0, 20)}...`);
          invalidTokenIds.push(tokenRecord.id);
          failedCount++;
        } else if (fcmResult.success === 1) {
          successCount++;
        } else {
          failedCount++;
        }
      } else {
        failedCount++;
      }
    }

    // Remove invalid tokens from database
    if (invalidTokenIds.length > 0) {
      console.log(`Removing ${invalidTokenIds.length} invalid token(s) from database`);
      await supabase
        .from('notification_tokens')
        .delete()
        .in('id', invalidTokenIds);
    }

    console.log(`Notifications sent: ${successCount} success, ${failedCount} failed`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: successCount,
        failed: failedCount,
        total: tokens.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error: any) {
    console.error('Error sending notification:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});