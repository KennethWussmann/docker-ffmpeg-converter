ARG NODE_VERSION=18
FROM node:${NODE_VERSION}-slim AS builder

WORKDIR /app

COPY . .

RUN npm install
RUN npm run bundle

FROM gcr.io/distroless/nodejs${NODE_VERSION}
LABEL org.opencontainers.image.source https://github.com/KennethWussmann/docker-ffmpeg-converter

WORKDIR /app

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

ARG VERSION=develop
ENV VERSION=${VERSION}

ENV FFMPEG_PATH=/usr/bin/ffmpeg

COPY --from=builder /app/build/bundle /app/
COPY --from=builder /app/node_modules/ffmpeg-static/ffmpeg /usr/bin/

CMD [ "startService.js" ]