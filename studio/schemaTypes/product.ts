import {Rule} from 'sanity'

export default {
  name: 'product',
  title: 'Products',
  type: 'document',
  groups: [
    {name: 'details', title: 'Product details', default: true},
    {name: 'variants', title: 'Variants & Inventory'},
    {name: 'media', title: 'Media'},
    {name: 'organization', title: 'Organization'},
    {name: 'shipping', title: 'Shipping'},
  ],
  fields: [
    {
      name: 'name',
      title: 'Product name',
      type: 'string',
      group: 'details',
      validation: (Rule: Rule) => Rule.required(),
    },
    {
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      group: 'details',
      options: {
        source: 'name',
        maxLength: 96,
      },
      validation: (Rule: Rule) => Rule.required(),
    },
    {
      name: 'description',
      title: 'Description',
      type: 'array',
      group: 'details',
      of: [
        {type: 'block'},
        {
          type: 'image',
          options: {hotspot: true},
          fields: [{name: 'caption', title: 'Caption', type: 'string'}],
        },
      ],
    },
    {
      name: 'images',
      title: 'Product images',
      type: 'array',
      group: 'media',
      options: {
        layout: 'grid',
      },
      of: [
        {
          type: 'image',
          options: {hotspot: true},
          fields: [
            {
              name: 'alt',
              title: 'Alt',
              type: 'string',
              options: {isHighlighted: true},
              validation: (Rule: Rule) => Rule.required(),
            },
            {
              name: 'caption',
              title: 'Caption',
              type: 'string',
              options: {isHighlighted: true},
            },
          ],
        },
      ],
      validation: (Rule: Rule) => Rule.min(1).error('At least one image is required.'),
    },
    {
      name: 'basePrice',
      title: 'Base price (XOF)',
      description: 'The main price. Variant pricing can adjust this.',
      type: 'number',
      group: 'variants',
      validation: (Rule: Rule) => Rule.required().min(0),
    },
    {
      name: 'colors',
      title: 'Colors',
      type: 'array',
      group: 'variants',
      description: 'Available colors for this product',
      initialValue: () => [
        {name: 'Noir', available: true},
        {name: 'Blanc', available: true},
      ],
      of: [
        {
          type: 'object',
          fields: [
            {
              name: 'name',
              title: 'Color name',
              type: 'string',
              description:
                'The color name automatically determines the color display. Use CSS color names (e.g., black, white, red, blue, noir, blanc) or "mix" for a half-white, half-black display. French and English color names are supported. Examples: noir, blanc, black, white, red, blue, mix, etc.',
              validation: (Rule: Rule) => Rule.required(),
            },
            {
              name: 'image',
              title: 'Color image',
              type: 'image',
              description: 'Image to show when this color is selected',
              options: {
                hotspot: true,
              },
            },
            {
              name: 'available',
              title: 'Available',
              type: 'boolean',
              description: 'Whether this color is currently available',
              initialValue: true,
            },
          ],
          preview: {
            select: {
              name: 'name',
              available: 'available',
            },
            prepare({name, available}: {name: string; available: boolean}) {
              return {
                title: name || 'Unnamed Color',
                subtitle: available ? 'Available' : 'Unavailable',
              }
            },
          },
        },
      ],
    },
    {
      name: 'sizes',
      title: 'Product sizes',
      type: 'array',
      group: 'variants',
      description:
        'Select sizes for this product. Mark as available if in stock, or uncheck to mark as out of stock (rupture). Sizes not listed are not available.',
      initialValue: () => [
        {name: 'S', available: true},
        {name: 'M', available: true},
        {name: 'L', available: true},
        {name: 'XL', available: true},
      ],
      of: [
        {
          type: 'object',
          fields: [
            {
              name: 'name',
              title: 'Size name',
              type: 'string',
              options: {
                list: [
                  {title: 'XXS', value: 'XXS'},
                  {title: 'XS', value: 'XS'},
                  {title: 'S', value: 'S'},
                  {title: 'M', value: 'M'},
                  {title: 'L', value: 'L'},
                  {title: 'XL', value: 'XL'},
                  {title: 'XXL', value: 'XXL'},
                  {title: '2XL', value: '2XL'},
                ],
              },
              validation: (Rule: Rule) => Rule.required(),
            },
            {
              name: 'available',
              title: 'Available (in stock)',
              type: 'boolean',
              description:
                'Check if this size is in stock. Uncheck to mark as out of stock (rupture de stock) - it will appear with a vertical slash.',
              initialValue: true,
            },
          ],
          preview: {
            select: {
              name: 'name',
              available: 'available',
            },
            prepare({name, available}: {name: string; available: boolean}) {
              return {
                title: name || 'Unnamed Size',
                subtitle: available ? 'In stock' : 'Out of stock (rupture)',
              }
            },
          },
        },
      ],
    },
    {
      name: 'baseStock',
      title: 'Base stock',
      type: 'number',
      group: 'variants',
      description: 'Number of items available if not using variants. Set 0 for Sold Out.',
      validation: (Rule: Rule) => Rule.integer().min(0),
    },
    {
      name: 'categories',
      title: 'Categories',
      type: 'array',
      group: 'organization',
      of: [{type: 'reference', to: {type: 'category'}}],
    },
  ],
  preview: {
    select: {
      title: 'name',
      price: 'basePrice',
      stock: 'baseStock',
      media: 'images.0.asset',
    },
    prepare: (value: any) => {
      let subtitle = `${value.price} XOF`
      if (value.stock !== undefined && value.stock !== null) {
        subtitle += ` - ${value.stock} in stock`
      } else {
        subtitle += ` - Stock Undefined`
      }
      return {
        title: value.title,
        subtitle: subtitle,
        media: value.media,
      }
    },
  },
}
