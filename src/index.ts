import {init} from "./init/init.js";
import {purpleText} from "./utils/formatter.js";
import {FFMPEG_OPTIONS} from "./config.js";

if (FFMPEG_OPTIONS.OFFSET !== 0) {
    console.log(purpleText(`Offset Value: ${FFMPEG_OPTIONS.OFFSET} seconds`));
}

try {
    init()
} catch (e) {
    console.log(`
= = = = = = = = = = H I N T S : = = = = = = = = = =

* Line 1 should be the video filename including its extension. 
    Example: input.mp4.

* Timestamp format for each line (except Line 1) should be [timestamp1 timestamp2] without the brackets AND with a single space in between.
    Example: 10:00:00.123456789 11:00:00.123456789

* Timestamp format should be in sexagesimal system and the seconds' format should be 3-9 decimal places long. 
    Example: 12:34:56.123456789

* Don't leave any empty lines.
`
    )
    console.error(e);
}