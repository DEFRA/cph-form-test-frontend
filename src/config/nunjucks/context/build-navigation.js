/**
 * @param {Partial<Request> | null} request
 */
export function buildNavigation(request) {
  return [
    {
      text: 'Create CPH',
      href: '/apply-for-a-county-parish-holding-cph-number/are-you-18-or-older',
      active: request?.path?.startsWith(
        '/apply-for-a-county-parish-holding-cph-number'
      )
    }
  ]
}

/**
 * @import { Request } from '@hapi/hapi'
 */
