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
}
const supabase = createClient(supabaseUrl || "", supabaseServiceRoleKey || "");

// lomi. API Config
const LOMI_API_KEY = Deno.env.get("LOMI_API_KEY");
const LOMI_API_BASE_URL = Deno.env.get("LOMI_API_BASE_URL") || "https://api.lomi.africa/v1";
const APP_BASE_URL = Deno.env.get("APP_BASE_URL") || "http://localhost:3000";

// Default allowed providers
const DEFAULT_ALLOWED_PROVIDERS = ["WAVE"];

interface RequestPayload {
  eventId: string;
  eventTitle: string;
  ticketTypeId: string;
  ticketName: string;
  pricePerTicket: number;
  quantity: number;
  currencyCode?: string;
  userName: string;
  userEmail: string;
  userPhone?: string;
  successUrlPath?: string;
  cancelUrlPath?: string;
  allowedProviders?: string[];
  productId?: string; 
  allowCouponCode?: boolean; // Allow coupon codes
  allowQuantity?: boolean; // Allow quantity changes
  eventDateText?: string;
  eventTimeText?: string;
  eventVenueName?: string;
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
    console.log("Received payload:", JSON.stringify(payload, null, 2));
    console.log("Product ID in request:", payload.productId);

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
    console.log("Checking for existing customer with email:", payload.userEmail);
    
    const { data: existingCustomer, error: customerError } = await supabase
      .from("customers")
      .select("id")
      .eq("email", payload.userEmail)
      .maybeSingle(); // Use maybeSingle() instead of single() to handle no results gracefully

    if (customerError) {
      console.error("Error fetching customer:", customerError);
      return new Response(
        JSON.stringify({ error: `Error fetching customer: ${customerError.message}` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
      );
    }

    if (existingCustomer) {
      console.log("Found existing customer:", existingCustomer.id);
      customerId = existingCustomer.id;
      // Update customer details if they've changed
      const { error: updateCustomerError } = await supabase
        .from("customers")
        .update({ name: payload.userName, phone: payload.userPhone })
        .eq("id", customerId);
      if (updateCustomerError) {
        console.error("Error updating customer:", updateCustomerError);
        // Non-fatal, proceed with existing customerId
      }
    } else {
      console.log("Creating new customer");
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
        return new Response(
          JSON.stringify({ error: `Error creating customer: ${createCustomerError?.message || 'No customer data returned'}` }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
        );
      }
      customerId = newCustomer.id;
      console.log("Created new customer:", customerId);
    }

    // --- Create Purchase Record ---
    const totalAmount = payload.pricePerTicket * payload.quantity;
    const currencyCode = payload.currencyCode || "XOF";

    console.log("Creating purchase record");
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
        event_date_text: payload.eventDateText || "To Be Announced",
        event_time_text: payload.eventTimeText || "Time TBA",
        event_venue_name: payload.eventVenueName || "Venue TBA",
      })
      .select("id")
      .single();

    if (purchaseError || !purchase) {
      console.error("Error creating purchase record:", purchaseError);
      return new Response(
        JSON.stringify({ error: `Error creating purchase record: ${purchaseError?.message || 'No purchase data returned'}` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
      );
    }
    const purchaseId = purchase.id;
    console.log("Created purchase record:", purchaseId);

    // --- Prepare lomi. Payload ---
    const successRedirectPath = payload.successUrlPath || "/payment/success";
    const cancelRedirectPath = payload.cancelUrlPath || "/payment/cancel";
    
    // Determine if we're using product-based or event-based checkout
    const isProductBased = !!payload.productId;
    console.log("Is product-based checkout:", isProductBased);
    console.log("Product ID being used:", payload.productId);
    
    const baseLomiPayload = {
      success_url: `${APP_BASE_URL}${successRedirectPath}?purchase_id=${purchaseId}&status=success`,
      cancel_url: `${APP_BASE_URL}${cancelRedirectPath}?purchase_id=${purchaseId}&status=cancelled`,
      allowed_providers: payload.allowedProviders || DEFAULT_ALLOWED_PROVIDERS,
      currency_code: currencyCode,
      quantity: payload.quantity,
      customer_email: payload.userEmail,
      customer_name: payload.userName,
      ...(payload.userPhone && { customer_phone: payload.userPhone }),
      allow_coupon_code: payload.allowCouponCode !== undefined ? payload.allowCouponCode : true,
      allow_quantity: payload.allowQuantity !== undefined ? payload.allowQuantity : true,
      metadata: {
        internal_purchase_id: purchaseId,
        event_id: payload.eventId,
        ticket_type_id: payload.ticketTypeId,
        customer_id: customerId,
        app_source: "djaouli_events_app",
        is_product_based: isProductBased
      },
      expiration_minutes: 30,
    };

    const lomiPayload = isProductBased ? {
      ...baseLomiPayload,
      product_id: payload.productId,
      amount: payload.pricePerTicket, // Unit price - lomi. will multiply by quantity
      title: `${payload.eventTitle} Tickets (x${payload.quantity})`,
      public_description: `Tickets for: ${payload.eventTitle}`,
    } : {
      ...baseLomiPayload,
      // Event-based checkout: Use unit price, let lomi. handle quantity multiplication
      amount: payload.pricePerTicket, // Unit price - lomi. will multiply by quantity
      title: `${payload.ticketName} - ${payload.eventTitle} (x${payload.quantity})`,
      public_description: `Payment for ${payload.quantity} ticket(s) for the event: ${payload.eventTitle}. Ticket type: ${payload.ticketName}.`,
    };

    console.log("Using", isProductBased ? "product-based" : "event-based", "checkout");

    console.log("Calling lomi. API with URL:", `${LOMI_API_BASE_URL}/checkout-sessions`);
    console.log("Final lomi.payload:", JSON.stringify(lomiPayload, null, 2));

    // --- Call lomi. API ---
    const lomiResponse = await fetch(`${LOMI_API_BASE_URL}/checkout-sessions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": LOMI_API_KEY,
      },
      body: JSON.stringify(lomiPayload),
    });

    console.log("lomi. API response status:", lomiResponse.status);
    console.log("lomi. API response headers:", Object.fromEntries(lomiResponse.headers.entries()));

    // Get response text first to handle both JSON and HTML responses
    const lomiResponseText = await lomiResponse.text();
    console.log("lomi. API response body:", lomiResponseText);

    let lomiResponseData;
    try {
      lomiResponseData = JSON.parse(lomiResponseText);
    } catch (parseError) {
      console.error("Failed to parse lomi. API response as JSON:", parseError);
      console.error("Response was:", lomiResponseText);
      
      // Update purchase status to failed
      await supabase.from("purchases").update({ 
        status: "payment_init_failed", 
        payment_processor_details: { error: "Invalid JSON response from lomi. API", response: lomiResponseText }
      }).eq("id", purchaseId);
      
      return new Response(
        JSON.stringify({
          error: "Invalid response from payment provider",
          details: "The payment provider returned an invalid response. Please try again later.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 502 },
      );
    }

    if (!lomiResponse.ok || !lomiResponseData.data || !lomiResponseData.data.url) {
      console.error("lomi. API error:", lomiResponseData);
      await supabase.from("purchases").update({ status: "payment_init_failed", payment_processor_details: lomiResponseData })
        .eq("id", purchaseId);
      return new Response(
        JSON.stringify({
          error: "Failed to create lomi. checkout session",
          details: lomiResponseData.error || lomiResponseData,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: lomiResponseData.error?.status || 500 },
      );
    }

    // --- Update Purchase Record with lomi. details ---
    const { error: updatePurchaseError } = await supabase
      .from("purchases")
      .update({
        lomi_session_id: lomiResponseData.data.checkout_session_id,
        lomi_checkout_url: lomiResponseData.data.url,
        payment_processor_details: { request: lomiPayload, response: lomiResponseData.data }
      })
      .eq("id", purchaseId);

    if (updatePurchaseError) {
      console.warn("Failed to update purchase record with lomi. details, but checkout URL obtained:", updatePurchaseError);
    }

    console.log("Successfully created checkout session:", lomiResponseData.data.checkout_session_id); 
    
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