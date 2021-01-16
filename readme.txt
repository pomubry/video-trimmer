Install mpv as the video player.
Paste the copyTime.js file into "C:\Users\[user]\AppData\Roaming\mpv\scripts" or "%APPDATA%/mpv/scripts".
Make the mpv/scripts folder if you dont have one yet.

The format for ts.txt should be

==========
videoName.videoExtension
timestamp1 timestamp2
timestamp3 timestamp4
and so on...
==========

Example:

==========
myVideo.mp4
00:01:38.078000000 00:04:42.983000000
00:05:21.508000000 00:10:25.112000000
==========
This example will cut the video into two parts, from 00:01:38.078000000 to 00:04:42.983000000, and then from 00:05:21.508000000 to 00:10:25.112000000. 
The script will then generate two video cuts as output000.mp4 and output001.mp4 and merge it together as output.mp4.
After merging, the script will rename output.mp4 to the original filename that you have (in this case, its "myVideo.mp4").

NOTES:

You could copy the current timestamp of the video by pressing Ctrl+C when using mpv as the video player.

Put the video file in the same directory as all these files that were extracted.
The video filename should not contain any spaces. Dashes are allowed though. It is recommended to keep the video filename as simple as possible and only rename it after the video has been processed.
Also take note that the original video file will be removed after it has been processed so make a copy if you want to keep the original file.

Once you're done enumerating the timestamps, save ts.txt and run js.sh
When its done, press ENTER to close the remaining terminal and you should see the output file with the same original file name.
You're now then safe to delete all the individual video sections cut (e.g. output000.mp4).