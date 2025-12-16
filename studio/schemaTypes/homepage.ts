import {defineType, defineField} from 'sanity'
import {HomeIcon} from '@sanity/icons'

export default defineType({
  name: 'homepage',
  title: 'Homepage',
  type: 'document',
  icon: HomeIcon,
  // Uncomment limiter if using @sanity/document-internationalization
  // __experimental_actions: [/* 'create', */ 'update', /* 'delete', */ 'publish'],
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      initialValue: 'Homepage',
      readOnly: true, // Make title read-only for singleton
    }),
    defineField({
      name: 'defaultShippingCost',
      title: 'Default Shipping Cost (XOF)',
      type: 'number',
      description: 'Default shipping cost for products without a specific fee. Used by the shop cart.',
      initialValue: 0,
    }),
    defineField({
      name: 'promoEvent',
      title: 'Promoted Event (for Homepage Floating flyer)',
      type: 'reference',
      to: [{type: 'event'}],
      description:
        "Select an event to feature in the floating promo on the homepage. The event's flyer will be used as the image, and the promo will link to the event page.",
    }),
    defineField({
      name: 'featuredEvents',
      title: 'Featured Events for Hero Carousel',
      type: 'array',
      of: [
        {
          type: 'reference',
          to: [{type: 'event'}],
        },
      ],
      description:
        'Select events to feature in the hero section carousel. These will appear alongside videos and images.',
      validation: (Rule) => Rule.max(5),
    }),
    defineField({
      name: 'heroContent',
      title: 'Hero Section Content',
      type: 'array',
      of: [
        {
          type: 'object',
          name: 'heroItem',
          fields: [
            defineField({
              name: 'title',
              title: 'Title',
              type: 'string',
              description: 'Main title to display in the hero section',
            }),
            defineField({
              name: 'description',
              title: 'Description',
              type: 'text',
              rows: 3,
              description: 'Subtitle or description text',
            }),
            defineField({
              name: 'type',
              title: 'Media Type',
              type: 'string',
              options: {
                list: [
                  {title: 'Image', value: 'image'},
                  {title: 'Video', value: 'video'},
                ],
                layout: 'radio',
              },
              initialValue: 'image',
            }),
            defineField({
              name: 'image',
              title: 'Image',
              type: 'image',
              options: {hotspot: true},
              hidden: ({parent}) => parent?.type !== 'image',
              fields: [
                {
                  name: 'alt',
                  title: 'Alt Text',
                  type: 'string',
                  validation: (Rule) => Rule.required(),
                },
                {
                  name: 'caption',
                  title: 'Caption',
                  type: 'string',
                },
              ],
            }),
            defineField({
              name: 'video',
              title: 'Video',
              type: 'file',
              options: {accept: 'video/*'},
              hidden: ({parent}) => parent?.type !== 'video',
              description: 'Upload a video file for the hero section',
            }),
            defineField({
              name: 'videoUrl',
              title: 'Video URL',
              type: 'url',
              hidden: ({parent}) => parent?.type !== 'video',
              description: 'External video URL (YouTube, Vimeo, etc.)',
            }),
            defineField({
              name: 'isActive',
              title: 'Active',
              type: 'boolean',
              initialValue: true,
              description: 'Show this hero item on the homepage',
            }),
          ],
          preview: {
            select: {
              title: 'title',
              type: 'type',
              image: 'image',
              isActive: 'isActive',
            },
            prepare({title, type, image, isActive}) {
              return {
                title: title || 'Untitled Hero Item',
                subtitle: `${type} • ${isActive ? 'Active' : 'Inactive'}`,
                media: image,
              }
            },
          },
        },
      ],
      description: 'Hero section content - supports multiple items for carousel/slideshow',
      validation: (Rule) => Rule.max(5),
    }),
  ],
  preview: {
    select: {
      title: 'title',
      promoEventTitle: 'promoEvent.title',
      heroItems: 'heroContent',
      featuredEvents: 'featuredEvents',
    },
    prepare({title, promoEventTitle, heroItems, featuredEvents}) {
      let previewTitle = title || 'Homepage Settings'

      const counts = []
      if (heroItems?.length) counts.push(`${heroItems.length} hero`)
      if (featuredEvents?.length) counts.push(`${featuredEvents.length} event`)

      if (counts.length > 0) {
        previewTitle += ` (${counts.join(', ')})`
      }

      if (promoEventTitle) {
        previewTitle += ` • Promo: ${promoEventTitle}`
      }

      return {
        title: previewTitle,
        media: HomeIcon,
      }
    },
  },
})
