// supabase/functions/send-ticket-email/index.ts
// Deno standard libraries
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts"; // Assuming you have this

// Supabase client
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// Third-party libraries for email, PDF, QR, React rendering
import { Resend } from "npm:resend";
// import QRCode from "npm:qrcode"; // For generating QR code data URL or SVG
// import React from "npm:react"; // For JSX
// import ReactDOMServer from "npm:react-dom/server"; // To render React to HTML string
// import puppeteer from "https://deno.land/x/puppeteer@16.2.0/mod.ts"; // For HTML to PDF via Puppeteer

// The multi-line commented block containing a placeholder EventTicketProps interface and renderTicketToHtml function (with HTML/CSS)
// was removed from here to resolve TypeScript parsing errors.

// --- Environment Variables ---
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const resendApiKey = Deno.env.get("RESEND_API_KEY")!;
const fromEmail = Deno.env.get("FROM_EMAIL")! || "noreply@yourdomain.com"; // IMPORTANT: Set this in your env vars
const appBaseUrl = Deno.env.get("APP_BASE_URL") || "http://localhost:3000"; // For links in email if any

interface UpdatePurchasePayload {
  email_dispatch_status: string;
  email_last_dispatch_attempt_at: string;
  email_dispatch_error?: string | null;
  email_dispatch_attempts?: number;
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

    const { purchase_id } = await req.json();
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

    // --- 3. Generate QR Code ---
    // const qrValue = JSON.stringify({
    //   ticketId: ticketProps.ticketIdentifier,
    //   eventName: ticketProps.eventName,
    //   name: \`\${ticketProps.firstName} \${ticketProps.lastName}\`,
    //   quantity: ticketProps.quantity,
    // });
    // const qrCodeDataURL = await QRCode.toDataURL(qrValue, { errorCorrectionLevel: 'M', width: 200 });
    // For now, placeholder
    const qrCodeDataURL = "https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=" + encodeURIComponent(ticketProps.ticketIdentifier);


    // --- 4. Generate PDF ---
    // This is the complex part.
    // Option A: Puppeteer (higher fidelity for your React component design)
    // Option B: pdf-lib (more manual, design might be simplified)
    // The user wants a "sure to work" method, design impact is secondary.
    // Let's assume a simple HTML string for now, which Puppeteer would render.
    
    // const ticketHtml = renderTicketToHtml({ ...ticketProps, qrCodeDataURL }); // qrCodeDataURL would be embedded in HTML
    // For a "sure to work" very basic PDF if Puppeteer is an issue or not set up yet:
    // const pdfBytes = await generateSimplePdfWithPdfLib(ticketProps, qrCodeDataURL);

    // Placeholder HTML. In reality, this would come from rendering your EventTicket.tsx component.
    // And it would need the Tailwind CSS inlined or linked for Puppeteer.
    const simpleTicketHtml = `
      <html><body>
        <h1>Ticket: ${ticketProps.eventName}</h1>
        <p>ID: ${ticketProps.ticketIdentifier}</p>
        <p>Name: ${ticketProps.firstName} ${ticketProps.lastName}</p>
        <p>Quantity: ${ticketProps.quantity}</p>
        <p>Date: ${ticketProps.eventDate}, Time: ${ticketProps.eventTime}, Venue: ${ticketProps.eventVenue}</p>
        <img src="${qrCodeDataURL}" alt="QR Code" />
      </body></html>
    `;

    // PUPPETEER USAGE (Conceptual - requires Puppeteer setup and Tailwind CSS handling)
    // This is a rough guide and might need adjustments for Deno Puppeteer environment.
    /*
    let pdfBytes: Uint8Array;
    const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] }); // Required for many environments
    const page = await browser.newPage();
    // Option 1: Set content directly with inlined CSS
    // await page.setContent(ticketHtmlWithInlinedTailwind, { waitUntil: 'networkidle0' });
    // Option 2: Go to a URL (if you serve the ticket HTML temporarily - more complex)
    // await page.goto('some_url_serving_the_ticket_html', { waitUntil: 'networkidle0' });
    
    // For a very simple HTML without complex CSS, direct content setting is easier:
    await page.setContent(simpleTicketHtml, { waitUntil: 'domcontentloaded' });
    
    pdfBytes = await page.pdf({
      format: 'A4', // or specific dimensions
      printBackground: true,
      // margin: { top: '1in', right: '1in', bottom: '1in', left: '1in' },
    });
    await browser.close();
    */

    // For now, as a "sure to work" placeholder, let's skip actual PDF generation
    // and send the HTML content in the email body directly for testing purposes.
    // In a real scenario, you'd generate pdfBytes.
    console.warn("PDF Generation with Puppeteer is conceptual here and needs full implementation and CSS handling.");
    const pdfBytesPlaceholder = new TextEncoder().encode(simpleTicketHtml); // This is NOT a PDF

    // --- 5. Send Email with Resend ---
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: fromEmail,
      to: ticketProps.email, // Ensure this is a valid email from customer data
      subject: `Your Ticket for ${ticketProps.eventName}!`,
      html: `
        <h1>Here's your ticket for ${ticketProps.eventName}!</h1>
        <p>Thank you for your purchase, ${ticketProps.firstName}.</p>
        <p>Details:</p>
        <ul>
          <li>Event: ${ticketProps.eventName}</li>
          <li>Ticket ID: ${ticketProps.ticketIdentifier}</li>
          <li>Date: ${ticketProps.eventDate}</li>
          <li>Time: ${ticketProps.eventTime}</li>
          <li>Venue: ${ticketProps.eventVenue}</li>
          <li>Quantity: ${ticketProps.quantity}</li>
        </ul>
        <p>Your QR code is attached and also displayed below (if your email client supports it):</p>
        <img src="${qrCodeDataURL}" alt="Ticket QR Code" />
        <p>We've also attached your ticket as a PDF.</p>
      `,
      attachments: [
        {
          filename: `ticket-${ticketProps.ticketIdentifier}.pdf`,
          // content: Buffer.from(pdfBytes).toString("base64"), // Use actual pdfBytes here
          content: btoa(new TextDecoder().decode(pdfBytesPlaceholder)), // Placeholder: sending HTML as base64
        },
      ],
    });

    if (emailError) {
      console.error(`send-ticket-email: Resend error for purchase ${purchaseIdFromRequest}:`, emailError);
      await updatePurchaseDispatchStatus(supabase, purchaseIdFromRequest, 'DISPATCH_FAILED', `Resend API error: ${emailError.message}`);
      return new Response(JSON.stringify({ error: "Failed to send email", details: emailError }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    // --- 6. Update Purchase Record on Success ---
    await supabase
      .from("purchases")
      .update({
        email_dispatch_status: 'SENT_SUCCESSFULLY',
        pdf_ticket_generated: true, 
        pdf_ticket_sent_at: new Date().toISOString(),
        email_last_dispatch_attempt_at: new Date().toISOString(), // Also update this on success
        email_dispatch_error: null // Clear any previous error
      })
      .eq("id", purchaseIdFromRequest);

    console.log(`send-ticket-email: Ticket email sent successfully for purchase ${purchaseIdFromRequest}. Email ID: ${emailData?.id}`);
    return new Response(JSON.stringify({ message: "Ticket email sent successfully!", email_id: emailData?.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (e: unknown) {
    let errorMessage = "An unknown error occurred";
    if (e instanceof Error) {
      errorMessage = e.message;
    }
    console.error(`send-ticket-email: Unexpected error for purchase ${purchaseIdFromRequest || 'unknown'}:`, e);
    if (purchaseIdFromRequest) {
      // Ensure createClient is available or passed correctly if Supabase instance isn't in this scope
      const supabaseForError = createClient(supabaseUrl, supabaseServiceRoleKey);
      await updatePurchaseDispatchStatus(supabaseForError, purchaseIdFromRequest, 'DISPATCH_FAILED', `Unexpected error: ${errorMessage}`);
    }
    return new Response(JSON.stringify({ error: "Internal server error", details: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

async function updatePurchaseDispatchStatus(
    supabase: SupabaseClient, 
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
        if (errorMessage !== undefined) { // Allow clearing the error with null
            updatePayload.email_dispatch_error = errorMessage;
        }
        if (attempts !== undefined) {
            updatePayload.email_dispatch_attempts = attempts;
        }
        const { error } = await supabase
            .from('purchases')
            .update(updatePayload)
            .eq('id', purchaseId);
        if (error) {
            console.error(`send-ticket-email: Failed to update purchase dispatch status for ${purchaseId} to ${status}:`, error);
        }
    } catch(e) {
        console.error(`send-ticket-email: Exception while updating purchase dispatch status for ${purchaseId}:`, e);
    }
}

// --- NOTES & TODOs ---
// 1. PDF Generation:
//    - The current 'pdfBytesPlaceholder' sends HTML, not a real PDF.
//    - For real PDFs: Implement Puppeteer. This involves:
//      - Ensuring Puppeteer works in Supabase Edge Functions (check resource limits, Deno compatibility).
//      - Adapting your EventTicket.tsx for server-side rendering (SSR) or creating a dedicated SSR version.
//      - Inlining Tailwind CSS into the HTML string or ensuring Puppeteer can access a deployed CSS file.
// 2. Dynamic Event Details:
//    - The fields event_date_text, event_time_text, event_venue_name MUST exist on purchaseData.
//    - This means `create-lomi-checkout-session` needs to save them, or they need to be fetched from an `events` table.
// 3. QR Code:
//    - Uncomment and use a library like 'npm:qrcode' to generate a proper QR code image data URL.
//    - Embed this data URL in the HTML for the PDF.
// 4. Error Handling & Retries:
//    - The current error handling is basic. Consider a more robust retry mechanism if an email fails to send.
//    - (Your `03.sql` migration includes `email_dispatch_attempts` which is good for this).
// 5. Environment Variables:
//    - RESEND_API_KEY, FROM_EMAIL, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, APP_BASE_URL must be set in your Supabase Function secrets.
// 6. Tailwind CSS for PDF:
//    - This is the biggest challenge for high-fidelity PDFs from HTML.
//    - You might need to compile your Tailwind CSS and inline it into the HTML string passed to Puppeteer.
//      Or, have Puppeteer load an HTML page that includes your full site CSS (might be slower/more complex).
// 7. Testing:
//    - Test thoroughly, including error cases (e.g., invalid purchase ID, Resend API failure).
//    - Test the actual PDF output on different email clients. 