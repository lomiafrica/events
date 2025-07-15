import {Rule} from 'sanity'

export default {
  name: 'event',
  title: 'Event',
  type: 'document',
  groups: [
    {name: 'details', title: 'Event details', default: true},
    {name: 'location', title: 'Location'},
    {name: 'media', title: 'Media & Lineup'},
    {name: 'tickets', title: 'Tickets & Offerings'},
  ],
  orderings: [
    {
      title: 'Event Date (Newest First)',
      name: 'eventDateDesc',
      by: [{field: 'date', direction: 'desc'}],
    },
    {
      title: 'Event Date (Oldest First)',
      name: 'eventDateAsc',
      by: [{field: 'date', direction: 'asc'}],
    },
    {
      title: 'Title (A-Z)',
      name: 'titleAsc',
      by: [{field: 'title', direction: 'asc'}],
    },
    {
      title: 'Title (Z-A)',
      name: 'titleDesc',
      by: [{field: 'title', direction: 'desc'}],
    },
  ],
  fields: [
    {
      name: 'title',
      title: 'Title',
      type: 'string',
      group: 'details',
      validation: (Rule: Rule) => Rule.required(),
    },
    {
      name: 'subtitle',
      title: 'Subtitle',
      type: 'string',
      group: 'details',
    },
    {
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      group: 'details',
      options: {
        source: 'title',
        maxLength: 96,
      },
      validation: (Rule: Rule) => Rule.required(),
    },
    {
      name: 'eventType',
      title: 'Event type',
      type: 'string',
      group: 'details',
      options: {
        list: [
          {title: 'Concert', value: 'concert'},
          {title: 'Festival', value: 'festival'},
          {title: 'Party', value: 'party'},
          {title: 'Meet-up', value: 'meetup'},
          {title: 'Workshop', value: 'workshop'},
          {title: 'Other', value: 'other'},
        ],
        layout: 'dropdown',
      },
    },
    {
      name: 'date',
      title: 'Date & Time',
      description: 'The main start date and time for the event.',
      type: 'datetime',
      group: 'details',
      options: {dateFormat: 'YYYY-MM-DD', timeFormat: 'HH:mm', timeStep: 15},
      validation: (Rule: Rule) => Rule.required(),
    },
    {
      name: 'description',
      title: 'Description',
      type: 'object',
      group: 'details',
      fields: [
        {
          name: 'en',
          title: 'English',
          type: 'text',
        },
        {
          name: 'fr',
          title: 'French',
          type: 'text',
        },
      ],
    },
    {
      name: 'hostedBy',
      title: 'Hosted by',
      type: 'string',
      group: 'details',
    },
    {
      name: 'ageRestriction',
      title: 'Age restriction',
      type: 'string',
      group: 'details',
    },
    {
      name: 'location',
      title: 'Location & Venue',
      type: 'object',
      group: 'location',
      fields: [
        {name: 'venueName', title: 'Venue name', type: 'string'},
        {name: 'address', title: 'Address', type: 'text'},
        {name: 'googleMapsUrl', title: 'Google Maps URL', type: 'url'},
        {
          name: 'yangoUrl',
          title: 'Yango Ride URL',
          type: 'url',
          description:
            'Direct URL to open Yango app for a ride to the venue (e.g., a pre-filled destination link). The format should be: https://yango.go.link/route?end-lat={latitude}&end-lon={longitude}',
        },
      ],
    },
    {
      name: 'venueDetails',
      title: 'Additional details',
      description: 'Info about parking, access, etc.',
      type: 'object',
      group: 'location',
      fields: [
        {
          name: 'en',
          title: 'English',
          type: 'text',
        },
        {
          name: 'fr',
          title: 'French',
          type: 'text',
        },
      ],
    },
    {
      name: 'flyer',
      title: 'Event flyer',
      type: 'image',
      group: 'media',
      options: {
        hotspot: true,
      },
      fields: [
        {
          name: 'caption',
          title: 'Caption',
          type: 'string',
          options: {isHighlighted: true},
        },
      ],
    },
    {
      name: 'lineup',
      title: 'Lineup / Artists',
      type: 'array',
      group: 'media',
      description:
        'Add artists performing at this event. Create new artists or link existing ones.',
      of: [
        {
          name: 'artistReference',
          title: 'Artist',
          type: 'reference',
          to: [{type: 'artist'}],
          preview: {
            select: {
              title: 'reference.name',
              media: 'reference.image',
            },
          },
        },
      ],
    },
    {
      name: 'gallery',
      title: 'Event Gallery',
      type: 'array',
      group: 'media',
      of: [
        {
          type: 'image',
          options: {hotspot: true},
          fields: [
            {name: 'caption', title: 'Caption', type: 'string', options: {isHighlighted: true}},
          ],
        },
      ],
    },
    {
      name: 'ticketsAvailable',
      title: 'Tickets currently on sale?',
      type: 'boolean',
      group: 'tickets',
      initialValue: true,
    },
    {
      name: 'ticketTypes',
      title: 'Ticket Types / Offerings',
      type: 'array',
      group: 'tickets',
      of: [
        {
          name: 'ticketType',
          title: 'Ticket / Offering',
          type: 'object',
          fields: [
            {
              name: 'paymentLink',
              title: 'Direct payment link',
              type: 'url',
              description: 'URL for direct purchase of this specific ticket type.',
            },
            {
              name: 'name',
              title: 'Name',
              type: 'string',
              validation: (Rule: Rule) => Rule.required(),
            },
            {
              name: 'price',
              title: 'Price (XOF)',
              type: 'number',
              validation: (Rule: Rule) => Rule.required().min(0),
            },
            {
              name: 'productId',
              title: 'lomi. Product ID',
              type: 'string',
              description:
                'Optional lomi.africa product ID for this ticket type (UUID format). Leave empty if not this event is not tied to a specific product.',
            },
            {
              name: 'description',
              title: 'Short description',
              type: 'string',
            },
            {
              name: 'details',
              title: 'More details / Perks',
              type: 'text',
              description:
                'Use this field to list inclusions, benefits, or conditions (e.g., "Includes 1 bottle of champagne", "VIP seating area access", "Valid for entry before 11 PM").',
            },
            {
              name: 'stock',
              title: 'Available stock',
              type: 'number',
              description: "Number of tickets available. Leave empty or set 0 for 'Sold Out'.",
              validation: (Rule: Rule) => Rule.integer().min(0),
            },
            {
              name: 'active',
              title: 'Active for Sale',
              type: 'boolean',
              description:
                'Is this ticket type currently available for sale (independent of stock/dates)?',
              initialValue: true,
            },
            {
              name: 'maxPerOrder',
              title: 'Max per order',
              type: 'number',
              initialValue: 10,
              validation: (Rule: Rule) => Rule.integer().min(1),
            },
            {
              name: 'salesStart',
              title: 'Sales Start Date/Time',
              type: 'datetime',
              options: {dateFormat: 'YYYY-MM-DD', timeFormat: 'HH:mm'},
            },
            {
              name: 'salesEnd',
              title: 'Sales End Date/Time',
              type: 'datetime',
              options: {dateFormat: 'YYYY-MM-DD', timeFormat: 'HH:mm'},
            },
          ],
          preview: {
            select: {
              title: 'name',
              price: 'price',
              stock: 'stock',
              description: 'description',
              details: 'details',
            },
            prepare({
              title,
              price,
              stock,
              description,
              details,
            }: {
              title: string
              price: number
              stock: number
              description?: string
              details?: string
            }) {
              let subtitle = `${price} XOF`
              if (stock !== undefined && stock !== null) {
                subtitle += ` - ${stock} left`
              } else {
                subtitle += ` - Unlimited`
              }
              const previewDesc = description || details || ''
              subtitle += ` | ${previewDesc}`.trim()
              return {
                title: title,
                subtitle: subtitle.substring(0, 80) + (subtitle.length > 80 ? '...' : ''),
              }
            },
          },
        },
      ],
    },
    {
      name: 'bundles',
      title: 'Ticket bundles / Packages',
      type: 'array',
      group: 'tickets',
      description: 'Define special packages combining tickets or offering unique value.',
      of: [
        {
          name: 'bundle',
          title: 'Bundle / Package',
          type: 'object',
          fields: [
            {
              name: 'name',
              title: 'Bundle name',
              type: 'string',
              validation: (Rule: Rule) => Rule.required(),
            },
            {
              name: 'bundleId',
              title: 'Bundle ID',
              type: 'slug',
              options: {source: 'name', maxLength: 50},
              description:
                'Unique identifier for this bundle (e.g., vip-duo-pack). Auto-generated if blank.',
              validation: (Rule: Rule) => Rule.required(),
            },
            {
              name: 'price',
              title: 'Bundle price (XOF)',
              type: 'number',
              validation: (Rule: Rule) => Rule.required().min(0),
            },
            {
              name: 'productId',
              title: 'lomi. Product ID',
              type: 'string',
              description:
                'Optional lomi. product ID for this bundle (UUID format). Leave empty if not this event is not tied to a specific product.',
            },
            {
              name: 'ticketsIncluded',
              title: 'Tickets included per bundle',
              type: 'number',
              description:
                'Number of tickets included with each bundle purchase. For example, if set to 2, buying 1 bundle will generate 2 tickets.',
              initialValue: 1,
              validation: (Rule: Rule) => Rule.required().integer().min(1),
            },
            {
              name: 'description',
              title: 'Short description',
              type: 'string',
            },
            {
              name: 'details',
              title: 'Bundle details',
              type: 'text',
              description:
                'List everything included in this bundle (e.g., "2x VIP Tickets, 1x Champagne Bottle").',
            },
            {
              name: 'stock',
              title: 'Available bundles',
              type: 'number',
              description: "Number of bundles available. Leave empty or set 0 for 'Sold Out'.",
              validation: (Rule: Rule) => Rule.integer().min(0),
            },
            {
              name: 'paymentLink',
              title: 'Direct payment link',
              type: 'url',
              description: 'URL for direct purchase of this specific bundle.',
            },
            {
              name: 'active',
              title: 'Active',
              type: 'boolean',
              description: 'Is this bundle currently active for sale?',
              initialValue: true,
            },
            {
              name: 'maxPerOrder',
              title: 'Max per order',
              type: 'number',
              initialValue: 10,
              description: 'Maximum number of this bundle that can be purchased in a single order.',
              validation: (Rule: Rule) => Rule.integer().min(1),
            },
            {
              name: 'salesStart',
              title: 'Sales Start Date/Time',
              type: 'datetime',
              options: {dateFormat: 'YYYY-MM-DD', timeFormat: 'HH:mm'},
            },
            {
              name: 'salesEnd',
              title: 'Sales End Date/Time',
              type: 'datetime',
              options: {dateFormat: 'YYYY-MM-DD', timeFormat: 'HH:mm'},
            },
          ],
          preview: {
            select: {
              title: 'name',
              price: 'price',
              description: 'description',
              details: 'details',
            },
            prepare({
              title,
              price,
              description,
              details,
            }: {
              title: string
              price: number
              description?: string
              details?: string
            }) {
              const subtitle = `${price} XOF | ${description || details || ''}`.trim()
              return {
                title: title,
                subtitle: subtitle.substring(0, 80) + (subtitle.length > 80 ? '...' : ''),
              }
            },
          },
        },
      ],
    },
  ],
  preview: {
    select: {
      title: 'title',
      subtitle: 'subtitle',
      date: 'date',
      venue: 'location.venueName',
      media: 'flyer',
    },
    prepare({
      title,
      subtitle,
      date,
      venue,
      media,
    }: {
      title: string
      subtitle?: string
      date: string
      venue?: string
      media: any
    }) {
      const formattedDate = date ? new Date(date).toLocaleDateString() : 'No date'
      const previewSubtitle = [subtitle, venue, formattedDate].filter(Boolean).join(' | ')

      return {
        title: title,
        subtitle: previewSubtitle,
        media: media,
      }
    },
  },
}
