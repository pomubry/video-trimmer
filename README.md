# Video Trimmer

A simple video trimmer for Windows using FFmpeg, mpv and Node.js.

## Requirements

- Node.js
- FFmpeg
- mpv video player

## Installation

- Install Node.js, FFmpeg, and mpv as your video player.
- Make sure to add FFmpeg to Windows Path using Environment variables.
- Copy and paste the copyTime.js file into `%APPDATA%/mpv/scripts`.
- Make the mpv/scripts folder if you dont have one yet.

## Usage

Make sure to place the video file in the same directory as these files.

First, put the name of the video file including its extension at the top of timestamps.txt. Then list the timestamps of the video segments that you want to trim out on the next line moving forward. **Don't** leave empty lines.

The format for timestamps.txt should be:

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

This example will cut the video into five segments:
from `00:04:21.427833333` to `00:04:52.191900000`, and then
from `00:05:04.470833333` to `00:05:44.243900000`, and so on.

Make sure each timestamp pairs are separated by a space between them.

The script will then generate 5 video cuts with the format sampleVideo_001.mp4, sampleVideo_002.mp4, etc., and then merge it together as "sampleVideo (Result).mp4".

Once you're done enumerating the timestamps, save timestamps.txt and run `RunTrimmer.bat`.

**NOTES:**

- You could copy the current timestamp of the video by pressing `Ctrl + c` when using mpv as the video player along with copyTime.js mentioned above.
