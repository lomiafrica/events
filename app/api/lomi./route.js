import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { Buffer } from 'node:buffer';

// --- Environment Variables ---
const supabaseUrl = process.env.SUPABASE_URL; // General Supabase URL for Vercel
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // General Supabase Service Key for Vercel
const lomiWebhookSecret = process.env.LOMI_WEBHOOK_SECRET;
const sendTicketEmailFunctionUrl = process.env.SEND_TICKET_EMAIL_FUNCTION_URL; // e.g., https://<project_ref>.supabase.co/functions/v1/send-ticket-email
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY; // For invoking Supabase functions if needed with anon key and RLS

if (!supabaseUrl || !supabaseServiceKey || !lomiWebhookSecret || !sendTicketEmailFunctionUrl || !supabaseAnonKey) {
    console.error("Events Webhook: Missing critical environment variables. Check SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, LOMI_WEBHOOK_SECRET, SEND_TICKET_EMAIL_FUNCTION_URL, SUPABASE_ANON_KEY.");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
});

// --- Helper: Verify Lomi Webhook Signature ---
async function verifyLomiWebhook(rawBody, signatureHeader) {
    if (!signatureHeader) {
        throw new Error("Missing Lomi signature header (X-Lomi-Signature).");
    }
    if (!lomiWebhookSecret) {
        console.error("LOMI_WEBHOOK_SECRET is not set. Cannot verify webhook.");
        throw new Error("Webhook secret not configured internally.");
    }
    const expectedSignature = crypto.createHmac("sha256", lomiWebhookSecret).update(rawBody).digest("hex");
    const sigBuffer = Buffer.from(signatureHeader);
    const expectedSigBuffer = Buffer.from(expectedSignature);
    if (sigBuffer.length !== expectedSigBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedSigBuffer)) {
        throw new Error("Lomi webhook signature mismatch.");
    }
    return JSON.parse(rawBody.toString("utf8"));
}

// --- POST Handler for App Router ---
export async function POST(request) {
    // Read the raw body
    let rawBody;
    try {
        rawBody = await request.text();
    } catch (bodyError) {
        console.error('Events Webhook: Error reading request body:', bodyError);
        return new Response(JSON.stringify({ error: 'Failed to read request body' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    const signature = request.headers.get('x-lomi-signature');
    let eventPayload;

    try {
        eventPayload = await verifyLomiWebhook(rawBody, signature);
        console.log('Events Webhook: Lomi event verified:', eventPayload?.event || 'Event type missing');
    } catch (err) {
        console.error('Events Webhook: Lomi signature verification failed:', err.message);
        return new Response(JSON.stringify({ error: `Webhook verification failed: ${err.message}` }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    // --- Event Processing ---
    try {
        const lomiEventType = eventPayload?.event;
        const eventData = eventPayload?.data;

        if (!lomiEventType || !eventData) {
            console.warn('Events Webhook: Event type or data missing in Lomi payload.', eventPayload);
            return new Response(JSON.stringify({ error: 'Event type or data missing.' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        console.log('Events Webhook: Received Lomi event type:', lomiEventType);

        // Assuming Lomi sends metadata.internal_purchase_id as set in create-lomi-checkout-session
        const purchaseId = eventData.metadata?.internal_purchase_id;
        const lomiCheckoutSessionId = eventData.id; // ID of the CheckoutSession object for CHECKOUT_COMPLETED
        const lomiTransactionId = eventData.transaction_id; // ID of the Transaction object for PAYMENT_SUCCEEDED
        const amount = eventData.amount || eventData.gross_amount; // Amount from Lomi
        const currency = eventData.currency_code;

        if (!purchaseId) {
            console.error('Events Webhook Error: Missing internal_purchase_id in Lomi webhook metadata.', { lomiEventData: eventData });
            return new Response(JSON.stringify({ error: 'Missing internal_purchase_id in Lomi webhook metadata.' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        let paymentStatusForDb = 'unknown';
        if (lomiEventType === 'checkout.completed' || lomiEventType === 'CHECKOUT_COMPLETED') {
            // Check if checkout_session.status is 'paid' or similar if Lomi provides it.
            // For now, assuming completion means payment for simplicity, adjust if Lomi has distinct paid status on checkout object.
            paymentStatusForDb = 'paid'; // Or derive from eventData.status if available
        } else if (lomiEventType === 'payment.succeeded' || lomiEventType === 'PAYMENT_SUCCEEDED') {
            paymentStatusForDb = 'paid';
        } else if (lomiEventType === 'payment.failed' || lomiEventType === 'PAYMENT_FAILED') {
            paymentStatusForDb = 'payment_failed';
        } else {
            console.log('Events Webhook: Lomi event type not handled for direct payment status update:', lomiEventType);
            return new Response(JSON.stringify({ received: true, message: "Webhook event type not handled for payment update." }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 1. Record Payment Outcome
        const { error: rpcError } = await supabase.rpc('record_event_lomi_payment', {
            p_purchase_id: purchaseId,
            p_lomi_payment_id: lomiTransactionId,
            p_lomi_checkout_session_id: lomiCheckoutSessionId,
            p_payment_status: paymentStatusForDb,
            p_lomi_event_payload: eventPayload,
            p_amount_paid: amount, // Lomi sends amount in smallest unit (e.g. cents) if applicable, XOF is base.
            p_currency_paid: currency
        });

        if (rpcError) {
            console.error('Events Webhook Error: Failed to call record_event_lomi_payment RPC:', rpcError);
            // Potentially retry or alert, but respond to Lomi to avoid Lomi retries for DB issues.
            return new Response(JSON.stringify({ error: 'Failed to process payment update in DB.' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        console.log(`Events Webhook: Payment for purchase ${purchaseId} (status: ${paymentStatusForDb}) processed.`);

        // Only proceed to email dispatch if payment was successful
        if (paymentStatusForDb === 'paid') {
            // 2. Prepare for Email Dispatch
            const { error: prepError } = await supabase.rpc('prepare_purchase_for_email_dispatch', {
                p_purchase_id: purchaseId
            });

            if (prepError) {
                console.error(`Events Webhook Warning: Failed to prepare purchase ${purchaseId} for email dispatch:`, prepError);
                // Log and continue, as payment is recorded. Email might need manual retry or investigation.
            } else {
                console.log(`Events Webhook: Purchase ${purchaseId} prepared for email dispatch.`);

                // 3. Asynchronously Trigger Send Ticket Email Function
                if (sendTicketEmailFunctionUrl) {
                    fetch(sendTicketEmailFunctionUrl, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${supabaseAnonKey}` // Supabase Edge Functions are typically protected
                        },
                        body: JSON.stringify({ purchase_id: purchaseId })
                    })
                        .then(response => {
                            if (!response.ok) {
                                response.text().then(text => console.error(`Events Webhook: Error triggering send-ticket-email for ${purchaseId}. Status: ${response.status}, Body: ${text}`));
                            } else {
                                console.log(`Events Webhook: Successfully triggered send-ticket-email for ${purchaseId}.`);
                            }
                        })
                        .catch(fetchError => {
                            console.error(`Events Webhook: Network error triggering send-ticket-email for ${purchaseId}:`, fetchError);
                        });
                } else {
                    console.warn("Events Webhook: SEND_TICKET_EMAIL_FUNCTION_URL not set. Cannot trigger email sending.");
                }
            }
        }

        return new Response(JSON.stringify({ received: true, message: "Webhook processed." }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Events Webhook - Uncaught error during event processing:', error);
        return new Response(JSON.stringify({ error: 'Internal server error processing webhook event.' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
} 