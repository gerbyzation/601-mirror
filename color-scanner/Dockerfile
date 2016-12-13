FROM node:boron

# Create app directory
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

# install app dependencies
COPY package.json /usr/src/app/
RUN npm install

COPY . /usr/src/app

ENV NODE_ENV=production
CMD ["node", "app.js"]