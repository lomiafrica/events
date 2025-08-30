import { client } from "../sanity/client";
import type { NewsPost, NewsCategory, NewsAuthor } from "../types/news";

// Get all news posts
export async function getAllNewsPosts(): Promise<NewsPost[]> {
  try {
    console.log("Starting Sanity query for all news posts");
    const query = `*[_type == "post"] | order(publishedAt desc) {
      _id,
      title,
      title_fr,
      slug,
      publishedAt,
      excerpt,
      excerpt_fr,
      "tags": tags,
      "languages": languages,
      "image": image {
        asset->,
        alt,
        caption
      },
      "mainImage": image {
        asset->,
        alt,
        caption
      },
      "category": category,
      "categories": categories[] {
        _id,
        title,
        slug
      },
      "author": author->{
        _id,
        name,
        "image": image{
          asset->,
          alt
        },
        bio,
        role
      },
      body
    }`;
    console.log("Executing query:", query);

    const result = await client.fetch(query);
    console.log("Query successful, news post count:", result?.length || 0);
    return result || [];
  } catch (error) {
    console.error("Error in getAllNewsPosts:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
    return [];
  }
}

// Get a single news post by slug
export async function getNewsPostBySlug(
  slug: string,
): Promise<NewsPost | null> {
  try {
    const query = `*[_type == "post" && slug.current == $slug][0] {
      _id,
      title,
      title_fr,
      title_es,
      title_pt,
      title_zh,
      slug,
      publishedAt,
      excerpt,
      excerpt_fr,
      excerpt_es,
      excerpt_pt,
      excerpt_zh,
      "tags": tags,
      "languages": languages,
      "image": image {
        asset->,
        alt,
        caption
      },
      "mainImage": image {
        asset->,
        alt,
        caption
      },
      "category": category,
      "categories": categories[] {
        _id,
        title,
        slug
      },
      "author": author->{
        _id,
        name,
        "image": image{
          asset->,
          alt
        },
        bio,
        role
      },
      body,
      body_fr,
      body_es,
      body_pt,
      body_zh
    }`;

    const result = await client.fetch(query, { slug });
    return result || null;
  } catch (error) {
    console.error("Error in getNewsPostBySlug:", error);
    return null;
  }
}

// Get featured news posts (most recent 3)
export async function getFeaturedNewsPosts(limit = 3): Promise<NewsPost[]> {
  try {
    const query = `*[_type == "post"] | order(publishedAt desc)[0...${limit}] {
      _id,
      title,
      title_fr,
      slug,
      publishedAt,
      excerpt,
      excerpt_fr,
      "tags": tags,
      "languages": languages,
      "image": image {
        asset->,
        alt,
        caption
      },
      "mainImage": image {
        asset->,
        alt,
        caption
      },
      "category": category,
      "categories": categories[] {
        _id,
        title,
        slug
      }
    }`;

    const result = await client.fetch(query);
    return result || [];
  } catch (error) {
    console.error("Error in getFeaturedNewsPosts:", error);
    return [];
  }
}

// Get news posts by tag
export async function getNewsPostsByTag(tagValue: string): Promise<NewsPost[]> {
  try {
    const query = `*[_type == "post" && "${tagValue}" in tags] | order(publishedAt desc) {
      _id,
      title,
      title_fr,
      slug,
      publishedAt,
      excerpt,
      excerpt_fr,
      "tags": tags,
      "languages": languages,
      "image": image {
        asset->,
        alt,
        caption
      },
      "mainImage": image {
        asset->,
        alt,
        caption
      },
      "category": category,
      "categories": categories[] {
        _id,
        title,
        slug
      },
      "author": author->{
        _id,
        name,
        "image": image{
          asset->,
          alt
        },
        bio,
        role
      }
    }`;

    const result = await client.fetch(query);
    return result || [];
  } catch (error) {
    console.error("Error in getNewsPostsByTag:", error);
    return [];
  }
}

// Get all news categories
export async function getAllNewsCategories(): Promise<NewsCategory[]> {
  try {
    const query = `*[_type == "category"] | order(title asc) {
      _id,
      title,
      description
    }`;

    const result = await client.fetch(query);
    return result || [];
  } catch (error) {
    console.error("Error in getAllNewsCategories:", error);
    return [];
  }
}

// Get all news authors
export async function getAllNewsAuthors(): Promise<NewsAuthor[]> {
  try {
    const query = `*[_type == "author"] | order(name asc) {
      _id,
      name,
      slug,
      "image": image {
        asset->,
        alt
      },
      bio,
      role,
      email,
      social
    }`;

    const result = await client.fetch(query);
    return result || [];
  } catch (error) {
    console.error("Error in getAllNewsAuthors:", error);
    return [];
  }
}
