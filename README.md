# Video Trimmer

A simple video trimmer for Linux using FFmpeg, mpv and Node.js.

## Requirements

- xclip
- Node.js
- FFmpeg & FFProbe
- mpv video player

## Setup

- Install xclip, Node.js, FFmpeg, FFProbe, and mpv as your video player.
- Make sure to add FFmpeg & FFProbe to your Environment variables.
- Copy and paste the contents of the script folder into mpv's config directory. e.g. `~/.config/mpv/scripts`.
- Make the /mpv/scripts folder if you dont have one yet.

## Usage

Make sure to place the video file in the same directory as `index.js` & `timestamps.txt`.

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

This example will cut the video one by one:
from `00:04:21.427833333` to `00:04:52.191900000`, and then
from `00:05:04.470833333` to `00:05:44.243900000`, and so on.

Make sure each timestamp pairs are separated by a single space between them.

The script will then generate 5 video cuts with the format sampleVideo_001.mp4, sampleVideo_002.mp4, etc., and then merge it together as "sampleVideo (Result).mp4".

Once you're done enumerating the timestamps, save timestamps.txt and run the `index.js` file.

**NOTES:**

- You could copy the current timestamp of the video by pressing `Ctrl + c` when using mpv as the video player along with copyTime.js mentioned above.
