import {defineType, defineField} from 'sanity'
import {UsersIcon} from '@sanity/icons' // Optional: Add an icon

export default defineType({
  name: 'artist',
  title: 'Artist / Performer',
  type: 'document',
  icon: UsersIcon, // Optional icon
  fields: [
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {
        source: 'name',
        maxLength: 96,
      },
      description: 'Unique identifier for the artist, used for URLs if needed.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'bio',
      title: 'Short Bio (Optional)',
      type: 'text',
    }),
    defineField({
      name: 'image',
      title: 'Image',
      type: 'image',
      options: {hotspot: true},
    }),
    defineField({
      name: 'socialLink',
      title: 'Social Media Link (Optional)',
      type: 'url',
      description: 'Link to their primary social media profile (e.g., Instagram, Twitter, Website).',
    }),
    // Add any other relevant fields for artists here
  ],
  preview: {
    select: {
      title: 'name',
      media: 'image',
    },
    prepare({title, media}) {
      return {
        title: title,
        media: media,
      }
    },
  },
}) 