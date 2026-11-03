# Video Trimmer

A simple video trimmer script for Linux and macOS that uses FFmpeg and Node.js.

## Requirements

- xclip
- Node.js
- FFmpeg & FFProbe
- **Optional:** mpv video player

## Setup

- Install xclip, Node.js, FFmpeg, FFProbe.
- Make sure to add `bin/vtrim`, FFmpeg, and FFProbe to your environment variables.
- **Optional:** Install mpv. Then, copy and paste the contents of the script folder into mpv's config directory. e.g. `~/.config/mpv/scripts`.

## Usage

Make sure to place `timestamps.txt` in the same directory as the video file.

First, write the name of the video file, including its extension, at the top of `timestamps.txt`. Then, list the start and end timestamps of the video segments you want to trim on the subsequent lines. **Do not** leave any empty lines.

The format for `timestamps.txt` should be:

**Format:**

```
videoName.videoExtension
timestamp1 timestamp2
timestamp3 timestamp4
and so on...
```

**Practical Example:**

```
sampleVideo.mp4
00:04:21.427833333 00:04:52.191900000
00:05:04.470833333 00:05:44.243900000
00:05:58.891866667 00:06:09.869500000
00:06:20.480100000 00:06:30.623566667
00:06:37.363633333 00:07:16.536100000
```

This example will cut the video sequentially:
from `00:04:21.427833333` to `00:04:52.191900000`, then
from `00:05:04.470833333` to `00:05:44.243900000`, and so on.

Make sure each timestamp pair is separated by a single space.

The script will generate 5 individual video clips named `sampleVideo_001.mp4`, `sampleVideo_002.mp4`, etc., and then merge them together into `sampleVideo (Result).mp4`.

Once you're done listing the timestamps, save `timestamps.txt` and run `vtrim` in the same directory as the video file and `timestamps.txt`.

**NOTES:**

- You can copy the video's current timestamp by pressing `Ctrl + c` while using the mpv video player (if you followed the setup above).
