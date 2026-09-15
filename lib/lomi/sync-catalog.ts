import type {SanityClient} from "next-sanity";
import {
  addLomiPrice,
  createLomiProduct,
  getLomiProduct,
  listLomiProducts,
  setDefaultLomiPrice,
  updateLomiProduct,
  type LomiPrice,
  type LomiProduct,
} from "./catalog-client";

export type CatalogSku = {
  sanityId: string;
  sanityType: "product" | "ticket" | "bundle";
  sanityItemKey?: string;
  name: string;
  description?: string;
  amount: number;
  images?: string[];
  isActive: boolean;
  displayOnStorefront: boolean;
  existingProductId?: string;
  existingPriceId?: string;
  existingError?: string;
};

export type CatalogSyncResult = {
  productId: string | null;
  priceId: string | null;
  error?: string;
  unchanged?: boolean;
  skipped?: boolean;
};

type SanityProductDoc = {
  _id: string;
  _type: "product";
  name?: string;
  basePrice?: number;
  description?: unknown;
  images?: Array<string | null>;
  lomiProductId?: string;
  lomiPriceId?: string;
  lomiSyncError?: string;
};

type SanityOffer = {
  _key?: string;
  name?: string;
  price?: number;
  description?: string;
  details?: string;
  active?: boolean;
  lomiProductId?: string;
  lomiPriceId?: string;
  lomiSyncError?: string;
};

type SanityEventDoc = {
  _id: string;
  _type: "event";
  title?: string;
  ticketsAvailable?: boolean;
  flyerUrl?: string | null;
  ticketTypes?: SanityOffer[];
  bundles?: SanityOffer[];
};

const PRODUCT_QUERY = `*[_id == $id][0]{
  _id,
  _type,
  name,
  basePrice,
  description,
  lomiProductId,
  lomiPriceId,
  lomiSyncError,
  "images": images[].asset->url
}`;

const EVENT_QUERY = `*[_id == $id][0]{
  _id,
  _type,
  title,
  ticketsAvailable,
  "flyerUrl": flyer.asset->url,
  ticketTypes[]{
    _key,
    name,
    price,
    description,
    details,
    active,
    lomiProductId,
    lomiPriceId,
    lomiSyncError
  },
  bundles[]{
    _key,
    name,
    price,
    description,
    details,
    active,
    lomiProductId,
    lomiPriceId,
    lomiSyncError
  }
}`;

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function portableTextToString(value: unknown): string | undefined {
  if (typeof value === "string") {
    return value.trim() || undefined;
  }
  if (!Array.isArray(value)) {
    return undefined;
  }
  const text = value
    .map((block) => {
      if (
        block &&
        typeof block === "object" &&
        "children" in block &&
        Array.isArray((block as {children?: unknown}).children)
      ) {
        return (block as {children: Array<{text?: string}>}).children
          .map((child) => child.text ?? "")
          .join("");
      }
      return "";
    })
    .join("\n")
    .trim();
  return text || undefined;
}

function httpImages(values: Array<string | null | undefined> | undefined) {
  return (values || []).filter(
    (url): url is string =>
      typeof url === "string" && /^https?:\/\//i.test(url),
  );
}

function sameAmount(a: number, b: number) {
  return Math.round(a) === Math.round(b);
}

function metadataOf(sku: CatalogSku) {
  return {
    sanity_id: sku.sanityId,
    sanity_type: sku.sanityType,
    sanity_item_key: sku.sanityItemKey || sku.sanityId,
    app_source: "djaouli_events_app",
  };
}

function matchesSku(product: LomiProduct, sku: CatalogSku) {
  const meta = product.metadata || {};
  return (
    meta.sanity_id === sku.sanityId &&
    meta.sanity_item_key === (sku.sanityItemKey || sku.sanityId)
  );
}

function defaultPrice(product: LomiProduct): LomiPrice | undefined {
  const prices = product.prices || [];
  return prices.find((price) => price.is_default) || prices[0];
}

function priceMatchingAmount(product: LomiProduct, amount: number) {
  return (product.prices || []).find(
    (price) => price.is_active !== false && sameAmount(price.amount, amount),
  );
}

async function findProductByMetadata(sku: CatalogSku) {
  let cursor: string | null | undefined;
  for (let page = 0; page < 20; page += 1) {
    const listed = await listLomiProducts(cursor);
    if (!listed.ok || !listed.data?.data) {
      return null;
    }
    const match = listed.data.data.find((product) => matchesSku(product, sku));
    if (match) {
      const full = await getLomiProduct(match.product_id);
      return full.ok && full.data ? full.data : match;
    }
    if (!listed.data.has_more || !listed.data.next_cursor) {
      return null;
    }
    cursor = listed.data.next_cursor;
  }
  return null;
}

async function resolveProduct(sku: CatalogSku) {
  if (sku.existingProductId) {
    const existing = await getLomiProduct(sku.existingProductId);
    if (existing.ok && existing.data) {
      return existing.data;
    }
  }
  return findProductByMetadata(sku);
}

async function ensurePrice(
  product: LomiProduct,
  amount: number,
): Promise<{priceId: string | null; error?: string; product: LomiProduct}> {
  const matching = priceMatchingAmount(product, amount);
  if (matching) {
    if (!matching.is_default) {
      const updated = await setDefaultLomiPrice(
        product.product_id,
        matching.price_id,
      );
      if (updated.ok && updated.data) {
        return {priceId: matching.price_id, product: updated.data};
      }
    }
    return {priceId: matching.price_id, product};
  }

  const created = await addLomiPrice(product.product_id, {
    amount: Math.round(amount),
    currency_code: "XOF",
    pricing_model: "standard",
    is_default: true,
  });

  if (created.ok && created.data?.price_id) {
    return {priceId: created.data.price_id, product};
  }

  return {
    priceId: null,
    product,
    error:
      "Could not add a new lomi. price (catalog prices are immutable, max 3). Checkout will use the Sanity amount instead.",
  };
}

export async function syncCatalogSku(
  sku: CatalogSku,
): Promise<CatalogSyncResult> {
  if (!sku.name || Math.round(sku.amount) < 1) {
    return {productId: sku.existingProductId || null, priceId: null, skipped: true};
  }

  let product = await resolveProduct(sku);
  const images = httpImages(sku.images).slice(0, 8);

  if (!product) {
    const created = await createLomiProduct({
      name: sku.name,
      description: sku.description,
      product_type: "one_time",
      images: images.length ? images : undefined,
      is_active: sku.isActive,
      display_on_storefront: sku.displayOnStorefront,
      metadata: metadataOf(sku),
      prices: [
        {
          amount: Math.round(sku.amount),
          currency_code: "XOF",
          pricing_model: "standard",
          is_default: true,
        },
      ],
    });

    if (!created.ok || !created.data?.product_id) {
      return {
        productId: null,
        priceId: null,
        error: `Failed to create lomi. product: ${created.text.slice(0, 400)}`,
      };
    }

    product = created.data;
    if (!defaultPrice(product)) {
      const refetch = await getLomiProduct(product.product_id);
      if (refetch.ok && refetch.data) {
        product = refetch.data;
      }
    }
    const price = defaultPrice(product);
    return {
      productId: product.product_id,
      priceId: price?.price_id || null,
    };
  }

  const currentDefault = defaultPrice(product);
  const matchingPrice = priceMatchingAmount(product, sku.amount);
  const nameMatches = product.name === sku.name;
  const descriptionMatches =
    (product.description || "") === (sku.description || "");
  const activeMatches = (product.is_active ?? true) === sku.isActive;
  const idsAlreadyWritten =
    sku.existingProductId === product.product_id &&
    !!matchingPrice &&
    sku.existingPriceId === matchingPrice.price_id;

  if (nameMatches && descriptionMatches && activeMatches && idsAlreadyWritten) {
    return {
      productId: product.product_id,
      priceId: matchingPrice?.price_id || sku.existingPriceId || null,
      unchanged: true,
    };
  }

  if (
    nameMatches &&
    descriptionMatches &&
    activeMatches &&
    !matchingPrice &&
    sku.existingProductId === product.product_id &&
    !sku.existingPriceId &&
    sku.existingError
  ) {
    return {
      productId: product.product_id,
      priceId: null,
      unchanged: true,
      error: sku.existingError,
    };
  }

  if (!nameMatches || !descriptionMatches || !activeMatches) {
    const updated = await updateLomiProduct(product.product_id, {
      name: sku.name,
      description: sku.description || undefined,
      images: images.length ? images : undefined,
      is_active: sku.isActive,
    });
    if (!updated.ok) {
      return {
        productId: product.product_id,
        priceId: sku.existingPriceId || currentDefault?.price_id || null,
        error: `Failed to update lomi. product: ${updated.text.slice(0, 400)}`,
      };
    }
    product = updated.data || product;
  }

  const priced = await ensurePrice(product, sku.amount);
  return {
    productId: product.product_id,
    priceId: priced.priceId,
    error: priced.error,
  };
}

function offerToSku(input: {
  event: SanityEventDoc;
  offer: SanityOffer;
  sanityType: "ticket" | "bundle";
}): CatalogSku | null {
  const key = asString(input.offer._key);
  const name = asString(input.offer.name);
  if (!key || !name) {
    return null;
  }
  const description =
    asString(input.offer.description) || asString(input.offer.details);
  return {
    sanityId: input.event._id,
    sanityType: input.sanityType,
    sanityItemKey: key,
    name: `${input.event.title || "Event"} — ${name}`,
    description,
    amount: Number(input.offer.price) || 0,
    images: input.event.flyerUrl ? [input.event.flyerUrl] : [],
    isActive:
      input.offer.active !== false && input.event.ticketsAvailable !== false,
    displayOnStorefront: false,
    existingProductId: asString(input.offer.lomiProductId),
    existingPriceId: asString(input.offer.lomiPriceId),
    existingError: asString(input.offer.lomiSyncError),
  };
}

async function patchFields(
  client: SanityClient,
  id: string,
  fields: Record<string, string | null>,
) {
  const set: Record<string, string> = {};
  const unset: string[] = [];
  for (const [path, value] of Object.entries(fields)) {
    if (value) {
      set[path] = value;
    } else {
      unset.push(path);
    }
  }
  let patch = client.patch(id);
  if (Object.keys(set).length) {
    patch = patch.set(set);
  }
  if (unset.length) {
    patch = patch.unset(unset);
  }
  await patch.commit({autoGenerateArrayKeys: false});
}

function syncStamp(result: CatalogSyncResult) {
  return {
    productId: result.productId,
    priceId: result.priceId,
    syncedAt: new Date().toISOString(),
    error: result.error || null,
  };
}

export async function syncSanityDocument(client: SanityClient, id: string) {
  if (id.startsWith("drafts.")) {
    return {ok: true, skipped: "draft"};
  }

  const doc = await client.fetch<{_id: string; _type: string} | null>(
    `*[_id == $id][0]{_id,_type}`,
    {id},
  );

  if (!doc) {
    return {ok: true, skipped: "missing"};
  }

  if (doc._type === "product") {
    const product = await client.fetch<SanityProductDoc | null>(PRODUCT_QUERY, {
      id,
    });
    if (!product) {
      return {ok: true, skipped: "missing"};
    }

    const result = await syncCatalogSku({
      sanityId: product._id,
      sanityType: "product",
      name: asString(product.name) || "Untitled product",
      description: portableTextToString(product.description),
      amount: Number(product.basePrice) || 0,
      images: httpImages(product.images),
      isActive: true,
      displayOnStorefront: true,
      existingProductId: asString(product.lomiProductId),
      existingPriceId: asString(product.lomiPriceId),
      existingError: asString(product.lomiSyncError),
    });

    if (result.skipped || result.unchanged) {
      return {ok: true, result};
    }

    const stamp = syncStamp(result);
    if (
      asString(product.lomiProductId) === (stamp.productId || undefined) &&
      asString(product.lomiPriceId) === (stamp.priceId || undefined) &&
      asString(product.lomiSyncError) === (stamp.error || undefined)
    ) {
      return {ok: true, result: {...result, unchanged: true}};
    }

    await patchFields(client, product._id, {
      lomiProductId: stamp.productId,
      lomiPriceId: stamp.priceId,
      lomiSyncedAt: stamp.syncedAt,
      lomiSyncError: stamp.error,
    });
    return {ok: !result.error || !!result.productId, result};
  }

  if (doc._type === "event") {
    const event = await client.fetch<SanityEventDoc | null>(EVENT_QUERY, {id});
    if (!event) {
      return {ok: true, skipped: "missing"};
    }

    const items: Array<{
      pathPrefix: string;
      sku: CatalogSku;
      current: SanityOffer;
    }> = [];

    for (const offer of event.ticketTypes || []) {
      const sku = offerToSku({event, offer, sanityType: "ticket"});
      if (sku) {
        items.push({
          pathPrefix: `ticketTypes[_key=="${sku.sanityItemKey}"]`,
          sku,
          current: offer,
        });
      }
    }
    for (const offer of event.bundles || []) {
      const sku = offerToSku({event, offer, sanityType: "bundle"});
      if (sku) {
        items.push({
          pathPrefix: `bundles[_key=="${sku.sanityItemKey}"]`,
          sku,
          current: offer,
        });
      }
    }

    const results: CatalogSyncResult[] = [];
    const fieldSets: Record<string, string | null> = {};

    for (const item of items) {
      const result = await syncCatalogSku(item.sku);
      results.push(result);
      if (result.skipped || result.unchanged) {
        continue;
      }
      const stamp = syncStamp(result);
      if (
        asString(item.current.lomiProductId) ===
          (stamp.productId || undefined) &&
        asString(item.current.lomiPriceId) === (stamp.priceId || undefined) &&
        asString(item.current.lomiSyncError) === (stamp.error || undefined)
      ) {
        continue;
      }
      fieldSets[`${item.pathPrefix}.lomiProductId`] = stamp.productId;
      fieldSets[`${item.pathPrefix}.lomiPriceId`] = stamp.priceId;
      fieldSets[`${item.pathPrefix}.lomiSyncedAt`] = stamp.syncedAt;
      fieldSets[`${item.pathPrefix}.lomiSyncError`] = stamp.error;
    }

    if (Object.keys(fieldSets).length) {
      await patchFields(client, event._id, fieldSets);
    }

    return {ok: true, results};
  }

  return {ok: true, skipped: doc._type};
}
