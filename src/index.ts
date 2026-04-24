import fs from "fs";
import readline from "readline";

import {main} from "./main.js";
import {APP_OPTIONS, FFMPEG_OPTIONS, FILENAME_OPTIONS} from "./config.js";

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

if (FFMPEG_OPTIONS.OFFSET !== 0) {
    console.log("\x1b[35m%s\x1b[0m", `Offset Value: ${FFMPEG_OPTIONS.OFFSET} seconds`);
}

rl.question(
    "\nKeep all video segments? (Default: yes) | [yes|no]: ",
    async _ => {
        try {
            if (APP_OPTIONS.IS_BATCH) {
                let ts = ""
                ts += fs.readFileSync(APP_OPTIONS.BATCH_INPUT);
                const tsList = ts.split(APP_OPTIONS.BATCH_SEPARATOR)
                    .map(string => string.trim())

                for (const timestamp of tsList) {
                    fs.writeFileSync(FILENAME_OPTIONS.TIMESTAMPS_FILENAME, timestamp);
                    main(rl);
                }
            } else {
                main(rl)
            }

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
        rl.close();
    }
);