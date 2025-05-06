import {defineCliConfig} from 'sanity/cli'

export default defineCliConfig({
  api: {
    projectId: '11qckjsr',
    dataset: 'production',
  },
  studioHost: 'djaoulient',
  /**
   * Enable auto-updates for studios.
   * Learn more at https://www.sanity.io/docs/cli#auto-updates
   */
  autoUpdates: true,
})
