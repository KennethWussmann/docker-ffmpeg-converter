# Multi-Stage Processing Pipeline

Process videos through multiple conversion stages simultaneously using multiple service instances.

```yaml
services: 
  # Stage 1: Convert to MP4
  format-converter:
    image: ghcr.io/kennethwussmann/docker-ffmpeg-converter:latest
    volumes:
      - ./data:/data
    environment:
      - SOURCE_DIRECTORY_PATH=/data/input
      - DESTINATION_DIRECTORY_PATH=/data/mp4
      - GLOB_PATTERNS=*.webm,*.avi,*.mkv
      - FFMPEG_ARGS=-y -i %s -c:v libx264 -crf 23 %s.mp4
      - REMOVE_SOURCE_AFTER_CONVERT=true

  # Stage 2: Generate thumbnails from MP4s
  thumbnail-generator:
    image: ghcr.io/kennethwussmann/docker-ffmpeg-converter:latest
    volumes:
      - ./data:/data
    environment:
      - SOURCE_DIRECTORY_PATH=/data/mp4
      - DESTINATION_DIRECTORY_PATH=/data/output
      - GLOB_PATTERNS=*.mp4
      - FFMPEG_ARGS=-y -i %s -vf fps=1/30 %s_thumb_%04d.png
      - REMOVE_SOURCE_AFTER_CONVERT=false

  # Stage 3: Extract audio from MP4s
  audio-extractor:
    image: ghcr.io/kennethwussmann/docker-ffmpeg-converter:latest
    volumes:
      - ./data:/data
    environment:
      - SOURCE_DIRECTORY_PATH=/data/mp4
      - DESTINATION_DIRECTORY_PATH=/data/output
      - GLOB_PATTERNS=*.mp4
      - FFMPEG_ARGS=-y -i %s -vn -acodec mp3 -ab 192k %s.mp3
      - REMOVE_SOURCE_AFTER_CONVERT=false
```

## Pipeline Flow

1. **Input**: Place various video formats in `./data/input/`
2. **Stage 1**: Convert all to MP4 format in `./data/mp4/`
3. **Stage 2 & 3**: Simultaneously generate thumbnails and extract audio to `./data/output/`

## Directory Structure

```
./data/
├── input/     # Original files
├── mp4/       # Intermediate MP4 files
└── output/    # Final thumbnails and audio
```