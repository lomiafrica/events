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
const LOMI_API_BASE_URL =
  Deno.env.get("LOMI_API_BASE_URL") || "https://api.lomi.africa/v1";
const APP_BASE_URL = (
  Deno.env.get("APP_BASE_URL") || "http://localhost:3000"
).replace(/\/$/, ""); // Remove trailing slash
const LOMI_CHECKOUT_BASE_URL = "https://checkout.lomi.africa/pay";

interface CartItem {
  merchandiseId: string;
  quantity: number;
  productId?: string;
  title: string;
  price: number;
}

interface RequestPayload {
  cartItems: CartItem[];
  currencyCode?: string;
  userName: string;
  userEmail: string;
  userPhone?: string;
  successUrlPath?: string;
  cancelUrlPath?: string;
  allowCouponCode?: boolean;
  allowQuantity?: boolean;
}

serve(async (req: Request) => {
  // Handle CORS preflight requests first
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return new Response(
      JSON.stringify({
        error:
          "Supabase environment variables not configured for the function.",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
  if (!LOMI_API_KEY) {
    console.error("LOMI_API_KEY is not set for the function.");
    return new Response(
      JSON.stringify({
        error: "LOMI API key not configured for the function.",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      },
    );
  }

  try {
    const payload: RequestPayload = await req.json();
    console.log("Received cart payload:", JSON.stringify(payload, null, 2));

    // --- Validate Input ---
    const requiredFields: (keyof RequestPayload)[] = [
      "cartItems",
      "userName",
      "userEmail",
    ];
    for (const field of requiredFields) {
      if (
        !(field in payload) ||
        payload[field] === undefined ||
        payload[field] === null ||
        String(payload[field]).trim() === ""
      ) {
        return new Response(
          JSON.stringify({
            error: `Missing or invalid required field: ${field}`,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          },
        );
      }
    }

    if (!Array.isArray(payload.cartItems) || payload.cartItems.length === 0) {
      return new Response(
        JSON.stringify({ error: "Cart items must be a non-empty array." }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        },
      );
    }

    // Validate each cart item
    for (let i = 0; i < payload.cartItems.length; i++) {
      const item = payload.cartItems[i];
      if (!item.merchandiseId || !item.title || !item.price || !item.quantity) {
        return new Response(
          JSON.stringify({
            error: `Invalid cart item at index ${i}: missing required fields`,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          },
        );
      }
      if (item.quantity <= 0) {
        return new Response(
          JSON.stringify({
            error: `Invalid quantity for item at index ${i}: must be greater than 0`,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          },
        );
      }
    }

    // --- Upsert Customer using RPC ---
    console.log("Creating/updating customer using RPC function");
    const { data: customerId, error: customerError } = await supabase.rpc(
      "upsert_customer",
      {
        p_name: payload.userName,
        p_email: payload.userEmail,
        p_phone: payload.userPhone || null,
        p_whatsapp: payload.userPhone || null, // Set WhatsApp same as phone
      },
    );

    if (customerError || !customerId) {
      console.error("Error upserting customer:", customerError);
      return new Response(
        JSON.stringify({
          error: `Error creating/updating customer: ${customerError?.message || "No customer ID returned"}`,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        },
      );
    }

    console.log("Customer upserted successfully:", customerId);

    // --- Calculate totals and create purchase records ---
    const currencyCode = payload.currencyCode || "XOF";
    let totalAmount = 0;
    const purchaseIds: string[] = [];

    for (const item of payload.cartItems) {
      const itemTotal = item.price * item.quantity;
      totalAmount += itemTotal;

      console.log(`Creating purchase record for ${item.title}`);
      const { data: purchaseId, error: purchaseError } = await supabase.rpc(
        "create_merch_purchase",
        {
          p_customer_id: customerId,
          p_product_id: item.productId || item.merchandiseId,
          p_product_title: item.title,
          p_quantity: item.quantity,
          p_price_per_item: item.price,
          p_total_amount: itemTotal,
          p_merchandise_id: item.merchandiseId,
          p_currency_code: currencyCode,
        },
      );

      if (purchaseError || !purchaseId) {
        console.error("Error creating purchase record:", purchaseError);
        return new Response(
          JSON.stringify({
            error: `Error creating purchase record: ${purchaseError?.message || "No purchase ID returned"}`,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500,
          },
        );
      }

      purchaseIds.push(purchaseId);
      console.log("Created purchase record:", purchaseId);
    }

    console.log(
      `Created ${purchaseIds.length} purchase records, total amount: ${totalAmount}`,
    );

    // --- Prepare lomi. Payload ---
    const successRedirectPath = payload.successUrlPath || "/payment/success";
    const cancelRedirectPath = payload.cancelUrlPath || "/payment/cancel";

    // Determine checkout approach based on productIds (similar to regular checkout)
    const productIds = payload.cartItems
      .map((item) => item.productId)
      .filter(Boolean); // Remove null/undefined

    let isProductBased = false;
    let singleProductId: string | undefined;

    if (productIds.length > 0) {
      // Check if all items with productIds have the same productId
      const uniqueProductIds = [...new Set(productIds)];
      if (uniqueProductIds.length === 1 && payload.cartItems.length === 1) {
        // Single item with productId - use product-based checkout
        isProductBased = true;
        singleProductId = uniqueProductIds[0];
      }
      // For multiple items or mixed productIds, fall back to amount-based
    }

    console.log(
      "Cart checkout approach:",
      isProductBased ? "product-based" : "amount-based",
    );
    console.log("Product ID (if applicable):", singleProductId);

    const baseLomiPayload = {
      success_url: `${APP_BASE_URL}${successRedirectPath}?purchase_ids=${encodeURIComponent(purchaseIds.join(","))}&status=success`,
      cancel_url: `${APP_BASE_URL}${cancelRedirectPath}?purchase_ids=${encodeURIComponent(purchaseIds.join(","))}&status=cancelled`,
      currency_code: currencyCode,
      customer_email: payload.userEmail,
      customer_name: payload.userName,
      ...(payload.userPhone && { customer_phone: payload.userPhone }),
      allow_coupon_code:
        payload.allowCouponCode !== undefined ? payload.allowCouponCode : true,
      allow_quantity:
        payload.allowQuantity !== undefined ? payload.allowQuantity : false,
      metadata: {
        internal_purchase_ids: purchaseIds,
        customer_id: customerId,
        app_source: "djaouli_merch_app",
        is_cart_checkout: true,
        is_product_based: isProductBased,
        item_count: payload.cartItems.length,
      },
    };

    const lomiPayload = isProductBased
      ? {
          ...baseLomiPayload,
          product_id: singleProductId,
          title: `${payload.cartItems[0].title} (x${payload.cartItems[0].quantity})`,
          description: `Purchase: ${payload.cartItems[0].title}`,
        }
      : {
          ...baseLomiPayload,
          amount: totalAmount,
          title: `Merch (${payload.cartItems.length} items)`,
          description: `Your order: ${payload.cartItems.map((item) => `${item.quantity}x ${item.title}`).join(", ")}`,
        };

    console.log(
      "Using",
      isProductBased ? "product-based" : "amount-based",
      "checkout for cart",
    );

    console.log(
      "Calling lomi. API with URL:",
      `${LOMI_API_BASE_URL}/checkout-sessions`,
    );
    console.log("Final lomi. payload:", JSON.stringify(lomiPayload, null, 2));

    // --- Call lomi. API ---
    const lomiResponse = await fetch(`${LOMI_API_BASE_URL}/checkout-sessions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": LOMI_API_KEY,
      },
      body: JSON.stringify(lomiPayload),
    });

    console.log("lomi. API response status:", lomiResponse.status);
    console.log(
      "lomi. API response headers:",
      Object.fromEntries(lomiResponse.headers.entries()),
    );

    // Get response text first to handle both JSON and HTML responses
    const lomiResponseText = await lomiResponse.text();
    console.log("lomi. API response body:", lomiResponseText);

    let lomiResponseData;
    try {
      lomiResponseData = JSON.parse(lomiResponseText);
    } catch (parseError) {
      console.error("Failed to parse lomi. API response as JSON:", parseError);
      console.error("Response was:", lomiResponseText);

      // Update purchase status to failed using RPC
      for (const purchaseId of purchaseIds) {
        await supabase.rpc("update_purchase_lomi_session", {
          p_purchase_id: purchaseId,
          p_lomi_session_id: "failed",
          p_lomi_checkout_url: "failed",
          p_payment_processor_details: {
            error: "Invalid JSON response from lomi. API",
            response: lomiResponseText,
          },
        });
      }

      return new Response(
        JSON.stringify({
          error: "Invalid response from payment provider",
          details:
            "The payment provider returned an invalid response. Please try again later.",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 502,
        },
      );
    }

    if (!lomiResponse.ok || !lomiResponseData.checkout_session_id) {
      console.error("lomi. API error:", lomiResponseData);

      // Update purchase with failure details using RPC
      for (const purchaseId of purchaseIds) {
        await supabase.rpc("update_purchase_lomi_session", {
          p_purchase_id: purchaseId,
          p_lomi_session_id: "failed",
          p_lomi_checkout_url: "failed",
          p_payment_processor_details: lomiResponseData,
        });
      }

      return new Response(
        JSON.stringify({
          error: "Failed to create lomi. checkout session",
          details: lomiResponseData.error || lomiResponseData,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: lomiResponseData.error?.status || 500,
        },
      );
    }

    // --- Construct checkout URL from session ID ---
    const checkoutUrl = `${LOMI_CHECKOUT_BASE_URL}/${lomiResponseData.checkout_session_id}`;

    // --- Update Purchase Records with lomi. details using RPC ---
    for (const purchaseId of purchaseIds) {
      const { error: updatePurchaseError } = await supabase.rpc(
        "update_purchase_lomi_session",
        {
          p_purchase_id: purchaseId,
          p_lomi_session_id: lomiResponseData.checkout_session_id,
          p_lomi_checkout_url: checkoutUrl,
          p_payment_processor_details: {
            request: lomiPayload,
            response: lomiResponseData,
          },
        },
      );

      if (updatePurchaseError) {
        // Check if this is the expected "already has session ID" warning
        const isDuplicateSessionError = updatePurchaseError.message?.includes(
          "already has a lomi session ID",
        );

        if (isDuplicateSessionError) {
          console.log(
            "Purchase already has lomi session details (likely from retry), proceeding with existing checkout URL",
          );
        } else {
          console.warn(
            "Failed to update purchase record with lomi. details, but checkout URL obtained:",
            updatePurchaseError,
          );
        }
      }
    }

    console.log(
      "Successfully created checkout session:",
      lomiResponseData.checkout_session_id,
    );

    // --- Success Response ---
    return new Response(
      JSON.stringify({
        checkout_url: checkoutUrl,
        purchase_ids: purchaseIds,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    console.error(
      "!!!!!!!!!! CAUGHT ERROR in main try/catch !!!!!!!!!:",
      error,
    );
    let message = "An unexpected error occurred.";
    if (error instanceof Error) {
      message = error.message;
    }
    return new Response(
      JSON.stringify({ error: message, details: String(error) }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
});
