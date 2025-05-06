import { defineType } from 'sanity'

// Code Block
export const codeBlockType = defineType({
  name: 'codeBlock',
  title: 'Code Block',
  type: 'object',
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
  preview: {
    select: {
      language: 'language',
      code: 'code',
    },
    prepare({ language, code }) {
      return {
        title: `Code: ${language || 'No language specified'}`,
        subtitle: code ? `${code.substring(0, 50)}...` : 'No code',
      }
    },
  },
})

// Info Block
export const infoBlockType = defineType({
  name: 'infoBlock',
  title: 'Info Block',
  type: 'object',
  fields: [
    {
      name: 'text',
      title: 'Text',
      type: 'text',
      rows: 3,
    },
  ],
  preview: {
    select: {
      text: 'text',
    },
    prepare({ text }) {
      return {
        title: 'Info Block',
        subtitle: text ? `${text.substring(0, 50)}...` : 'No text',
      }
    },
  },
})

// Warning Block
export const warningBlockType = defineType({
  name: 'warningBlock',
  title: 'Warning Block',
  type: 'object',
  fields: [
    {
      name: 'text',
      title: 'Text',
      type: 'text',
      rows: 3,
    },
  ],
  preview: {
    select: {
      text: 'text',
    },
    prepare({ text }) {
      return {
        title: 'Warning Block',
        subtitle: text ? `${text.substring(0, 50)}...` : 'No text',
      }
    },
  },
})

// Table Block
export const tableType = defineType({
  name: 'table',
  title: 'Table',
  type: 'object',
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
          preview: {
            select: {
              cells: 'cells',
            },
            prepare({ cells }) {
              return {
                title: 'Row',
                subtitle: cells ? cells.join(' | ') : 'Empty row',
              }
            },
          },
        },
      ],
    },
  ],
  preview: {
    select: {
      rows: 'rows',
    },
    prepare({ rows }) {
      return {
        title: 'Table',
        subtitle: `${rows?.length || 0} rows`,
      }
    },
  },
})

// Custom Blocks Array
export const customBlocks = [
  codeBlockType,
  infoBlockType,
  warningBlockType,
  tableType,
] 