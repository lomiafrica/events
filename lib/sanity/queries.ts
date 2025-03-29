import { client } from './client'

// Events
export async function getLatestEvents(limit = 3) {
  return client.fetch(`
    *[_type == "event" && dateTime(date) >= dateTime(now())] | order(date asc) [0...$limit] {
      _id,
      title,
      slug,
      date,
      "date": dateTime(date),
      "time": coalesce(time, "TBD"),
      "location": coalesce(location, "TBD"),
      "flyer": {
        "url": flyer.asset->url
      },
      ticketsAvailable
    }
  `, { limit })
}

export async function getAllEvents() {
  return client.fetch(`
    *[_type == "event"] | order(date desc) {
      _id,
      title,
      slug,
      date,
      "date": dateTime(date),
      "time": coalesce(time, "TBD"),
      "location": coalesce(location, "TBD"),
      "flyer": {
        "url": flyer.asset->url
      },
      ticketsAvailable
    }
  `)
}

export async function getEventBySlug(slug: string) {
  const events = await client.fetch(`
    *[_type == "event" && slug.current == $slug][0] {
      _id,
      title,
      slug,
      date,
      "date": dateTime(date),
      "time": coalesce(time, "TBD"),
      "location": coalesce(location, "TBD"),
      "flyer": {
        "url": flyer.asset->url
      },
      description,
      venueDetails,
      ticketsAvailable,
      ticketTypes,
      bundles
    }
  `, { slug })
  
  return events
}

// Blog
export async function getLatestBlogPosts(limit = 2) {
  return client.fetch(`
    *[_type == "post"] | order(publishedAt desc) [0...$limit] {
      _id,
      title,
      "slug": slug.current,
      publishedAt,
      excerpt,
      "mainImage": {
        "url": mainImage.asset->url
      }
    }
  `, { limit })
}

export async function getAllBlogPosts() {
  return client.fetch(`
    *[_type == "post"] | order(publishedAt desc) {
      _id,
      title,
      "slug": slug.current,
      publishedAt,
      excerpt,
      "mainImage": {
        "url": mainImage.asset->url
      }
    }
  `)
}

export async function getBlogPostBySlug(slug: string) {
  const post = await client.fetch(`
    *[_type == "post" && slug.current == $slug][0] {
      _id,
      title,
      "slug": slug.current,
      publishedAt,
      "mainImage": {
        "url": mainImage.asset->url
      },
      "author": author->{name, "image": image.asset->url},
      body,
      "categories": categories[]->{title}
    }
  `, { slug })
  
  return post
}

// Story
export async function getFeaturedStory() {
  return client.fetch(`
    *[_type == "story" && featured == true][0] {
      _id,
      title,
      subtitle,
      "mainImage": {
        "url": mainImage.asset->url
      },
      content
    }
  `)
}

export async function getStory() {
  return client.fetch(
    `*[_type == "story"][0]{
      title,
      subtitle,
      content,
      "image": mainImage.asset->{
        "url": url,
        "alt": alt
      }
    }`,
  )
}

// Products (New Section)
export async function getAllProducts() {
  return client.fetch(`
    *[_type == "product"] | order(name asc) {
      _id,
      name,
      slug,
      productId,
      "mainImage": images[0].asset->url, // Get the first image URL
      price,
      stock
    }
  `)
}

export async function getProductBySlug(slug: string) {
  return client.fetch(`
    *[_type == "product" && slug.current == $slug][0] {
      _id,
      name,
      slug,
      productId,
      description,
      "images": images[].asset->{
        url,
        metadata {
          dimensions,
          lqip // Low Quality Image Placeholder
        }
       },
      price,
      stock,
      // Fetch referenced categories if needed
      "categories": categories[]->{title, slug}
      // Fetch variants if implemented
      // variants
    }
  `, { slug })
}

