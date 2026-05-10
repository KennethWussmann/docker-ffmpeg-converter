# Video Resizing and Scaling

Resize videos to specific dimensions for different platforms or to reduce file sizes.

```yaml
services: 
  video-resizer:
    image: ghcr.io/kennethwussmann/docker-ffmpeg-converter:latest
    volumes:
      - ./data:/data
    environment:
      - SOURCE_DIRECTORY_PATH=/data/input
      - DESTINATION_DIRECTORY_PATH=/data/output
      - GLOB_PATTERNS=*.mp4,*.webm,*.avi,*.mkv
      - FFMPEG_ARGS=-y -i %s -vf scale=1280:720 -c:v libx264 -crf 23 %s_720p.mp4
      - REMOVE_SOURCE_AFTER_CONVERT=false
```

## Common Resolutions

Replace the scale values for different target sizes:

- **1920:1080**: Full HD (1080p)
- **1280:720**: HD (720p)
- **854:480**: SD (480p)
- **640:360**: Mobile-friendly
- **1080:1920**: Vertical/Portrait (for social media)

## Aspect Ratio Preservation

Use `-1` to maintain aspect ratio:
- **scale=1280:-1**: Width 1280px, height auto-calculated
- **scale=-1:720**: Height 720px, width auto-calculated