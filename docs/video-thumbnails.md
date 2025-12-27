# Extracting Video Thumbnails

Generate thumbnail images from video files at regular intervals for previews or galleries.

```yaml
services: 
  video-thumbnail-extractor:
    image: ghcr.io/kennethwussmann/docker-ffmpeg-converter:latest
    volumes:
      - ./data:/data
    environment:
      - SOURCE_DIRECTORY_PATH=/data/input
      - DESTINATION_DIRECTORY_PATH=/data/output
      - GLOB_PATTERNS=*.mp4,*.webm,*.avi,*.mkv
      - FFMPEG_ARGS=-y -i %s -vf fps=1/10 %s_thumb_%04d.png
      - REMOVE_SOURCE_AFTER_CONVERT=false
```

## Configuration

- **fps=1/10**: Extracts one frame every 10 seconds
- **%04d**: Creates numbered sequence (0001, 0002, etc.)
- Supports multiple video formats as input

## Output

For a video named `movie.mp4`, you'll get:
- `movie_thumb_0001.png`
- `movie_thumb_0002.png` 
- And so on...