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

### *camelCase* data field.

Success response return data:
```
{
  "data": {
    "id": 1001,
    "name": "Wing",
    "phoneNumber": "+849093748392"
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
```


Error response return error:
```
{
  "error": {
    "code": "InvalidFormat",
    "message": "ID not found"
  }
}

OR

{
  "error": [{
    "code": "InvalidFormat",
    "message": "ID not found"
  },
  {
    "code": "InvalidField",
    "message": "Name not found"
  }
  ]
}


```
