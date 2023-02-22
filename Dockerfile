# Base image
FROM node:18-alpine
ARG env
ENV env=${env}
# Create app directory
WORKDIR /usr/src/app

# A wildcard is used to ensure both package.json AND package-lock.json are copied
COPY package*.json ./

# Install app dependencies
RUN npm i

# Bundle app source
COPY . .

# Run API Test
RUN npm run test-e2e:${env}

# Build production
# Creates a "dist" folder with the production build
ENV NODE_ENV production
RUN npm run build

# Run the web service on container startup.
CMD npm run start:${env}