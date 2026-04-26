import * as formatter from "./formatter.js";
import {FFMPEG_OPTIONS} from "../config.js";

// Timestamp in sexagesimal format: '12:34:56.123456789 12:34:56.123456789'
export const timestampPattern = "\\d{2}:\\d{2}:\\d{2}\\.\\d{3,9}"; // note double backslash

export const timestampRegex = new RegExp(`^${timestampPattern} ${timestampPattern}$`);

/*
Split the strings inside the array by whitespaces.
The result would be in the form: [[timestamp1,timestamp2],[timestamp3,timestamp4],etc]
*/
const getTimestampPair = (timestamp: string, offset: number) => {
    let timestampPair = timestamp.split(/\s/);

    if (offset !== 0) {
        timestampPair = timestampPair.map((singleTs) => {
            let tsInSeconds = formatter.sexagesimalToSeconds(singleTs);
            return formatter.sexagesimalFormat(tsInSeconds + FFMPEG_OPTIONS.OFFSET);
        });
    }

    return timestampPair;
};

/*
Check if the 1st timestamp of the current iteration is equal to the 2nd timestamp of the previous iteration.
i.e.,
"00:01:00.000000000 00:05:00.000000000"
"00:05:00.00000000 00:10:00.000000000"
will give an error.
*/
const isDuplicateTimestamp = (
    prevTimestamp: string,
    timestamp1: string,
    idx: number
): {
    isDuplicate: boolean,
    message: string,
} => {
    const prevTimestamp2 = prevTimestamp.split(/\s/)[1]
    if (prevTimestamp2 === undefined && idx > 1) {
        return {
            isDuplicate: true,
            message: `\nThe 2nd timestamp from line ${idx} might be undefined.`
        }
    }

    if (timestamp1 === prevTimestamp2) {
        return {
            isDuplicate: true,
            message: `
Duplicate timestamp found at line ${idx} and line ${idx + 1}:
    --- Two instances of timestamp [${timestamp1}] were found.`
        }
    }

    return {
        isDuplicate: false,
        message: ``
    }
}

export const processTimestamps = (timestampArr: string[]) => {
    let tsError = false;
    let totalTime = 0;
    let videoSegmentDurations: number[] = [];
    let videoFilename = "";

    const timestampPairs = timestampArr.reduce((acc, timestamp, idx) => {
        if (idx === 0) {
            videoFilename = timestamp;
            return [];
        }

        if (timestamp === "" && idx === timestampArr.length - 1) return acc;

        if (timestampRegex.test(timestamp)) {
            let timestamps = timestamp.split(/\s/g) as [string, string];

            // Convert the time string format into seconds.
            let timestamp1 = formatter.sexagesimalToSeconds(timestamps[0]);
            let timestamp2 = formatter.sexagesimalToSeconds(timestamps[1]);

            // Check for all possible timestamp errors
            if (timestamp2 <= timestamp1) {
                tsError = true;
                console.error(`
Timestamp duration error at line ${idx + 1}:
    --- Timestamp [${timestamps[1]}] should be greater than [${timestamps[0]}].`
                );
                return acc
            }

            const prevTimestamp = timestampArr[idx - 1] || "";
            if (!timestampRegex.test(prevTimestamp) && idx > 1) {
                tsError = true;
                return acc
            }

            const res = isDuplicateTimestamp(prevTimestamp, timestamps[0], idx)
            if (res.isDuplicate) {
                tsError = true;
                console.error(res.message)
                return acc
            }

            totalTime += timestamp2 - timestamp1;
            videoSegmentDurations.push(timestamp2 - timestamp1);

            return [...acc, getTimestampPair(timestamp, FFMPEG_OPTIONS.OFFSET)];
        } else {
            tsError = true;
            console.error(`\nInvalid timestamp format at line ${idx + 1}: [${timestamp}].`);
            return acc
        }
    }, [] as string[][]);

    if (tsError) throw new Error(
        formatter.errorMsgFormatter("Timestamps errors were found.")
    )

    return {timestampPairs, totalTime, videoSegmentDurations, videoFilename};
}

export const getTimestampArray = (timestamp: string) => timestamp
    .split("\n")
    .map((ts) => ts.trim())