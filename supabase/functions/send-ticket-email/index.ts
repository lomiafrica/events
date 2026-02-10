import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.4";
import { Resend } from "npm:resend@2.0.0";
import { PDFDocument, StandardFonts, rgb } from "npm:pdf-lib@1.17.1";

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
const fromEmail = Deno.env.get("FROM_EMAIL") || "noreply@tickets.djaoulient.com";
const APP_BASE_URL = Deno.env.get("APP_BASE_URL") || "http://localhost:3000";
const defaultLogoUrl = "https://www.djaoulient.com/icon.png";

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

    // Event data for ticket — only set date/time/venue when we have real values (omit row if TBA/missing)
    const rawDate = (purchaseData.event_date_text || "").trim();
    const rawTime = (purchaseData.event_time_text || "").trim();
    const rawVenue = (purchaseData.event_venue_name || "").trim();
    const tbaOrEmpty = (v: string) =>
      !v ||
      v === "TBA" ||
      v === "Time TBA" ||
      v === "Venue TBA" ||
      v === "À confirmer" ||
      v === "Lieu à confirmer" ||
      v === "To Be Announced";
    const hasDate = !tbaOrEmpty(rawDate);
    const hasTime = !tbaOrEmpty(rawTime);
    const hasVenue = !tbaOrEmpty(rawVenue);
    const eventDataForTicket = {
      eventName: purchaseData.event_title || "Amazing Event",
      eventDate: hasDate ? rawDate : null as string | null,
      eventTime: hasTime ? rawTime : null as string | null,
      eventVenue: hasVenue ? rawVenue : null as string | null,
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
      hasDate: hasDate,
      hasTime: hasTime,
      hasVenue: hasVenue,
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
      // Generate individual PDFs for each ticket (receipt-style layout like kamayakoi)
      const receiptWidth = 250;
      const receiptHeight = 400;
      const rightAlignX = receiptWidth - 10;

      for (let i = 0; i < qrCodeData.length; i++) {
        const qr = qrCodeData[i];
        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage([receiptWidth, receiptHeight]);
        const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const helveticaBold = await pdfDoc.embedFont(
          StandardFonts.HelveticaBold,
        );

        const blackColor = rgb(0, 0, 0);
        const whiteColor = rgb(1, 1, 1);
        const greyColor = rgb(0.5, 0.5, 0.5);

        page.drawRectangle({
          x: 0,
          y: 0,
          width: receiptWidth,
          height: receiptHeight,
          color: whiteColor,
        });
        page.drawRectangle({
          x: 2,
          y: 2,
          width: receiptWidth - 4,
          height: receiptHeight - 4,
          borderColor: rgb(0.9, 0.9, 0.9),
          borderWidth: 1,
        });

        let y = receiptHeight - 20;

        page.drawText("DJAOULI ENTERTAINMENT", {
          x: 10,
          y: y,
          size: 10,
          font: helveticaBold,
          color: blackColor,
        });
        y -= 15;
        page.drawText("VOTRE E-TICKET", {
          x: 10,
          y: y,
          size: 8,
          font: helvetica,
          color: greyColor,
        });
        y -= 25;

        page.drawLine({
          start: { x: 10, y: y },
          end: { x: receiptWidth - 10, y: y },
          thickness: 0.5,
          color: greyColor,
        });
        y -= 15;

        page.drawText("ÉVÉNEMENT", {
          x: 10,
          y: y,
          size: 7,
          font: helveticaBold,
          color: blackColor,
        });
        const eventNameW = helvetica.widthOfTextAtSize(ticketProps.eventName, 7);
        page.drawText(ticketProps.eventName, {
          x: rightAlignX - eventNameW,
          y: y,
          size: 7,
          font: helvetica,
          color: blackColor,
        });
        y -= 12;

        if (ticketProps.eventDate) {
          page.drawText("DATE", {
            x: 10,
            y: y,
            size: 7,
            font: helveticaBold,
            color: blackColor,
          });
          const dateW = helvetica.widthOfTextAtSize(ticketProps.eventDate, 7);
          page.drawText(ticketProps.eventDate, {
            x: rightAlignX - dateW,
            y: y,
            size: 7,
            font: helvetica,
            color: blackColor,
          });
          y -= 12;
        }
        if (ticketProps.eventTime) {
          page.drawText("HEURE", {
            x: 10,
            y: y,
            size: 7,
            font: helveticaBold,
            color: blackColor,
          });
          const timeW = helvetica.widthOfTextAtSize(ticketProps.eventTime, 7);
          page.drawText(ticketProps.eventTime, {
            x: rightAlignX - timeW,
            y: y,
            size: 7,
            font: helvetica,
            color: blackColor,
          });
          y -= 12;
        }
        if (ticketProps.eventVenue) {
          page.drawText("LIEU", {
            x: 10,
            y: y,
            size: 7,
            font: helveticaBold,
            color: blackColor,
          });
          const venueW = helvetica.widthOfTextAtSize(
            ticketProps.eventVenue,
            7,
          );
          page.drawText(ticketProps.eventVenue, {
            x: rightAlignX - venueW,
            y: y,
            size: 7,
            font: helvetica,
            color: blackColor,
          });
          y -= 12;
        }

        page.drawText("TITULAIRE", {
          x: 10,
          y: y,
          size: 7,
          font: helveticaBold,
          color: blackColor,
        });
        const holderName = `${ticketProps.firstName} ${ticketProps.lastName}`;
        const holderW = helvetica.widthOfTextAtSize(holderName, 7);
        page.drawText(holderName, {
          x: rightAlignX - holderW,
          y: y,
          size: 7,
          font: helvetica,
          color: blackColor,
        });
        y -= 20;

        page.drawLine({
          start: { x: 10, y: y },
          end: { x: receiptWidth - 10, y: y },
          thickness: 0.5,
          color: greyColor,
        });
        y -= 15;

        try {
          const qrImage = await pdfDoc.embedPng(qr.qrCodeBytes);
          const qrSize = 100;
          const qrX = (receiptWidth - qrSize) / 2;
          const qrY = y - qrSize;
          const qrPadding = 8;

          page.drawRectangle({
            x: qrX - qrPadding,
            y: qrY - qrPadding,
            width: qrSize + qrPadding * 2,
            height: qrSize + qrPadding * 2,
            borderColor: rgb(0, 0, 0),
            borderWidth: 1,
          });
          page.drawImage(qrImage, {
            x: qrX,
            y: qrY,
            width: qrSize,
            height: qrSize,
          });
          y = qrY - 10;
        } catch (imgError) {
          const embedErrorMsg =
            imgError instanceof Error
              ? imgError.message
              : "Unknown QR image embedding error";
          console.error(
            `Error embedding QR for ticket ${i + 1}:`,
            embedErrorMsg,
          );
          const errorText = "[QR CODE INDISPONIBLE]";
          page.drawText(errorText, {
            x: (receiptWidth - 90) / 2,
            y: y - 15,
            size: 6,
            font: helvetica,
            color: rgb(0.8, 0.2, 0.2),
          });
          y -= 25;
        }

        const bottomY = 25;
        const footerMsg1 = "Présentez ce QR code à l'entrée";
        const footerMsg1W = helvetica.widthOfTextAtSize(footerMsg1, 5);
        page.drawText(footerMsg1, {
          x: rightAlignX - footerMsg1W,
          y: bottomY,
          size: 5,
          font: helvetica,
          color: greyColor,
        });
        const ticketNumText = `Ticket ${i + 1} / ${actualTicketQuantity}`;
        const ticketNumW = helvetica.widthOfTextAtSize(ticketNumText, 5);
        page.drawText(ticketNumText, {
          x: rightAlignX - ticketNumW,
          y: bottomY - 8,
          size: 5,
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
      // Legacy single PDF generation (receipt-style layout like kamayakoi)
      const receiptWidth = 250;
      const receiptHeight = 450;
      const legacyRightAlignX = receiptWidth - 10;

      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([receiptWidth, receiptHeight]);
      const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      const blackColor = rgb(0, 0, 0);
      const whiteColor = rgb(1, 1, 1);
      const greyColor = rgb(0.5, 0.5, 0.5);

      page.drawRectangle({
        x: 0,
        y: 0,
        width: receiptWidth,
        height: receiptHeight,
        color: whiteColor,
      });
      page.drawRectangle({
        x: 2,
        y: 2,
        width: receiptWidth - 4,
        height: receiptHeight - 4,
        borderColor: rgb(0.9, 0.9, 0.9),
        borderWidth: 1,
      });

      let y = receiptHeight - 20;

      page.drawText("DJAOULI ENTERTAINMENT", {
        x: 10,
        y: y,
        size: 10,
        font: helveticaBold,
        color: blackColor,
      });
      y -= 15;
      page.drawText("VOTRE E-TICKET", {
        x: 10,
        y: y,
        size: 8,
        font: helvetica,
        color: greyColor,
      });
      y -= 25;

      page.drawLine({
        start: { x: 10, y: y },
        end: { x: receiptWidth - 10, y: y },
        thickness: 0.5,
        color: greyColor,
      });
      y -= 15;

      page.drawText("ÉVÉNEMENT", {
        x: 10,
        y: y,
        size: 7,
        font: helveticaBold,
        color: blackColor,
      });
      const legacyEventNameW = helvetica.widthOfTextAtSize(
        ticketProps.eventName,
        7,
      );
      page.drawText(ticketProps.eventName, {
        x: legacyRightAlignX - legacyEventNameW,
        y: y,
        size: 7,
        font: helvetica,
        color: blackColor,
      });
      y -= 12;

      if (ticketProps.eventDate) {
        page.drawText("DATE", {
          x: 10,
          y: y,
          size: 7,
          font: helveticaBold,
          color: blackColor,
        });
        const legacyDateW = helvetica.widthOfTextAtSize(
          ticketProps.eventDate,
          7,
        );
        page.drawText(ticketProps.eventDate, {
          x: legacyRightAlignX - legacyDateW,
          y: y,
          size: 7,
          font: helvetica,
          color: blackColor,
        });
        y -= 12;
      }
      if (ticketProps.eventTime) {
        page.drawText("HEURE", {
          x: 10,
          y: y,
          size: 7,
          font: helveticaBold,
          color: blackColor,
        });
        const legacyTimeW = helvetica.widthOfTextAtSize(
          ticketProps.eventTime,
          7,
        );
        page.drawText(ticketProps.eventTime, {
          x: legacyRightAlignX - legacyTimeW,
          y: y,
          size: 7,
          font: helvetica,
          color: blackColor,
        });
        y -= 12;
      }
      if (ticketProps.eventVenue) {
        page.drawText("LIEU", {
          x: 10,
          y: y,
          size: 7,
          font: helveticaBold,
          color: blackColor,
        });
        const legacyVenueW = helvetica.widthOfTextAtSize(
          ticketProps.eventVenue,
          7,
        );
        page.drawText(ticketProps.eventVenue, {
          x: legacyRightAlignX - legacyVenueW,
          y: y,
          size: 7,
          font: helvetica,
          color: blackColor,
        });
        y -= 12;
      }

      page.drawText("TITULAIRE", {
        x: 10,
        y: y,
        size: 7,
        font: helveticaBold,
        color: blackColor,
      });
      const legacyDisplayName = getNameText(
        ticketProps.firstName,
        ticketProps.lastName,
        ticketProps.quantity,
      );
      const legacyHolderW = helvetica.widthOfTextAtSize(
        legacyDisplayName,
        7,
      );
      page.drawText(legacyDisplayName, {
        x: legacyRightAlignX - legacyHolderW,
        y: y,
        size: 7,
        font: helvetica,
        color: blackColor,
      });
      y -= 20;

      page.drawLine({
        start: { x: 10, y: y },
        end: { x: receiptWidth - 10, y: y },
        thickness: 0.5,
        color: greyColor,
      });
      y -= 15;

      if (qrCodeData.length > 0) {
        const qr = qrCodeData[0];
        try {
          const qrImage = await pdfDoc.embedPng(qr.qrCodeBytes);
          const qrSize = 100;
          const qrX = (receiptWidth - qrSize) / 2;
          const qrY = y - qrSize;
          const qrPadding = 8;

          page.drawRectangle({
            x: qrX - qrPadding,
            y: qrY - qrPadding,
            width: qrSize + qrPadding * 2,
            height: qrSize + qrPadding * 2,
            borderColor: rgb(0, 0, 0),
            borderWidth: 1,
          });
          page.drawImage(qrImage, {
            x: qrX,
            y: qrY,
            width: qrSize,
            height: qrSize,
          });
          y = qrY - 10;
        } catch (imgError) {
          const embedErrorMsg =
            imgError instanceof Error
              ? imgError.message
              : "Unknown QR image embedding error";
          console.error(
            `Error embedding QR for ${purchaseIdFromRequest}: ${embedErrorMsg}`,
          );
          const errorText = "[QR CODE INDISPONIBLE]";
          page.drawText(errorText, {
            x: (receiptWidth - 90) / 2,
            y: y - 15,
            size: 6,
            font: helvetica,
            color: rgb(0.8, 0.2, 0.2),
          });
          y -= 25;
        }
      } else {
        const missingText = "[QR UNAVAILABLE]";
        page.drawText(missingText, {
          x: (receiptWidth - 90) / 2,
          y: y - 15,
          size: 6,
          font: helvetica,
          color: greyColor,
        });
        y -= 25;
      }

      const legacyBottomY = 25;
      const legacyFooterMsg1 = "Présentez ce QR code à l'entrée";
      const legacyFooterMsg1W = helvetica.widthOfTextAtSize(
        legacyFooterMsg1,
        5,
      );
      page.drawText(legacyFooterMsg1, {
        x: legacyRightAlignX - legacyFooterMsg1W,
        y: legacyBottomY,
        size: 5,
        font: helvetica,
        color: greyColor,
      });

      const pdfBytes = await pdfDoc.save();
      pdfsToAttach.push({
        filename: `Ticket-${ticketProps.ticketIdentifier}.pdf`,
        content: uint8ArrayToBase64(pdfBytes),
      });
    }

    // --- 5. Send Email with Resend (with PDF attachment) ---
    // Use logo URL directly for reliable display in email clients
    const logoSrc = defaultLogoUrl;

    const dateTimeRow =
      ticketProps.eventDate || ticketProps.eventTime
        ? `<tr><td style="padding:4px 0;font-size:14px;"><strong>Date</strong></td><td style="padding:4px 0;font-size:14px;">${[ticketProps.eventDate, ticketProps.eventTime].filter(Boolean).join(" · ")}</td></tr>`
        : "";
    const lieuRow = ticketProps.eventVenue
      ? `<tr><td style="padding:4px 0;font-size:14px;"><strong>Lieu</strong></td><td style="padding:4px 0;font-size:14px;">${ticketProps.eventVenue}</td></tr>`
      : "";

    // Inline styles only, no border-radius/overflow (stripped by many clients and can cause collapse). Explicit width on table for reliable layout.
    const emailHtmlBody = `<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Votre ticket - ${ticketProps.eventName}</title>
</head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background-color:#f0f0f0;color:#333;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f0f0f0;">
    <tr>
      <td align="center" style="padding:24px 16px;">
        <table role="presentation" width="560" cellspacing="0" cellpadding="0" border="0" style="width:560px;max-width:100%;background-color:#ffffff;">
          <tr>
            <td style="padding:24px 24px 16px;text-align:center;">
              <img src="${logoSrc}" alt="Djaouli Entertainment" width="80" height="80" style="display:block;margin:0 auto;border:0;" />
            </td>
          </tr>
          <tr>
            <td style="padding:0 24px 24px;">
              <h1 style="margin:0 0 16px;font-size:20px;font-weight:bold;color:#111;">Votre ticket pour ${ticketProps.eventName}</h1>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.5;">Bonjour ${ticketProps.firstName},</p>
              <p style="margin:0 0 20px;font-size:15px;line-height:1.5;">Merci pour votre achat. Votre e-ticket est en pièce jointe.</p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f8f8f8;">
                <tr>
                  <td style="padding:16px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr><td style="padding:4px 0;font-size:14px;"><strong>Événement</strong></td><td style="padding:4px 0;font-size:14px;">${ticketProps.eventName}</td></tr>
                      ${dateTimeRow}
                      ${lieuRow}
                      <tr><td style="padding:4px 0;font-size:14px;"><strong>Réf.</strong></td><td style="padding:4px 0;font-size:14px;">${ticketProps.ticketIdentifier}</td></tr>
                    </table>
                  </td>
                </tr>
              </table>
              <p style="margin:20px 0 0;font-size:14px;line-height:1.5;color:#555;">Présentez le QR code (en pièce jointe) à l'entrée.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 24px;border-top:1px solid #eee;font-size:12px;color:#888;text-align:center;">© ${new Date().getFullYear()} Djaouli Entertainment</td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
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
