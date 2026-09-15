const CHECKOUT_FORM_STORAGE_KEY = "djaouli.checkout";

export interface CheckoutFormData {
  name: string;
  email: string;
  phone: string;
}

function canUseSessionStorage(): boolean {
  return typeof window !== "undefined";
}

export function loadCheckoutForm(): Partial<CheckoutFormData> {
  if (!canUseSessionStorage()) return {};

  try {
    const raw = sessionStorage.getItem(CHECKOUT_FORM_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Partial<CheckoutFormData>;
    return {
      name: typeof parsed.name === "string" ? parsed.name : "",
      email: typeof parsed.email === "string" ? parsed.email : "",
      phone: typeof parsed.phone === "string" ? parsed.phone : "",
    };
  } catch {
    return {};
  }
}

export function saveCheckoutForm(data: Partial<CheckoutFormData>): void {
  if (!canUseSessionStorage()) return;

  try {
    const existing = loadCheckoutForm();
    sessionStorage.setItem(
      CHECKOUT_FORM_STORAGE_KEY,
      JSON.stringify({
        name: data.name ?? existing.name ?? "",
        email: data.email ?? existing.email ?? "",
        phone: data.phone ?? existing.phone ?? "",
      }),
    );
  } catch {
    // Ignore storage errors (private browsing, quota, etc.)
  }
}

export function clearCheckoutForm(): void {
  if (!canUseSessionStorage()) return;

  try {
    sessionStorage.removeItem(CHECKOUT_FORM_STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
}
