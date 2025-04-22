import {Rule} from 'sanity'

export default {
  name: 'event',
  title: 'Event',
  type: 'document',
  groups: [
    {name: 'details', title: 'Event Details', default: true},
    {name: 'location', title: 'Location'},
    {name: 'media', title: 'Media & Lineup'},
    {name: 'tickets', title: 'Tickets & Offerings'},
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
      title: 'Event Type',
      type: 'string',
      group: 'details',
      options: {
        list: [
          {title: 'Concert', value: 'concert'},
          {title: 'Festival', value: 'festival'},
          {title: 'Club Night', value: 'club_night'},
          {title: 'Conference', value: 'conference'},
          {title: 'Workshop', value: 'workshop'},
          {title: 'Other', value: 'other'},
        ],
        layout: 'dropdown',
      },
    },
    {
      name: 'date',
      title: 'Date & Time',
      type: 'datetime',
      group: 'details',
      options: {dateFormat: 'YYYY-MM-DD', timeFormat: 'HH:mm', timeStep: 15},
      validation: (Rule: Rule) => Rule.required(),
    },
    {
      name: 'description',
      title: 'Description',
      type: 'text',
      group: 'details',
    },
    {
      name: 'ageRestriction',
      title: 'Age Restriction',
      type: 'string',
      group: 'details',
    },
    {
      name: 'location',
      title: 'Location / Venue',
      type: 'object',
      group: 'location',
      fields: [
        {name: 'venueName', title: 'Venue Name', type: 'string'},
        {name: 'address', title: 'Address', type: 'text'},
        {name: 'googleMapsUrl', title: 'Google Maps URL', type: 'url'},
      ],
    },
    {
      name: 'venueDetails',
      title: 'Additional Venue Details',
      description: 'Info about parking, access, etc.',
      type: 'text',
      group: 'location',
    },
    {
      name: 'flyer',
      title: 'Event Flyer',
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
      of: [
        {
          name: 'artist',
          title: 'Artist / Performer',
          type: 'object',
          fields: [
            {
              name: 'name',
              title: 'Name',
              type: 'string',
              validation: (Rule: Rule) => Rule.required(),
            },
            {name: 'bio', title: 'Short Bio', type: 'text'},
            {name: 'image', title: 'Image', type: 'image', options: {hotspot: true}},
            {name: 'socialLink', title: 'Social Media Link (Optional)', type: 'url'},
          ],
          preview: {
            select: {title: 'name', media: 'image'},
            prepare({title, media}: {title: string; media: any}) {
              return {title, media}
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
      title: 'Tickets Currently On Sale?',
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
              name: 'name',
              title: 'Name',
              type: 'string',
              validation: (Rule: Rule) => Rule.required(),
            },
            {
              name: 'ticketId',
              title: 'Ticket ID / SKU',
              type: 'slug',
              options: {source: 'name', maxLength: 50},
              description:
                'Unique identifier for API integration (e.g., early-bird, booking-table). Auto-generated from name if not specified.',
              validation: (Rule: Rule) => Rule.required(),
            },
            {
              name: 'price',
              title: 'Price (XOF)',
              type: 'number',
              validation: (Rule: Rule) => Rule.required().min(0),
            },
            {
              name: 'description',
              title: 'Short Description',
              type: 'string',
            },
            {
              name: 'details',
              title: 'Detailed Information / Conditions',
              type: 'text',
              description:
                'Additional details, conditions (e.g., entry times, supplement info, package inclusions).',
            },
            {
              name: 'stock',
              title: 'Available Stock',
              type: 'number',
              description: "Number of tickets available. Leave empty or set 0 for 'Sold Out'.",
              validation: (Rule: Rule) => Rule.integer().min(0),
            },
            {
              name: 'maxPerOrder',
              title: 'Max Per Order',
              type: 'number',
              initialValue: 10,
              validation: (Rule: Rule) => Rule.integer().min(1),
            },
            {
              name: 'salesStart',
              title: 'Sales Start Date/Time (Optional)',
              type: 'datetime',
            },
            {
              name: 'salesEnd',
              title: 'Sales End Date/Time (Optional)',
              type: 'datetime',
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
              subtitle += ` | ${description || details || ''}`.trim()
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
      date: 'date',
      venue: 'location.venueName',
      media: 'flyer',
    },
    prepare({title, date, venue, media}: {title: string; date: string; venue: string; media: any}) {
      const formattedDate = date ? new Date(date).toLocaleDateString() : 'No date'
      return {
        title: title,
        subtitle: `${venue ? venue + ' | ' : ''}${formattedDate}`,
        media: media,
      }
    },
  },
}
