import {execSync} from "child_process";

import {errorMsgFormatter, sexagesimalFormat} from "../utils/formatter.js";

export const getVideoSegmentErrors = (videoSegments: string[], videoSegmentDurations: number[], baseOutputPath: string) => {
    let possibleErrors: string[] = [];

    videoSegments.forEach((file, index) => {
        let durationInSeconds = Number(
            execSync(
                `ffprobe -v warning -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${baseOutputPath}/${file}"`
            ).toString()
        );

        if (videoSegmentDurations[index] === undefined) {
            throw new Error(
                errorMsgFormatter(`Duration of video segment for index ${index} might be undefined.`)
            )
        }

        let difference = Math.abs(videoSegmentDurations[index] - durationInSeconds).toFixed(4);
        let isGreaterThanOne = Number(difference) > 1;

        if (isGreaterThanOne) {
            possibleErrors.push(file);
        }

        console.log(`\n[\x1b[94m${file}\x1b[0m] Duration: Computed (${sexagesimalFormat(
                videoSegmentDurations[index]
            )}) vs Actual (${sexagesimalFormat(
                durationInSeconds
            )}). Difference: ${difference} seconds.${
                isGreaterThanOne
                    ? "\x1b[31m Possible Error!\x1b[0m"
                    : "\x1b[32m Result Okay!\x1b[0m"
            }`
        );
    });

    return possibleErrors
}