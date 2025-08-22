# Common build args
ARG NODE_VERSION=22
ARG FFMPEG_VERSION=7.0.2
ARG FFMPEG_VARIANT=cpu
ARG TARGETARCH

####################
# Builder Stage
####################
FROM node:${NODE_VERSION}-slim AS builder
WORKDIR /app

COPY . .
RUN npm install
RUN npm run bundle

####################
# FFmpeg CPU downloader
####################
FROM debian:bookworm-slim AS ffmpeg-downloader

ARG TARGETARCH
ARG FFMPEG_VERSION

RUN apt-get update && apt-get install -y curl xz-utils && \
    mkdir -p /ffmpeg

# Define arch mapping for download - detect if TARGETARCH is empty
RUN if [ -z "${TARGETARCH}" ]; then \
      ARCH=$(uname -m); \
      if [ "${ARCH}" = "x86_64" ]; then \
        ARCH=amd64; \
      elif [ "${ARCH}" = "aarch64" ]; then \
        ARCH=arm64; \
      else \
        echo "Unsupported architecture: ${ARCH}" && exit 1; \
      fi; \
    elif [ "${TARGETARCH}" = "amd64" ]; then \
      ARCH=amd64; \
    elif [ "${TARGETARCH}" = "arm64" ]; then \
      ARCH=arm64; \
    else \
      echo "Unsupported TARGETARCH: ${TARGETARCH}" && exit 1; \
    fi && \
    echo "Downloading FFmpeg for architecture: ${ARCH}" && \
    curl -L "https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-${ARCH}-static.tar.xz" | \
      tar -xJ --strip-components=1 -C /ffmpeg

####################
# Final CPU Image (distroless)
####################
FROM gcr.io/distroless/nodejs${NODE_VERSION} AS cpu-final
WORKDIR /app

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}
ARG VERSION=develop
ENV VERSION=${VERSION}
ENV FFMPEG_PATH=/usr/bin/ffmpeg

COPY --from=builder /app/build/bundle /app/
COPY --from=builder /app/node_modules /app/node_modules
COPY --from=ffmpeg-downloader /ffmpeg/ffmpeg /usr/bin/ffmpeg

CMD ["startService.js"]

####################
# Final GPU Image (base = jrottenberg/ffmpeg)
####################
FROM jrottenberg/ffmpeg:${FFMPEG_VERSION}-nvidia2204 AS gpu-final

ARG NODE_VERSION=22

# Reintroduce Node in FFmpeg-based image
RUN apt-get update && apt-get install -y curl ca-certificates && \
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash - && \
    apt-get install -y nodejs && \
    node --version

WORKDIR /app

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}
ARG VERSION=develop
ENV VERSION=${VERSION}
ENV FFMPEG_PATH=/usr/local/bin/ffmpeg

COPY --from=builder /app/build/bundle /app/
COPY --from=builder /app/node_modules /app/node_modules

ENTRYPOINT ["node", "/app/startService.js"]