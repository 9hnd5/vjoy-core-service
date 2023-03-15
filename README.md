## Description

vjoy-core-service is a microservice, apart of vjoy backend service. This service takes the responsibility of:
- Authentication & Authorization.
- Users management.
- Kids management.
- Roles management.
  ......

## Installation
```bash
$ yarn install
```

## Running the app
```bash
# development & watch mode
$ yarn start

# dev mode
$ yarn start:dev

# production mode
$ yarn start:prod

# staging mode
$ yarn start:stag
```

## Test
```bash
# e2e tests
$ yarn test:e2e:dev
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
## BaseURL
- Core Service: http://vus-vjoy-1ap23wxt.an.gateway.dev/api/v1/dev/core/{resource=**}
- Content Service: http://vus-vjoy-1ap23wxt.an.gateway.dev/api/v1/dev/content/{resource=**}
- File Uploader: http://vus-vjoy-1ap23wxt.an.gateway.dev/api/v1/dev/file-uploader/{resource=**}