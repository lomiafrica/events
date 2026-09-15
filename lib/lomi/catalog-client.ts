const DEFAULT_API_URL = "https://api.lomi.africa";

export type LomiPrice = {
  price_id: string;
  amount: number;
  currency_code?: string;
  is_default?: boolean;
  is_active?: boolean;
};

export type LomiProduct = {
  product_id: string;
  name: string;
  description?: string | null;
  images?: string[] | null;
  is_active?: boolean;
  display_on_storefront?: boolean;
  metadata?: Record<string, unknown> | null;
  prices?: LomiPrice[];
};

type ListResponse = {
  data?: LomiProduct[];
  has_more?: boolean;
  next_cursor?: string | null;
};

function apiUrl(): string {
  return (process.env.LOMI_API_URL || DEFAULT_API_URL).replace(/\/$/, "");
}

function apiKey(): string {
  const key = process.env.LOMI_SECRET_KEY;
  if (!key) {
    throw new Error("LOMI_SECRET_KEY is not configured.");
  }
  return key;
}

async function lomiFetch<T>(
  path: string,
  init: RequestInit & {method?: string} = {},
): Promise<{ok: boolean; status: number; data: T | null; text: string}> {
  const response = await fetch(`${apiUrl()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey(),
      ...(init.headers || {}),
    },
  });
  const text = await response.text();
  let data: T | null = null;
  try {
    data = text ? (JSON.parse(text) as T) : null;
  } catch {
    data = null;
  }
  return {ok: response.ok, status: response.status, data, text};
}

export async function createLomiProduct(body: Record<string, unknown>) {
  return lomiFetch<LomiProduct>("/products", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function getLomiProduct(productId: string) {
  return lomiFetch<LomiProduct>(`/products/${encodeURIComponent(productId)}`);
}

export async function updateLomiProduct(
  productId: string,
  body: Record<string, unknown>,
) {
  return lomiFetch<LomiProduct>(`/products/${encodeURIComponent(productId)}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function addLomiPrice(
  productId: string,
  body: Record<string, unknown>,
) {
  return lomiFetch<LomiPrice>(
    `/products/${encodeURIComponent(productId)}/prices`,
    {
      method: "POST",
      body: JSON.stringify(body),
    },
  );
}

export async function setDefaultLomiPrice(productId: string, priceId: string) {
  return lomiFetch<LomiProduct>(
    `/products/${encodeURIComponent(productId)}/prices/${encodeURIComponent(priceId)}/default`,
    {method: "POST"},
  );
}

export async function listLomiProducts(cursor?: string | null) {
  const params = new URLSearchParams({limit: "100"});
  if (cursor) {
    params.set("cursor", cursor);
  }
  return lomiFetch<ListResponse>(`/products?${params.toString()}`);
}
