import { Rule } from 'sanity';

export default {
  name: "story",
  title: "Story",
  type: "document",
  fields: [
    {
      name: "title",
      title: "Title",
      type: "string",
      validation: (Rule: Rule) => Rule.required(),
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
          fields: [
            {
              name: 'alt',
              title: 'Alt Text (for SEO & Accessibility)',
              type: 'string',
              options: { isHighlighted: true },
              validation: (Rule: Rule) => Rule.required()
            },
            {
              name: 'caption',
              title: 'Caption',
              type: 'string',
              options: { isHighlighted: true }
            }
          ]
        },
        {
          name: 'videoEmbed',
          title: 'Video Embed',
          type: 'object',
          fields: [
            {
              name: 'url',
              title: 'Video URL',
              type: 'url',
              description: 'URL from YouTube, Vimeo, etc.',
              validation: (Rule: Rule) => Rule.required()
            },
            {
              name: 'caption',
              title: 'Caption',
              type: 'string'
            }
          ],
          preview: {
            select: { url: 'url', caption: 'caption' },
            prepare({ url, caption }: { url: string; caption?: string }) {
              return {
                title: `Video: ${caption || url}`,
                subtitle: url
              }
            }
          }
        }
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