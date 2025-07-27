# Extracting Audio from Video

Extract audio tracks from video files and save as MP3 for music libraries or podcasts.

```yaml
services: 
  audio-extractor:
    image: ghcr.io/kennethwussmann/docker-ffmpeg-converter:latest
    volumes:
      - ./data:/data
    environment:
      - SOURCE_DIRECTORY_PATH=/data/input
      - DESTINATION_DIRECTORY_PATH=/data/output
      - GLOB_PATTERNS=*.mp4,*.mkv,*.avi,*.webm
      - FFMPEG_ARGS=-y -i %s -vn -acodec mp3 -ab 192k %s.mp3
      - REMOVE_SOURCE_AFTER_CONVERT=false
```

## Options Explained

- **-vn**: Disable video recording (audio only)
- **-acodec mp3**: Use MP3 audio codec
- **-ab 192k**: Set audio bitrate to 192kbps

## Use Cases

- Creating audio podcasts from video content
- Building music libraries from video files
- Extracting commentary tracks