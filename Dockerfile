FROM node:18-alpine as builder
ARG env
WORKDIR /app
COPY . .
RUN yarn install --frozen-lockfile
# RUN if [ "$env" = "dev" ]; then \
#     yarn test-e2e:${env} & yarn test; \
# fi
RUN yarn test-e2e:dev

RUN yarn build

FROM node:18-alpine as runner
ARG env
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json /app/yarn.lock ./
COPY --from=builder /app/env ./env
ENV NODE_ENV=production
ENV env=${env}
RUN yarn install --frozen-lockfile && yarn cache clean
CMD yarn start:${env}