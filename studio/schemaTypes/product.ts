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
      name: 'productId',
      title: 'lomi. Product ID',
      type: 'string',
      description:
        'Optional lomi.africa product ID for this product (UUID format). Leave empty if not this product is not tied to a specific lomi product.',
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
      name: 'manageVariants',
      title: 'Manage variants (e.g., Size, Color)',
      type: 'boolean',
      group: 'variants',
      initialValue: false,
    },
    {
      name: 'variantOptions',
      title: 'Variant options',
      type: 'array',
      group: 'variants',
      hidden: ({document}: {document: {manageVariants?: boolean}}) => !document?.manageVariants,
      of: [
        {
          name: 'option',
          title: 'Type',
          type: 'object',
          fields: [
            {
              name: 'name',
              title: 'Option name (e.g., Size, Color)',
              type: 'string',
              validation: (Rule: Rule) => Rule.required(),
            },
            {
              name: 'values',
              title: 'Option values (e.g., S, M, L or Red, Blue, Green)',
              type: 'array',
              of: [{type: 'string'}],
              validation: (Rule: Rule) => Rule.required().min(1),
            },
          ],
        },
      ],
    },
    {
      name: 'variantInventory',
      title: 'Variant & Pricing',
      type: 'array',
      group: 'variants',
      description:
        'Define stock and specific pricing for each combination of variants. If empty, base price and stock are used.',
      hidden: ({document}: {document: {manageVariants?: boolean}}) => !document?.manageVariants,
      of: [
        {
          name: 'variantEntry',
          title: 'Variant combination',
          type: 'object',
          fields: [
            {
              name: 'variantName',
              title: 'Variant combination (e.g., Medium / Red)',
              type: 'string',
              validation: (Rule: Rule) => Rule.required(),
              description: 'Auto-generated or manually set',
            },
            {
              name: 'sku',
              title: 'V-ID',
              type: 'string',
              description: 'Optional unique identifier for this specific variant',
            },
            {
              name: 'price',
              title: 'Price',
              type: 'number',
              description: 'Leave blank to use base price',
            },
            {
              name: 'stock',
              title: 'Stock',
              type: 'number',
              validation: (Rule: Rule) => Rule.required().integer().min(0),
            },
          ],
          preview: {
            select: {title: 'variantName', sku: 'sku', price: 'price', stock: 'stock'},
            prepare: (value: any) => ({
              title: `${value.title} (SKU: ${value.sku})`,
              subtitle: `${value.price ? value.price + ' XOF' : 'Base Price'} - ${value.stock} in stock`,
            }),
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
      hidden: ({document}: {document: {manageVariants?: boolean}}) => document?.manageVariants,
      validation: (Rule: Rule) => Rule.integer().min(0),
    },
    {
      name: 'baseSku',
      title: 'Product ID (if not managing variants)',
      type: 'string',
      group: 'variants',
      hidden: ({document}: {document: {manageVariants?: boolean}}) => document?.manageVariants,
      validation: (Rule: Rule) => Rule.required(),
    },
    {
      name: 'categories',
      title: 'Categories',
      type: 'array',
      group: 'organization',
      of: [{type: 'reference', to: {type: 'category'}}],
    },
    {
      name: 'tags',
      title: 'Tags',
      type: 'array',
      group: 'organization',
      of: [{type: 'string'}],
      options: {layout: 'tags'},
    },
    {
      name: 'relatedProducts',
      title: 'Related products',
      type: 'array',
      group: 'organization',
      of: [{type: 'reference', to: {type: 'product'}}],
    },
    {
      name: 'requiresShipping',
      title: 'Requires shipping?',
      type: 'boolean',
      group: 'shipping',
      initialValue: true,
    },
    {
      name: 'weight',
      title: 'Weight (kg)',
      type: 'number',
      group: 'shipping',
      hidden: ({document}: {document: {requiresShipping?: boolean}}) => !document?.requiresShipping,
    },
    {
      name: 'dimensions',
      title: 'Dimensions (cm)',
      type: 'object',
      group: 'shipping',
      hidden: ({document}: {document: {requiresShipping?: boolean}}) => !document?.requiresShipping,
      fields: [
        {name: 'length', title: 'Length', type: 'number'},
        {name: 'width', title: 'Width', type: 'number'},
        {name: 'height', title: 'Height', type: 'number'},
      ],
    },
  ],
  preview: {
    select: {
      title: 'name',
      price: 'basePrice',
      stock: 'baseStock',
      media: 'images.0.asset',
      manageVariants: 'manageVariants',
    },
    prepare: (value: any) => {
      let subtitle = `${value.price} XOF`
      if (value.manageVariants) {
        subtitle += ' - Manages Variants'
      } else if (value.stock !== undefined && value.stock !== null) {
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
