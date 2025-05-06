import { defineField, defineType } from 'sanity'

export const postType = defineType({
  name: 'post',
  title: 'Post',
  type: 'document',
  fields: [
    // Default language fields (English)
    defineField({
      name: 'title',
      title: 'Title (English)',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'title' },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'publishedAt',
      title: 'Published At',
      type: 'datetime',
      initialValue: () => new Date().toISOString(),
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'image',
      title: 'Featured Image',
      type: 'image',
      options: {
        hotspot: true,
      },
      fields: [
        {
          name: 'alt',
          type: 'string',
          title: 'Alternative Text',
        },
        {
          name: 'caption',
          type: 'string',
          title: 'Image Caption',
          description: 'A caption that will appear below the image',
        },
      ],
    }),
    defineField({
      name: 'excerpt',
      title: 'Excerpt (English)',
      type: 'text',
      rows: 3,
    }),
    defineField({
      name: 'body',
      title: 'Body (English)',
      type: 'array',
      of: [
        { type: 'block',
          marks: {
            decorators: [
              { title: 'Strong', value: 'strong' },
              { title: 'Emphasis', value: 'em' },
              { title: 'Code', value: 'code' },
              { title: 'Underline', value: 'underline' },
              { title: 'Strike', value: 'strike-through' },
              { title: 'Highlight', value: 'highlight' },
            ],
            annotations: [
              {
                name: 'link',
                type: 'object',
                title: 'Link',
                fields: [
                  {
                    name: 'href',
                    type: 'url',
                    title: 'URL',
                  },
                ],
              },
              {
                name: 'button',
                type: 'object',
                title: 'Button',
                fields: [
                  {
                    name: 'url',
                    type: 'url',
                    title: 'URL',
                  },
                ],
              },
            ],
          },
          styles: [
            { title: 'Normal', value: 'normal' },
            { title: 'H1', value: 'h1' },
            { title: 'H2', value: 'h2' },
            { title: 'H3', value: 'h3' },
            { title: 'H4', value: 'h4' },
            { title: 'Quote', value: 'blockquote' },
            { title: 'Lead Paragraph', value: 'lead' },
            { title: 'Custom List', value: 'customList' },
          ],
        },
        {
          type: 'image',
          fields: [
            {
              name: 'alt',
              type: 'string',
              title: 'Alternative Text',
            },
            {
              name: 'caption',
              type: 'string',
              title: 'Caption',
              description: 'A caption that will appear below the image',
            },
          ],
        },
        {
          type: 'object',
          name: 'codeBlock',
          title: 'Code Block',
          fields: [
            {
              name: 'language',
              title: 'Language',
              type: 'string',
              options: {
                list: [
                  { title: 'JavaScript', value: 'javascript' },
                  { title: 'TypeScript', value: 'typescript' },
                  { title: 'HTML', value: 'html' },
                  { title: 'CSS', value: 'css' },
                  { title: 'JSON', value: 'json' },
                  { title: 'Bash', value: 'bash' },
                  { title: 'Python', value: 'python' },
                ],
              },
            },
            {
              name: 'code',
              title: 'Code',
              type: 'text',
              rows: 10,
            },
          ],
        },
        {
          type: 'object',
          name: 'infoBlock',
          title: 'Info Block',
          fields: [
            {
              name: 'text',
              title: 'Text',
              type: 'text',
              rows: 3,
            },
          ],
        },
        {
          type: 'object',
          name: 'warningBlock',
          title: 'Warning Block',
          fields: [
            {
              name: 'text',
              title: 'Text',
              type: 'text',
              rows: 3,
            },
          ],
        },
        {
          type: 'object',
          name: 'table',
          title: 'Table',
          fields: [
            {
              name: 'rows',
              title: 'Rows',
              type: 'array',
              of: [
                {
                  name: 'row',
                  title: 'Row',
                  type: 'object',
                  fields: [
                    {
                      name: 'cells',
                      title: 'Cells',
                      type: 'array',
                      of: [{ type: 'string' }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    }),
    
    // French translations
    defineField({
      name: 'title_fr',
      title: 'Title (French)',
      type: 'string',
    }),
    defineField({
      name: 'excerpt_fr',
      title: 'Excerpt (French)',
      type: 'text',
      rows: 3,
    }),
    defineField({
      name: 'body_fr',
      title: 'Body (French)',
      type: 'array',
      of: [
        { type: 'block',
          marks: {
            decorators: [
              { title: 'Strong', value: 'strong' },
              { title: 'Emphasis', value: 'em' },
              { title: 'Code', value: 'code' },
              { title: 'Underline', value: 'underline' },
              { title: 'Strike', value: 'strike-through' },
              { title: 'Highlight', value: 'highlight' },
            ],
            annotations: [
              {
                name: 'link',
                type: 'object',
                title: 'Link',
                fields: [
                  {
                    name: 'href',
                    type: 'url',
                    title: 'URL',
                  },
                ],
              },
              {
                name: 'button',
                type: 'object',
                title: 'Button',
                fields: [
                  {
                    name: 'url',
                    type: 'url',
                    title: 'URL',
                  },
                ],
              },
            ],
          },
          styles: [
            { title: 'Normal', value: 'normal' },
            { title: 'H1', value: 'h1' },
            { title: 'H2', value: 'h2' },
            { title: 'H3', value: 'h3' },
            { title: 'H4', value: 'h4' },
            { title: 'Quote', value: 'blockquote' },
            { title: 'Lead Paragraph', value: 'lead' },
            { title: 'Custom List', value: 'customList' },
          ],
        },
        {
          type: 'image',
          fields: [
            {
              name: 'alt',
              type: 'string',
              title: 'Alternative Text',
            },
            {
              name: 'caption',
              type: 'string',
              title: 'Caption',
              description: 'A caption that will appear below the image',
            },
          ],
        },
        {
          type: 'object',
          name: 'codeBlock',
          title: 'Code Block',
          fields: [
            {
              name: 'language',
              title: 'Language',
              type: 'string',
              options: {
                list: [
                  { title: 'JavaScript', value: 'javascript' },
                  { title: 'TypeScript', value: 'typescript' },
                  { title: 'HTML', value: 'html' },
                  { title: 'CSS', value: 'css' },
                  { title: 'JSON', value: 'json' },
                  { title: 'Bash', value: 'bash' },
                  { title: 'Python', value: 'python' },
                ],
              },
            },
            {
              name: 'code',
              title: 'Code',
              type: 'text',
              rows: 10,
            },
          ],
        },
        {
          type: 'object',
          name: 'infoBlock',
          title: 'Info Block',
          fields: [
            {
              name: 'text',
              title: 'Text',
              type: 'text',
              rows: 3,
            },
          ],
        },
        {
          type: 'object',
          name: 'warningBlock',
          title: 'Warning Block',
          fields: [
            {
              name: 'text',
              title: 'Text',
              type: 'text',
              rows: 3,
            },
          ],
        },
        {
          type: 'object',
          name: 'table',
          title: 'Table',
          fields: [
            {
              name: 'rows',
              title: 'Rows',
              type: 'array',
              of: [
                {
                  name: 'row',
                  title: 'Row',
                  type: 'object',
                  fields: [
                    {
                      name: 'cells',
                      title: 'Cells',
                      type: 'array',
                      of: [{ type: 'string' }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    }),
    
    // Spanish translations
    defineField({
      name: 'title_es',
      title: 'Title (Spanish)',
      type: 'string',
    }),
    defineField({
      name: 'excerpt_es',
      title: 'Excerpt (Spanish)',
      type: 'text',
      rows: 3,
    }),
    defineField({
      name: 'body_es',
      title: 'Body (Spanish)',
      type: 'array',
      of: [
        { type: 'block',
          marks: {
            decorators: [
              { title: 'Strong', value: 'strong' },
              { title: 'Emphasis', value: 'em' },
              { title: 'Code', value: 'code' },
              { title: 'Underline', value: 'underline' },
              { title: 'Strike', value: 'strike-through' },
              { title: 'Highlight', value: 'highlight' },
            ],
            annotations: [
              {
                name: 'link',
                type: 'object',
                title: 'Link',
                fields: [
                  {
                    name: 'href',
                    type: 'url',
                    title: 'URL',
                  },
                ],
              },
              {
                name: 'button',
                type: 'object',
                title: 'Button',
                fields: [
                  {
                    name: 'url',
                    type: 'url',
                    title: 'URL',
                  },
                ],
              },
            ],
          },
          styles: [
            { title: 'Normal', value: 'normal' },
            { title: 'H1', value: 'h1' },
            { title: 'H2', value: 'h2' },
            { title: 'H3', value: 'h3' },
            { title: 'H4', value: 'h4' },
            { title: 'Quote', value: 'blockquote' },
            { title: 'Lead Paragraph', value: 'lead' },
            { title: 'Custom List', value: 'customList' },
          ],
        },
        {
          type: 'image',
          fields: [
            {
              name: 'alt',
              type: 'string',
              title: 'Alternative Text',
            },
            {
              name: 'caption',
              type: 'string',
              title: 'Caption',
              description: 'A caption that will appear below the image',
            },
          ],
        },
        {
          type: 'object',
          name: 'codeBlock',
          title: 'Code Block',
          fields: [
            {
              name: 'language',
              title: 'Language',
              type: 'string',
              options: {
                list: [
                  { title: 'JavaScript', value: 'javascript' },
                  { title: 'TypeScript', value: 'typescript' },
                  { title: 'HTML', value: 'html' },
                  { title: 'CSS', value: 'css' },
                  { title: 'JSON', value: 'json' },
                  { title: 'Bash', value: 'bash' },
                  { title: 'Python', value: 'python' },
                ],
              },
            },
            {
              name: 'code',
              title: 'Code',
              type: 'text',
              rows: 10,
            },
          ],
        },
        {
          type: 'object',
          name: 'infoBlock',
          title: 'Info Block',
          fields: [
            {
              name: 'text',
              title: 'Text',
              type: 'text',
              rows: 3,
            },
          ],
        },
        {
          type: 'object',
          name: 'warningBlock',
          title: 'Warning Block',
          fields: [
            {
              name: 'text',
              title: 'Text',
              type: 'text',
              rows: 3,
            },
          ],
        },
        {
          type: 'object',
          name: 'table',
          title: 'Table',
          fields: [
            {
              name: 'rows',
              title: 'Rows',
              type: 'array',
              of: [
                {
                  name: 'row',
                  title: 'Row',
                  type: 'object',
                  fields: [
                    {
                      name: 'cells',
                      title: 'Cells',
                      type: 'array',
                      of: [{ type: 'string' }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    }),
    
    // Portuguese translations
    defineField({
      name: 'title_pt',
      title: 'Title (Portuguese)',
      type: 'string',
    }),
    defineField({
      name: 'excerpt_pt',
      title: 'Excerpt (Portuguese)',
      type: 'text',
      rows: 3,
    }),
    defineField({
      name: 'body_pt',
      title: 'Body (Portuguese)',
      type: 'array',
      of: [
        { type: 'block',
          marks: {
            decorators: [
              { title: 'Strong', value: 'strong' },
              { title: 'Emphasis', value: 'em' },
              { title: 'Code', value: 'code' },
              { title: 'Underline', value: 'underline' },
              { title: 'Strike', value: 'strike-through' },
              { title: 'Highlight', value: 'highlight' },
            ],
            annotations: [
              {
                name: 'link',
                type: 'object',
                title: 'Link',
                fields: [
                  {
                    name: 'href',
                    type: 'url',
                    title: 'URL',
                  },
                ],
              },
              {
                name: 'button',
                type: 'object',
                title: 'Button',
                fields: [
                  {
                    name: 'url',
                    type: 'url',
                    title: 'URL',
                  },
                ],
              },
            ],
          },
          styles: [
            { title: 'Normal', value: 'normal' },
            { title: 'H1', value: 'h1' },
            { title: 'H2', value: 'h2' },
            { title: 'H3', value: 'h3' },
            { title: 'H4', value: 'h4' },
            { title: 'Quote', value: 'blockquote' },
            { title: 'Lead Paragraph', value: 'lead' },
            { title: 'Custom List', value: 'customList' },
          ],
        },
        {
          type: 'image',
          fields: [
            {
              name: 'alt',
              type: 'string',
              title: 'Alternative Text',
            },
            {
              name: 'caption',
              type: 'string',
              title: 'Caption',
              description: 'A caption that will appear below the image',
            },
          ],
        },
        {
          type: 'object',
          name: 'codeBlock',
          title: 'Code Block',
          fields: [
            {
              name: 'language',
              title: 'Language',
              type: 'string',
              options: {
                list: [
                  { title: 'JavaScript', value: 'javascript' },
                  { title: 'TypeScript', value: 'typescript' },
                  { title: 'HTML', value: 'html' },
                  { title: 'CSS', value: 'css' },
                  { title: 'JSON', value: 'json' },
                  { title: 'Bash', value: 'bash' },
                  { title: 'Python', value: 'python' },
                ],
              },
            },
            {
              name: 'code',
              title: 'Code',
              type: 'text',
              rows: 10,
            },
          ],
        },
        {
          type: 'object',
          name: 'infoBlock',
          title: 'Info Block',
          fields: [
            {
              name: 'text',
              title: 'Text',
              type: 'text',
              rows: 3,
            },
          ],
        },
        {
          type: 'object',
          name: 'warningBlock',
          title: 'Warning Block',
          fields: [
            {
              name: 'text',
              title: 'Text',
              type: 'text',
              rows: 3,
            },
          ],
        },
        {
          type: 'object',
          name: 'table',
          title: 'Table',
          fields: [
            {
              name: 'rows',
              title: 'Rows',
              type: 'array',
              of: [
                {
                  name: 'row',
                  title: 'Row',
                  type: 'object',
                  fields: [
                    {
                      name: 'cells',
                      title: 'Cells',
                      type: 'array',
                      of: [{ type: 'string' }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    }),
    
    // Chinese translations
    defineField({
      name: 'title_zh',
      title: 'Title (Chinese)',
      type: 'string',
    }),
    defineField({
      name: 'excerpt_zh',
      title: 'Excerpt (Chinese)',
      type: 'text',
      rows: 3,
    }),
    defineField({
      name: 'body_zh',
      title: 'Body (Chinese)',
      type: 'array',
      of: [
        { type: 'block',
          marks: {
            decorators: [
              { title: 'Strong', value: 'strong' },
              { title: 'Emphasis', value: 'em' },
              { title: 'Code', value: 'code' },
              { title: 'Underline', value: 'underline' },
              { title: 'Strike', value: 'strike-through' },
              { title: 'Highlight', value: 'highlight' },
            ],
            annotations: [
              {
                name: 'link',
                type: 'object',
                title: 'Link',
                fields: [
                  {
                    name: 'href',
                    type: 'url',
                    title: 'URL',
                  },
                ],
              },
              {
                name: 'button',
                type: 'object',
                title: 'Button',
                fields: [
                  {
                    name: 'url',
                    type: 'url',
                    title: 'URL',
                  },
                ],
              },
            ],
          },
          styles: [
            { title: 'Normal', value: 'normal' },
            { title: 'H1', value: 'h1' },
            { title: 'H2', value: 'h2' },
            { title: 'H3', value: 'h3' },
            { title: 'H4', value: 'h4' },
            { title: 'Quote', value: 'blockquote' },
            { title: 'Lead Paragraph', value: 'lead' },
            { title: 'Custom List', value: 'customList' },
          ],
        },
        {
          type: 'image',
          fields: [
            {
              name: 'alt',
              type: 'string',
              title: 'Alternative Text',
            },
            {
              name: 'caption',
              type: 'string',
              title: 'Caption',
              description: 'A caption that will appear below the image',
            },
          ],
        },
        {
          type: 'object',
          name: 'codeBlock',
          title: 'Code Block',
          fields: [
            {
              name: 'language',
              title: 'Language',
              type: 'string',
              options: {
                list: [
                  { title: 'JavaScript', value: 'javascript' },
                  { title: 'TypeScript', value: 'typescript' },
                  { title: 'HTML', value: 'html' },
                  { title: 'CSS', value: 'css' },
                  { title: 'JSON', value: 'json' },
                  { title: 'Bash', value: 'bash' },
                  { title: 'Python', value: 'python' },
                ],
              },
            },
            {
              name: 'code',
              title: 'Code',
              type: 'text',
              rows: 10,
            },
          ],
        },
        {
          type: 'object',
          name: 'infoBlock',
          title: 'Info Block',
          fields: [
            {
              name: 'text',
              title: 'Text',
              type: 'text',
              rows: 3,
            },
          ],
        },
        {
          type: 'object',
          name: 'warningBlock',
          title: 'Warning Block',
          fields: [
            {
              name: 'text',
              title: 'Text',
              type: 'text',
              rows: 3,
            },
          ],
        },
        {
          type: 'object',
          name: 'table',
          title: 'Table',
          fields: [
            {
              name: 'rows',
              title: 'Rows',
              type: 'array',
              of: [
                {
                  name: 'row',
                  title: 'Row',
                  type: 'object',
                  fields: [
                    {
                      name: 'cells',
                      title: 'Cells',
                      type: 'array',
                      of: [{ type: 'string' }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    }),
    
    // Author information
    defineField({
      name: 'author',
      title: 'Author',
      type: 'reference',
      to: [{ type: 'author' }],
      description: 'Select the author of this post',
    }),
    
    // Categories - single string field (legacy support)
    defineField({
      name: 'category',
      title: 'Category (Legacy)',
      type: 'string',
      description: 'Single category selection (for backward compatibility)',
      options: {
        list: [
          { title: 'News', value: 'news' },
          { title: 'Opinion', value: 'opinion' },
          { title: 'Payments', value: 'payments' },
          { title: 'Startup & Open-Source', value: 'startupOpenSource' },
          { title: 'Case Study', value: 'case-study' },
          { title: 'Online Business', value: 'online-business' },
        ],
        layout: 'dropdown',
      },
    }),
    
    
    // Tags
    defineField({
      name: 'tags',
      title: 'Tags',
      type: 'array',
      of: [{ type: 'string' }],
      options: {
        layout: 'tags',
      },
    }),
    
    // Language support field
    defineField({
      name: 'languages',
      title: 'Available Languages',
      type: 'array',
      of: [{ type: 'string' }],
      options: {
        list: [
          { title: 'English', value: 'en' },
          { title: 'French', value: 'fr' },
          { title: 'Spanish', value: 'es' },
          { title: 'Portuguese', value: 'pt' },
          { title: 'Chinese', value: 'zh' },
        ],
      },
      initialValue: ['en'],
    }),
  ],
  preview: {
    select: {
      title: 'title',
      subtitle: 'category',
      media: 'image',
    },
  },
}) 