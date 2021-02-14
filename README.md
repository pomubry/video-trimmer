# Video Trimmer

A simple video trimmer for windows using FFmpeg and mpv.

## Requirements

- FFmpeg
- mpv video player

## Installation

Install FFmpeg and make it available to your PATH.
Install mpv as the video player and paste the copyTime.js file into `C:\Users\[user]\AppData\Roaming\mpv\scripts` or `%APPDATA%/mpv/scripts`.
Make the mpv/scripts folder if you dont have one yet.

## Usage

Make sure to place the video file in the same directory as these files.
First, put the name of the video file including its extension at the top of timestamps.txt. Then list the timestamps of the video segments that you want to process on the next line moving forward.
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
00:01:38.078000000 00:04:42.983000000
00:05:21.508000000 00:10:25.112000000
```

This example will cut the video into two parts:
from `00:01:38.078000000` to `00:04:42.983000000`, and then
from `00:05:21.508000000` to `00:10:25.112000000`.

Make sure each timestamp pairs are separated by a space between them.

The script will then generate two video cuts as output000.mp4 and output001.mp4 and then merge it together as whatever is the filename of the original video file with "(Result)" tagged with it. In this example, it will be "sampleVideo(Result).mp4".

Once you're done enumerating the timestamps, save timestamps.txt and run `RunTrimmer.sh`.

When its done, press ENTER to close the remaining terminal and you should see the output file.

**NOTES:**

- You could copy the current timestamp of the video by pressing Ctrl+C when using mpv as the video player.
- The video filename should **NOT** contain any **spaces** nor **period/dot**. Dashes are allowed though. It is recommended to keep the video filename as simple as possible and only rename it after the video has been processed.
