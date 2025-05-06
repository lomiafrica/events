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
      name: 'backgroundVideo',
      title: 'Background video',
      type: 'file',
      options: {
        accept: 'video/*', // Accept only video files
      },
      description: 'Upload a video to play in the background of the homepage.',
    }),
    defineField({
      name: 'promoEvent',
      title: 'Promoted Event (for Homepage Floating flyer)',
      type: 'reference',
      to: [{type: 'event'}],
      description: 'Select an event to feature in the floating promo on the homepage. The event\'s flyer will be used as the image, and the promo will link to the event page.',
    })
    // Add other homepage-specific fields here if needed
  ],
  preview: {
    select: {
      title: 'title',
      media: 'backgroundVideo',
      promoEventTitle: 'promoEvent.title',
    },
    prepare({title, media, promoEventTitle}) {
      let previewTitle = title || 'Homepage Settings';
      if (promoEventTitle) {
        previewTitle += ` (Promo: ${promoEventTitle})`;
      }
      return {
        title: previewTitle,
        media: HomeIcon,
      }
    },
  },
})
