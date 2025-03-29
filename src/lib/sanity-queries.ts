import { createClient } from "next-sanity"

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
  apiVersion: "2023-05-03",
  useCdn: process.env.NODE_ENV === "production",
})

// Events
export async function getLatestEvents(limit = 3) {
  return client.fetch(
    `*[_type == "event" && date >= now()] | order(date asc)[0...${limit}]{
      _id,
      title,
      slug,
      date,
      time,
      location,
      "flyer": flyer.asset->{
        "url": url
      },
      ticketsAvailable
    }`,
  )
}

export async function getAllEvents() {
  return client.fetch(
    `*[_type == "event" && date >= now()] | order(date asc){
      _id,
      title,
      slug,
      date,
      time,
      location,
      "flyer": flyer.asset->{
        "url": url
      },
      ticketsAvailable
    }`,
  )
}

export async function getEventBySlug(slug: string) {
  return client.fetch(
    `*[_type == "event" && slug.current == $slug][0]{
      _id,
      title,
      slug,
      date,
      time,
      location,
      description,
      venueDetails,
      "flyer": flyer.asset->{
        "url": url
      },
      ticketsAvailable,
      ticketTypes[]{
        "id": _key,
        name,
        price,
        description,
        available,
        maxPerOrder
      },
      bundles[]{
        "id": _key,
        name,
        price,
        description,
        includes,
        available,
        maxPerOrder
      }
    }`,
    { slug },
  )
}

// Blog
export async function getLatestBlogPosts(limit = 3) {
  return client.fetch(
    `*[_type == "post"] | order(publishedAt desc)[0...${limit}]{
      _id,
      title,
      "slug": slug.current,
      publishedAt,
      excerpt,
      "mainImage": mainImage.asset->{
        "url": url
      }
    }`,
  )
}

export async function getAllBlogPosts() {
  return client.fetch(
    `*[_type == "post"] | order(publishedAt desc){
      _id,
      title,
      "slug": slug.current,
      publishedAt,
      excerpt,
      "mainImage": mainImage.asset->{
        "url": url
      },
      "categories": categories[]->{title}
    }`,
  )
}

export async function getBlogPostBySlug(slug: string) {
  return client.fetch(
    `*[_type == "post" && slug.current == $slug][0]{
      _id,
      title,
      "slug": slug.current,
      publishedAt,
      excerpt,
      body,
      "mainImage": mainImage.asset->{
        "url": url
      },
      "categories": categories[]->{title},
      "author": author->{
        name,
        bio,
        "image": image.asset->{
          "url": url
        }
      }
    }`,
    { slug },
  )
}

// Story
export async function getFeaturedStory() {
  return client.fetch(
    `*[_type == "story" && featured == true][0]{
      title,
      subtitle,
      content[0..1],
      "image": mainImage.asset->{
        "url": url,
        "alt": alt
      }
    }`,
  )
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

