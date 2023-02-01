## Description

vjoy-core-service is a microservice, apart of vjoy backend service. This service takes the responsibility of:

- Authentication & Authorization.
- Users management.
- Kids management.
- Roles management.
  ......

## Installation

```bash
$ npm install
```

## Running the app

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Test

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Response Format (Google JSON guide)

```
Success response return data:
{
  "data": {
    "id": 1001,
    "name": "Wing"
  }
}

OR

{
  "data": [
    {
      "id": 1001,
      "name": "Wing"
    },
    {
      "id": 1002,
      "name": "Zing"
    }
  ]
}

Error response return error:
{
  "error": {
    "code": 404,
    "message": "ID not found"
  }
}
```
