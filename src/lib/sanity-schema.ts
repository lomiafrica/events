export const eventSchema = {
  name: "event",
  title: "Event",
  type: "document",
  fields: [
    {
      name: "title",
      title: "Title",
      type: "string",
      validation: (Rule) => Rule.required(),
    },
    {
      name: "slug",
      title: "Slug",
      type: "slug",
      options: {
        source: "title",
        maxLength: 96,
      },
      validation: (Rule) => Rule.required(),
    },
    {
      name: "date",
      title: "Date",
      type: "datetime",
      validation: (Rule) => Rule.required(),
    },
    {
      name: "time",
      title: "Time",
      type: "string",
    },
    {
      name: "location",
      title: "Location",
      type: "string",
    },
    {
      name: "description",
      title: "Description",
      type: "text",
    },
    {
      name: "venueDetails",
      title: "Venue Details",
      type: "text",
    },
    {
      name: "flyer",
      title: "Event Flyer",
      type: "image",
      options: {
        hotspot: true,
      },
    },
    {
      name: "ticketsAvailable",
      title: "Tickets Available",
      type: "boolean",
      initialValue: true,
    },
    {
      name: "ticketTypes",
      title: "Ticket Types",
      type: "array",
      of: [
        {
          type: "object",
          fields: [
            { name: "name", type: "string" },
            { name: "price", type: "number" },
            { name: "description", type: "string" },
            { name: "available", type: "boolean", initialValue: true },
            { name: "maxPerOrder", type: "number", initialValue: 10 },
          ],
        },
      ],
    },
    {
      name: "bundles",
      title: "Ticket Bundles",
      type: "array",
      of: [
        {
          type: "object",
          fields: [
            { name: "name", type: "string" },
            { name: "price", type: "number" },
            { name: "description", type: "string" },
            { name: "includes", type: "array", of: [{ type: "string" }] },
            { name: "available", type: "boolean", initialValue: true },
            { name: "maxPerOrder", type: "number", initialValue: 5 },
          ],
        },
      ],
    },
  ],
}

export const postSchema = {
  name: "post",
  title: "Blog Post",
  type: "document",
  fields: [
    {
      name: "title",
      title: "Title",
      type: "string",
      validation: (Rule) => Rule.required(),
    },
    {
      name: "slug",
      title: "Slug",
      type: "slug",
      options: {
        source: "title",
        maxLength: 96,
      },
      validation: (Rule) => Rule.required(),
    },
    {
      name: "author",
      title: "Author",
      type: "reference",
      to: { type: "author" },
    },
    {
      name: "mainImage",
      title: "Main image",
      type: "image",
      options: {
        hotspot: true,
      },
    },
    {
      name: "categories",
      title: "Categories",
      type: "array",
      of: [{ type: "reference", to: { type: "category" } }],
    },
    {
      name: "publishedAt",
      title: "Published at",
      type: "datetime",
    },
    {
      name: "excerpt",
      title: "Excerpt",
      type: "text",
    },
    {
      name: "body",
      title: "Body",
      type: "array",
      of: [
        { type: "block" },
        {
          type: "image",
          options: { hotspot: true },
        },
      ],
    },
  ],
}

export const storySchema = {
  name: "story",
  title: "Story",
  type: "document",
  fields: [
    {
      name: "title",
      title: "Title",
      type: "string",
      validation: (Rule) => Rule.required(),
    },
    {
      name: "subtitle",
      title: "Subtitle",
      type: "string",
    },
    {
      name: "mainImage",
      title: "Main image",
      type: "image",
      options: {
        hotspot: true,
      },
    },
    {
      name: "content",
      title: "Content",
      type: "array",
      of: [
        { type: "block" },
        {
          type: "image",
          options: { hotspot: true },
        },
      ],
    },
    {
      name: "featured",
      title: "Featured on Homepage",
      type: "boolean",
      initialValue: true,
    },
  ],
}

