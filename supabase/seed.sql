-- Insert a test customer
INSERT INTO public.customers (id, name, email, phone)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'Babacar Test',
  'babacar@lomi.africa',
  '+221700000000'
)
ON CONFLICT (email) DO NOTHING;

-- Insert a test purchase for that customer
INSERT INTO public.purchases (
  id,
  customer_id,
  event_id,
  event_title,
  ticket_type_id,
  ticket_name,
  quantity,
  price_per_ticket,
  total_amount,
  currency_code,
  status
)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  'test-event-001',
  'Test Event',
  'test-ticket-type-001',
  'VIP',
  1,
  10000,
  10000,
  'XOF',
  'paid'
)
ON CONFLICT (id) DO NOTHING;