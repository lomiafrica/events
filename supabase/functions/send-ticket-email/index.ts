// supabase/functions/send-ticket-email/index.ts
// Deno standard libraries
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts"; // Assuming you have this

// Supabase client
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// Third-party libraries for email, PDF, QR
import { Resend } from "npm:resend";
import { PDFDocument, StandardFonts, rgb, PageSizes, PDFFont } from "npm:pdf-lib"; // Added PDFFont

// Helper function to convert Uint8Array to Base64 string
function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// The multi-line commented block containing a placeholder EventTicketProps interface and renderTicketToHtml function (with HTML/CSS)
// was removed from here to resolve TypeScript parsing errors.

// --- Environment Variables ---
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const resendApiKey = Deno.env.get("RESEND_API_KEY")!;
const fromEmail = Deno.env.get("FROM_EMAIL")! || "noreply@send.lomi.africa"; // Use your verified domain
const appBaseUrl = Deno.env.get("APP_BASE_URL") || "http://localhost:3000"; // For links in email if any

interface UpdatePurchasePayload {
  email_dispatch_status: string;
  email_last_dispatch_attempt_at: string;
  email_dispatch_error?: string | null;
  email_dispatch_attempts?: number;
  pdf_ticket_generated?: boolean;
  pdf_ticket_sent_at?: string;
  unique_ticket_identifier?: string;
}

// --- Main Serve Function ---
serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  let purchaseIdFromRequest: string | null = null;

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    const resend = new Resend(resendApiKey);

    const body = await req.json();
    const purchase_id = body.purchase_id;
    purchaseIdFromRequest = purchase_id;

    if (!purchaseIdFromRequest) {
      console.error("send-ticket-email: Missing purchase_id in request");
      return new Response(JSON.stringify({ error: "Missing purchase_id" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // --- 1. Fetch Purchase, Customer, and Event Details ---
    // ASSUMPTION: 'purchases' table has event_date_text, event_time_text, event_venue_name
    // or these are easily joinable/fetched.
    const { data: purchaseData, error: purchaseError } = await supabase
      .from("purchases")
      .select("*, customers (email, name, phone)")
      .eq("id", purchaseIdFromRequest)
      .single();

    if (purchaseError || !purchaseData) {
      console.error(`send-ticket-email: Error fetching purchase ${purchaseIdFromRequest}:`, purchaseError);
      await updatePurchaseDispatchStatus(supabase, purchaseIdFromRequest, 'DISPATCH_FAILED', `Purchase not found or DB error: ${purchaseError?.message}`);
      return new Response(JSON.stringify({ error: "Purchase not found or database error" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: purchaseError?.code === 'PGRST116' ? 404 : 500, // PGRST116: Not found
      });
    }
    
    // Check if email already sent or in progress to prevent duplicates if retried
    if (purchaseData.email_dispatch_status === 'SENT_SUCCESSFULLY' || purchaseData.email_dispatch_status === 'DISPATCH_IN_PROGRESS') {
        console.warn(`send-ticket-email: Ticket email for purchase ${purchaseIdFromRequest} already processed or in progress (${purchaseData.email_dispatch_status}). Skipping.`);
        return new Response(JSON.stringify({ message: "Ticket email already processed or in progress." }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
        });
    }

    await updatePurchaseDispatchStatus(supabase, purchaseIdFromRequest, 'DISPATCH_IN_PROGRESS', null, (purchaseData.email_dispatch_attempts || 0) + 1);


    // --- 2. Prepare Data for Ticket ---
    if (!purchaseData.customers) {
        await updatePurchaseDispatchStatus(supabase, purchaseIdFromRequest, 'DISPATCH_FAILED', 'Customer data missing for purchase.');
        console.error(`send-ticket-email: Customer data missing for purchase ${purchaseIdFromRequest}`);
        return new Response(JSON.stringify({ error: "Customer data missing" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500,
        });
    }

    const customerName = purchaseData.customers.name || 'Valued Customer';
    const nameParts = customerName.split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ');

    const uniqueTicketId = purchaseData.unique_ticket_identifier || crypto.randomUUID(); // Generate if not already set
    if (!purchaseData.unique_ticket_identifier) {
        await supabase.from('purchases').update({ unique_ticket_identifier: uniqueTicketId }).eq('id', purchaseIdFromRequest);
    }
    
    // CRITICAL: Ensure these are fetched or present on purchaseData
    // These are placeholders and NEED to be replaced with actual data from purchaseData
    const eventDataForTicket = {
        eventName: purchaseData.event_title || "Amazing Event",
        eventDate: purchaseData.event_date_text || "To Be Announced", // e.g., from purchaseData.event_date_text
        eventTime: purchaseData.event_time_text || "Soon",      // e.g., from purchaseData.event_time_text
        eventVenue: purchaseData.event_venue_name || "Secret Location", // e.g., from purchaseData.event_venue_name
    };

    const ticketProps = {
      firstName: firstName,
      lastName: lastName,
      email: purchaseData.customers.email,
      phone: purchaseData.customers.phone || undefined,
      eventName: eventDataForTicket.eventName,
      eventDate: eventDataForTicket.eventDate,
      eventTime: eventDataForTicket.eventTime,
      eventVenue: eventDataForTicket.eventVenue,
      quantity: purchaseData.quantity || 1,
      ticketIdentifier: uniqueTicketId,
    };

    // --- 3. Generate QR Code Bytes ---
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&format=png&data=${encodeURIComponent(ticketProps.ticketIdentifier)}`;
    let qrCodeImageBytes: Uint8Array;
    try {
      const qrResponse = await fetch(qrCodeUrl);
      if (!qrResponse.ok) throw new Error(`Failed to fetch QR code (${qrResponse.status} from ${qrCodeUrl})`);
      qrCodeImageBytes = new Uint8Array(await qrResponse.arrayBuffer());
    } catch (qrError) {
      console.error(`Failed to generate QR for ${purchaseIdFromRequest}:`, qrError);
      const errorMessage = qrError instanceof Error ? qrError.message : "Unknown QR generation error";
      await updatePurchaseDispatchStatus(supabase, purchaseIdFromRequest, 'DISPATCH_FAILED', `QR generation error: ${errorMessage}`);
      return new Response(JSON.stringify({ error: "Failed to generate QR code", details: errorMessage }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }});
    }

    // --- 4. Generate PDF with pdf-lib ---
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage(PageSizes.A4);
    const { width, height } = page.getSize();
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    let y = height - 50;
    const margin = 50;
    const lineH = 18; 
    const primaryColor = rgb(0.1, 0.1, 0.1);
    const secondaryColor = rgb(0.3, 0.3, 0.3);
    const labelColor = rgb(0, 0, 0);

    const drawTextLine = (
        pdfPage: typeof page,
        font: PDFFont,
        text: string,
        xPos: number,
        yPos: number,
        size: number,
        color = primaryColor
    ) => {
        pdfPage.drawText(text, { x: xPos, y: yPos, font, size, color });
    };
    
    drawTextLine(page, helveticaBold, ticketProps.eventName, margin, y, 20);
    y -= lineH * 2;

    const details = [
        { label: "Ticket ID", value: ticketProps.ticketIdentifier, boldValue: true },
        { label: "Attendee", value: `${ticketProps.firstName} ${ticketProps.lastName}` },
        { label: "Email", value: ticketProps.email },
        ...(ticketProps.phone ? [{ label: "Phone", value: ticketProps.phone }] : []),
        { label: "Event Date", value: ticketProps.eventDate, spaceBefore: true },
        { label: "Event Time", value: ticketProps.eventTime },
        { label: "Venue", value: ticketProps.eventVenue },
        { label: "Quantity", value: ticketProps.quantity.toString() },
    ];

    details.forEach(detail => {
        if (detail.spaceBefore) y -= lineH * 0.5;
        drawTextLine(page, helveticaBold, `${detail.label}:`, margin, y, 11, labelColor);
        drawTextLine(page, detail.boldValue ? helveticaBold : helvetica, detail.value, margin + 100, y, 11, secondaryColor);
        y -= lineH;
    });

    y -= lineH * 0.5; // Space before QR

    if (qrCodeImageBytes && qrCodeImageBytes.length > 0) {
      try {
        const qrImage = await pdfDoc.embedPng(qrCodeImageBytes);
        const qrDims = qrImage.scale(0.60); // Adjust scale as needed
        const qrX = width / 2 - qrDims.width / 2;
        let qrY = y - qrDims.height;

        if (qrY < margin + 40) { // Check if QR fits, considering footer
            page.addPage(); // Add new page if not enough space
            y = height - 50; // Reset y for new page
            qrY = y - qrDims.height; 
        }
        page.drawImage(qrImage, { x: qrX, y: qrY, width: qrDims.width, height: qrDims.height });
        y = qrY - lineH; 
      } catch (imgError) {
        const embedErrorMsg = imgError instanceof Error ? imgError.message : "Unknown QR image embedding error";
        console.error(`Error embedding QR for ${purchaseIdFromRequest}: ${embedErrorMsg}`);
        drawTextLine(page, helvetica, "[QR Code Unavailable]", margin, y, 10, rgb(0.7, 0.1, 0.1));
        y -= lineH;
      }
    } else {
        drawTextLine(page, helvetica, "[QR Code Data Missing]", margin, y, 10, rgb(0.5, 0.5, 0.5));
        y -= lineH;
    }
    
    // Footer text on the last active page
    const currentContentPage = pdfDoc.getPage(pdfDoc.getPageCount() - 1);
    drawTextLine(currentContentPage, helvetica, "Present this ticket at the event.", margin, margin + lineH, 9, secondaryColor);
    drawTextLine(currentContentPage, helvetica, `Generated: ${new Date().toLocaleString()}`, margin, margin, 8, rgb(0.6, 0.6, 0.6));

    const pdfBytes = await pdfDoc.save();

    // --- 5. Send Email with Resend (with PDF attachment) ---
    const emailHtmlBody = `
      <body style="font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f4f4f4; color: #333;">
        <div style="max-width: 600px; margin: auto; background-color: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h1 style="font-size: 22px; color: #1a1a1a; border-bottom: 1px solid #eee; padding-bottom: 10px; margin-bottom: 20px;">Your Ticket for ${ticketProps.eventName}</h1>
          <p style="font-size: 16px; line-height: 1.6;">Hello ${ticketProps.firstName},</p>
          <p style="font-size: 16px; line-height: 1.6;">Thank you for your purchase! Your PDF ticket for <strong>${ticketProps.eventName}</strong> is attached.</p>
          <h3 style="font-size: 18px; color: #1a1a1a; margin-top: 20px; margin-bottom: 10px;">Summary:</h3>
          <ul style="font-size: 15px; line-height: 1.7; list-style: none; padding-left: 0;">
            <li><strong>Event:</strong> ${ticketProps.eventName}</li>
            <li><strong>Ticket ID:</strong> ${ticketProps.ticketIdentifier}</li>
            <li><strong>Date:</strong> ${ticketProps.eventDate} at ${ticketProps.eventTime}</li>
            <li><strong>Venue:</strong> ${ticketProps.eventVenue}</li>
          </ul>
          <p style="font-size: 16px; line-height: 1.6; margin-top: 25px;">Please find your PDF ticket attached. If you have any questions, contact support.</p>
          <p style="font-size: 15px; color: #555; margin-top: 30px;">We look forward to seeing you there!</p>
        </div>
        <p style="text-align: center; font-size: 12px; color: #888; margin-top: 20px;">&copy; ${new Date().getFullYear()} Djaouli Event Management</p>
      </body>`;

    const { data: emailData, error: emailError } = await resend.emails.send({
      from: fromEmail,
      to: ticketProps.email,
      subject: `Your PDF Ticket for ${ticketProps.eventName}`,
      html: emailHtmlBody,
      attachments: [{
        filename: `Ticket-${ticketProps.ticketIdentifier}.pdf`,
        content: uint8ArrayToBase64(pdfBytes),
      }],
    });

    if (emailError) {
      const resendErrorMsg = emailError instanceof Error ? emailError.message : JSON.stringify(emailError);
      console.error(`Resend error for purchase ${purchaseIdFromRequest}:`, resendErrorMsg);
      await updatePurchaseDispatchStatus(supabase, purchaseIdFromRequest, 'DISPATCH_FAILED', `Resend API error: ${resendErrorMsg}`);
      return new Response(JSON.stringify({ error: "Failed to send email", details: resendErrorMsg }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // --- 6. Update Purchase Record on Success ---
    await supabase
      .from("purchases")
      .update({
        email_dispatch_status: 'SENT_SUCCESSFULLY',
        pdf_ticket_generated: true, // Set to true as PDF is now generated
        pdf_ticket_sent_at: new Date().toISOString(),
        email_last_dispatch_attempt_at: new Date().toISOString(),
        email_dispatch_error: null
      })
      .eq("id", purchaseIdFromRequest);

    console.log(`Email with PDF sent for ${purchaseIdFromRequest}. Email ID: ${emailData?.id}`);
    return new Response(JSON.stringify({ message: "Ticket email with PDF sent successfully!", email_id: emailData?.id }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : "An unknown error occurred";
    console.error(`Unexpected error for ${purchaseIdFromRequest || 'unknown'}:`, e);
    if (purchaseIdFromRequest) {
      const supabaseForErrorFallback = createClient(supabaseUrl, supabaseServiceRoleKey); // Fallback client
      await updatePurchaseDispatchStatus(supabaseForErrorFallback, purchaseIdFromRequest, 'DISPATCH_FAILED', `Unexpected error: ${errorMessage}`);
    }
    return new Response(JSON.stringify({ error: "Internal server error", details: errorMessage }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});

async function updatePurchaseDispatchStatus(
    supabaseClient: SupabaseClient, 
    purchaseId: string | null, 
    status: string, 
    errorMessage: string | null,
    attempts?: number
) {
    if (!purchaseId) return;
    try {
        const updatePayload: UpdatePurchasePayload = {
            email_dispatch_status: status,
            email_last_dispatch_attempt_at: new Date().toISOString(),
        };
        if (errorMessage !== undefined) { 
            updatePayload.email_dispatch_error = errorMessage;
        }
        if (attempts !== undefined) {
            updatePayload.email_dispatch_attempts = attempts;
        }
        // pdf_ticket_generated and pdf_ticket_sent_at are updated directly in the main success block

        const { error } = await supabaseClient
            .from('purchases')
            .update(updatePayload)
            .eq('id', purchaseId);
        if (error) {
            console.error(`send-ticket-email: Failed to update purchase dispatch status for ${purchaseId} to ${status}:`, error);
        }
    } catch(e) {
        const catchErrorMsg = e instanceof Error ? e.message : "Unknown error in updatePurchaseDispatchStatus";
        console.error(`send-ticket-email: Exception while updating purchase dispatch status for ${purchaseId}:`, catchErrorMsg);
    }
}

// --- NOTES & TODOs ---
// 1. PDF Design: 
//    - The current PDF layout is basic. `pdf-lib` allows for more complex drawing, custom fonts (requires font file embedding),
//      and precise element placement if a more sophisticated design is needed.
// 2. Multi-page PDFs: 
//    - Current implementation assumes a single page. If content overflows, logic to add new pages is needed.
//      Placeholders for this are marked with "/* TODO: Add new page */".
// 3. QR Code Image Type: 
//    - Assumed QR server (api.qrserver.com) sends PNG. `pdfDoc.embedPng` is used.
//    - If it's JPEG, use `pdfDoc.embedJpg`. If SVG, it needs rasterization first or a different embedding strategy.
// 4. Error Handling for QR/Image Embedding: 
//    - Currently logs an error and tries to proceed. You might want stricter handling.
// 5. Environment Variables & Dependencies: 
//    - Ensure `npm:pdf-lib` is correctly handled by Supabase Edge Functions tooling.
//    - All environment variables must be set.
// 6. Custom Fonts for PDF: 
//    - StandardFonts are used. For custom fonts, you would need to fetch/load .ttf or .otf files into the function 
//      and use `pdfDoc.embedFont(customFontBytes)`.
// 7. Testing:
//    - Test thoroughly, including error cases (e.g., invalid purchase ID, Resend API failure).
//    - Test the actual PDF output on different email clients. 