import {defineField, defineType, defineArrayMember} from 'sanity'

export default defineType({
  name: 'gallery',
  title: 'Gallery',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      description:
        'This title acts as the category/group name for all images you are going to add below (e.g., "Event November", "Kama December", "Backstage")',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'images',
      title: 'Images',
      type: 'array',
      description:
        'Click "Add item" and select multiple images at once, or drag and drop multiple files directly here. You can upload 100+ images in one go!',
      options: {
        layout: 'grid',
      },
      of: [
        defineArrayMember({
          type: 'image',
          options: {
            hotspot: true,
          },
        }),
      ],
      validation: (Rule) => Rule.required().min(1).error('Add at least one image'),
    }),
  ],
  preview: {
    select: {
      title: 'title',
      imageCount: 'images',
      media: 'images.0',
    },
    prepare({title, imageCount, media}) {
      const count = Array.isArray(imageCount) ? imageCount.length : 0
      return {
        title: title || 'Untitled gallery',
        subtitle: `${count} image${count !== 1 ? 's' : ''}`,
        media,
      }
    },
  },
})
