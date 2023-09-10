FROM oven/bun:1.0 AS builder

WORKDIR /app

COPY . .

RUN bun install --frozen-lockfile
RUN bun run build

FROM oven/bun:1.0
LABEL org.opencontainers.image.source https://github.com/KennethWussmann/docker-ffmpeg-converter

WORKDIR /app

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

ARG VERSION=develop
ENV VERSION=${VERSION}

ENV FFMPEG_PATH=/usr/bin/ffmpeg

COPY --from=builder /app/build /app/
COPY --from=builder /app/node_modules/ffmpeg-static/ffmpeg /usr/bin/

CMD [ "startService.js" ]