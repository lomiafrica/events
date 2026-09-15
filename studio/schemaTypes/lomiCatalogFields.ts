export const lomiCatalogFieldset = {
  name: 'lomi',
  title: 'lomi.',
  options: {collapsible: true, collapsed: true},
}

export function lomiCatalogFields(options?: {group?: string; fieldset?: string}) {
  const shared = {
    readOnly: true,
    ...(options?.group ? {group: options.group} : {}),
    ...(options?.fieldset ? {fieldset: options.fieldset} : {}),
  }

  return [
    {
      name: 'lomiProductId',
      title: 'Product ID',
      type: 'string',
      description: 'Set automatically when this is published to lomi.',
      ...shared,
    },
    {
      name: 'lomiPriceId',
      title: 'Price ID',
      type: 'string',
      description: 'Set automatically when this is published to lomi.',
      ...shared,
    },
    {
      name: 'lomiSyncedAt',
      title: 'Last synced',
      type: 'datetime',
      ...shared,
    },
    {
      name: 'lomiSyncError',
      title: 'Last sync error',
      type: 'text',
      ...shared,
    },
  ]
}
