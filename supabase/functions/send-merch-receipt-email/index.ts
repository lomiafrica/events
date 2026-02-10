/// <reference types="https://deno.land/x/deno/cli/tsc/dts/lib.deno.d.ts" />
/// <reference lib="deno.ns" />

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

// Helper function to convert Uint8Array to Base64 string
function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = "";
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// --- Environment Variables ---
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const resendApiKey = Deno.env.get("RESEND_API_KEY");
const fromEmail = Deno.env.get("FROM_EMAIL") || "orders@tickets.djaoulient.com";
const APP_BASE_URL = (
  Deno.env.get("APP_BASE_URL") || "https://www.djaouli.com"
).replace(/\/$/, "");
const defaultLogoUrl = `${supabaseUrl}/storage/v1/object/public/assets/logo.png`;

// --- Environment Validation ---
if (!supabaseUrl || !supabaseServiceRoleKey || !resendApiKey) {
  throw new Error(
    "Missing required environment variables (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY)",
  );
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  let purchaseIdFromRequest: string | null = null;

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    const resend = new Resend(resendApiKey);

    const body = await req.json();
    // The webhook will send an array of purchase IDs for cart checkouts
    const purchase_ids = body.purchase_ids;
    if (
      !purchase_ids ||
      !Array.isArray(purchase_ids) ||
      purchase_ids.length === 0
    ) {
      console.error(
        "send-merch-receipt-email: Missing purchase_ids in request",
      );
      return new Response(JSON.stringify({ error: "Missing purchase_ids" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Use the first purchase ID for fetching shared customer data
    purchaseIdFromRequest = purchase_ids[0];

    // --- 1. Fetch Purchase, Customer, and Item Details using RPC ---
    console.log(
      `send-merch-receipt-email: Fetching data for purchase IDs: ${purchase_ids.join(", ")}`,
    );

    // This RPC will need to be created. It should return customer info and a list of items.
    const { data: purchaseData, error: purchaseError } = await supabase.rpc(
      "get_merch_purchase_for_email_dispatch",
      { p_purchase_ids: purchase_ids },
    );

    if (purchaseError || !purchaseData) {
      console.error(
        `send-merch-receipt-email: Error fetching data for purchases ${purchase_ids.join(", ")}:`,
        purchaseError,
      );
      // Can't reliably update status if we can't fetch the data
      return new Response(
        JSON.stringify({ error: "Purchase not found or database error" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 404,
        },
      );
    }

    const { customer_name, customer_email, items, total_amount, shipping_fee } =
      purchaseData;

    if (!customer_email || !customer_name) {
      console.error(
        `send-merch-receipt-email: Customer data missing for purchases ${purchase_ids.join(", ")}`,
      );
      // Update status for all purchases? This might be complex. For now, just error out.
      return new Response(JSON.stringify({ error: "Customer data missing" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    // --- 2. Prepare Data for Email ---
    const nameParts = customer_name.split(" ");
    const firstName = nameParts[0];

    // --- 3. Fetch Logo ---
    let logoSrc = defaultLogoUrl;
    try {
      const { data: logoData, error: logoError } = await supabase.storage
        .from("assets")
        .download("logo.png");
      if (logoData && !logoError) {
        const logoBytes = new Uint8Array(await logoData.arrayBuffer());
        const logoBase64 = uint8ArrayToBase64(logoBytes);
        logoSrc = `data:image/png;base64,${logoBase64}`;
      }
    } catch (logoError) {
      console.warn(
        "Could not fetch logo for email, using default URL.",
        logoError,
      );
    }

    // --- 4. Send Email with Resend ---
    // Table-based layout + inline styles only so email clients (Gmail, Outlook, etc.) don't strip styles and collapse the content
    const itemsRows = items
      .map(
        (item: any) =>
          `<tr><td style="padding:10px;font-size:14px;border-bottom:1px solid #eee;">${item.product_title}</td><td style="padding:10px;font-size:14px;border-bottom:1px solid #eee;">${item.quantity}</td><td style="padding:10px;font-size:14px;border-bottom:1px solid #eee;">${Number(item.total_amount).toLocaleString("fr-FR")} F CFA</td></tr>`,
      )
      .join("");

    const emailHtmlBody = `<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Confirmation de votre commande Djaouli</title>
</head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background-color:#f5f5f5;color:#333;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f5f5f5;">
    <tr>
      <td align="center" style="padding:24px 16px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;background-color:#ffffff;">
          <tr>
            <td style="padding:24px;text-align:center;">
              <img src="${logoSrc}" alt="Djaouli Logo" width="100" height="100" style="display:block;margin:0 auto;border:0;" />
            </td>
          </tr>
          <tr>
            <td style="padding:0 24px 24px;">
              <h1 style="margin:0 0 16px;font-size:20px;font-weight:bold;color:#111;">Merci pour votre commande, ${firstName}&nbsp;!</h1>
              <p style="margin:0 0 20px;font-size:15px;line-height:1.5;">Nous avons bien reçu votre commande et nous la préparons pour l'expédition. Voici un récapitulatif&nbsp;:</p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom:20px;">
                <tr>
                  <th style="padding:10px;text-align:left;font-size:14px;border-bottom:1px solid #eee;">Article</th>
                  <th style="padding:10px;text-align:left;font-size:14px;border-bottom:1px solid #eee;">Quantité</th>
                  <th style="padding:10px;text-align:left;font-size:14px;border-bottom:1px solid #eee;">Prix</th>
                </tr>
                ${itemsRows}
              </table>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom:20px;">
                <tr><td style="padding:10px;font-size:14px;">Sous-total</td><td style="padding:10px;font-size:14px;text-align:right;">${(Number(total_amount) - Number(shipping_fee)).toLocaleString("fr-FR")} F CFA</td></tr>
                <tr><td style="padding:10px;font-size:14px;">Livraison</td><td style="padding:10px;font-size:14px;text-align:right;">${Number(shipping_fee).toLocaleString("fr-FR")} F CFA</td></tr>
                <tr><td style="padding:10px;font-size:14px;font-weight:bold;">Total</td><td style="padding:10px;font-size:14px;font-weight:bold;text-align:right;">${Number(total_amount).toLocaleString("fr-FR")} F CFA</td></tr>
              </table>
              <p style="margin:0 0 12px;font-size:15px;line-height:1.5;">Nous vous enverrons une autre notification dès que votre commande sera expédiée.</p>
              <p style="margin:0;font-size:15px;line-height:1.5;">Pour toute question, répondez simplement à cet e-mail.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 24px;border-top:1px solid #eee;font-size:12px;color:#666;text-align:center;">© ${new Date().getFullYear()} Djaouli Entertainment</td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const { data: emailData, error: emailError } = await resend.emails.send({
      from: `Djaouli Entertainment <${fromEmail}>`,
      to: customer_email,
      reply_to: "djaouli@gmail.com",
      subject: `Confirmation de votre commande #${purchase_ids[0].substring(0, 8)}`,
      html: emailHtmlBody,
    });

    if (emailError) {
      throw emailError; // Will be caught by the main try-catch
    }

    // --- 5. Update Purchase Records on Success ---
    // This could be another RPC `update_merch_email_dispatch_status`
    console.log(
      `Email sent successfully for purchases: ${purchase_ids.join(", ")}. Email ID: ${emailData?.id}`,
    );

    return new Response(
      JSON.stringify({
        message: "Merchandise receipt email sent successfully!",
        email_id: emailData?.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (e: unknown) {
    const errorMessage =
      e instanceof Error ? e.message : "An unknown error occurred";
    console.error(
      `Unexpected error for purchases ${purchaseIdFromRequest || "unknown"}:`,
      e,
    );

    return new Response(
      JSON.stringify({ error: "Internal server error", details: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
