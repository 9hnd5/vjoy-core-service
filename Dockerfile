# Base image
FROM node:18-alpine as build
ARG env
# Create app directory
WORKDIR /usr/src/app

# A wildcard is used to ensure both package.json AND package-lock.json are copied
COPY package*.json ./

# Install app dependencies
RUN npm i

# Bundle app source
COPY . .

# Set NODE_ENV environment variable
ENV NODE_ENV production

# Creates a "dist" folder with the production build
RUN npm run build

FROM node:18-alpine as test
CMD npm run test:e2e

FROM node:18-alpine as run
ARG env

# Run the web service on container startup.
CMD npm run start:${env}