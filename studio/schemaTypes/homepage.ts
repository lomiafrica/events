import {defineType, defineField} from 'sanity'

export default defineType({
  name: 'homepage',
  title: 'Homepage',
  type: 'document',
  // Uncomment limiter if using @sanity/document-internationalization
  // __experimental_actions: [/* 'create', */ 'update', /* 'delete', */ 'publish'],
  fields: [
    defineField({
      name: 'defaultShippingCost',
      title: 'Default shipping cost (F CFA)',
      type: 'number',
      description: 'Set the default shipping costs. Leave at 0 if shipping is free.',
      initialValue: 3000,
      validation: (Rule) => Rule.min(0),
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
      name: 'showBlogInNavigation',
      title: 'Show Blog in Navigation',
      type: 'boolean',
      initialValue: true,
      description: 'Show or hide the blog page link in the navigation menu',
    }),
    defineField({
      name: 'showGalleryInNavigation',
      title: 'Show Gallery in Navigation',
      type: 'boolean',
      initialValue: true,
      description: 'Show or hide the gallery page link in the navigation menu',
    }),
    defineField({
      name: 'primaryButtonColor',
      title: 'Primary button color',
      type: 'string',
      options: {
        list: [
          {title: 'Red', value: 'red'},
          {title: 'Amber', value: 'amber'},
          {title: 'Cyan', value: 'cyan'},
          {title: 'Teal', value: 'teal'},
          {title: 'Sky', value: 'sky'},
          {title: 'Pink', value: 'pink'},
          {title: 'Purple', value: 'purple'},
          {title: 'Yellow', value: 'yellow'},
          {title: 'Emerald', value: 'emerald'},
          {title: 'Blue', value: 'blue'},
        ],
        layout: 'dropdown',
      },
      initialValue: 'teal',
      description:
        'Color for themed buttons (cart button in header, floating promo CTA). Change in Sanity to update site-wide.',
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
      promoEventTitle: 'promoEvent.title',
      heroItems: 'heroContent',
      featuredEvents: 'featuredEvents',
    },
    prepare({promoEventTitle, heroItems, featuredEvents}) {
      let previewTitle = 'Homepage Settings'

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
      }
    },
  },
})
