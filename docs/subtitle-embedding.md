# Embedding Subtitles

Burn subtitles directly into video files for permanent display across all devices and players.

```yaml
services: 
  subtitle-embedder:
    image: ghcr.io/kennethwussmann/docker-ffmpeg-converter:latest
    volumes:
      - ./data:/data
    environment:
      - SOURCE_DIRECTORY_PATH=/data/input
      - DESTINATION_DIRECTORY_PATH=/data/output
      - GLOB_PATTERNS=*.mp4,*.mkv,*.avi
      - FFMPEG_ARGS=-y -i %s -vf subtitles=%s.srt -c:a copy %s_with_subs.mp4
      - REMOVE_SOURCE_AFTER_CONVERT=false
```

## Requirements

For each video file, you need a matching subtitle file:
- `movie.mp4` → `movie.mp4.srt`
- `episode.mkv` → `episode.mkv.srt`

## Subtitle Styling

For custom styling, modify the subtitles filter:
```yaml
- FFMPEG_ARGS=-y -i %s -vf "subtitles=%s.srt:force_style='FontSize=24,PrimaryColour=&Hffffff&'" -c:a copy %s_with_subs.mp4
```

## File Organization

```
./data/input/
├── movie.mp4
├── movie.mp4.srt
├── episode.mkv
└── episode.mkv.srt
```