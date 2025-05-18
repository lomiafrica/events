/// <reference types="https://deno.land/x/deno/cli/tsc/dts/lib.deno.d.ts" />
/// <reference lib="deno.ns" />

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Initialize Supabase client
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error(
    "Supabase URL or Service Role Key is not set. Ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are defined in Edge Function environment variables.",
  );
  // We can't proceed without these, so this function would be non-operational.
  // Depending on policy, you might throw an error or handle it differently.
}
const supabase = createClient(supabaseUrl || "", supabaseServiceRoleKey || "");

// Lomi API Config
const LOMI_API_KEY = Deno.env.get("LOMI_API_KEY");
const LOMI_API_BASE_URL = Deno.env.get("LOMI_API_BASE_URL") || "https://api.lomi.africa/v1";
const APP_BASE_URL = Deno.env.get("APP_BASE_URL") || "http://localhost:3000"; // Ensure this is your app's deployed base URL

// Default allowed providers (can be made more dynamic if needed)
const DEFAULT_ALLOWED_PROVIDERS = ["WAVE", "ORANGE"]; // Example

interface RequestPayload {
  eventId: string;
  eventTitle: string;
  ticketTypeId: string;
  ticketName: string;
  pricePerTicket: number;
  quantity: number;
  currencyCode?: string; // Default 'XOF'
  userName: string;
  userEmail: string;
  userPhone?: string;
  successUrlPath?: string; // e.g., "/payment/success"
  cancelUrlPath?: string; // e.g., "/payment/cancel"
  allowedProviders?: string[];
}

serve(async (req: Request) => {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return new Response(
        JSON.stringify({ error: "Supabase environment variables not configured for the function." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
    );
  }
  if (!LOMI_API_KEY) {
    console.error("LOMI_API_KEY is not set for the function.");
    return new Response(
      JSON.stringify({ error: "LOMI API key not configured for the function." }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
    );
  }

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload: RequestPayload = await req.json();

    // --- Validate Input ---
    const requiredFields: (keyof RequestPayload)[] = [
      "eventId",
      "eventTitle",
      "ticketTypeId",
      "ticketName",
      "pricePerTicket",
      "quantity",
      "userName",
      "userEmail",
    ];
    for (const field of requiredFields) {
      if (!(field in payload) || payload[field] === undefined || payload[field] === null || String(payload[field]).trim() === "") {
        // Price and quantity can be 0, but other textual fields should not be empty.
        // Explicitly allow pricePerTicket = 0 for free tickets, quantity must be > 0 (checked by DB).
        if (field === 'pricePerTicket' && payload[field] === 0) continue;

        return new Response(
          JSON.stringify({ error: `Missing or invalid required field: ${field}` }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
        );
      }
    }
    if (payload.quantity <= 0) {
        return new Response(
            JSON.stringify({ error: "Quantity must be greater than 0." }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
        );
    }


    // --- Upsert Customer ---
    let customerId: string;
    const { data: existingCustomer, error: customerError } = await supabase
      .from("customers")
      .select("id")
      .eq("email", payload.userEmail)
      .single();

    if (customerError && customerError.code !== "PGRST116") { // PGRST116: "Searched item was not found"
      console.error("Error fetching customer:", customerError);
      throw new Error(`Error fetching customer: ${customerError.message}`);
    }

    if (existingCustomer) {
      customerId = existingCustomer.id;
      // Optionally, update customer details if they've changed
      const { error: updateCustomerError } = await supabase
        .from("customers")
        .update({ name: payload.userName, phone: payload.userPhone })
        .eq("id", customerId);
      if (updateCustomerError) {
        console.error("Error updating customer:", updateCustomerError);
        // Non-fatal, proceed with existing customerId
      }
    } else {
      const { data: newCustomer, error: createCustomerError } = await supabase
        .from("customers")
        .insert({
          name: payload.userName,
          email: payload.userEmail,
          phone: payload.userPhone,
        })
        .select("id")
        .single();
      if (createCustomerError || !newCustomer) {
        console.error("Error creating customer:", createCustomerError);
        throw new Error(`Error creating customer: ${createCustomerError?.message || 'No customer data returned'}`);
      }
      customerId = newCustomer.id;
    }

    // --- Create Purchase Record ---
    const totalAmount = payload.pricePerTicket * payload.quantity;
    const currencyCode = payload.currencyCode || "XOF";

    const { data: purchase, error: purchaseError } = await supabase
      .from("purchases")
      .insert({
        customer_id: customerId,
        event_id: payload.eventId,
        event_title: payload.eventTitle,
        ticket_type_id: payload.ticketTypeId,
        ticket_name: payload.ticketName,
        quantity: payload.quantity,
        price_per_ticket: payload.pricePerTicket,
        total_amount: totalAmount,
        currency_code: currencyCode,
        status: "pending_payment",
      })
      .select("id")
      .single();

    if (purchaseError || !purchase) {
      console.error("Error creating purchase record:", purchaseError);
      throw new Error(`Error creating purchase record: ${purchaseError?.message || 'No purchase data returned'}`);
    }
    const purchaseId = purchase.id;

    // --- Prepare Lomi Payload ---
    const successRedirectPath = payload.successUrlPath || "/payment/success";
    const cancelRedirectPath = payload.cancelUrlPath || "/payment/cancel";
    
    const lomiPayload = {
      success_url: `${APP_BASE_URL}${successRedirectPath}?purchase_id=${purchaseId}&status=success`,
      cancel_url: `${APP_BASE_URL}${cancelRedirectPath}?purchase_id=${purchaseId}&status=cancelled`,
      allowed_providers: payload.allowedProviders || DEFAULT_ALLOWED_PROVIDERS,
      amount: totalAmount, // Lomi expects amount in the smallest currency unit. XOF has no smaller unit.
      currency_code: currencyCode,
      title: `${payload.ticketName} - ${payload.eventTitle} (x${payload.quantity})`,
      public_description: `Payment for ${payload.quantity} ticket(s) for the event: ${payload.eventTitle}. Ticket type: ${payload.ticketName}.`,
      customer_email: payload.userEmail,
      customer_name: payload.userName,
      ...(payload.userPhone && { customer_phone: payload.userPhone }),
      metadata: {
        internal_purchase_id: purchaseId,
        event_id: payload.eventId,
        ticket_type_id: payload.ticketTypeId,
        customer_id: customerId,
        app_source: "djaouli_events_app" // Example metadata
      },
      expiration_minutes: 30, // Or make configurable
      // allow_coupon_code: false, // Default or configure
    };

    // --- Call Lomi API ---
    const lomiResponse = await fetch(`${LOMI_API_BASE_URL}/checkout-sessions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": LOMI_API_KEY,
      },
      body: JSON.stringify(lomiPayload),
    });

    const lomiResponseData = await lomiResponse.json();

    if (!lomiResponse.ok || !lomiResponseData.data || !lomiResponseData.data.url) {
      console.error("Lomi API error:", lomiResponseData);
      // Attempt to update purchase status to failed
      await supabase.from("purchases").update({ status: "payment_init_failed", payment_processor_details: lomiResponseData })
        .eq("id", purchaseId);
      return new Response(
        JSON.stringify({
          error: "Failed to create Lomi checkout session",
          details: lomiResponseData.error || lomiResponseData,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: lomiResponseData.error?.status || 500 },
      );
    }

    // --- Update Purchase Record with Lomi details ---
    const { error: updatePurchaseError } = await supabase
      .from("purchases")
      .update({
        lomi_session_id: lomiResponseData.data.checkout_session_id,
        lomi_checkout_url: lomiResponseData.data.url,
        payment_processor_details: { request: lomiPayload, response: lomiResponseData.data } // Store for reference
      })
      .eq("id", purchaseId);

    if (updatePurchaseError) {
      console.warn("Failed to update purchase record with Lomi details, but checkout URL obtained:", updatePurchaseError);
      // Non-fatal for the client, but needs monitoring.
    }

    // --- Success Response ---
    return new Response(
      JSON.stringify({ checkout_url: lomiResponseData.data.url, purchase_id: purchaseId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );

  } catch (error) {
    console.error("!!!!!!!!!! CAUGHT ERROR in main try/catch !!!!!!!!!:", error);
    let message = "An unexpected error occurred.";
    if (error instanceof Error) {
        message = error.message;
    }
    return new Response(JSON.stringify({ error: message, details: String(error) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
}); 