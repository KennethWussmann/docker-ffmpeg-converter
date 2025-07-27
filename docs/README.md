# Example Scenarios

This directory contains ready-to-use Docker Compose examples for common media conversion tasks. Each scenario includes a complete `docker-compose.yml` that you can copy and run immediately.

## Quick Start Examples

| Scenario | Description | Use Case |
|----------|-------------|----------|
| [WebM to MP4](./webm-to-mp4.md) | Convert WebM files to MP4 format | Cross-platform video compatibility |
| [Video Thumbnails](./video-thumbnails.md) | Extract thumbnail images from videos | Video previews and galleries |
| [Audio Extraction](./audio-extraction.md) | Extract audio tracks as MP3 files | Podcasts, music libraries |
| [Video Compression](./video-compression.md) | Reduce file sizes with H.264 encoding | Storage optimization |
| [GIF Creation](./gif-creation.md) | Convert video clips to animated GIFs | Social media, web content |
| [Video Resizing](./video-resizing.md) | Scale videos to different resolutions | Platform-specific formatting |
| [Subtitle Embedding](./subtitle-embedding.md) | Burn subtitles permanently into videos | Accessibility, multi-language content |
| [Batch Processing Pipeline](./batch-processing-pipeline.md) | Multi-stage processing with multiple services | Complex workflows |

## How to Use

1. Choose a scenario from the table above
2. Click the link to view the complete example
3. Copy the `docker-compose.yml` content
4. Create your data directories: `./data/input/` and `./data/output/`
5. Run `docker-compose up -d`
6. Add files to the input directory and watch the magic happen!

## Tips

- **Multiple Services**: You can run multiple scenarios simultaneously by combining services in one compose file
- **File Patterns**: Adjust `GLOB_PATTERNS` to match your specific file types
- **Custom Arguments**: Modify `FFMPEG_ARGS` for different conversion settings
- **Directory Structure**: Organize your data directories based on your workflow needs

## Advanced Usage

For complex workflows, check out the [Batch Processing Pipeline](./batch-processing-pipeline.md) example that demonstrates how to chain multiple conversion steps together.