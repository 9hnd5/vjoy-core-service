# Base image
FROM node:18
ARG env
# Create app directory
WORKDIR /usr/src/app

# A wildcard is used to ensure both package.json AND package-lock.json are copied
COPY package*.json ./

# Install app dependencies
RUN npm install

# Bundle app source
COPY . .

# Creates a "dist" folder with the production build
RUN npm run build

# Run the web service on container startup.
CMD [ "npm", "run", "start:dev" ]

EXPOSE 8080/tcp