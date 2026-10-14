# forms-engine-plugin-example-ui

Core delivery platform Node.js Frontend Template.

- [Quick Start](#quick-start)
- [Requirements](#requirements)
  - [Node.js](#nodejs)
- [Server-side Caching](#server-side-caching)
- [Redis](#redis)
- [Proxy](#proxy)
- [Local Development](#local-development)
  - [Setup](#setup)
  - [Development](#development)
  - [Production](#production)
  - [Npm scripts](#npm-scripts)
  - [Update dependencies](#update-dependencies)
  - [Formatting](#formatting)
    - [Windows prettier issue](#windows-prettier-issue)
- [Docker](#docker)
  - [Development image](#development-image)
  - [Production image](#production-image)
  - [Docker Compose](#docker-compose)
  - [Dependabot](#dependabot)
  - [SonarCloud](#sonarcloud)
- [Licence](#licence)
  - [About the licence](#about-the-licence)

## Quick Start

The intention is that this project is built and run from the cph-service-backend projects docker compose and should not be built and run separately.

This project originated from the [forms-engine-plugin-example-ui](https://github.com/DEFRA/forms-engine-plugin-example-ui) project. There are a lot of additional files and dependencies which have not been removed from the original project.

There have been some minor modifications applied to publish the form on submit to the SQS queue http://localhost:4566/000000000000/cph-form.

The CPH form definition is obtained from the [Defra Forms Designer](https://forms.defra.gov.uk/library/apply-for-a-county-parish-holding-cph-number) Editor -> Tools -> Download this form

The downloaded form definition should be stored in the following location:

```text
src/server/forms/apply-for-a-county-parish-holding-cph-number.json
```

The Defra Form Designer should be periodically checked for updates to the form. The current form was last updated on:

```text
11 Sep 2026 by Steven Thomas
```

With additional work, it may be possible to retrieve the form definition through the API.

Form IDs:

- Ext-test: 69663bb43484dbb09cc499e6
- Production: 668655e3a608789f306eb121

Notes from Alex Luckett

```text
Getting the form definition: our API is stable but you're actually the first external consumers so unfortunately I don't have any live docs. If you could give me a bit of time today, I can install hapi-swagger on that repo and publish an OpenAPI spec.

Until then, fortunately it's simple. There's a single endpoint you can get started with, more if you want to do more advanced things.

Pre-requisite: you need your form ID, this will be unique to each form and each environment. A draft form will replace a live form when published and it will keep the same ID.

API base URL
Our API is privately available on CDP, not the internet. Use the usual CDP internal convention: forms-manager.<environment>.cdp-int.defra.cloud base URL for all endpoints.

Potential endpoints
GET /forms/{id}/definitionReturns the latest live form definition.

GET /forms/{id}/definition/draftReturns the latest draft definition.

GET /forms/{id}/versions/{versionNumber}/definitionReturns a specific version of the form. You can find all version numbers by querying the `/form/{id}/versions` endpoint.

Note: using the version endpoint is critical for automation purposes. Because our form submissions come through over SQS, there's a (usually minor) chance that the form has changed between when a submission is submitted vs processed by you. For this, you'll want to use the version endpoint to process the EXACT version of the form the user submitted. The version number is provided to you in the meta section of the SQS message payload.

Workflow
Just a reminder: the usual workflow for form creators is they'll create a draft form and publish it to live when they're ready. This all happens in production.

Due to CDP networking limitations, services on CDP can only communicate with the same environment. E.g. ext-test -> ext-test, prod -> prod. As such, you might need to port a form back from production to test in a lower environment. You'll need to make sure the two forms are kept in sync manually. Some teams choose to do this by just building the form in ext-test and promoting it to live when ready, bypassing the 'draft' in production and going straight to live. This workflow is up to your team's preferences.

Keeping this in mind, we offer a /definition and a /definition/draft endpoint if you need to differentiate between a draft form and a live form if you want to cater for that. Within the SQS payload, it will clearly tell you if the payload is for a draft or live submission and you can vary the endpoints you call accordingly.

Form definition documentation
The best way to understand your form is just to look at it, to be honest. But if you want a more GUI approach, we have interactive docs you can browse: https://defra.github.io/forms-engine-plugin/schemas. You'll want to use "v2" rather than the deprecated v1.

Once you've loaded the form definition docs, you'll most likely want to look at the docs for pages and components.

Our form definition schema is based on joi, and from that we automatically generate this documentation. The open source tooling around joi is fairly poor so there are some rough edges to the docs, but they should give you the key bits. (edited)

Terminology:

Form (type: FormMetadata): the wrapper data structure which includes metadata, which has a unique ID that won't change.
Definition (type: FormDefinition): the form journey itself. 
Versions: a version of a form definition. Version numbers are sequential.
Draft, live: status labels for a form definition version


The model is:

You have a form.
The form has many versions
A draft definition points to one of those versions
A live definition points to one of those versions


The form ID itself won't ever change, that is long lived. However, the version of a form the user filed out can change over time as content designers put newer versions live, it won't be fixed. E.g. they might fill out v1 of the form for the first month, then v2 might go live and new users fill that out.

so you'll want something like:

const definition = await getFormVersion(formId, sqsPayload.meta.versionMetadata.versionNumber)

formId is a constant you own, versionNumber comes from the SQS payload. That way definition is dynamic depending on what version the user filled out.
```

**The remainder of this README is from the original project.**

## Requirements

### Node.js

Please install [Node.js](http://nodejs.org/) `>= v24` and [npm](https://nodejs.org/) `>= 12`. You will find it
easier to use the Node Version Manager [nvm](https://github.com/creationix/nvm)

To use the correct version of Node.js for this application, via nvm:

```bash
cd forms-engine-plugin-example-ui
nvm use
```

## Server-side Caching

We use Catbox for server-side caching. By default the service will use CatboxRedis when deployed and CatboxMemory for
local development.
You can override the default behaviour by setting the `SESSION_CACHE_ENGINE` environment variable to either `redis` or
`memory`.

Please note: CatboxMemory (`memory`) is _not_ suitable for production use! The cache will not be shared between each
instance of the service and it will not persist between restarts.

## Redis

Redis is an in-memory key-value store. Every instance of a service has access to the same Redis key-value store similar
to how services might have a database (or MongoDB). All frontend services are given access to a namespaced prefixed that
matches the service name. e.g. `my-service` will have access to everything in Redis that is prefixed with `my-service`.

If your service does not require a session cache to be shared between instances or if you don't require Redis, you can
disable setting `SESSION_CACHE_ENGINE=false` or changing the default value in `~/src/config/index.js`.

## Proxy

We are using forward-proxy which is set up by default. To make use of this: `import { fetch } from 'undici'` then because of the `setGlobalDispatcher(new ProxyAgent(proxyUrl))` calls will use the ProxyAgent Dispatcher

If you are not using Wreck, Axios or Undici or a similar http that uses `Request`. Then you may have to provide the proxy dispatcher:

To add the dispatcher to your own client:

```javascript
import { ProxyAgent } from 'undici'

return await fetch(url, {
  dispatcher: new ProxyAgent({
    uri: proxyUrl,
    keepAliveTimeout: 10,
    keepAliveMaxTimeout: 10
  })
})
```

## Local Development

### Setup

Install application dependencies:

```bash
npm install
```

### Development

To run the application in `development` mode run:

```bash
npm run dev
```

### Production

To mimic the application running in `production` mode locally run:

```bash
npm start
```

### Npm scripts

All available Npm scripts can be seen in [package.json](./package.json)
To view them in your command line run:

```bash
npm run
```

### Update dependencies

To update dependencies use [npm-check-updates](https://github.com/raineorshine/npm-check-updates):

> The following script is a good start. Check out all the options on
> the [npm-check-updates](https://github.com/raineorshine/npm-check-updates)

```bash
ncu --interactive --format group
```

### Formatting

#### Windows prettier issue

If you are having issues with formatting of line breaks on Windows update your global git config by running:

```bash
git config --global core.autocrlf false
```

## Docker

### Development image

Build:

```bash
docker build --target development --no-cache --tag forms-engine-plugin-example-ui:development .
```

Run:

```bash
docker run -p 3000:3000 forms-engine-plugin-example-ui:development
```

### Production image

Build:

```bash
docker build --no-cache --tag forms-engine-plugin-example-ui .
```

Run:

```bash
docker run -p 3000:3000 forms-engine-plugin-example-ui
```

### Docker Compose

A local environment with:

- Localstack for AWS services (S3, SQS)
- Redis
- MongoDB
- This service.
- A commented out backend example.

```bash
docker compose up --build -d
```

### Dependabot

We have added an example dependabot configuration file to the repository. You can enable it by renaming
the [.github/example.dependabot.yml](.github/example.dependabot.yml) to `.github/dependabot.yml`

### SonarCloud

Instructions for setting up SonarCloud can be found in [sonar-project.properties](./sonar-project.properties).

## Licence

THIS INFORMATION IS LICENSED UNDER THE CONDITIONS OF THE OPEN GOVERNMENT LICENCE found at:

<http://www.nationalarchives.gov.uk/doc/open-government-licence/version/3>

The following attribution statement MUST be cited in your products and applications when using this information.

> Contains public sector information licensed under the Open Government license v3

### About the licence

The Open Government Licence (OGL) was developed by the Controller of Her Majesty's Stationery Office (HMSO) to enable
information providers in the public sector to license the use and re-use of their information under a common open
licence.

It is designed to encourage use and re-use of information freely and flexibly, with only a few conditions.
