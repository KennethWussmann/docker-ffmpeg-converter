<div align="center">
  <h1>🎬 <code>docker-ffmpeg-converter</code></h1>
  <p>
    <strong>Dynamic Docker service designed to simplify and streamline media conversion tasks</strong>
  </p>
</div>

## 🌟 Overview
docker-ffmpeg-converter automates the process of file conversion by:
1. **Monitoring** an input directory for new files.
2. **Utilizing** [ffmpeg](https://www.ffmpeg.org/) to perform specified conversion operations.
3. **Optionally removing** the source files post conversion.

Whether you are building a small pipeline or conducting background conversions of multiple files, docker-ffmpeg-converter efficiently handles it all. Run multiple instances and make your conversion process more versatile and robust.

## 🚀 Quick Start

Get started in minutes with our ready-to-use examples! Here's a simple WebM to MP4 converter:

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
```

**🎯 Want more examples?** Check out our [example scenarios](./docs/README.md) for video compression, thumbnail extraction, GIF creation, and complex processing pipelines!

### 🏷️ Tags

This image is built for `arm64` and `amd64`.

- `latest` - Latest stable release
- `x.x.x` - Specific version under Semver ([See all versions](https://github.com/KennethWussmann/docker-ffmpeg-converter/pkgs/container/docker-ffmpeg-converter/versions))
- `develop` - Unstable pre-release development version

### 🔧 Configuration

Configure the container through environment variables. Here's a breakdown of what you can customize:

<table>
  <tr>
    <th>Variable</th>
    <th>Required</th>
    <th>Description</th>
  </tr>
  <tr>
    <td><code>SOURCE_DIRECTORY_PATH</code></td>
    <td>Yes</td>
    <td>Directory watched for new files</td>
  </tr>
  <tr>
    <td><code>DESTINATION_DIRECTORY_PATH</code></td>
    <td>Yes</td>
    <td>Directory for converted files</td>
  </tr>
  <tr>
    <td><code>GLOB_PATTERNS</code></td>
    <td>Yes</td>
    <td>Comma-separated list of glob patterns the service will use to filter files in the <code>SOURCE_DIRECTORY_PATH</code></td>
  </tr>
  <tr>
    <td><code>FFMPEG_ARGS</code></td>
    <td>Yes</td>
    <td>Arguments for the ffmpeg binary that specify what to do. See <a href="https://ffmpeg.org/ffmpeg.html">ffmpeg docs</a>. You can use placeholders <code>%s</code>, see below.</td>
  </tr>
  <tr>
    <td><code>REMOVE_SOURCE_AFTER_CONVERT</code></td>
    <td>No (default: <code>false</code>)</td>
    <td><code>true</code> or <code>false</code>. Whether or not to delete source files after successful conversion</td>
  </tr>
  <tr>
    <td><code>SCAN_INTERVAL</code></td>
    <td>No (default: <code>10</code>)</td>
    <td>Interval in seconds when the service will search for new files</td>
  </tr>
  <tr>
    <td><code>FILE_UNCHANGED_INTERVALS</code></td>
    <td>No (default: <code>3</code>)</td>
    <td>How many cycles the service will wait for new files to stay unchanged until conversion starts. See below for detailed info.</td>
  </tr>
</table>

## 💼 How the Service Works

### 📂 File Monitoring and Conversion

1. **File Detection**: The service continually polls the `SOURCE_DIRECTORY_PATH`, filtering files using the specified `GLOB_PATTERNS`. 
2. **File Verification**: New files are cached and checked for size stability, based on `FILE_UNCHANGED_INTERVALS`.
3. **Conversion**: Stable files are handed to the converter, building an ffmpeg command with `FFMPEG_ARGS`.

Example:
```shell
FFMPEG_ARGS=-y -fflags +genpts -i %s -r 24 %s.mp4
SOURCE_DIRECTORY_PATH=/data/input
DESTINATION_DIRECTORY_PATH=/data/output
```
Resulting command:
```shell
/usr/bin/ffmpeg -y -fflags +genpts -i /data/input/myfile.webm -r 24 /data/input/myfile.mp4
```
> Note: The order of `%s` is vital. The first represents the source file and the second the destination.

4. **Post-Conversion**: Depending on `REMOVE_SOURCE_AFTER_CONVERT`, the source file may be deleted after successful conversion.

### ⏱️ Custom Intervals and Patterns

- **Scan Interval**: Adjust the polling frequency with `SCAN_INTERVAL`, defining the seconds between each search.
- **File Unchanged Intervals**: Customize the number of cycles to wait for file size stability using `FILE_UNCHANGED_INTERVALS`.

## 📋 Example Scenarios

Explore our comprehensive collection of ready-to-use examples:

| 🎯 **Popular Use Cases** | 🔧 **Advanced Workflows** |
|-------------------------|----------------------------|
| • [WebM to MP4 Conversion](./docs/webm-to-mp4.md)<br>• [Video Thumbnail Extraction](./docs/video-thumbnails.md)<br>• [Audio Extraction](./docs/audio-extraction.md)<br>• [Video Compression](./docs/video-compression.md) | • [Multi-Stage Processing Pipeline](./docs/batch-processing-pipeline.md)<br>• [GIF Creation](./docs/gif-creation.md)<br>• [Video Resizing](./docs/video-resizing.md)<br>• [Subtitle Embedding](./docs/subtitle-embedding.md) |

**💡 Pro Tip:** Run multiple services simultaneously for parallel processing! Check out our [batch processing pipeline](./docs/batch-processing-pipeline.md) example.

## 🎉 Conclusion
docker-ffmpeg-converter is a great solution for seamless media conversion tasks, providing robust customization and a simplified deployment process. Experience the ease of automation with this powerful Docker service.

Feel free to explore, contribute, or seek support. Happy converting! 🎬