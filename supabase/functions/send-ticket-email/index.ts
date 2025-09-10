import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.4";
import { Resend } from "npm:resend@2.0.0";
import { PDFDocument, StandardFonts, rgb, PageSizes } from "npm:pdf-lib@1.17.1";

// Helper function to convert Uint8Array to Base64 string
function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = "";
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

interface IndividualTicket {
  ticket_identifier: string;
}

// The multi-line commented block containing a placeholder EventTicketProps interface and renderTicketToHtml function (with HTML/CSS)
// was removed from here to resolve TypeScript parsing errors.

// --- Environment Variables ---
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const resendApiKey = Deno.env.get("RESEND_API_KEY")!;
const fromEmail = Deno.env.get("FROM_EMAIL") || "noreply@send.lomi.africa";
const APP_BASE_URL = Deno.env.get("APP_BASE_URL") || "http://localhost:3000";
const defaultLogoUrl = `${supabaseUrl}/storage/v1/object/public/assets/logo.png`;

// --- Main Serve Function ---
Deno.serve(async (req: Request) => {
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

    // --- 1. Fetch Purchase, Customer, and Event Details using RPC ---
    console.log(
      `send-ticket-email: Fetching purchase data for ${purchaseIdFromRequest}`,
    );
    const { data: purchaseDataArray, error: purchaseError } =
      await supabase.rpc("get_purchase_for_email_dispatch", {
        p_purchase_id: purchaseIdFromRequest,
      });

    if (purchaseError || !purchaseDataArray || purchaseDataArray.length === 0) {
      console.error(
        `send-ticket-email: Error fetching purchase ${purchaseIdFromRequest}:`,
        purchaseError,
      );
      // Try to update status if we have a purchase ID
      if (purchaseIdFromRequest) {
        await supabase
          .rpc("update_email_dispatch_status", {
            p_purchase_id: purchaseIdFromRequest,
            p_email_dispatch_status: "DISPATCH_FAILED",
            p_email_dispatch_error: `Purchase not found or DB error: ${purchaseError?.message}`,
          })
          .catch((err: unknown) =>
            console.error("Failed to update error status:", err),
          );
      }
      return new Response(
        JSON.stringify({ error: "Purchase not found or database error" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 404,
        },
      );
    }

    const purchaseData = purchaseDataArray[0];

    // Check if email already sent or in progress to prevent duplicates if retried
    if (
      purchaseData.email_dispatch_status === "SENT_SUCCESSFULLY" ||
      purchaseData.email_dispatch_status === "DISPATCH_IN_PROGRESS"
    ) {
      console.warn(
        `send-ticket-email: Ticket email for purchase ${purchaseIdFromRequest} already processed or in progress (${purchaseData.email_dispatch_status}). Skipping.`,
      );
      return new Response(
        JSON.stringify({
          message: "Ticket email already processed or in progress.",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      );
    }

    // Update status to in progress using RPC
    console.log(
      `send-ticket-email: Setting purchase ${purchaseIdFromRequest} to DISPATCH_IN_PROGRESS`,
    );
    const { error: updateError } = await supabase.rpc(
      "update_email_dispatch_status",
      {
        p_purchase_id: purchaseIdFromRequest,
        p_email_dispatch_status: "DISPATCH_IN_PROGRESS",
        p_email_dispatch_attempts:
          (purchaseData.email_dispatch_attempts || 0) + 1,
      },
    );

    if (updateError) {
      console.error(
        `send-ticket-email: Failed to update dispatch status for ${purchaseIdFromRequest}:`,
        updateError,
      );
      return new Response(
        JSON.stringify({ error: "Failed to update dispatch status" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        },
      );
    }

    // --- 2. Prepare Data for Ticket ---
    if (!purchaseData.customer_email || !purchaseData.customer_name) {
      console.error(
        `send-ticket-email: Customer data missing for purchase ${purchaseIdFromRequest}`,
      );
      await supabase.rpc("update_email_dispatch_status", {
        p_purchase_id: purchaseIdFromRequest,
        p_email_dispatch_status: "DISPATCH_FAILED",
        p_email_dispatch_error: "Customer data missing for purchase.",
      });
      return new Response(JSON.stringify({ error: "Customer data missing" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    const customerName = purchaseData.customer_name || "Valued Customer";
    const nameParts = customerName.split(" ");
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(" ");

    let uniqueTicketId = purchaseData.unique_ticket_identifier;
    if (!uniqueTicketId) {
      uniqueTicketId = crypto.randomUUID();
      console.log(
        `send-ticket-email: Generated unique ticket ID ${uniqueTicketId} for purchase ${purchaseIdFromRequest}`,
      );
      // Update using RPC
      await supabase.rpc("update_email_dispatch_status", {
        p_purchase_id: purchaseIdFromRequest,
        p_email_dispatch_status: "DISPATCH_IN_PROGRESS",
        p_unique_ticket_identifier: uniqueTicketId,
      });
    }

    // Event data for ticket
    const eventDataForTicket = {
      eventName: purchaseData.event_title || "Amazing Event",
      eventDate: purchaseData.event_date_text || "To Be Announced",
      eventTime: purchaseData.event_time_text || "Soon",
      eventVenue: purchaseData.event_venue_name || "Secret Location",
    };

    // Calculate actual ticket quantity for bundles
    const isBundle = purchaseData.is_bundle || false;
    const ticketsPerBundle = purchaseData.tickets_per_bundle || 1;
    const actualTicketQuantity = isBundle
      ? purchaseData.quantity * ticketsPerBundle
      : purchaseData.quantity;

    console.log(
      `Bundle calculation: isBundle=${isBundle}, quantity=${purchaseData.quantity}, ticketsPerBundle=${ticketsPerBundle}, actualTicketQuantity=${actualTicketQuantity}`,
    );

    // --- NEW LOGIC: Decide between individual tickets or legacy single QR ---
    const INDIVIDUAL_TICKETS_CUTOFF_DATE = new Date("2025-07-01"); // Use new system for all purchases from July 1, 2025
    const purchaseDate = new Date(purchaseData.created_at || Date.now());
    const useIndividualTickets =
      purchaseDate >= INDIVIDUAL_TICKETS_CUTOFF_DATE &&
      actualTicketQuantity > 1;

    let ticketIdentifiers: string[] = [];
    const qrCodeData: Array<{ identifier: string; qrCodeBytes: Uint8Array }> =
      [];

    if (useIndividualTickets) {
      // Generate individual tickets for new multi-person purchases
      console.log(
        `Generating individual tickets for purchase ${purchaseIdFromRequest} (${actualTicketQuantity} tickets)`,
      );

      const { data: generatedTickets, error: generateError } =
        await supabase.rpc("generate_individual_tickets_for_purchase", {
          p_purchase_id: purchaseIdFromRequest,
        });

      if (generateError || !generatedTickets) {
        console.error(
          `Failed to generate individual tickets for ${purchaseIdFromRequest}:`,
          generateError,
        );
        await supabase.rpc("update_email_dispatch_status", {
          p_purchase_id: purchaseIdFromRequest,
          p_email_dispatch_status: "DISPATCH_FAILED",
          p_email_dispatch_error: `Individual ticket generation failed: ${generateError?.message}`,
        });
        return new Response(
          JSON.stringify({ error: "Failed to generate individual tickets" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      ticketIdentifiers = (generatedTickets as IndividualTicket[]).map(
        (t: IndividualTicket) => t.ticket_identifier,
      );

      // Generate QR codes for each individual ticket
      for (const ticketId of ticketIdentifiers) {
        const verificationUrl = `${APP_BASE_URL}/verify?id=${encodeURIComponent(ticketId)}`;
        const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&format=png&data=${encodeURIComponent(verificationUrl)}`;

        try {
          const qrResponse = await fetch(qrCodeUrl);
          if (!qrResponse.ok)
            throw new Error(`Failed to fetch QR code for ${ticketId}`);
          const qrCodeBytes = new Uint8Array(await qrResponse.arrayBuffer());
          qrCodeData.push({ identifier: ticketId, qrCodeBytes });
        } catch (qrError) {
          console.error(
            `Failed to generate QR for individual ticket ${ticketId}:`,
            qrError,
          );
          await supabase.rpc("update_email_dispatch_status", {
            p_purchase_id: purchaseIdFromRequest,
            p_email_dispatch_status: "DISPATCH_FAILED",
            p_email_dispatch_error: `QR generation failed for individual ticket: ${qrError}`,
          });
          return new Response(
            JSON.stringify({
              error: "Failed to generate QR codes for individual tickets",
            }),
            {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }
      }
    } else {
      // Legacy single QR code system
      console.log(
        `Using legacy single QR system for purchase ${purchaseIdFromRequest}`,
      );
      ticketIdentifiers = [uniqueTicketId];

      // --- 3. Generate QR Code Bytes (original logic) ---
      const verificationUrl = `${APP_BASE_URL}/verify?id=${encodeURIComponent(uniqueTicketId)}`;
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&format=png&data=${encodeURIComponent(verificationUrl)}`;
      let qrCodeImageBytes: Uint8Array;
      try {
        const qrResponse = await fetch(qrCodeUrl);
        if (!qrResponse.ok)
          throw new Error(
            `Failed to fetch QR code (${qrResponse.status} from ${qrCodeUrl})`,
          );
        qrCodeImageBytes = new Uint8Array(await qrResponse.arrayBuffer());
        qrCodeData.push({
          identifier: uniqueTicketId,
          qrCodeBytes: qrCodeImageBytes,
        });
      } catch (qrError) {
        console.error(
          `Failed to generate QR for ${purchaseIdFromRequest}:`,
          qrError,
        );
        const errorMessage =
          qrError instanceof Error
            ? qrError.message
            : "Unknown QR generation error";
        await supabase.rpc("update_email_dispatch_status", {
          p_purchase_id: purchaseIdFromRequest,
          p_email_dispatch_status: "DISPATCH_FAILED",
          p_email_dispatch_error: `QR generation error: ${errorMessage}`,
        });
        return new Response(
          JSON.stringify({
            error: "Failed to generate QR code",
            details: errorMessage,
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    }

    // Helper functions for quantity-based text (inspired by ticket.tsx)
    const getAdmissionText = (quantity: number) => {
      if (quantity === 1) return "ADMIT ONE";
      if (quantity === 2) return "ADMIT TWO";
      if (quantity === 3) return "ADMIT THREE";
      return `ADMIT ${quantity}`;
    };

    const getNameText = (
      firstName: string,
      lastName: string,
      quantity: number,
    ) => {
      if (quantity === 1) return `${firstName} ${lastName}`;
      if (quantity === 2) return `${firstName} ${lastName} + Friend`;
      return `${firstName} ${lastName} + Friends`;
    };

    const ticketProps = {
      firstName: firstName,
      lastName: lastName,
      email: purchaseData.customer_email,
      phone: purchaseData.customer_phone || undefined,
      eventName: eventDataForTicket.eventName,
      eventDate: eventDataForTicket.eventDate,
      eventTime: eventDataForTicket.eventTime,
      eventVenue: eventDataForTicket.eventVenue,
      quantity: actualTicketQuantity, // Use actual ticket quantity for display
      ticketIdentifier: ticketIdentifiers[0], // Primary identifier for compatibility
      isBundle: isBundle,
      bundleQuantity: isBundle ? purchaseData.quantity : undefined, // Original bundle quantity
      useIndividualTickets: useIndividualTickets,
      ticketIdentifiers: ticketIdentifiers, // All ticket identifiers
    };

    // --- 4. Generate Clean, Simple PDF with pdf-lib ---
    const pdfsToAttach: Array<{ filename: string; content: string }> = [];

    if (useIndividualTickets) {
      // Generate individual PDFs for each ticket
      for (let i = 0; i < qrCodeData.length; i++) {
        const qr = qrCodeData[i];
        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage(PageSizes.A4);
        const { width, height } = page.getSize();
        const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const helveticaBold = await pdfDoc.embedFont(
          StandardFonts.HelveticaBold,
        );

        // Simple color scheme
        const blackColor = rgb(0, 0, 0);
        const whiteColor = rgb(1, 1, 1);
        const accentColor = rgb(0.2, 0.6, 1); // Nice blue
        const greyColor = rgb(0.6, 0.6, 0.6);

        // Draw clean dark background
        page.drawRectangle({
          x: 0,
          y: 0,
          width: width,
          height: height,
          color: blackColor,
        });

        // Start from top with QR code
        let y = height - 100;

        // QR Code for this specific ticket
        try {
          const qrImage = await pdfDoc.embedPng(qr.qrCodeBytes);
          const qrSize = 200;
          const qrX = (width - qrSize) / 2;
          const qrY = y - qrSize;

          // Clean white background for QR code
          const bgPadding = 20;
          page.drawRectangle({
            x: qrX - bgPadding,
            y: qrY - bgPadding,
            width: qrSize + bgPadding * 2,
            height: qrSize + bgPadding * 2,
            color: whiteColor,
          });

          page.drawImage(qrImage, {
            x: qrX,
            y: qrY,
            width: qrSize,
            height: qrSize,
          });

          y = qrY - 40;
        } catch (imgError) {
          const embedErrorMsg =
            imgError instanceof Error
              ? imgError.message
              : "Unknown QR image embedding error";
          console.error(
            `Error embedding QR for ticket ${i + 1}:`,
            embedErrorMsg,
          );

          const errorText = "[QR Code Unavailable]";
          const errorWidth = errorText.length * 8;
          page.drawText(errorText, {
            x: (width - errorWidth) / 2,
            y: y - 30,
            size: 14,
            font: helvetica,
            color: rgb(0.8, 0.2, 0.2),
          });
          y -= 80;
        }

        // ADMIT ONE badge for individual tickets
        const admissionText = "ADMIT ONE";
        const admissionTextSize = 18;
        const textWidth = admissionText.length * (admissionTextSize * 0.6);
        const badgeWidth = textWidth + 60;
        const badgeHeight = 45;
        const badgeX = (width - badgeWidth) / 2;
        const badgeY = y - badgeHeight;

        // Simple rectangular badge
        page.drawRectangle({
          x: badgeX,
          y: badgeY,
          width: badgeWidth,
          height: badgeHeight,
          color: accentColor,
        });

        // Text centered in the badge
        const textX = badgeX + (badgeWidth - textWidth) / 2;
        const textY = badgeY + (badgeHeight - admissionTextSize) / 2 + 5;

        page.drawText(admissionText, {
          x: textX,
          y: textY,
          size: admissionTextSize,
          font: helveticaBold,
          color: whiteColor,
        });

        y = badgeY - 40;

        // Display name for individual ticket (no "+Friends" since it's individual)
        const displayName = `${ticketProps.firstName} ${ticketProps.lastName}`;
        const displayNameWidth = displayName.length * 9;
        page.drawText(displayName, {
          x: (width - displayNameWidth) / 2,
          y: y,
          size: 18,
          font: helveticaBold,
          color: whiteColor,
        });

        y -= 35;

        // Event title below the name
        const eventTitleWidth = ticketProps.eventName.length * 8;
        page.drawText(ticketProps.eventName, {
          x: (width - eventTitleWidth) / 2,
          y: y,
          size: 16,
          font: helvetica,
          color: accentColor,
        });

        // Date/time and venue at the bottom with interpunct
        const bottomY = 80;
        const eventDetails = `${ticketProps.eventDate} at ${ticketProps.eventTime} • ${ticketProps.eventVenue}`;
        const eventDetailsWidth = eventDetails.length * 7;
        page.drawText(eventDetails, {
          x: (width - eventDetailsWidth) / 2,
          y: bottomY,
          size: 14,
          font: helvetica,
          color: whiteColor,
        });

        // Add ticket number indicator
        const ticketNumberText = `Ticket ${i + 1} of ${actualTicketQuantity}`;
        const ticketNumberWidth = ticketNumberText.length * 6;
        page.drawText(ticketNumberText, {
          x: (width - ticketNumberWidth) / 2,
          y: 50,
          size: 12,
          font: helvetica,
          color: greyColor,
        });

        const individualPdfBytes = await pdfDoc.save();
        pdfsToAttach.push({
          filename: `Ticket-${i + 1}-${qr.identifier.substring(0, 8)}.pdf`,
          content: uint8ArrayToBase64(individualPdfBytes),
        });
      }
    } else {
      // Legacy single PDF generation
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage(PageSizes.A4);
      const { width, height } = page.getSize();
      const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      // Simple color scheme
      const blackColor = rgb(0, 0, 0);
      const whiteColor = rgb(1, 1, 1);
      const accentColor = rgb(0.2, 0.6, 1); // Nice blue
      const greyColor = rgb(0.6, 0.6, 0.6);

      // Draw clean dark background
      page.drawRectangle({
        x: 0,
        y: 0,
        width: width,
        height: height,
        color: blackColor,
      });

      // Start from top with QR code
      let y = height - 100;

      // QR Code at the very top
      if (qrCodeData.length > 0) {
        const qr = qrCodeData[0]; // Use first (and only) QR code for legacy
        try {
          const qrImage = await pdfDoc.embedPng(qr.qrCodeBytes);
          const qrSize = 200;
          const qrX = (width - qrSize) / 2;
          const qrY = y - qrSize;

          // Clean white background for QR code
          const bgPadding = 20;
          page.drawRectangle({
            x: qrX - bgPadding,
            y: qrY - bgPadding,
            width: qrSize + bgPadding * 2,
            height: qrSize + bgPadding * 2,
            color: whiteColor,
          });

          page.drawImage(qrImage, {
            x: qrX,
            y: qrY,
            width: qrSize,
            height: qrSize,
          });

          y = qrY - 40;
        } catch (imgError) {
          const embedErrorMsg =
            imgError instanceof Error
              ? imgError.message
              : "Unknown QR image embedding error";
          console.error(
            `Error embedding QR for ${purchaseIdFromRequest}: ${embedErrorMsg}`,
          );

          const errorText = "[QR Code Unavailable]";
          const errorWidth = errorText.length * 8;
          page.drawText(errorText, {
            x: (width - errorWidth) / 2,
            y: y - 30,
            size: 14,
            font: helvetica,
            color: rgb(0.8, 0.2, 0.2),
          });
          y -= 80;
        }
      } else {
        const missingText = "[QR Code Data Missing]";
        const missingWidth = missingText.length * 8;
        page.drawText(missingText, {
          x: (width - missingWidth) / 2,
          y: y - 30,
          size: 14,
          font: helvetica,
          color: greyColor,
        });
        y -= 80;
      }

      // ADMIT badge - simple rectangle
      const admissionText = getAdmissionText(ticketProps.quantity);
      const admissionTextSize = 18;
      const textWidth = admissionText.length * (admissionTextSize * 0.6); // Approximate text width
      const badgeWidth = textWidth + 60; // More padding for better look
      const badgeHeight = 45;
      const badgeX = (width - badgeWidth) / 2;
      const badgeY = y - badgeHeight;

      // Simple rectangular badge
      page.drawRectangle({
        x: badgeX,
        y: badgeY,
        width: badgeWidth,
        height: badgeHeight,
        color: accentColor,
      });

      // Text centered in the badge
      const textX = badgeX + (badgeWidth - textWidth) / 2;
      const textY = badgeY + (badgeHeight - admissionTextSize) / 2 + 5; // +5 for better vertical centering

      page.drawText(admissionText, {
        x: textX,
        y: textY,
        size: admissionTextSize,
        font: helveticaBold,
        color: whiteColor,
      });

      y = badgeY - 40;

      // Display name based on quantity logic - centered below badge
      const displayName = getNameText(
        ticketProps.firstName,
        ticketProps.lastName,
        ticketProps.quantity,
      );
      const displayNameWidth = displayName.length * 9;
      page.drawText(displayName, {
        x: (width - displayNameWidth) / 2,
        y: y,
        size: 18,
        font: helveticaBold,
        color: whiteColor,
      });

      y -= 35;

      // Event title below the name
      const eventTitleWidth = ticketProps.eventName.length * 8;
      page.drawText(ticketProps.eventName, {
        x: (width - eventTitleWidth) / 2,
        y: y,
        size: 16,
        font: helvetica,
        color: accentColor,
      });

      // Date/time and venue at the bottom with interpunct
      const bottomY = 80;
      const eventDetails = `${ticketProps.eventDate} at ${ticketProps.eventTime} • ${ticketProps.eventVenue}`;
      const eventDetailsWidth = eventDetails.length * 7;
      page.drawText(eventDetails, {
        x: (width - eventDetailsWidth) / 2,
        y: bottomY,
        size: 14,
        font: helvetica,
        color: whiteColor,
      });

      const pdfBytes = await pdfDoc.save();
      pdfsToAttach.push({
        filename: `Ticket-${ticketProps.ticketIdentifier}.pdf`,
        content: uint8ArrayToBase64(pdfBytes),
      });
    }

    // --- 5. Send Email with Resend (with PDF attachment) ---
    // Fetch and embed the logo image as Base64 from Supabase storage to prevent email clients from blocking it.
    // If embedding fails, fall back to using the URL directly. Logo loading never affects email sending.
    let logoSrc = defaultLogoUrl; // Default to URL - email sending always works

    try {
      console.log("Attempting to embed logo from Supabase storage bucket into email...");
      const logoResponse = await fetch(defaultLogoUrl);

      if (logoResponse.ok) {
        try {
          const logoBytes = new Uint8Array(await logoResponse.arrayBuffer());
          const logoBase64 = uint8ArrayToBase64(logoBytes);
          logoSrc = `data:image/png;base64,${logoBase64}`;
          console.log(
            "Successfully fetched and encoded logo from Supabase storage for email embedding.",
          );
        } catch (encodingError) {
          // If base64 encoding fails, fall back to URL
          console.warn(
            "Failed to encode logo as base64, falling back to URL:",
            encodingError,
          );
          logoSrc = defaultLogoUrl;
        }
      } else {
        // If fetch fails, fall back to URL
        console.warn(
          `Failed to fetch logo from Supabase storage (status: ${logoResponse.status}), using URL fallback.`,
        );
        logoSrc = defaultLogoUrl;
      }
    } catch (logoError) {
      // Any error in logo processing - just log and continue with URL
      console.warn(
        "Error processing logo, using URL fallback (email sending unaffected):",
        logoError instanceof Error ? logoError.message : logoError,
      );
      logoSrc = defaultLogoUrl;
    }

    const emailHtmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Votre e-ticket pour ${ticketProps.eventName}</title>
        <style type="text/css">
          .logo-img { width: 100px; height: auto; border-radius: 6px; object-fit: contain; }
          .email-header { padding: 20px; text-align: center; background-color: #ffffff; }
        </style>
      </head>
      <body style="font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; color: #333;">
        
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          
          <div class="email-header">
            <img src="${logoSrc}" alt="Djaouli Entertainment" class="logo-img" />
          </div>
          
          <div style="padding: 30px;">
            <h1 style="color: #333; font-size: 24px; margin-bottom: 20px;">Votre ticket pour ${ticketProps.eventName}</h1>
          
          <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
            Hello ${ticketProps.firstName},
          </p>
          
          <p style="font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
            Merci pour votre achat ! Votre e-ticket pour <strong>${ticketProps.eventName}</strong> a été généré avec succès.
            ${ticketProps.isBundle ? `<br><br>Vous avez acheté ${ticketProps.bundleQuantity} bundle(s) qui inclut ${ticketProps.quantity} ticket(s) au total.` : ""}
            ${ticketProps.useIndividualTickets ? `<br><br><strong>🎟️ Vous avez reçu ${ticketProps.quantity} QR codes individuels</strong> - un pour chaque personne.` : ""}
          </p>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 6px; margin-bottom: 30px;">
            <h2 style="color: #333; font-size: 18px; margin-bottom: 15px; margin-top: 0;">Summary</h2>
            
            <p style="margin: 8px 0; font-size: 14px;">
              <strong>Événement :</strong> ${ticketProps.eventName}
            </p>
            
            <p style="margin: 8px 0; font-size: 14px;">
              <strong>Ticket ID :</strong> ${ticketProps.ticketIdentifier}
            </p>
            
            <p style="margin: 8px 0; font-size: 14px;">
              <strong>Date :</strong> ${ticketProps.eventDate} à ${ticketProps.eventTime}
            </p>
            
            <p style="margin: 8px 0; font-size: 14px;">
              <strong>Lieu :</strong> ${ticketProps.eventVenue}
            </p>
          </div>
          
          <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
            ${
              ticketProps.useIndividualTickets
                ? `Vos ${ticketProps.quantity} QR codes se trouvent en pièce jointe. Chaque personne doit utiliser son propre QR code le jour J.`
                : `Votre QR code se trouve en pièce jointe. Conservez-le précieusement et présentez-le nous le jour J.`
            }
          </p>

          <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
            Si vous avez des questions, contactez notre équipe en répondant à cet email.
          </p>
          
          <p style="font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
            Nous avons hâte de vous retrouver !
          </p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          
          <p style="font-size: 12px; color: #666; text-align: center; margin: 0;">
            © ${new Date().getFullYear()} Djaouli Entertainment • Fait avec ❤️ en Côte d'Ivoire
          </p>
          
          <p style="font-size: 12px; color: #666; text-align: center; margin: 5px 0 0 0;">
            Ceci est un email automatique.
          </p>
          
          </div>
        </div>
        
      </body>
      </html>`;

    const { data: emailData, error: emailError } = await resend.emails.send({
      from: `Djaouli Entertainment <${fromEmail}>`,
      to: ticketProps.email,
      reply_to: "djaoulient@gmail.com",
      subject: `Votre ticket pour ${ticketProps.eventName}`,
      html: emailHtmlBody,
      attachments: pdfsToAttach,
    });

    if (emailError) {
      const resendErrorMsg =
        emailError instanceof Error
          ? emailError.message
          : JSON.stringify(emailError);
      console.error(
        `Resend error for purchase ${purchaseIdFromRequest}:`,
        resendErrorMsg,
      );
      await supabase.rpc("update_email_dispatch_status", {
        p_purchase_id: purchaseIdFromRequest,
        p_email_dispatch_status: "DISPATCH_FAILED",
        p_email_dispatch_error: `Resend API error: ${resendErrorMsg}`,
      });
      return new Response(
        JSON.stringify({
          error: "Failed to send email",
          details: resendErrorMsg,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // --- 6. Update Purchase Record on Success ---
    console.log(
      `send-ticket-email: Email sent successfully for purchase ${purchaseIdFromRequest}. Email ID: ${emailData?.id}`,
    );
    await supabase.rpc("update_email_dispatch_status", {
      p_purchase_id: purchaseIdFromRequest,
      p_email_dispatch_status: "SENT_SUCCESSFULLY",
      p_pdf_ticket_generated: true,
      p_pdf_ticket_sent_at: new Date().toISOString(),
      p_email_dispatch_error: null,
    });

    console.log(
      `Email with PDF sent for ${purchaseIdFromRequest}. Email ID: ${emailData?.id}`,
    );
    return new Response(
      JSON.stringify({
        message: "Ticket email with PDF sent successfully!",
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
      `Unexpected error for ${purchaseIdFromRequest || "unknown"}:`,
      e,
    );
    if (purchaseIdFromRequest) {
      try {
        const supabaseForErrorFallback = createClient(
          supabaseUrl!,
          supabaseServiceRoleKey!,
        );
        await supabaseForErrorFallback.rpc("update_email_dispatch_status", {
          p_purchase_id: purchaseIdFromRequest,
          p_email_dispatch_status: "DISPATCH_FAILED",
          p_email_dispatch_error: `Unexpected error: ${errorMessage}`,
        });
      } catch (updateError) {
        console.error(
          `Failed to update error status for ${purchaseIdFromRequest}:`,
          updateError,
        );
      }
    }
    return new Response(
      JSON.stringify({ error: "Internal server error", details: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
