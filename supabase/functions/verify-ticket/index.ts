import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.49.4';

interface TicketVerificationRequest {
  ticket_identifier: string;
  verified_by: string;
  auto_admit?: boolean; // Whether to automatically admit valid tickets
}

interface TicketVerificationResponse {
  success: boolean;
  ticket_data?: any;
  error_code?: string;
  error_message?: string;
  admitted?: boolean; // Whether the ticket was successfully admitted
}

// Environment variables
const supabaseUrl = Deno.env.get('SUPABASE_URL') || Deno.env.get('URL');
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SERVICE_ROLE_KEY');

// Validation
if (!supabaseUrl || supabaseUrl.trim() === '') {
  console.error('SUPABASE_URL environment variable is missing or empty');
  throw new Error('SUPABASE_URL environment variable is required');
}

if (!supabaseServiceRoleKey || supabaseServiceRoleKey.trim() === '') {
  console.error('SUPABASE_SERVICE_ROLE_KEY environment variable is missing or empty');
  throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is required');
}

// The edge function's single-threaded nature prevents race conditions
// No additional locking mechanism needed

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    const body: TicketVerificationRequest = await req.json();

    const { ticket_identifier, verified_by, auto_admit = true } = body;

    if (!ticket_identifier || ticket_identifier.trim() === '') {
      return new Response(JSON.stringify({
        success: false,
        error_code: 'INVALID_INPUT',
        error_message: 'Ticket identifier is required'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const trimmedId = ticket_identifier.trim();

    // Step 1: Verify the ticket (atomic operation)
    console.log(`Verifying ticket: ${trimmedId}`);

    const { data: ticketData, error: verifyError } = await supabase.rpc(
      'verify_ticket',
      { p_ticket_identifier: trimmedId }
    );

    if (verifyError) {
      console.error('Verification error:', verifyError);
      return new Response(JSON.stringify({
        success: false,
        error_code: 'VERIFICATION_FAILED',
        error_message: verifyError.message
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!ticketData || ticketData.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        error_code: 'TICKET_NOT_FOUND',
        error_message: 'Ticket not found in system'
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const ticket = ticketData[0];
    console.log(`Ticket verified: ${ticket.customer_name} - ${ticket.event_title}`);

    // Step 2: Check if ticket can be admitted
    const canBeAdmitted =
      ticket.use_count !== undefined && ticket.total_quantity
        ? ticket.use_count < ticket.total_quantity
        : !ticket.is_used;

    if (!canBeAdmitted) {
      console.log(`Ticket cannot be admitted: already used`);
      return new Response(JSON.stringify({
        success: true, // Verification succeeded
        ticket_data: ticket,
        admitted: false,
        error_code: 'ALREADY_USED',
        error_message: ticket.is_used
          ? 'Ticket has already been used for entry'
          : 'Legacy ticket fully used (all admissions consumed)'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Step 3: Auto-admit if requested and possible
    let admitted = false;
    if (auto_admit && canBeAdmitted) {
      console.log(`Auto-admitting ticket: ${trimmedId}`);

      const { data: admitResult, error: admitError } = await supabase.rpc(
        'mark_ticket_used',
        {
          p_ticket_identifier: trimmedId,
          p_verified_by: verified_by || 'edge_function'
        }
      );

      if (admitError) {
        console.error('Admission error:', admitError);
        return new Response(JSON.stringify({
          success: true, // Verification succeeded, but admission failed
          ticket_data: ticket,
          admitted: false,
          error_code: 'ADMISSION_FAILED',
          error_message: admitError.message
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (admitResult === 'SUCCESS') {
        admitted = true;
        console.log(`Ticket successfully admitted: ${trimmedId}`);
      } else {
        console.log(`Admission rejected: ${admitResult}`);
        return new Response(JSON.stringify({
          success: true,
          ticket_data: ticket,
          admitted: false,
          error_code: admitResult,
          error_message: admitResult === 'ALREADY_USED'
            ? 'Ticket has already been used for entry'
            : admitResult === 'DUPLICATE_SCAN'
            ? 'Ticket scanned again too quickly'
            : 'Admission failed'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Success response
    const response: TicketVerificationResponse = {
      success: true,
      ticket_data: ticket,
      admitted: admitted
    };

    console.log(`Verification complete: success=${response.success}, admitted=${admitted}`);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Unexpected error:', error);

    return new Response(JSON.stringify({
      success: false,
      error_code: 'INTERNAL_ERROR',
      error_message: error instanceof Error ? error.message : 'Internal server error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
