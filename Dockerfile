# Base image
FROM node:18-alpine
ARG env
# Create app directory
WORKDIR /usr/src/app

# A wildcard is used to ensure both package.json AND package-lock.json are copied
COPY package*.json ./

# Install app dependencies
RUN npm ci --omit=dev && npm cache clean --force

# Bundle app source
COPY . .

# Set NODE_ENV environment variable
ENV NODE_ENV production

# Creates a "dist" folder with the production build
RUN npm run build

# Run the web service on container startup.
ENV env=${env}
CMD npm run start:${env}