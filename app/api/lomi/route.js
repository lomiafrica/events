import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import { Buffer } from "node:buffer";

// --- Helper: Verify Lomi Webhook Signature ---
async function verifyLomiWebhook(rawBody, signatureHeader, webhookSecret) {
  if (!signatureHeader) {
    throw new Error("Missing Lomi signature header (X-Lomi-Signature).");
  }
  if (!webhookSecret) {
    console.error("LOMI_WEBHOOK_SECRET is not set. Cannot verify webhook.");
    throw new Error("Webhook secret not configured internally.");
  }
  const expectedSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(rawBody)
    .digest("hex");
  const sigBuffer = Buffer.from(signatureHeader);
  const expectedSigBuffer = Buffer.from(expectedSignature);
  if (
    sigBuffer.length !== expectedSigBuffer.length ||
    !crypto.timingSafeEqual(sigBuffer, expectedSigBuffer)
  ) {
    throw new Error("Lomi webhook signature mismatch.");
  }
  return JSON.parse(rawBody.toString("utf8"));
}

// --- POST Handler for App Router ---
export async function POST(request) {
  console.log(
    "🚀 Events Webhook: Received request at",
    new Date().toISOString(),
  );
  console.log(
    "📧 Request headers:",
    Object.fromEntries(request.headers.entries()),
  );

  // --- Environment Variables (moved inside function) ---
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const lomiWebhookSecret = process.env.LOMI_WEBHOOK_SECRET;

  console.log("🔧 Environment check:");
  console.log(`  - SUPABASE_URL: ${supabaseUrl ? "✅ Set" : "❌ Missing"}`);
  console.log(
    `  - SUPABASE_SERVICE_ROLE_KEY: ${supabaseServiceKey ? "✅ Set" : "❌ Missing"}`,
  );
  console.log(
    `  - LOMI_WEBHOOK_SECRET: ${lomiWebhookSecret ? "✅ Set" : "❌ Missing"}`,
  );

  // Check for required environment variables
  if (!supabaseUrl || !supabaseServiceKey || !lomiWebhookSecret) {
    console.error(
      "Events Webhook: Missing critical environment variables. Check SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, LOMI_WEBHOOK_SECRET.",
    );
    return new Response(
      JSON.stringify({ error: "Missing required environment variables" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  // Initialize Supabase client inside the function
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Read the raw body
  let rawBody;
  try {
    rawBody = await request.text();
  } catch (bodyError) {
    console.error("Events Webhook: Error reading request body:", bodyError);
    return new Response(
      JSON.stringify({ error: "Failed to read request body" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const signature = request.headers.get("x-lomi-signature");
  let eventPayload;

  try {
    eventPayload = await verifyLomiWebhook(
      rawBody,
      signature,
      lomiWebhookSecret,
    );
    console.log(
      "Events Webhook: Lomi event verified:",
      eventPayload?.event || "Event type missing",
    );
  } catch (err) {
    console.error(
      "Events Webhook: Lomi signature verification failed:",
      err.message,
    );
    return new Response(
      JSON.stringify({ error: `Webhook verification failed: ${err.message}` }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  // --- Event Processing ---
  try {
    const lomiEventType = eventPayload?.event;
    const eventData = eventPayload?.data;

    if (!lomiEventType || !eventData) {
      console.warn(
        "Events Webhook: Event type or data missing in Lomi payload.",
        eventPayload,
      );
      return new Response(
        JSON.stringify({ error: "Event type or data missing." }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    console.log("Events Webhook: Received Lomi event type:", lomiEventType);
    console.log(
      "Events Webhook: Full event payload:",
      JSON.stringify(eventPayload, null, 2),
    );

    // Assuming Lomi sends metadata.internal_purchase_id as set in create-lomi-checkout-session
    const purchaseId = eventData.metadata?.internal_purchase_id;
    const lomiTransactionId = eventData.transaction_id || eventData.id; // Transaction ID

    // For checkout.completed events, eventData.id is the checkout session ID
    // For payment.succeeded events, we need to get checkout session ID from metadata.linkId
    let lomiCheckoutSessionId;
    if (
      lomiEventType === "checkout.completed" ||
      lomiEventType === "CHECKOUT_COMPLETED"
    ) {
      lomiCheckoutSessionId = eventData.id; // Checkout session ID for checkout events
    } else {
      lomiCheckoutSessionId = eventData.metadata?.linkId || eventData.id; // Get from metadata for payment events
    }
    const amount = eventData.amount || eventData.gross_amount; // Amount from Lomi
    const currency = eventData.currency_code;

    if (!purchaseId) {
      console.error(
        "Events Webhook Error: Missing internal_purchase_id in Lomi webhook metadata.",
        { lomiEventData: eventData },
      );
      return new Response(
        JSON.stringify({
          error: "Missing internal_purchase_id in Lomi webhook metadata.",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    let paymentStatusForDb = "unknown";
    if (
      lomiEventType === "checkout.completed" ||
      lomiEventType === "CHECKOUT_COMPLETED"
    ) {
      // Check if checkout_session.status is 'paid' or similar if Lomi provides it.
      // For now, assuming completion means payment for simplicity, adjust if Lomi has distinct paid status on checkout object.
      paymentStatusForDb = "paid"; // Or derive from eventData.status if available
    } else if (
      lomiEventType === "payment.succeeded" ||
      lomiEventType === "PAYMENT_SUCCEEDED"
    ) {
      paymentStatusForDb = "paid";
    } else if (
      lomiEventType === "payment.failed" ||
      lomiEventType === "PAYMENT_FAILED"
    ) {
      paymentStatusForDb = "payment_failed";
    } else {
      console.log(
        "Events Webhook: Lomi event type not handled for direct payment status update:",
        lomiEventType,
      );
      return new Response(
        JSON.stringify({
          received: true,
          message: "Webhook event type not handled for payment update.",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // 1. Record Payment Outcome
    const { error: rpcError } = await supabase.rpc(
      "record_event_lomi_payment",
      {
        p_purchase_id: purchaseId,
        p_lomi_payment_id: lomiTransactionId,
        p_lomi_checkout_session_id: lomiCheckoutSessionId,
        p_payment_status: paymentStatusForDb,
        p_lomi_event_payload: eventPayload,
        p_amount_paid: amount, // Lomi sends amount in smallest unit (e.g. cents) if applicable, XOF is base.
        p_currency_paid: currency,
      },
    );

    if (rpcError) {
      console.error(
        "Events Webhook Error: Failed to call record_event_lomi_payment RPC:",
        rpcError,
      );
      // Potentially retry or alert, but respond to Lomi to avoid Lomi retries for DB issues.
      return new Response(
        JSON.stringify({ error: "Failed to process payment update in DB." }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
    console.log(
      `Events Webhook: Payment for purchase ${purchaseId} (status: ${paymentStatusForDb}) processed.`,
    );

    // Only proceed to email dispatch if payment was successful
    if (paymentStatusForDb === "paid") {
      // 2. Prepare for Email Dispatch
      const { error: prepError } = await supabase.rpc(
        "prepare_purchase_for_email_dispatch",
        {
          p_purchase_id: purchaseId,
        },
      );

      if (prepError) {
        console.error(
          `Events Webhook Warning: Failed to prepare purchase ${purchaseId} for email dispatch:`,
          prepError,
        );
        // Log and continue, as payment is recorded. Email might need manual retry or investigation.
      } else {
        console.log(
          `Events Webhook: Purchase ${purchaseId} prepared for email dispatch.`,
        );

        // 3. Trigger Send Ticket Email Function via direct HTTP call
        console.log(
          `📧 Events Webhook: Triggering send-ticket-email for ${purchaseId} via HTTP call`,
        );
        try {
          const functionUrl = `${supabaseUrl}/functions/v1/send-ticket-email`;

          const emailResponse = await fetch(functionUrl, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${supabaseServiceKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ purchase_id: purchaseId }),
          });

          const emailResult = await emailResponse.text();

          if (!emailResponse.ok) {
            console.error(
              `❌ Events Webhook: Error triggering send-ticket-email for ${purchaseId}:`,
              {
                status: emailResponse.status,
                statusText: emailResponse.statusText,
                response: emailResult,
              },
            );

            // Try to update purchase status to indicate email dispatch failed
            try {
              await supabase.rpc("update_email_dispatch_status", {
                p_purchase_id: purchaseId,
                p_email_dispatch_status: "DISPATCH_FAILED",
                p_email_dispatch_error: `HTTP call failed: ${emailResponse.status} - ${emailResult}`,
              });
            } catch (updateError) {
              console.error(
                `❌ Failed to update email dispatch status after HTTP error:`,
                updateError,
              );
            }
          } else {
            console.log(
              `✅ Events Webhook: Successfully triggered send-ticket-email for ${purchaseId}:`,
              emailResult,
            );
          }
        } catch (functionError) {
          console.error(
            `❌ Events Webhook: Exception calling send-ticket-email for ${purchaseId}:`,
            functionError,
          );
          // Log additional context about the error
          console.error(`❌ Function Error Details:`, {
            name: functionError.name,
            message: functionError.message,
            stack: functionError.stack,
          });

          // Try to update purchase status to indicate email dispatch failed
          try {
            await supabase.rpc("update_email_dispatch_status", {
              p_purchase_id: purchaseId,
              p_email_dispatch_status: "DISPATCH_FAILED",
              p_email_dispatch_error: `Function invocation error: ${functionError.message}`,
            });
          } catch (updateError) {
            console.error(
              `❌ Failed to update email dispatch status after function error:`,
              updateError,
            );
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ received: true, message: "Webhook processed." }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error(
      "Events Webhook - Uncaught error during event processing:",
      error,
    );
    return new Response(
      JSON.stringify({
        error: "Internal server error processing webhook event.",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
