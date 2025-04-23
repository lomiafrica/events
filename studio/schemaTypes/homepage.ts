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
    // Add other homepage-specific fields here if needed
  ],
  preview: {
    select: {
      title: 'title',
      media: 'backgroundVideo',
    },
    prepare({title}) {
      return {
        title: title || 'Homepage Settings',
        media: HomeIcon, // Use HomeIcon for preview
      }
    },
  },
})
