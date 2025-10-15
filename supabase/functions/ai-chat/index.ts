import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message } = await req.json();

    if (!message) {
      throw new Error("Message is required");
    }

    console.log("Sending message to N8N webhook:", message);

    // Call the N8N webhook
    const webhookUrl = "https://n8n.lrv.api.br/webhook/1c804baf-5153-4b5f-a3ec-c85fece152f6";
    
    const webhookResponse = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: message,
        timestamp: new Date().toISOString(),
      }),
    });

    if (!webhookResponse.ok) {
      console.error("Webhook error:", webhookResponse.status, await webhookResponse.text());
      throw new Error("Failed to get response from AI webhook");
    }

    const webhookData = await webhookResponse.json();
    console.log("Received response from N8N:", webhookData);

    // Extract the response from the webhook data
    // Adjust this based on the actual response structure from your N8N webhook
    const aiResponse = webhookData.response || webhookData.message || "Recebi sua mensagem!";

    return new Response(
      JSON.stringify({ response: aiResponse }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in ai-chat function:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error occurred",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
