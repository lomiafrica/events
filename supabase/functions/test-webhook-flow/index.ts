/// <reference types="https://deno.land/x/deno/cli/tsc/dts/lib.deno.d.ts" />
/// <reference lib="deno.ns" />

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Initialize Supabase client
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const webhookSecret = Deno.env.get("LOMI_WEBHOOK_SECRET");
const webhookUrl = Deno.env.get("WEBHOOK_URL") || "https://djaoulient.com/api/lomi/webhook";

if (!supabaseUrl || !supabaseServiceRoleKey || !webhookSecret) {
  console.error("Missing required environment variables");
}

const supabase = createClient(supabaseUrl || "", supabaseServiceRoleKey || "");

// Helper function to generate HMAC signature
async function generateWebhookSignature(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload)
  );
  
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 405 }
    );
  }

  try {
    console.log("🧪 Starting webhook flow test...");

    // Step 1: Create a test customer
    const testEmail = "babacar@lomi.africa";
    
    console.log("📝 Creating test customer...");
    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .upsert({
        name: "Babacar Test",
        email: testEmail,
        phone: "+221781234567"
      }, {
        onConflict: "email"
      })
      .select("id")
      .single();

    if (customerError || !customer) {
      console.error("❌ Failed to create customer:", customerError);
      return new Response(
        JSON.stringify({ error: "Failed to create test customer" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    console.log("✅ Test customer created:", customer.id);

    // Step 2: Create a test purchase
    const testPurchaseId = crypto.randomUUID();
    console.log("🎫 Creating test purchase...");
    
    const { data: purchase, error: purchaseError } = await supabase
      .from("purchases")
      .insert({
        id: testPurchaseId,
        customer_id: customer.id,
        event_id: "test-event-123",
        event_title: "Test Concert - Webhook Demo",
        ticket_type_id: "test-ticket-456",
        ticket_name: "VIP Test Ticket",
        quantity: 1,
        price_per_ticket: 5000,
        total_amount: 5000,
        currency_code: "XOF",
        status: "pending_payment",
        event_date_text: "25 December 2024",
        event_time_text: "8:00 PM",
        event_venue_name: "Test Venue Hall"
      })
      .select("id")
      .single();

    if (purchaseError || !purchase) {
      console.error("❌ Failed to create purchase:", purchaseError);
      return new Response(
        JSON.stringify({ error: "Failed to create test purchase" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    console.log("✅ Test purchase created:", testPurchaseId);

    // Step 3: Create webhook payload
    const webhookPayload = {
      event: 'payment.succeeded',
      data: {
        id: 'chks_test_' + Date.now(),
        transaction_id: 'txn_test_' + Date.now(),
        amount: 5000,
        currency_code: 'XOF',
        status: 'completed',
        metadata: {
          internal_purchase_id: testPurchaseId,
          event_id: 'test-event-123',
          ticket_type_id: 'test-ticket-456',
          customer_id: customer.id,
          app_source: "djaouli_events_app_test"
        },
        customer_email: testEmail,
        customer_name: 'Babacar Test',
        gross_amount: 5000
      }
    };

    // Step 4: Generate signature and send webhook
    const payloadString = JSON.stringify(webhookPayload);
    const signature = await generateWebhookSignature(payloadString, webhookSecret || "");

    console.log("🚀 Sending webhook to:", webhookUrl);
    console.log("📦 Webhook payload:", JSON.stringify(webhookPayload, null, 2));

    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Lomi-Signature': signature
      },
      body: payloadString
    });

    const webhookResponseText = await webhookResponse.text();
    console.log(`📨 Webhook response status: ${webhookResponse.status}`);
    console.log(`📝 Webhook response body:`, webhookResponseText);

    if (!webhookResponse.ok) {
      return new Response(
        JSON.stringify({
          error: "Webhook failed",
          status: webhookResponse.status,
          response: webhookResponseText,
          testData: {
            purchaseId: testPurchaseId,
            customerId: customer.id,
            email: testEmail
          }
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    // Success response
    return new Response(
      JSON.stringify({
        message: "✅ Webhook test completed successfully!",
        testData: {
          purchaseId: testPurchaseId,
          customerId: customer.id,
          email: testEmail,
          webhookStatus: webhookResponse.status,
          webhookResponse: webhookResponseText
        },
        instructions: [
          "✅ Test purchase created",
          "✅ Webhook sent successfully", 
          "📧 Check your email at: " + testEmail,
          "🔍 Check purchase status in database",
          "📊 Monitor logs for email dispatch"
        ]
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error) {
    console.error("❌ Test failed:", error);
    let message = "Test execution failed";
    if (error instanceof Error) {
      message = error.message;
    }
    return new Response(
      JSON.stringify({ error: message, details: String(error) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
}); 