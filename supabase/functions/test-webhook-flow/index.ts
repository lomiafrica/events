/// <reference types="https://deno.land/x/deno/cli/tsc/dts/lib.deno.d.ts" />
/// <reference lib="deno.ns" />

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Initialize Supabase client
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const webhookSecret = Deno.env.get("LOMI_WEBHOOK_SECRET");
const webhookUrl =
  Deno.env.get("WEBHOOK_URL") || "https://www.djaoulient.com/api/lomi";

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error(
    "Missing required environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
  );
}

if (!webhookSecret) {
  console.warn(
    "LOMI_WEBHOOK_SECRET not set - webhook signature verification will fail",
  );
}

const supabase = createClient(supabaseUrl || "", supabaseServiceRoleKey || "");

// Helper function to generate HMAC signature
async function generateWebhookSignature(
  payload: string,
  secret: string,
): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload),
  );

  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 405,
    });
  }

  try {
    console.log("🧪 Starting webhook flow test...");
    console.log("📍 Environment check:");
    console.log(`  - SUPABASE_URL: ${supabaseUrl ? "✅ Set" : "❌ Missing"}`);
    console.log(
      `  - SUPABASE_SERVICE_ROLE_KEY: ${supabaseServiceRoleKey ? "✅ Set" : "❌ Missing"}`,
    );
    console.log(
      `  - LOMI_WEBHOOK_SECRET: ${webhookSecret ? "✅ Set" : "❌ Missing"}`,
    );
    console.log(`  - WEBHOOK_URL: ${webhookUrl}`);

    // Check if we should skip webhook call for testing
    const requestBody = await req.text();
    let skipWebhook = false;
    let testMode = "full_test";

    try {
      const body = JSON.parse(requestBody || "{}");
      skipWebhook = body.skipWebhook === true;
      testMode = body.testMode || "full_test";
    } catch {
      // Ignore JSON parse errors
    }

    // Step 1: Create a test customer using RPC
    const testEmail = "babacar@lomi.africa";

    console.log("📝 Creating test customer using RPC...");
    const { data: customerId, error: customerError } = await supabase.rpc(
      "upsert_customer",
      {
        p_name: "Babacar Diop",
        p_email: testEmail,
        p_phone: "+2250160223401",
        p_whatsapp: "+2250160223401", // Set WhatsApp same as phone
      },
    );

    if (customerError || !customerId) {
      console.error("❌ Failed to create customer:", customerError);
      return new Response(
        JSON.stringify({
          error: "Failed to create test customer",
          details: customerError,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        },
      );
    }

    console.log("✅ Test customer created:", customerId);

    // Step 2: Create a test purchase using RPC
    console.log("🎫 Creating test purchase using RPC...");

    const { data: purchaseId, error: purchaseError } = await supabase.rpc(
      "create_purchase",
      {
        p_customer_id: customerId,
        p_event_id: "test-event-123",
        p_event_title: "BÔRÔ DE DJAOULI 013",
        p_ticket_type_id: "test-ticket-456",
        p_ticket_name: "EARLY BIRD",
        p_quantity: 3,
        p_price_per_ticket: 5000,
        p_total_amount: 15000,
        p_currency_code: "XOF",
        p_event_date_text: "18 Juin 2025",
        p_event_time_text: "10:00 PM",
        p_event_venue_name: "ADOUMIN BEACH",
      },
    );

    if (purchaseError || !purchaseId) {
      console.error("❌ Failed to create purchase:", purchaseError);
      return new Response(
        JSON.stringify({
          error: "Failed to create test purchase",
          details: purchaseError,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        },
      );
    }

    console.log("✅ Test purchase created:", purchaseId);

    // Return early if in database-only test mode
    if (testMode === "database_only" || skipWebhook) {
      console.log("⏭️ Skipping webhook call (test mode: " + testMode + ")");
      return new Response(
        JSON.stringify({
          message: "✅ Test data created successfully (webhook skipped)!",
          testData: {
            purchaseId: purchaseId,
            customerId: customerId,
            email: testEmail,
            mode: testMode,
          },
          instructions: [
            "✅ Test customer created",
            "✅ Test purchase created",
            "⏭️ Webhook call skipped for testing",
            "📧 Email dispatch not triggered",
            "🔍 Check purchase in database: " + purchaseId,
          ],
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      );
    }

    // Check if webhook secret is available for full test
    if (!webhookSecret) {
      return new Response(
        JSON.stringify({
          error: "LOMI_WEBHOOK_SECRET not configured",
          message: "Cannot perform full webhook test without webhook secret",
          testData: {
            purchaseId: purchaseId,
            customerId: customerId,
            email: testEmail,
          },
          suggestion:
            'Use {"testMode": "database_only"} to test without webhook call',
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        },
      );
    }

    // Step 3: Create webhook payload
    const webhookPayload = {
      event: "PAYMENT_SUCCEEDED",
      data: {
        id: "chks_test_" + Date.now(),
        transaction_id: "txn_test_" + Date.now(),
        amount: 15000,
        currency_code: "XOF",
        status: "completed",
        metadata: {
          internal_purchase_id: purchaseId,
          event_id: "test-event-123",
          ticket_type_id: "test-ticket-456",
          customer_id: customerId,
          app_source: "djaouli_events_app_test",
        },
        customer_email: testEmail,
        customer_name: "Babacar Diop",
        gross_amount: 15000,
      },
    };

    // Step 4: Generate signature and send webhook
    const payloadString = JSON.stringify(webhookPayload);
    const signature = await generateWebhookSignature(
      payloadString,
      webhookSecret,
    );

    console.log("🚀 Sending webhook to:", webhookUrl);
    console.log("📦 Webhook payload:", JSON.stringify(webhookPayload, null, 2));

    const webhookResponse = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Lomi-Signature": signature,
      },
      body: payloadString,
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
            purchaseId: purchaseId,
            customerId: customerId,
            email: testEmail,
          },
          troubleshooting: {
            issue: "Webhook endpoint returned error",
            possibleCauses: [
              "Environment variables not set in Next.js deployment",
              "Webhook endpoint not properly deployed",
              "Network connectivity issues",
              "CORS or security headers blocking request",
            ],
            solutions: [
              "Check environment variables in Vercel dashboard",
              'Use {"testMode": "database_only"} to test without webhook',
              "Test webhook endpoint directly with curl",
            ],
          },
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        },
      );
    }

    // Success response
    return new Response(
      JSON.stringify({
        message: "✅ Webhook test completed successfully!",
        testData: {
          purchaseId: purchaseId,
          customerId: customerId,
          email: testEmail,
          webhookStatus: webhookResponse.status,
          webhookResponse: webhookResponseText,
        },
        instructions: [
          "✅ Test purchase created",
          "✅ Webhook sent successfully",
          "📧 Check your email at: " + testEmail,
          "🔍 Check purchase status in database",
          "📊 Monitor logs for email dispatch",
        ],
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    console.error("❌ Test failed:", error);
    let message = "Test execution failed";
    let details = String(error);

    if (error instanceof Error) {
      message = error.message;
      details = error.stack || error.message;
    }

    return new Response(
      JSON.stringify({
        error: message,
        details: details,
        troubleshooting: {
          commonIssues: [
            "Environment variables missing in target environment",
            "Network connectivity issues",
            "Database connection problems",
            "Webhook endpoint configuration issues",
          ],
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
});
