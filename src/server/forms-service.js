import Boom from '@hapi/boom'
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs'
import { config } from '~/src/config/config.js'
import cphDefinition from './forms/apply-for-a-county-parish-holding-cph-number.json' with { type: 'json' }
import { checkFormStatus } from '@defra/forms-engine-plugin/engine/helpers.js'
import { getFormatter } from '@defra/forms-engine-plugin/engine/outputFormatters/index.js'

/**
 * @import { FormStatus } from '@defra/forms-engine-plugin/types'
 * @import { SubmitPayload } from '@defra/forms-model'
 */

// Form metadata
const now = new Date()
const user = { id: 'example-user', displayName: 'Example user' }

const author = {
  createdAt: now,
  createdBy: user,
  updatedAt: now,
  updatedBy: user
}

const cphMetadata = {
  id: 'cph-1234-5678-9012-3456',
  slug: 'apply-for-a-county-parish-holding-cph-number',
  title: 'Create CPH',
  organisation: 'Defra',
  teamName: 'Example team',
  teamEmail: 'example-team@defra.gov.uk',
  submissionGuidance: "Thanks for your submission, we'll be in touch",
  notificationEmail: 'example-email-submission-recipient@defra.com',
  ...author,
  live: author
}

const formsService = {
  getFormMetadata: function (slug) {
    switch (slug) {
      case cphMetadata.slug:
        return Promise.resolve(cphMetadata)
      default:
        return Promise.reject(Boom.notFound())
    }
  },
  getFormMetadataById: function (id) {
    switch (id) {
      case cphMetadata.id:
        return Promise.resolve(cphMetadata)
      default:
        return Promise.reject(Boom.notFound())
    }
  },
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getFormDefinition: function (id, /** @type {FormStatus} */ _state) {
    switch (id) {
      case cphMetadata.id:
        return Promise.resolve(cphDefinition)
      default:
        return Promise.reject(Boom.notFound())
    }
  },
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getFormSecret: function (_formId, _secretName) {
    return Promise.reject(Boom.notFound())
  }
}

const sqsClient = new SQSClient({
  region: config.get('aws.region'),
  ...(config.get('aws.endpoint') && { endpoint: config.get('aws.endpoint') })
})

const formSubmissionService = {
  persistFiles: () => Promise.resolve({}),
  submit: () =>
    Promise.resolve({
      message: 'OK',
      result: { files: { main: '', repeaters: {} } }
    })
}

const outputService = {
  submit: async (
    context,
    request,
    model,
    _emailAddress,
    items,
    submitResponse,
    formMetadata
  ) => {
    const format = getFormatter('adapter', '1')

    await sqsClient.send(
      new SendMessageCommand({
        QueueUrl: config.get('sqs.formSubmissionQueueUrl'),
        MessageBody: format(
          context,
          items,
          model,
          submitResponse,
          checkFormStatus(request.params),
          formMetadata
        )
      })
    )
  }
}

export default { formsService, formSubmissionService, outputService }
