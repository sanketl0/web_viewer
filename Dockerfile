FROM node:16-alpine

RUN npm update -g \
	&& npm update -g npm

WORKDIR /src

# To be able to be docker cache friendly, we first install dependencies
COPY ./package*.json ./
RUN npm install --legacy-peer-deps

# Build viewer
COPY ./ ./
RUN npm run build
