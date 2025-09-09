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
  productId?: string;
  mainImage?: string;
  price: number;
  stock?: number;
  description?: string | PortableTextBlock[];
  categories?: Array<{
    title: string;
    slug: string;
  }>;
  tags?: string[];
  images?: Array<{
    url: string;
    metadata?: {
      dimensions?: {
        width: number;
        height: number;
      };
      lqip?: string;
    };
  }>;
}
