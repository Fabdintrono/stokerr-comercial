import { RateProvider } from './provider'

export const manualProvider: RateProvider = {
  name: 'MANUAL',
  async fetchRate() {
    return null // manual: never auto-fetches; admin sets the rate explicitly
  },
}
