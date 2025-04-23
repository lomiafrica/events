import {Rule} from 'sanity'

export default {
  name: 'author',
  title: 'Author',
  type: 'document',
  fields: [
    {
      name: 'name',
      title: 'Name',
      type: 'string',
      validation: (Rule: Rule) => Rule.required(),
    },
    {
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {
        source: 'name',
        maxLength: 96,
      },
    },
    {
      name: 'image',
      title: 'Image',
      type: 'image',
      options: {
        hotspot: true,
      },
    },
    {
      name: 'bio',
      title: 'Bio',
      type: 'array',
      of: [{type: 'block'}],
    },
    {
      name: 'socialLinks',
      title: 'Social media links',
      type: 'array',
      of: [
        {
          name: 'socialLink',
          title: 'Social link',
          type: 'object',
          fields: [
            {
              name: 'platform',
              title: 'Platform',
              type: 'string',
              options: {list: ['Twitter', 'LinkedIn', 'Instagram', 'Facebook', 'Website', 'Other']},
              validation: (Rule: Rule) => Rule.required(),
            },
            {name: 'url', title: 'URL', type: 'url', validation: (Rule: Rule) => Rule.required()},
          ],
        },
      ],
    },
  ],
  preview: {
    select: {title: 'name', media: 'image'},
    prepare({title, media}: {title: string; media: any}) {
      return {title, media}
    },
  },
}
