# Video Compression

Reduce video file sizes while maintaining quality using H.264 encoding with optimized settings.

```yaml
services: 
  video-compressor:
    image: ghcr.io/kennethwussmann/docker-ffmpeg-converter:latest
    volumes:
      - ./data:/data
    environment:
      - SOURCE_DIRECTORY_PATH=/data/input
      - DESTINATION_DIRECTORY_PATH=/data/output
      - GLOB_PATTERNS=*.avi,*.mov,*.mkv,*.mp4
      - FFMPEG_ARGS=-y -i %s -c:v libx264 -crf 23 -c:a aac -b:a 128k %s_compressed.mp4
      - REMOVE_SOURCE_AFTER_CONVERT=false
```

## Compression Settings

- **libx264**: Efficient H.264 video codec
- **crf 23**: Constant Rate Factor (lower = higher quality, higher file size)
- **aac 128k**: AAC audio at 128kbps

## Quality Levels

- CRF 18-22: High quality, larger files
- CRF 23-25: Balanced quality/size (recommended)
- CRF 26-30: Smaller files, lower quality