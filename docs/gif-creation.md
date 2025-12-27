# Creating GIFs from Videos

Convert video clips to optimized GIF animations for web use and social media.

```yaml
services: 
  gif-creator:
    image: ghcr.io/kennethwussmann/docker-ffmpeg-converter:latest
    volumes:
      - ./data:/data
    environment:
      - SOURCE_DIRECTORY_PATH=/data/input
      - DESTINATION_DIRECTORY_PATH=/data/output
      - GLOB_PATTERNS=*.mp4,*.webm,*.avi
      - FFMPEG_ARGS=-y -i %s -vf "fps=10,scale=480:-1:flags=lanczos,palettegen=stats_mode=diff" -t 10 %s.gif
      - REMOVE_SOURCE_AFTER_CONVERT=false
```

## Settings Breakdown

- **fps=10**: 10 frames per second for smooth animation
- **scale=480:-1**: Width 480px, height auto-scaled
- **palettegen**: Optimized color palette for smaller files
- **-t 10**: Limit to first 10 seconds of video

## Optimization Tips

- Keep duration short (5-15 seconds) for smaller files
- Lower fps (5-12) reduces file size
- Smaller dimensions significantly reduce file size