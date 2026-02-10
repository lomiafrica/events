export interface PortableTextBlock {
  _key: string;
  _type: string;
  children: Array<{
    _key: string;
    _type: string;
    text: string;
    marks?: string[];
  }>;
  markDefs?: unknown[];
  style?: string;
}

export interface SanityProduct {
  _id: string;
  name: string;
  slug: string | { current: string };
  mainImage?: string;
  price: number;
  stock?: number;
  requiresShipping?: boolean;
  description?: string | PortableTextBlock[];
  categories?: Array<{
    title: string;
    slug: string;
  }>;
  tags?: string[];
  colors?: Array<{
    name: string;
    image?: string;
    available: boolean;
  }>;
  sizes?: Array<{
    name: string;
    available: boolean;
  }>;
  images?: Array<{
    url?: string;
    asset?: { url: string };
    metadata?: {
      dimensions?: { width: number; height: number };
      lqip?: string;
    };
  }>;
}
