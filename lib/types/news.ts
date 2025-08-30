// News/Blog Post Types
export interface NewsPost {
  _id: string;
  title: string;
  title_fr?: string;
  title_es?: string;
  title_pt?: string;
  title_zh?: string;
  slug: {
    current: string;
  };
  publishedAt: string;
  excerpt: string;
  excerpt_fr?: string;
  excerpt_es?: string;
  excerpt_pt?: string;
  excerpt_zh?: string;
  tags?: string[];
  languages?: string[];
  image?: {
    asset: {
      _ref: string;
      url: string;
    };
    alt?: string;
    caption?: string;
  };
  mainImage?: {
    asset: {
      _ref: string;
      url: string;
    };
    alt?: string;
    caption?: string;
  };
  category?: string;
  categories?: {
    _id: string;
    title: string;
    slug: {
      current: string;
    };
  }[];
  author?: {
    _id: string;
    name: string;
    image?: {
      asset: {
        _ref: string;
        url: string;
      };
      alt?: string;
    };
    bio?: string;
    role?: string;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body?: any; // Portable Text blocks
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body_fr?: any;
  isFeatured?: boolean;
}

// News Category Types
export interface NewsCategory {
  _id: string;
  title: string;
  description?: string;
}

// News Author Types
export interface NewsAuthor {
  _id: string;
  name: string;
  slug: {
    current: string;
  };
  image?: {
    asset: {
      _ref: string;
      url: string;
    };
    alt?: string;
  };
  bio?: unknown[]; // Portable Text blocks
  role?: string;
  email?: string;
  social?: {
    twitter?: string;
    linkedin?: string;
    github?: string;
  };
}
