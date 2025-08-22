# Converting WebM to MP4

Convert WebM files to MP4 format with 24fps frame rate for better compatibility across devices and platforms.

```yaml
services: 
  webm-to-mp4-converter:
    image: ghcr.io/kennethwussmann/docker-ffmpeg-converter:latest
    volumes:
      - ./data:/data
    environment:
      - SOURCE_DIRECTORY_PATH=/data/input
      - DESTINATION_DIRECTORY_PATH=/data/output
      - GLOB_PATTERNS=*.webm
      - FFMPEG_ARGS=-y -fflags +genpts -i %s -r 24 %s.mp4
      - REMOVE_SOURCE_AFTER_CONVERT=false
```

## Usage

1. Place your `.webm` files in `./data/input/`
2. Converted `.mp4` files will appear in `./data/output/`
3. Original files are preserved by default